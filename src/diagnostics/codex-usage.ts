import { randomUUID } from "node:crypto";
import type { CodexTokenUsageBreakdown, CodexUsageSnapshot } from "../connectors/codex-app-server.js";
import type { ObservedDiagnosticEvent, ObservedTokenUsage } from "./efficiency.js";

export type CodexUsageSequenceResult =
  | { kind: "baseline" }
  | { kind: "duplicate" }
  | { kind: "reset" }
  | { kind: "delta"; event: ObservedDiagnosticEvent };

const ZERO_BREAKDOWN: CodexTokenUsageBreakdown = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningOutputTokens: 0,
  totalTokens: 0,
};

function regressed(previous: CodexTokenUsageBreakdown, current: CodexTokenUsageBreakdown): boolean {
  return current.inputTokens < previous.inputTokens
    || current.cachedInputTokens < previous.cachedInputTokens
    || current.outputTokens < previous.outputTokens
    || current.reasoningOutputTokens < previous.reasoningOutputTokens
    || current.totalTokens < previous.totalTokens
    || (previous.cacheWriteInputTokens !== undefined
      && current.cacheWriteInputTokens !== undefined
      && current.cacheWriteInputTokens < previous.cacheWriteInputTokens);
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

  /**
   * Zero is a valid baseline only for a thread Livariant has just created via a
   * successful `thread/start`. Resumed/external threads must use first-snapshot
   * baselining because their earlier cumulative usage is not attributable to
   * the current Livariant observation window.
   */
  markNewThread(threadId: string): void {
    if (!threadId.trim()) throw new Error("Codex new thread id must not be blank.");
    this.#byThread.set(threadId, { ...ZERO_BREAKDOWN });
  }

  accept(snapshot: CodexUsageSnapshot, observedAt = new Date().toISOString()): CodexUsageSequenceResult {
    const previous = this.#byThread.get(snapshot.threadId);
    this.#byThread.set(snapshot.threadId, { ...snapshot.total });
    if (previous === undefined) return { kind: "baseline" };
    if (regressed(previous, snapshot.total)) return { kind: "reset" };
    if (same(previous, snapshot.total)) return { kind: "duplicate" };
    return {
      kind: "delta",
      event: {
        id: `codex-observed:${randomUUID()}`,
        kind: "observed",
        timestamp: new Date(observedAt).toISOString(),
        source: { kind: "runtime", id: snapshot.source.id, version: snapshot.source.version },
        attribution: { provider: "openai-codex", sessionId: snapshot.threadId, taskId: snapshot.turnId },
        usage: delta(previous, snapshot.total),
      },
    };
  }

  reset(threadId?: string): void {
    if (threadId === undefined) this.#byThread.clear();
    else this.#byThread.delete(threadId);
  }
}
