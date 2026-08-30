import { randomUUID } from "node:crypto";
import type { CodexTokenUsageBreakdown, CodexUsageSnapshot } from "../connectors/codex-app-server.js";
import type { ObservedDiagnosticEvent, ObservedTokenUsage } from "./efficiency.js";

export type CodexUsageSequenceResult =
  | { kind: "baseline" }
  | { kind: "duplicate" }
  | { kind: "reset" }
  | { kind: "delta"; event: ObservedDiagnosticEvent };

const REQUIRED_FIELDS = ["inputTokens", "cachedInputTokens", "outputTokens", "reasoningOutputTokens", "totalTokens"] as const;

type BreakdownField = (typeof REQUIRED_FIELDS)[number] | "cacheWriteInputTokens";

function knownFields(value: CodexTokenUsageBreakdown): BreakdownField[] {
  return value.cacheWriteInputTokens === undefined ? [...REQUIRED_FIELDS] : [...REQUIRED_FIELDS, "cacheWriteInputTokens"];
}
function regressed(previous: CodexTokenUsageBreakdown, current: CodexTokenUsageBreakdown): boolean {
  for (const field of knownFields(previous)) {
    const before = previous[field];
    const after = current[field];
    if (before !== undefined && after !== undefined && after < before) return true;
  }
  return false;
}
function same(previous: CodexTokenUsageBreakdown, current: CodexTokenUsageBreakdown): boolean {
  return previous.inputTokens === current.inputTokens
    && previous.cachedInputTokens === current.cachedInputTokens
    && previous.outputTokens === current.outputTokens
    && previous.reasoningOutputTokens === current.reasoningOutputTokens
    && previous.totalTokens === current.totalTokens
    && previous.cacheWriteInputTokens === current.cacheWriteInputTokens;
}
function delta(previous: CodexTokenUsageBreakdown, current: CodexTokenUsageBreakdown): ObservedTokenUsage {
  const usage: ObservedTokenUsage = {
    inputTokens: current.inputTokens - previous.inputTokens,
    cacheReadTokens: current.cachedInputTokens - previous.cachedInputTokens,
    outputTokens: current.outputTokens - previous.outputTokens,
    reasoningTokens: current.reasoningOutputTokens - previous.reasoningOutputTokens,
    totalTokens: current.totalTokens - previous.totalTokens,
  };
  if (previous.cacheWriteInputTokens !== undefined && current.cacheWriteInputTokens !== undefined) {
    usage.cacheWriteTokens = current.cacheWriteInputTokens - previous.cacheWriteInputTokens;
  }
  return usage;
}

export class CodexUsageSequencer {
  readonly #byThread = new Map<string, CodexTokenUsageBreakdown>();

  accept(snapshot: CodexUsageSnapshot, observedAt = new Date().toISOString()): CodexUsageSequenceResult {
    const previous = this.#byThread.get(snapshot.threadId);
    this.#byThread.set(snapshot.threadId, { ...snapshot.total });
    if (previous === undefined) return { kind: "baseline" };
    if (regressed(previous, snapshot.total)) return { kind: "reset" };
    if (same(previous, snapshot.total)) return { kind: "duplicate" };

    const event: ObservedDiagnosticEvent = {
      id: `codex-observed:${randomUUID()}`,
      kind: "observed",
      timestamp: new Date(observedAt).toISOString(),
      source: {
        kind: "runtime",
        id: snapshot.source.id,
        version: snapshot.source.version,
      },
      attribution: {
        provider: "openai-codex",
        sessionId: snapshot.threadId,
        taskId: snapshot.turnId,
      },
      usage: delta(previous, snapshot.total),
    };
    return { kind: "delta", event };
  }

  reset(threadId?: string): void {
    if (threadId === undefined) this.#byThread.clear();
    else this.#byThread.delete(threadId);
  }
}
