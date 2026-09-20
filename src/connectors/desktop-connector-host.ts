import { createHash } from "node:crypto";
import { join } from "node:path";
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
import { listCodexModels } from "./codex-model-catalog.js";
import {
  disconnectedConnectionIntent,
  readConnectionIntent,
  writeConnectionIntent,
  type ConnectionIntent,
} from "./connection-intent.js";
import { assertDiagnosticsMeasurementSession } from "./diagnostics-connection-policy.js";
import { aggregateObservedAttribution } from "../diagnostics/attribution.js";
import {
  aggregateDiagnosticEvents,
  diagnosticEventsInRange,
  diagnosticRangeForPreset,
  type DiagnosticEvent,
  type DiagnosticPreset,
} from "../diagnostics/efficiency.js";
import { buildDiagnosticEvidenceExport } from "../diagnostics/export.js";
import { CodexUsageSequencer } from "../diagnostics/codex-usage.js";
import {
  DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS,
  DiagnosticMeasurementStateStore,
  buildDiagnosticMeasurementTargets,
  type DiagnosticMeasurementTarget,
  type DiagnosticMeasurementTargetInput,
} from "../diagnostics/measurement-state.js";
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
const measurementStore = new DiagnosticMeasurementStateStore(join(diagnosticsRoot, "measurement-state.json"));
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
const MEASUREMENT_PROVIDER = "openai-codex";

type Request = {
  id: number;
  method: "inspect" | "connect" | "disconnect" | "diagnostics" | "export" | "measure";
  manualPath?: string;
  diagnosticsPreset?: DiagnosticPreset;
  diagnosticsProjectId?: string;
};
type ResolvedCodexInspection = {
  resolution: ReturnType<typeof resolveCodexCommand>;
  inspection: CodexInstallationInspection;
};
type ConnectSessionOptions = {
  manualPath?: string;
  resolvedAutoCommand?: string;
};
type ResolvedMeasurementTargets = {
  scope: "model" | "connection";
  detail: string | null;
  targets: DiagnosticMeasurementTarget[];
};

function emit(value: unknown): void { stdout.write(`${JSON.stringify(value)}\n`); }
function completionKey(threadId: string, turnId: string): string { return `${threadId}\u0000${turnId}`; }
function assertRequest(value: unknown): Request {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Desktop connector host request must be an object.");
  const record = value as Record<string, unknown>;
  if (!Number.isSafeInteger(record.id) || (record.id as number) < 0) throw new Error("Desktop connector host request id is invalid.");
  if (!["inspect", "connect", "disconnect", "diagnostics", "export", "measure"].includes(String(record.method))) throw new Error("Desktop connector host method is unsupported.");
  if (record.manualPath !== undefined && typeof record.manualPath !== "string") throw new Error("Desktop connector host manualPath must be a string when supplied.");
  if (record.diagnosticsPreset !== undefined && !DIAGNOSTIC_PRESETS.includes(record.diagnosticsPreset as DiagnosticPreset)) {
    throw new Error("Desktop connector host diagnosticsPreset is invalid.");
  }
  if (record.diagnosticsProjectId !== undefined && typeof record.diagnosticsProjectId !== "string") {
    throw new Error("Desktop connector host diagnosticsProjectId must be a string when supplied.");
  }
  const manualPath = typeof record.manualPath === "string" ? record.manualPath.trim() : undefined;
  const diagnosticsPreset = record.diagnosticsPreset as DiagnosticPreset | undefined;
  const diagnosticsProjectId = typeof record.diagnosticsProjectId === "string" ? record.diagnosticsProjectId.trim() : undefined;
  if (diagnosticsProjectId !== undefined && (!diagnosticsProjectId || diagnosticsProjectId.length > 240)) {
    throw new Error("Desktop connector host diagnosticsProjectId is invalid.");
  }
  return {
    id: record.id as number,
    method: record.method as Request["method"],
    ...(manualPath ? { manualPath } : {}),
    ...(diagnosticsPreset ? { diagnosticsPreset } : {}),
    ...(diagnosticsProjectId ? { diagnosticsProjectId } : {}),
  };
}

