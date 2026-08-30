import type { ConnectorDefinition } from "./connector-registry.js";

export const CODEX_APP_SERVER_CONNECTOR: ConnectorDefinition = {
  typeId: "openai.codex.app-server",
  displayName: "Codex App Server",
  version: "1",
  provenance: "framework-bundled",
  declaredCapabilities: [
    "task.execute",
    "session.resume",
    "approval.bidirectional",
    "telemetry.usage.provider-owned",
  ],
};

export interface CodexAppServerLaunchSpec {
  command: "codex";
  args: readonly ["app-server", "--stdio"];
  transport: "stdio-jsonl";
}

export const CODEX_APP_SERVER_LAUNCH: CodexAppServerLaunchSpec = {
  command: "codex",
  args: ["app-server", "--stdio"],
  transport: "stdio-jsonl",
};

export interface CodexInitializeRequest {
  method: "initialize";
  id: number;
  params: {
    clientInfo: {
      name: "livariant";
      title: "Livariant";
      version: string;
    };
  };
}

export interface CodexInitializedNotification {
  method: "initialized";
  params: Record<string, never>;
}

export function createCodexInitializeRequest(clientVersion: string, id = 0): CodexInitializeRequest {
  if (clientVersion.trim().length === 0) {
    throw new Error("Livariant client version must not be blank.");
  }
  if (!Number.isSafeInteger(id) || id < 0) {
    throw new Error("Codex initialize request id must be a non-negative safe integer.");
  }

  return {
    method: "initialize",
    id,
    params: {
      clientInfo: {
        name: "livariant",
        title: "Livariant",
        version: clientVersion,
      },
    },
  };
}

export function createCodexInitializedNotification(): CodexInitializedNotification {
  return { method: "initialized", params: {} };
}

export interface CodexTokenUsageBreakdown {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  cacheWriteInputTokens?: number;
}

export interface CodexUsageSnapshot {
  source: {
    kind: "provider-runtime";
    id: "openai.codex.app-server.thread-token-usage";
    version: string;
  };
  threadId: string;
  turnId: string;
  last: CodexTokenUsageBreakdown;
  total: CodexTokenUsageBreakdown;
  modelContextWindow?: number;
  emittedAtMs?: number;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-blank string.`);
  }
  return value;
}

function requireTokenCount(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${field} must be a non-negative safe integer.`);
  }
  return value as number;
}

function optionalTokenCount(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return requireTokenCount(value, field);
}

function parseBreakdown(value: unknown, field: string): CodexTokenUsageBreakdown {
  if (!isObject(value)) {
    throw new Error(`${field} must be an object.`);
  }

  const cacheWriteInputTokens = optionalTokenCount(value.cacheWriteInputTokens, `${field}.cacheWriteInputTokens`);
  return {
    inputTokens: requireTokenCount(value.inputTokens, `${field}.inputTokens`),
    cachedInputTokens: requireTokenCount(value.cachedInputTokens, `${field}.cachedInputTokens`),
    outputTokens: requireTokenCount(value.outputTokens, `${field}.outputTokens`),
    reasoningOutputTokens: requireTokenCount(value.reasoningOutputTokens, `${field}.reasoningOutputTokens`),
    totalTokens: requireTokenCount(value.totalTokens, `${field}.totalTokens`),
    ...(cacheWriteInputTokens === undefined ? {} : { cacheWriteInputTokens }),
  };
}

export function parseCodexAppServerLine(line: string): JsonObject {
  if (line.trim().length === 0) {
    throw new Error("Codex App Server line must not be blank.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    throw new Error("Codex App Server emitted malformed JSON.");
  }

  if (!isObject(parsed)) {
    throw new Error("Codex App Server message must be a JSON object.");
  }
  return parsed;
}

/**
 * Extracts provider/runtime-owned usage only from the dedicated Codex App Server
 * `thread/tokenUsage/updated` notification. Ordinary assistant text, tool output,
 * turn summaries, or model-authored token claims are intentionally ignored.
 *
 * The returned value is a snapshot, not yet a Livariant DiagnosticEvent. The
 * caller must deduplicate/sequence snapshots before deriving additive events.
 */
export function extractCodexUsageSnapshot(
  message: JsonObject,
  appServerVersion: string,
): CodexUsageSnapshot | undefined {
  if (message.method !== "thread/tokenUsage/updated") {
    return undefined;
  }
  if (appServerVersion.trim().length === 0) {
    throw new Error("Codex App Server version must not be blank for usage provenance.");
  }
  if (!isObject(message.params)) {
    throw new Error("Codex token usage notification params must be an object.");
  }

  const params = message.params;
  if (!isObject(params.tokenUsage)) {
    throw new Error("Codex token usage payload must be an object.");
  }

  const usage = params.tokenUsage;
  const modelContextWindow = optionalTokenCount(usage.modelContextWindow, "tokenUsage.modelContextWindow");
  const emittedAtMs = optionalTokenCount(message.emittedAtMs, "emittedAtMs");

  return {
    source: {
      kind: "provider-runtime",
      id: "openai.codex.app-server.thread-token-usage",
      version: appServerVersion,
    },
    threadId: requireString(params.threadId, "threadId"),
    turnId: requireString(params.turnId, "turnId"),
    last: parseBreakdown(usage.last, "tokenUsage.last"),
    total: parseBreakdown(usage.total, "tokenUsage.total"),
    ...(modelContextWindow === undefined ? {} : { modelContextWindow }),
    ...(emittedAtMs === undefined ? {} : { emittedAtMs }),
  };
}
