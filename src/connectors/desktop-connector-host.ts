import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { resolveCodexCommand, type CodexCommandResolution } from "./codex-command.js";
import {
  connectCodexAppServer,
  inspectCodexInstallation,
  type CodexAppServerSession,
  type CodexInstallationInspection,
} from "./codex-runtime.js";
import { CodexWorkflowClient } from "./codex-workflow.js";
import {
  disconnectedConnectionIntent,
  readConnectionIntent,
  writeConnectionIntent,
  type ConnectionIntent,
} from "./connection-intent.js";
import { aggregateObservedAttribution } from "../diagnostics/attribution.js";
import {
  aggregateDiagnosticEvents,
  diagnosticRangeForPreset,
  type DiagnosticPreset,
} from "../diagnostics/efficiency.js";
import { CodexUsageSequencer } from "../diagnostics/codex-usage.js";
import { DiagnosticEventStore } from "../diagnostics/store.js";

function requiredEnv(name: "LIVARIANT_DIAGNOSTICS_ROOT" | "LIVARIANT_CORE_VERSION" | "LIVARIANT_CONNECTION_INTENT_PATH"): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is required.`);
  return value;
}

const diagnosticsRoot = requiredEnv("LIVARIANT_DIAGNOSTICS_ROOT");
const clientVersion = requiredEnv("LIVARIANT_CORE_VERSION");
const connectionIntentPath = requiredEnv("LIVARIANT_CONNECTION_INTENT_PATH");
const store = new DiagnosticEventStore(diagnosticsRoot);
const sequencer = new CodexUsageSequencer();
let session: CodexAppServerSession | undefined;
let workflow: CodexWorkflowClient | undefined;
let unsubscribeWorkflow: (() => void) | undefined;
let writeQueue: Promise<void> = Promise.resolve();
let pendingApprovals = 0;
const completedTurns = new Set<string>();
let selectedResolution: CodexCommandResolution | undefined;
let selectedMode: "auto" | "manual" = "auto";
let lastRestoreError: string | undefined;

const DIAGNOSTIC_PRESETS = ["1d", "7d", "30d", "90d", "all"] as const satisfies readonly DiagnosticPreset[];

type Request = {
  id: number;
  method: "inspect" | "connect" | "disconnect" | "diagnostics" | "measure";
  manualPath?: string;
  diagnosticsPreset?: DiagnosticPreset;
};
type ResolvedCodexInspection = {
  resolution: ReturnType<typeof resolveCodexCommand>;
  inspection: CodexInstallationInspection;
};

function emit(value: unknown): void { stdout.write(`${JSON.stringify(value)}\n`); }
function completionKey(threadId: string, turnId: string): string { return `${threadId}\u0000${turnId}`; }
function assertRequest(value: unknown): Request {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Desktop connector host request must be an object.");
  const record = value as Record<string, unknown>;
  if (!Number.isSafeInteger(record.id) || (record.id as number) < 0) throw new Error("Desktop connector host request id is invalid.");
  if (!["inspect", "connect", "disconnect", "diagnostics", "measure"].includes(String(record.method))) throw new Error("Desktop connector host method is unsupported.");
  if (record.manualPath !== undefined && typeof record.manualPath !== "string") throw new Error("Desktop connector host manualPath must be a string when supplied.");
  if (record.diagnosticsPreset !== undefined && !DIAGNOSTIC_PRESETS.includes(record.diagnosticsPreset as DiagnosticPreset)) {
    throw new Error("Desktop connector host diagnosticsPreset is invalid.");
  }
  const manualPath = typeof record.manualPath === "string" ? record.manualPath.trim() : undefined;
  const diagnosticsPreset = record.diagnosticsPreset as DiagnosticPreset | undefined;
  return {
    id: record.id as number,
    method: record.method as Request["method"],
    ...(manualPath ? { manualPath } : {}),
    ...(diagnosticsPreset ? { diagnosticsPreset } : {}),
  };
}

function inspectResolvedCodex(manualPath?: string): ResolvedCodexInspection {
  const resolution = manualPath
    ? resolveCodexCommand({ pathCandidates: [manualPath] })
    : resolveCodexCommand();
  if (!resolution) {
    return {
      resolution: undefined,
      inspection: {
        state: "unusable",
        command: manualPath ?? "codex",
        evidence: "codex --version",
        detail: manualPath
          ? "The selected path is not a native Codex executable that Livariant can validate without a shell."
          : "Codex was found only through a Windows command shim whose native executable could not be resolved without invoking a shell.",
      },
    };
  }
  return { resolution, inspection: inspectCodexInstallation(resolution.command) };
}

function activeInspection(): ResolvedCodexInspection {
  if (selectedResolution) {
    return { resolution: selectedResolution, inspection: inspectCodexInstallation(selectedResolution.command) };
  }
  return inspectResolvedCodex();
}

function connectionStatus() {
  const { resolution, inspection } = activeInspection();
  const baseDetail = inspection.detail ?? (inspection.state === "available" ? "Codex is installed and can be connected through App Server." : "Codex is not currently connectable.");
  return {
    installationState: inspection.state,
    version: inspection.version ?? null,
    connected: Boolean(session?.isOpen()),
    connectionState: session?.connector.state ?? "disconnected",
    pendingApprovals,
    launchSource: resolution?.source ?? null,
    connectionMode: selectedResolution ? selectedMode : "auto",
    configuredCommand: selectedResolution?.command ?? null,
    detail: lastRestoreError ? `Codex remains configured to reconnect, but automatic reconnection failed: ${lastRestoreError}` : baseDetail,
  };
}

async function disconnectSession(): Promise<void> {
  unsubscribeWorkflow?.();
  unsubscribeWorkflow = undefined;
  workflow?.close();
  workflow = undefined;
  session?.close();
  session = undefined;
  pendingApprovals = 0;
  sequencer.reset();
  completedTurns.clear();
}

async function connectSession(manualPath?: string) {
  if (session?.isOpen() && workflow && !manualPath) return connectionStatus();
  await disconnectSession();
  const resolved = inspectResolvedCodex(manualPath);
  const { resolution, inspection } = resolved;
  if (!resolution || inspection.state !== "available") throw new Error(`Codex is not connectable: ${inspection.detail ?? inspection.state}.`);
  if (!inspection.version) throw new Error("Codex responded but its version could not be identified; measured provenance would be incomplete.");

  selectedResolution = resolution;
  selectedMode = manualPath ? "manual" : "auto";
  session = await connectCodexAppServer({ clientVersion, command: resolution.command });
  workflow = new CodexWorkflowClient(session, { appServerVersion: inspection.version });
  unsubscribeWorkflow = workflow.onEvent((event) => {
    if (event.kind === "approval-request") {
      pendingApprovals += 1;
      return;
    }
    if (event.kind === "turn-completed") {
      completedTurns.add(completionKey(event.threadId, event.turnId));
      return;
    }
    if (event.kind !== "usage") return;
    const result = sequencer.accept(event.snapshot);
    if (result.kind !== "delta") return;
    writeQueue = writeQueue.then(() => store.append(result.event));
  });
  return connectionStatus();
}

async function connect(manualPath?: string) {
  const status = await connectSession(manualPath);
  const intent: ConnectionIntent = {
    schemaVersion: 1,
    desiredConnected: true,
    mode: manualPath ? "manual" : "auto",
    ...(manualPath ? { manualPath } : {}),
  };
  try {
    await writeConnectionIntent(connectionIntentPath, intent);
    lastRestoreError = undefined;
    return status;
  } catch (error) {
    await disconnectSession();
    selectedResolution = undefined;
    selectedMode = "auto";
    throw new Error(`Codex connected, but the persistent connection preference could not be saved: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function disconnectByUser() {
  await writeConnectionIntent(connectionIntentPath, disconnectedConnectionIntent());
  await disconnectSession();
  selectedResolution = undefined;
  selectedMode = "auto";
  lastRestoreError = undefined;
  return connectionStatus();
}

