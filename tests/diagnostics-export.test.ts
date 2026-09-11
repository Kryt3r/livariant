import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildDiagnosticEvidenceExport,
  DIAGNOSTIC_EXPORT_EVENT_LIMIT,
} from "../src/diagnostics/export.js";
import type { DiagnosticEvent } from "../src/diagnostics/efficiency.js";

const events: DiagnosticEvent[] = [
  {
    id: "internal-event-id-observed",
    kind: "observed",
    timestamp: "2026-09-11T12:00:00.000Z",
    source: { kind: "runtime", id: "openai.codex.app-server.thread-token-usage", version: "1.2.3" },
    attribution: { provider: "openai-codex", sessionId: "thread-1", taskId: "turn-1" },
    usage: {
      inputTokens: 100,
      cacheReadTokens: 25,
      outputTokens: 30,
      reasoningTokens: 10,
      totalTokens: 165,
    },
  },
  {
    id: "internal-event-id-avoided",
    kind: "avoided",
    timestamp: "2026-09-11T12:01:00.000Z",
    metric: "context-tokens",
    consideredTokens: 1000,
    usedTokens: 300,
    reason: "Qualified context selection avoided retransmission.",
  },
  {
    id: "internal-event-id-estimated",
    kind: "estimated",
    timestamp: "2026-09-11T12:02:00.000Z",
    estimatedTokens: 500,
    method: { id: "controlled-comparison", version: "1" },
    confidence: "medium",
    reason: "Modeled comparison fixture.",
  },
  {
    id: "outside-range",
    kind: "observed",
    timestamp: "2026-09-09T12:00:00.000Z",
    source: { kind: "provider", id: "other-provider", version: "9" },
    usage: { totalTokens: 9999 },
  },
];

test("diagnostics export preserves measurement classes and bounded provider-owned evidence", () => {
  const evidence = buildDiagnosticEvidenceExport(events, {
    preset: "1d",
    range: { start: "2026-09-11T00:00:00.000Z", end: "2026-09-12T00:00:00.000Z" },
    coreVersion: "0.1.0-rc.12",
    generatedAt: "2026-09-11T13:00:00.000Z",
  });

  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.kind, "livariant-diagnostics-evidence-export");
  assert.equal(evidence.coreVersion, "0.1.0-rc.12");
  assert.equal(evidence.aggregate.eventCount, 3);
  assert.equal(evidence.aggregate.observed.totalTokens, 165);
  assert.equal(evidence.aggregate.avoided.contextTokens, 700);
  assert.equal(evidence.aggregate.estimated.tokens, 500);
  assert.equal(evidence.evidenceSources.length, 1);
  assert.deepEqual(evidence.evidenceSources[0], {
    kind: "runtime",
    id: "openai.codex.app-server.thread-token-usage",
    version: "1.2.3",
    eventCount: 1,
  });
  assert.deepEqual(evidence.eventWindow, {
    first: "2026-09-11T12:00:00.000Z",
    last: "2026-09-11T12:02:00.000Z",
  });
  assert.equal(evidence.events.length, 3);
  assert.equal(evidence.eventExport.truncated, false);
  assert.equal(evidence.measurementSemantics.observed, "provider-or-runtime-owned-evidence");
  assert.equal(evidence.boundaries.modelAuthoredUsageAcceptedAsObserved, false);
  assert.equal(evidence.boundaries.exportGrantsAuthority, false);
  assert.equal(evidence.privacy.appCredentialStateIncluded, false);
  assert.equal(evidence.privacy.freeformReasonsIncluded, false);

  const serialized = JSON.stringify(evidence);
  assert.doesNotMatch(serialized, /internal-event-id/);
  assert.doesNotMatch(serialized, /outside-range/);
  assert.doesNotMatch(serialized, /other-provider/);
  assert.doesNotMatch(serialized, /Qualified context selection/);
  assert.doesNotMatch(serialized, /Modeled comparison fixture/);
});

test("diagnostics export reports explicit truncation while aggregates still cover all matching events", () => {
  const many: DiagnosticEvent[] = Array.from({ length: DIAGNOSTIC_EXPORT_EVENT_LIMIT + 2 }, (_, index) => ({
    id: `observed-${index}`,
    kind: "observed" as const,
    timestamp: new Date(Date.UTC(2026, 8, 11, 0, 0, index % 60)).toISOString(),
    source: { kind: "runtime" as const, id: "fixture-runtime", version: "1" },
    usage: { totalTokens: 1 },
  }));

  const evidence = buildDiagnosticEvidenceExport(many, {
    preset: "all",
    range: {},
    coreVersion: "0.1.0-rc.12",
    generatedAt: "2026-09-11T13:00:00.000Z",
  });

  assert.equal(evidence.aggregate.eventCount, DIAGNOSTIC_EXPORT_EVENT_LIMIT + 2);
  assert.equal(evidence.aggregate.observed.totalTokens, DIAGNOSTIC_EXPORT_EVENT_LIMIT + 2);
  assert.equal(evidence.eventExport.totalMatchingEvents, DIAGNOSTIC_EXPORT_EVENT_LIMIT + 2);
  assert.equal(evidence.eventExport.exportedEvents, DIAGNOSTIC_EXPORT_EVENT_LIMIT);
  assert.equal(evidence.events.length, DIAGNOSTIC_EXPORT_EVENT_LIMIT);
  assert.equal(evidence.eventExport.truncated, true);
});

test("diagnostics export uses chronological event bounds rather than timestamp text ordering", () => {
  const offsetEvents: DiagnosticEvent[] = [
    {
      id: "later",
      kind: "observed",
      timestamp: "2026-09-11T13:00:00+02:00",
      source: { kind: "runtime", id: "fixture", version: "1" },
      usage: { totalTokens: 1 },
    },
    {
      id: "earlier",
      kind: "observed",
      timestamp: "2026-09-11T10:30:00Z",
      source: { kind: "runtime", id: "fixture", version: "1" },
      usage: { totalTokens: 1 },
    },
  ];

  const evidence = buildDiagnosticEvidenceExport(offsetEvents, {
    preset: "all",
    range: {},
    coreVersion: "0.1.0-rc.12",
    generatedAt: "2026-09-11T13:00:00.000Z",
  });

  assert.deepEqual(evidence.eventWindow, {
    first: "2026-09-11T10:30:00Z",
    last: "2026-09-11T13:00:00+02:00",
  });
});

test("diagnostics export rejects missing provenance version", () => {
  assert.throws(() => buildDiagnosticEvidenceExport([], {
    preset: "all",
    range: {},
    coreVersion: "   ",
  }), /coreVersion must not be blank/);
});

test("desktop diagnostics export reuses the canonical Core contract through the existing connector host", async () => {
  const nodeHost = await readFile("src/connectors/desktop-connector-host.ts", "utf8");
  const rustHost = await readFile("apps/desktop/src-tauri/src/connector_host.rs", "utf8");
  const lib = await readFile("apps/desktop/src-tauri/src/lib.rs", "utf8");

  assert.match(nodeHost, /buildDiagnosticEvidenceExport/);
  assert.match(nodeHost, /method: "inspect" \| "connect" \| "disconnect" \| "diagnostics" \| "export" \| "measure"/);
  assert.match(nodeHost, /request\.method === "export"/);
  assert.match(rustHost, /pub fn codex_diagnostics_export/);
  assert.match(rustHost, /request\(&app, &state, "export", None, preset\)/);
  assert.match(lib, /connector_host::codex_diagnostics_export/);
});
