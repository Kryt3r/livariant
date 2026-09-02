import assert from "node:assert/strict";
import test from "node:test";
import { aggregateObservedAttribution } from "../src/diagnostics/attribution.js";
import type { DiagnosticEvent } from "../src/diagnostics/efficiency.js";

const events: DiagnosticEvent[] = [
  {
    id: "codex-1",
    kind: "observed",
    timestamp: "2026-09-01T10:00:00.000Z",
    source: { kind: "runtime", id: "codex-app-server", version: "1" },
    attribution: { provider: "openai-codex", sessionId: "thread-a", taskId: "turn-a" },
    usage: { totalTokens: 120 },
  },
  {
    id: "codex-2",
    kind: "observed",
    timestamp: "2026-09-01T11:00:00.000Z",
    source: { kind: "runtime", id: "codex-app-server", version: "1" },
    attribution: { provider: "openai-codex", sessionId: "thread-a", taskId: "turn-b" },
    usage: { totalTokens: 80 },
  },
  {
    id: "provider-with-model",
    kind: "observed",
    timestamp: "2026-09-01T12:00:00.000Z",
    source: { kind: "provider", id: "provider-usage", version: "1" },
    attribution: { provider: "example", model: "model-a", projectId: "project-1" },
    usage: { inputTokens: 10 },
  },
  {
    id: "outside-range",
    kind: "observed",
    timestamp: "2026-08-01T12:00:00.000Z",
    source: { kind: "provider", id: "provider-usage", version: "1" },
    attribution: { provider: "old-provider" },
    usage: { totalTokens: 999 },
  },
];

test("observed attribution groups only retained evidence and preserves missing dimensions", () => {
  const result = aggregateObservedAttribution(events, {
    start: "2026-09-01T00:00:00.000Z",
    end: "2026-09-02T00:00:00.000Z",
  });

  assert.equal(result.provider.attributedEventCount, 3);
  assert.equal(result.provider.unattributedEventCount, 0);
  assert.deepEqual(result.provider.groups[0], {
    value: "openai-codex",
    eventCount: 2,
    totalTokens: 200,
    knownTotalTokenEvents: 2,
    unknownTotalTokenEvents: 0,
  });
  assert.equal(result.model.attributedEventCount, 1);
  assert.equal(result.model.unattributedEventCount, 2);
  assert.equal(result.model.groups[0]?.value, "model-a");
  assert.equal(result.projectId.attributedEventCount, 1);
  assert.equal(result.sessionId.attributedEventCount, 2);
  assert.equal(result.taskId.attributedEventCount, 2);
  assert.equal(result.provider.groups.some((group) => group.value === "old-provider"), false);
});

test("missing total-token evidence is counted as unknown instead of inferred", () => {
  const result = aggregateObservedAttribution([events[2]!]);
  const group = result.provider.groups[0]!;

  assert.equal(group.totalTokens, 0);
  assert.equal(group.knownTotalTokenEvents, 0);
  assert.equal(group.unknownTotalTokenEvents, 1);
});

test("attribution ranges stay start-inclusive and end-exclusive", () => {
  const result = aggregateObservedAttribution(events, {
    start: "2026-09-01T10:00:00.000Z",
    end: "2026-09-01T11:00:00.000Z",
  });

  assert.equal(result.provider.groups.length, 1);
  assert.equal(result.provider.groups[0]?.eventCount, 1);
  assert.equal(result.provider.groups[0]?.totalTokens, 120);
});
