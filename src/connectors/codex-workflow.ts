import { extractCodexUsageSnapshot, type CodexUsageSnapshot } from "./codex-app-server.js";
import type { CodexAppServerSession } from "./codex-runtime.js";

export interface CodexThreadHandle { threadId: string; source: "started" | "resumed"; }
export interface CodexTurnHandle { threadId: string; turnId: string; }

export interface CodexApprovalRequest {
  requestId: string | number;
  method:
    | "item/commandExecution/requestApproval"
    | "item/fileChange/requestApproval"
    | "item/permissions/requestApproval"
    | "applyPatchApproval"
    | "execCommandApproval";
  params: Record<string, unknown>;
  threadId?: string;
  turnId?: string;
}

export type CodexWorkflowEvent =
  | { kind: "notification"; method: string; message: Record<string, unknown> }
  | { kind: "approval-request"; request: CodexApprovalRequest }
  | { kind: "usage"; snapshot: CodexUsageSnapshot }
  | { kind: "turn-completed"; threadId: string; turnId: string; status: string; message: Record<string, unknown> };

export interface CodexWorkflowClientOptions {
  requestIdStart?: number;
  requestTimeoutMs?: number;
  appServerVersion: string;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${field} must be a non-blank string.`);
  return value;
}
function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
function requireObject(value: unknown, field: string): JsonObject {
  if (!isObject(value)) throw new Error(`${field} must be an object.`);
  return value;
}
function isResponseId(value: unknown): value is string | number {
  return typeof value === "string" || (typeof value === "number" && Number.isSafeInteger(value));
}
function markCapabilityAvailable(session: CodexAppServerSession, capability: string): void {
  session.connector.observedCapabilities = {
    ...session.connector.observedCapabilities,
    [capability]: "available",
  };
}

const APPROVAL_METHODS = new Set<CodexApprovalRequest["method"]>([
  "item/commandExecution/requestApproval",
  "item/fileChange/requestApproval",
  "item/permissions/requestApproval",
  "applyPatchApproval",
  "execCommandApproval",
]);

function parseApprovalRequest(message: JsonObject): CodexApprovalRequest | undefined {
  if (typeof message.method !== "string" || !APPROVAL_METHODS.has(message.method as CodexApprovalRequest["method"])) return undefined;
  if (!isResponseId(message.id)) throw new Error("Codex approval request id is missing or invalid.");
  const params = requireObject(message.params, "Codex approval request params");
  const threadId = optionalText(params.threadId);
  const turnId = optionalText(params.turnId);
  return {
    requestId: message.id,
    method: message.method as CodexApprovalRequest["method"],
    params: { ...params },
    ...(threadId === undefined ? {} : { threadId }),
    ...(turnId === undefined ? {} : { turnId }),
  };
}

interface PendingRequest {
  method: string;
  resolve: (result: JsonObject) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Thin workflow layer over an already handshaken Codex App Server session.
 * Server approval requests are surfaced but deliberately not answered here.
 * Authority remains a Livariant host decision, never a connector side effect.
 */
export class CodexWorkflowClient {
  readonly #session: CodexAppServerSession;
  readonly #requestTimeoutMs: number;
  readonly #appServerVersion: string;
  readonly #pending = new Map<string | number, PendingRequest>();
  readonly #listeners = new Set<(event: CodexWorkflowEvent) => void>();
  readonly #unsubscribeMessage: () => void;
  readonly #unsubscribeDisconnect: () => void;
  #nextRequestId: number;
  #closed = false;

  constructor(session: CodexAppServerSession, options: CodexWorkflowClientOptions) {
    if (!session.isOpen()) throw new Error("Codex workflow requires an open App Server session.");
    if (options.appServerVersion.trim().length === 0) throw new Error("Codex App Server version must not be blank.");
    const requestIdStart = options.requestIdStart ?? 100;
    const requestTimeoutMs = options.requestTimeoutMs ?? 15000;
    if (!Number.isSafeInteger(requestIdStart) || requestIdStart < 1) throw new Error("Codex workflow request id start must be a positive safe integer.");
    if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) throw new Error("Codex workflow request timeout must be a positive safe integer.");
    this.#session = session;
    this.#appServerVersion = options.appServerVersion;
    this.#nextRequestId = requestIdStart;
    this.#requestTimeoutMs = requestTimeoutMs;
    this.#unsubscribeMessage = session.onMessage((message) => this.#handleMessage(message));
    this.#unsubscribeDisconnect = session.onDisconnect((reason) => this.#failAll(new Error(`Codex App Server disconnected: ${reason}`)));
  }

  onEvent(listener: (event: CodexWorkflowEvent) => void): () => void {
    this.#requireOpen();
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async startThread(options: { cwd?: string; model?: string; ephemeral?: boolean } = {}): Promise<CodexThreadHandle> {
    const params: JsonObject = {};
    if (options.cwd !== undefined) params.cwd = requireText(options.cwd, "Codex thread cwd");
    if (options.model !== undefined) params.model = requireText(options.model, "Codex thread model");
    if (options.ephemeral !== undefined) params.ephemeral = options.ephemeral;
    const result = await this.#request("thread/start", params);
    const thread = requireObject(result.thread, "Codex thread/start result.thread");
    return { threadId: requireText(thread.id, "Codex thread id"), source: "started" };
  }

  async resumeThread(threadId: string): Promise<CodexThreadHandle> {
    const normalized = requireText(threadId, "Codex thread id");
    const result = await this.#request("thread/resume", { threadId: normalized });
    const thread = requireObject(result.thread, "Codex thread/resume result.thread");
    const returnedId = requireText(thread.id, "Codex resumed thread id");
    if (returnedId !== normalized) throw new Error("Codex resumed thread id does not match the requested thread.");
    markCapabilityAvailable(this.#session, "session.resume");
    return { threadId: returnedId, source: "resumed" };
  }

  async startTurn(threadId: string, text: string): Promise<CodexTurnHandle> {
    const normalizedThreadId = requireText(threadId, "Codex turn thread id");
    const normalizedText = requireText(text, "Codex turn input text");
    const result = await this.#request("turn/start", {
      threadId: normalizedThreadId,
      input: [{ type: "text", text: normalizedText, textElements: [] }],
    });
    const turn = requireObject(result.turn, "Codex turn/start result.turn");
    const turnId = requireText(turn.id, "Codex turn id");
    markCapabilityAvailable(this.#session, "task.execute");
    return { threadId: normalizedThreadId, turnId };
  }

  async interruptTurn(threadId: string, turnId: string): Promise<void> {
    await this.#request("turn/interrupt", {
      threadId: requireText(threadId, "Codex interrupt thread id"),
      turnId: requireText(turnId, "Codex interrupt turn id"),
    });
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#unsubscribeMessage();
    this.#unsubscribeDisconnect();
    this.#failAll(new Error("Codex workflow client closed."));
    this.#listeners.clear();
  }

  #request(method: string, params: JsonObject): Promise<JsonObject> {
    this.#requireOpen();
    const id = this.#nextRequestId++;
    if (!Number.isSafeInteger(id)) throw new Error("Codex workflow request id space exhausted.");
    return new Promise<JsonObject>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`Codex ${method} request timed out.`));
      }, this.#requestTimeoutMs);
      this.#pending.set(id, { method, resolve, reject, timeout });
      try {
        this.#session.send({ method, id, params });
      } catch (error) {
        clearTimeout(timeout);
        this.#pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  #handleMessage(message: JsonObject): void {
    if (this.#closed) return;
    if (isResponseId(message.id) && message.method === undefined) {
      const pending = this.#pending.get(message.id);
      if (pending !== undefined) {
        clearTimeout(pending.timeout);
        this.#pending.delete(message.id);
        if (message.error !== undefined) {
          pending.reject(new Error(`Codex ${pending.method} request failed.`));
          return;
        }
        try { pending.resolve(requireObject(message.result, `Codex ${pending.method} result`)); }
        catch (error) { pending.reject(error instanceof Error ? error : new Error(String(error))); }
        return;
      }
    }

    try {
      const approval = parseApprovalRequest(message);
      if (approval !== undefined) {
        this.#emit({ kind: "approval-request", request: approval });
        return;
      }
      const usage = extractCodexUsageSnapshot(message, this.#appServerVersion);
      if (usage !== undefined) {
        markCapabilityAvailable(this.#session, "telemetry.usage.provider-owned");
        this.#emit({ kind: "usage", snapshot: usage });
        return;
      }
      if (message.method === "turn/completed") {
        const params = requireObject(message.params, "Codex turn/completed params");
        const turn = requireObject(params.turn, "Codex completed turn");
        this.#emit({
          kind: "turn-completed",
          threadId: requireText(params.threadId, "Codex completed thread id"),
          turnId: requireText(turn.id, "Codex completed turn id"),
          status: requireText(turn.status, "Codex completed turn status"),
          message,
        });
        return;
      }
      if (typeof message.method === "string") this.#emit({ kind: "notification", method: message.method, message });
    } catch {
      // Invalid runtime messages are not promoted into connector evidence.
    }
  }

  #emit(event: CodexWorkflowEvent): void { for (const listener of this.#listeners) listener(event); }
  #failAll(error: Error): void {
    for (const pending of this.#pending.values()) { clearTimeout(pending.timeout); pending.reject(error); }
    this.#pending.clear();
  }
  #requireOpen(): void {
    if (this.#closed || !this.#session.isOpen()) throw new Error("Codex workflow client is closed.");
  }
}
