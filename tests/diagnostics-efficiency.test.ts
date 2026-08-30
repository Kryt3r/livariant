import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateDiagnosticEvents,
  diagnosticRangeForPreset,
  type DiagnosticEvent,
  validateDiagnosticEvent,
} from "../src/diagnostics/efficiency.js";

const events: DiagnosticEvent[] = [
  {
    id: "observed-complete",
    kind: "observed",
    timestamp: "2026-08-30T08:00:00.000Z",
    attribution: { provider: "example", model: "model-a", projectId: "project-1" },
    usage: { inputTokens: 100, outputTokens: 25, cacheReadTokens: 40 },
  },
  {
    id: "observed-missing",
    kind: "observed",
    timestamp: "2026-08-30T09:00:00.000Z",
    usage: {},
  },
  {
    id: "avoided-context",
    kind: "avoided",
    timestamp: "2026-08-30T10:00:00.000Z",
    metric: "context-tokens",
    consideredTokens: 1000,
    usedTokens: 250,
    reason: "Only task-relevant project context was selected.",
  },
  {
    id: "estimated-high",
    kind: "estimated",
    timestamp: "2026-08-30T11:00:00.000Z",
    estimatedTokens: 300,
    method: { id: "retry-counterfactual", version: "1" },
    confidence: "high",
    reason: "A previously verified result avoided a likely repeated analysis pass.",
  },
  {
    id: "estimated-v2",
    kind: "estimated",
    timestamp: "2026-08-30T11:30:00.000Z",
    estimatedTokens: 120,
    method: { id: "retry-counterfactual", version: "2" },
    confidence: "medium",
    reason: "Newer estimator methodology remains historically distinguishable.",
  },
];

test("aggregation preserves observed, avoided and estimated categories", () => {
  const result = aggregateDiagnosticEvents(events);

  assert.equal(result.eventCount, 5);
  assert.deepEqual(result.observed, {
    eventCount: 2,
    inputTokens: 100,
    outputTokens: 25,
    cacheReadTokens: 40,
    cacheWriteTokens: 0,
    knownFieldCount: 3,
    unknownFieldCount: 5,
  });
  assert.deepEqual(result.avoided, {
    eventCount: 1,
    contextTokens: 750,
  });
  assert.equal(result.estimated.tokens, 420);
  assert.deepEqual(result.estimated.byConfidence, { low: 0, medium: 120, high: 300 });
  assert.deepEqual(result.estimated.byMethod, {
    "retry-counterfactual@1": 300,
    "retry-counterfactual@2": 120,
  });
});

test("missing observed token fields remain unknown rather than becoming observed zeroes", () => {
  const result = aggregateDiagnosticEvents([events[1]!]);

  assert.equal(result.observed.eventCount, 1);
  assert.equal(result.observed.knownFieldCount, 0);
  assert.equal(result.observed.unknownFieldCount, 4);
  assert.equal(result.observed.inputTokens, 0);
  assert.equal(result.observed.outputTokens, 0);
});

test("custom ranges are start-inclusive and end-exclusive", () => {
  const range = {
    start: "2026-08-30T09:00:00.000Z",
    end: "2026-08-30T11:00:00.000Z",
  };
  const result = aggregateDiagnosticEvents(events, range);

  assert.equal(result.eventCount, 2);
  assert.equal(result.observed.eventCount, 1);
  assert.equal(result.avoided.contextTokens, 750);
  assert.equal(result.estimated.eventCount, 0);
});

test("preset ranges support the requested 1/7/30/90 day windows and all time", () => {
  const now = "2026-08-30T12:00:00.000Z";

  assert.deepEqual(diagnosticRangeForPreset("1d", now), {
    start: "2026-08-29T12:00:00.000Z",
    end: now,
  });
  assert.equal(Date.parse(diagnosticRangeForPreset("7d", now).start!), Date.parse(now) - 7 * 86400000);
  assert.equal(Date.parse(diagnosticRangeForPreset("30d", now).start!), Date.parse(now) - 30 * 86400000);
  assert.equal(Date.parse(diagnosticRangeForPreset("90d", now).start!), Date.parse(now) - 90 * 86400000);
  assert.deepEqual(diagnosticRangeForPreset("all", now), {});
});

test("invalid avoided comparisons and unversioned estimates fail closed", () => {
  assert.throws(
    () =>
      validateDiagnosticEvent({
        id: "bad-avoided",
        kind: "avoided",
        timestamp: "2026-08-30T10:00:00.000Z",
        metric: "context-tokens",
        consideredTokens: 10,
        usedTokens: 11,
        reason: "Impossible comparison",
      }),
    /must not exceed/i,
  );

  assert.throws(
    () =>
      validateDiagnosticEvent({
        id: "bad-estimate",
        kind: "estimated",
        timestamp: "2026-08-30T10:00:00.000Z",
        estimatedTokens: 10,
        method: { id: "counterfactual", version: "" },
        confidence: "low",
        reason: "Missing method version",
      }),
    /method id and version/i,
  );
});
