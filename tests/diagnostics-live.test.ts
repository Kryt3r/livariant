import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { aggregateDiagnosticEvents } from "../src/diagnostics/efficiency.js";
import { CodexUsageSequencer } from "../src/diagnostics/codex-usage.js";
import { DiagnosticEventStore } from "../src/diagnostics/store.js";
import type { CodexUsageSnapshot } from "../src/connectors/codex-app-server.js";

function snapshot(total: { inputTokens: number; cachedInputTokens: number; outputTokens: number; reasoningOutputTokens: number; totalTokens: number; cacheWriteInputTokens?: number }): CodexUsageSnapshot {
  return {
    source: { kind: "provider-runtime", id: "openai.codex.app-server.thread-token-usage", version: "0.142.4" },
    threadId: "thread-1",
    turnId: "turn-1",
    last: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0, totalTokens: 2 },
    total,
  };
}

test("Codex cumulative usage baselines, deduplicates, emits positive deltas and re-baselines regressions", () => {
  const sequencer = new CodexUsageSequencer();
  assert.equal(sequencer.accept(snapshot({ inputTokens: 100, cachedInputTokens: 40, outputTokens: 20, reasoningOutputTokens: 5, totalTokens: 125 })).kind, "baseline");
  assert.equal(sequencer.accept(snapshot({ inputTokens: 100, cachedInputTokens: 40, outputTokens: 20, reasoningOutputTokens: 5, totalTokens: 125 })).kind, "duplicate");
  const result = sequencer.accept(snapshot({ inputTokens: 130, cachedInputTokens: 50, outputTokens: 27, reasoningOutputTokens: 8, totalTokens: 165 }));
  assert.equal(result.kind, "delta");
  if (result.kind === "delta") {
    assert.deepEqual(result.event.usage, { inputTokens: 30, cacheReadTokens: 10, outputTokens: 7, reasoningTokens: 3, totalTokens: 40 });
    assert.equal(result.event.source.kind, "runtime");
    assert.equal(result.event.attribution?.sessionId, "thread-1");
  }
  assert.equal(sequencer.accept(snapshot({ inputTokens: 4, cachedInputTokens: 1, outputTokens: 2, reasoningOutputTokens: 0, totalTokens: 6 })).kind, "reset");
  assert.equal(sequencer.accept(snapshot({ inputTokens: 7, cachedInputTokens: 1, outputTokens: 3, reasoningOutputTokens: 0, totalTokens: 10 })).kind, "delta");
});

test("newly appearing optional cache-write data is not fabricated from zero", () => {
  const sequencer = new CodexUsageSequencer();
  sequencer.accept(snapshot({ inputTokens: 10, cachedInputTokens: 2, outputTokens: 2, reasoningOutputTokens: 0, totalTokens: 12 }));
  const result = sequencer.accept(snapshot({ inputTokens: 12, cachedInputTokens: 3, outputTokens: 3, reasoningOutputTokens: 0, totalTokens: 15, cacheWriteInputTokens: 4 }));
  assert.equal(result.kind, "delta");
  if (result.kind === "delta") assert.equal(result.event.usage.cacheWriteTokens, undefined);
});

test("provider-owned Codex deltas persist canonically without raw content and aggregate as Observed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "livariant-live-diagnostics-"));
  try {
    const store = new DiagnosticEventStore(directory);
    const sequencer = new CodexUsageSequencer();
    sequencer.accept(snapshot({ inputTokens: 20, cachedInputTokens: 5, outputTokens: 4, reasoningOutputTokens: 1, totalTokens: 25 }));
    const result = sequencer.accept(snapshot({ inputTokens: 32, cachedInputTokens: 7, outputTokens: 8, reasoningOutputTokens: 2, totalTokens: 40 }));
    assert.equal(result.kind, "delta");
    if (result.kind !== "delta") return;
    await store.append({ ...result.event, prompt: "must not persist", projectContent: "must not persist" } as typeof result.event);
    const raw = await readFile(store.path, "utf8");
    assert.doesNotMatch(raw, /must not persist/);
    const aggregate = aggregateDiagnosticEvents(await store.readAll());
    assert.equal(aggregate.observed.eventCount, 1);
    assert.equal(aggregate.observed.inputTokens, 12);
    assert.equal(aggregate.observed.cacheReadTokens, 2);
    assert.equal(aggregate.observed.outputTokens, 4);
    assert.equal(aggregate.observed.reasoningTokens, 1);
    assert.equal(aggregate.observed.totalTokens, 15);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