async function restoreDesiredConnection(): Promise<void> {
  if (session?.isOpen() && workflow) return;
  let intent: ConnectionIntent;
  try {
    intent = await readConnectionIntent(connectionIntentPath);
  } catch (error) {
    lastRestoreError = `stored connection preference is invalid: ${error instanceof Error ? error.message : String(error)}`;
    return;
  }
  if (!intent.desiredConnected) {
    lastRestoreError = undefined;
    return;
  }
  try {
    await connectSession(intent.mode === "manual" ? intent.manualPath : undefined);
    lastRestoreError = undefined;
  } catch (error) {
    lastRestoreError = error instanceof Error ? error.message : String(error);
  }
}

async function diagnostics(preset: DiagnosticPreset = "all") {
  await writeQueue;
  const range = diagnosticRangeForPreset(preset);
  const events = await store.readAll();
  const aggregate = aggregateDiagnosticEvents(events, range);
  return {
    preset,
    range: aggregate.range,
    observed: aggregate.observed,
    avoided: aggregate.avoided,
    estimated: aggregate.estimated,
    attribution: aggregateObservedAttribution(events, range),
    hasObservedData: aggregate.observed.eventCount > 0,
    storage: "local-jsonl",
  };
}

async function measure(preset: DiagnosticPreset = "all") {
  if (!session?.isOpen() || !workflow) await connectSession();
  if (!workflow || !session?.isOpen()) throw new Error("Codex connection did not become available.");
  const thread = await workflow.startThread({ ephemeral: true });
  sequencer.markNewThread(thread.threadId);
  const turn = await workflow.startTurn(thread.threadId, "Reply with exactly: Livariant diagnostics connection verified.");
  const key = completionKey(turn.threadId, turn.turnId);
  const deadline = Date.now() + 60_000;
  while (!completedTurns.has(key)) {
    if (!session.isOpen()) throw new Error("Codex disconnected during the diagnostics measurement turn.");
    if (Date.now() >= deadline) throw new Error("Codex diagnostics measurement turn timed out.");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  completedTurns.delete(key);
  await new Promise((resolve) => setTimeout(resolve, 250));
  await writeQueue;
  return { connection: connectionStatus(), diagnostics: await diagnostics(preset) };
}

async function handle(request: Request): Promise<unknown> {
  if (request.method === "inspect") {
    await restoreDesiredConnection();
    return connectionStatus();
  }
  if (request.method === "connect") return await connect(request.manualPath);
  if (request.method === "disconnect") return await disconnectByUser();
  if (request.method === "diagnostics") return await diagnostics(request.diagnosticsPreset);
  return await measure(request.diagnosticsPreset);
}

const input = createInterface({ input: stdin, crlfDelay: Infinity });
input.on("line", (line) => {
  void (async () => {
    let id: number | null = null;
    try {
      const parsed = JSON.parse(line) as unknown;
      const request = assertRequest(parsed);
      id = request.id;
      emit({ id, ok: true, result: await handle(request) });
    } catch (error) {
      emit({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  })();
});
input.on("close", () => { void disconnectSession().finally(() => process.exit(0)); });