function inspectResolvedCodex(candidatePath?: string): ResolvedCodexInspection {
  const resolution = candidatePath
    ? resolveCodexCommand({ pathCandidates: [candidatePath] })
    : resolveCodexCommand();
  if (!resolution) {
    return {
      resolution: undefined,
      inspection: {
        state: "unusable",
        command: candidatePath ?? "codex",
        evidence: "codex --version",
        detail: candidatePath
          ? "The configured Codex executable is no longer a native executable that Livariant can validate without a shell."
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

function connectionFingerprint(): string {
  const { resolution, inspection } = activeInspection();
  if (!resolution || !inspection.version) throw new Error("Codex connection identity is incomplete; diagnostics measurement cannot be scoped safely.");
  return createHash("sha256")
    .update(`${MEASUREMENT_PROVIDER}\u0000${resolution.command}\u0000${inspection.version}`)
    .digest("hex");
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

async function connectSession(options: ConnectSessionOptions = {}) {
  const manualPath = options.manualPath;
  const resolvedAutoCommand = options.resolvedAutoCommand;
  if (session?.isOpen() && workflow && !manualPath) return connectionStatus();
  await disconnectSession();
  const resolved = inspectResolvedCodex(manualPath ?? resolvedAutoCommand);
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
  const status = await connectSession(manualPath ? { manualPath } : {});
  const intent: ConnectionIntent = {
    schemaVersion: 1,
    desiredConnected: true,
    mode: manualPath ? "manual" : "auto",
    ...(manualPath ? { manualPath } : {}),
    ...(!manualPath && selectedResolution?.command ? { resolvedCommand: selectedResolution.command } : {}),
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
    await connectSession(intent.mode === "manual"
      ? { manualPath: intent.manualPath }
      : intent.resolvedCommand
        ? { resolvedAutoCommand: intent.resolvedCommand }
        : {});

    if (intent.mode === "auto" && !intent.resolvedCommand && selectedResolution?.command) {
      try {
        await writeConnectionIntent(connectionIntentPath, {
          ...intent,
          resolvedCommand: selectedResolution.command,
        });
      } catch (error) {
        await disconnectSession();
        selectedResolution = undefined;
        selectedMode = "auto";
        throw new Error(`legacy auto connection restored but its resolved executable could not be pinned: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    lastRestoreError = undefined;
  } catch (error) {
    lastRestoreError = error instanceof Error ? error.message : String(error);
  }
}

async function resolveMeasurementTargets(): Promise<ResolvedMeasurementTargets> {
  assertDiagnosticsMeasurementSession(Boolean(session?.isOpen() && workflow));
  if (!session?.isOpen() || !workflow) throw new Error("Codex diagnostics measurement requires an already connected session.");
  const fingerprint = connectionFingerprint();
  const state = await measurementStore.read();
  try {
    const models = await listCodexModels(session);
    if (models.length === 0) throw new Error("Codex model/list returned no visible models.");

    const catalog = await measurementStore.ensureCatalog(
      MEASUREMENT_PROVIDER,
      fingerprint,
      models.map((model) => model.model),
    );
    const defaultModel = models.find((model) => model.isDefault) ?? models[0];
    if (!defaultModel) throw new Error("Codex model/list did not provide a default measurement target.");

    const newlyAddedModels = catalog.initialized
      ? models.filter((model) => !catalog.knownModels.includes(model.model))
      : [];
    const candidates = [defaultModel, ...newlyAddedModels]
      .filter((model, index, all) => all.findIndex((candidate) => candidate.model === model.model) === index);

    const inputs: DiagnosticMeasurementTargetInput[] = candidates.map((model) => ({
      provider: MEASUREMENT_PROVIDER,
      connectionFingerprint: fingerprint,
      model: model.model,
      displayName: model.displayName,
      isDefault: model.isDefault,
    }));
    return {
      scope: "model",
      detail: null,
      targets: buildDiagnosticMeasurementTargets(inputs, state.records),
    };
  } catch (error) {
    const fallback: DiagnosticMeasurementTargetInput = {
      provider: MEASUREMENT_PROVIDER,
      connectionFingerprint: fingerprint,
      model: null,
      displayName: "Codex default model",
      isDefault: true,
    };
    return {
      scope: "connection",
      detail: `Model-scoped measurement is unavailable for this Codex App Server: ${error instanceof Error ? error.message : String(error)}`,
      targets: buildDiagnosticMeasurementTargets([fallback], state.records),
    };
  }
}

function publicMeasurementStatus(resolved: ResolvedMeasurementTargets) {
  const targets = resolved.targets.map(({ connectionFingerprint: _fingerprint, ...target }) => target);
  const readyTargets = targets.filter((target) => target.ready);
  const cooldownTargets = targets.filter((target) => !target.ready && target.retryAt);
  const nextRetryAt = cooldownTargets
    .map((target) => target.retryAt as string)
    .sort()[0] ?? null;
  return {
    provider: MEASUREMENT_PROVIDER,
    scope: resolved.scope,
    available: true,
    cooldownMs: DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS,
    readyTargetCount: readyTargets.length,
    unmeasuredTargetCount: targets.filter((target) => target.readiness === "unmeasured").length,
    nextRetryAt,
    detail: resolved.detail,
    targets,
  };
}

async function measurementStatus() {
  if (!session?.isOpen() || !workflow) {
    return {
      provider: MEASUREMENT_PROVIDER,
      scope: "unavailable",
      available: false,
      cooldownMs: DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS,
      readyTargetCount: 0,
      unmeasuredTargetCount: 0,
      nextRetryAt: null,
      detail: "Codex is not connected. Connect it before starting a diagnostics measurement.",
      targets: [],
    };
  }
  try {
    return publicMeasurementStatus(await resolveMeasurementTargets());
  } catch (error) {
    return {
      provider: MEASUREMENT_PROVIDER,
      scope: "unavailable",
      available: false,
      cooldownMs: DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS,
      readyTargetCount: 0,
      unmeasuredTargetCount: 0,
      nextRetryAt: null,
      detail: error instanceof Error ? error.message : String(error),
      targets: [],
    };
  }
}

function projectScopedDiagnosticEvents(
  events: readonly DiagnosticEvent[],
  range: ReturnType<typeof diagnosticRangeForPreset>,
  projectId: string,
): { events: DiagnosticEvent[]; unattributedEventCount: number } {
  const inRange = diagnosticEventsInRange(events, range);
  return {
    events: inRange.filter((event) => event.attribution?.projectId === projectId),
    unattributedEventCount: inRange.filter((event) => event.attribution?.projectId === undefined).length,
  };
}

async function diagnostics(preset: DiagnosticPreset = "all", projectId: string) {
  await writeQueue;
  const range = diagnosticRangeForPreset(preset);
  const allEvents = await store.readAll();
  const scoped = projectScopedDiagnosticEvents(allEvents, range, projectId);
  const aggregate = aggregateDiagnosticEvents(scoped.events, range);
  return {
    preset,
    range: aggregate.range,
    scope: {
      kind: "project",
      projectId,
      unattributedEventCount: scoped.unattributedEventCount,
    },
    observed: aggregate.observed,
    avoided: aggregate.avoided,
    estimated: aggregate.estimated,
    attribution: aggregateObservedAttribution(scoped.events, range),
    hasObservedData: aggregate.observed.eventCount > 0,
    storage: "local-jsonl",
    measurement: await measurementStatus(),
  };
}

async function diagnosticsExport(preset: DiagnosticPreset = "all", projectId: string) {
  await writeQueue;
  const range = diagnosticRangeForPreset(preset);
  const allEvents = await store.readAll();
  const scoped = projectScopedDiagnosticEvents(allEvents, range, projectId);
  return {
    scope: {
      kind: "project",
      projectId,
      unattributedEventCount: scoped.unattributedEventCount,
    },
    evidence: buildDiagnosticEvidenceExport(scoped.events, {
      preset,
      range,
      coreVersion: clientVersion,
    }),
  };
}

async function measure(preset: DiagnosticPreset = "all", projectId: string) {
  assertDiagnosticsMeasurementSession(Boolean(session?.isOpen() && workflow));
  if (!workflow || !session?.isOpen()) throw new Error("Codex diagnostics measurement requires an already connected session.");

  const resolved = await resolveMeasurementTargets();
  const ready = resolved.targets.filter((target) => target.ready);
  const unmeasured = ready.filter((target) => target.readiness === "unmeasured");
  const target = unmeasured.find((candidate) => candidate.isDefault)
    ?? unmeasured[0]
    ?? ready.find((candidate) => candidate.isDefault)
    ?? ready[0];
  if (!target) {
    const nextRetryAt = resolved.targets
      .filter((candidate) => !candidate.ready && candidate.retryAt)
      .map((candidate) => candidate.retryAt as string)
      .sort()[0] ?? null;
    throw new Error(nextRetryAt
      ? `Diagnostics measurement is in cooldown until ${nextRetryAt}.`
      : "No diagnostics measurement target is currently available.");
  }

  const thread = await workflow.startThread({
    ephemeral: true,
    ...(target.model ? { model: target.model } : {}),
  });
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
  await measurementStore.recordSuccess(target);
  return {
    connection: connectionStatus(),
    measuredTarget: {
      provider: target.provider,
      model: target.model,
      displayName: target.displayName,
      scope: resolved.scope,
    },
    diagnostics: await diagnostics(preset, projectId),
  };
}

async function handle(request: Request): Promise<unknown> {
  if (request.method === "inspect") {
    await restoreDesiredConnection();
    return connectionStatus();
  }
  if (request.method === "connect") return await connect(request.manualPath);
  if (request.method === "disconnect") return await disconnectByUser();
  if (request.method === "diagnostics") {
    if (!request.diagnosticsProjectId) throw new Error("Project-focused Diagnostics requires diagnosticsProjectId.");
    return await diagnostics(request.diagnosticsPreset, request.diagnosticsProjectId);
  }
  if (request.method === "export") {
    if (!request.diagnosticsProjectId) throw new Error("Project-focused Diagnostics export requires diagnosticsProjectId.");
    return await diagnosticsExport(request.diagnosticsPreset, request.diagnosticsProjectId);
  }
  if (!request.diagnosticsProjectId) throw new Error("Project-focused Diagnostics measurement requires diagnosticsProjectId.");
  return await measure(request.diagnosticsPreset, request.diagnosticsProjectId);
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
