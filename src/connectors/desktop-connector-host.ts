import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { resolveCodexCommand } from "./codex-command.js";
import { connectCodexAppServer, inspectCodexInstallation, type CodexAppServerSession } from "./codex-runtime.js";
import { CodexWorkflowClient } from "./codex-workflow.js";
import { aggregateDiagnosticEvents } from "../diagnostics/efficiency.js";
import { CodexUsageSequencer } from "../diagnostics/codex-usage.js";
import { DiagnosticEventStore } from "../diagnostics/store.js";

function requiredEnv(name: "LIVARIANT_DIAGNOSTICS_ROOT" | "LIVARIANT_CORE_VERSION"): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is required.`);
  return value;
}

const diagnosticsRoot = requiredEnv("LIVARIANT_DIAGNOSTICS_ROOT");
const clientVersion = requiredEnv("LIVARIANT_CORE_VERSION");
const store = new DiagnosticEventStore(diagnosticsRoot);
const sequencer = new CodexUsageSequencer();
let session: CodexAppServerSession | undefined;
let workflow: CodexWorkflowClient | undefined;
let unsubscribeWorkflow: (() => void) | undefined;
let writeQueue: Promise<void> = Promise.resolve();
let pendingApprovals = 0;
const completedTurns = new Set<string>();

type Request = { id: number; method: "inspect" | "connect" | "disconnect" | "diagnostics" | "measure" };

function emit(value: unknown): void { stdout.write(`${JSON.stringify(value)}\n`); }
function completionKey(threadId: string, turnId: string): string { return `${threadId}\u0000${turnId}`; }
function assertRequest(value: unknown): Request {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Desktop connector host request must be an object.");
  const record = value as Record<string, unknown>;
  if (!Number.isSafeInteger(record.id) || (record.id as number) < 0) throw new Error("Desktop connector host request id is invalid.");
  if (!["inspect", "connect", "disconnect", "diagnostics", "measure"].includes(String(record.method))) throw new Error("Desktop connector host method is unsupported.");
  return { id: record.id as number, method: record.method as Request["method"] };
}

function inspectResolvedCodex() {
  const resolution = resolveCodexCommand();
  if (!resolution) {
    return {
      resolution: undefined,
      inspection: {
        state: "unusable" as const,
        command: "codex",
        evidence: "codex --version" as const,
        detail: "Codex was found only through a Windows command shim whose native executable could not be resolved without invoking a shell.",
      },
    };
  }
  return { resolution, inspection: inspectCodexInstallation(resolution.command) };
}

function connectionStatus() {
  const { resolution, inspection } = inspectResolvedCodex();
  return {
    installationState: inspection.state,
    version: inspection.version ?? null,
    connected: Boolean(session?.isOpen()),
    connectionState: session?.connector.state ?? "disconnected",
    pendingApprovals,
    launchSource: resolution?.source ?? null,
    detail: inspection.detail ?? (inspection.state === "available" ? "Codex is installed and can be connected through App Server." : "Codex is not currently connectable."),
  };
}

async function disconnect(): Promise<void> {
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

async function connect() {
  if (session?.isOpen() && workflow) return connectionStatus();
  await disconnect();
  const { resolution, inspection } = inspectResolvedCodex();
  if (!resolution || inspection.state !== "available") throw new Error(`Codex is not connectable: ${inspection.state}.`);
  if (!inspection.version) throw new Error("Codex responded but its version could not be identified; measured provenance would be incomplete.");

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

async function diagnostics() {
  await writeQueue;
  const aggregate = aggregateDiagnosticEvents(await store.readAll());
  return {
    observed: aggregate.observed,
    avoided: aggregate.avoided,
    estimated: aggregate.estimated,
    hasObservedData: aggregate.observed.eventCount > 0,
    storage: "local-jsonl",
  };
}

async function measure() {
  if (!session?.isOpen() || !workflow) await connect();
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
  return { connection: connectionStatus(), diagnostics: await diagnostics() };
}

async function handle(request: Request): Promise<unknown> {
  if (request.method === "inspect") return connectionStatus();
  if (request.method === "connect") return await connect();
  if (request.method === "disconnect") { await disconnect(); return connectionStatus(); }
  if (request.method === "diagnostics") return await diagnostics();
  return await measure();
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
input.on("close", () => { void disconnect().finally(() => process.exit(0)); });
