import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { DiagnosticEventStore } from "../dist/src/diagnostics/store.js";
import { aggregateDiagnosticEvents, diagnosticRangeForPreset } from "../dist/src/diagnostics/efficiency.js";
import { aggregateObservedAttribution } from "../dist/src/diagnostics/attribution.js";

const BENCHMARK_SCHEMA_VERSION = 1;
const FIXED_NOW = new Date("2026-09-01T12:00:00.000Z");
const DEFAULT_TIERS = [100, 1_000, 10_000, 50_000];
const DAY_MS = 86_400_000;

function requireSourceSha() {
  const value = process.env.LIVARIANT_BENCHMARK_SOURCE_SHA?.trim().toLowerCase();
  if (!value || !/^[0-9a-f]{40}$/u.test(value)) {
    throw new Error("LIVARIANT_BENCHMARK_SOURCE_SHA must be an exact 40-character Git SHA.");
  }
  return value;
}

function parseTiers() {
  const configured = process.env.LIVARIANT_DIAGNOSTICS_BENCHMARK_TIERS?.trim();
  if (!configured) return DEFAULT_TIERS;
  const tiers = configured.split(",").map((part) => Number.parseInt(part.trim(), 10));
  if (tiers.length === 0 || tiers.some((value) => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error("LIVARIANT_DIAGNOSTICS_BENCHMARK_TIERS must be a comma-separated list of positive safe integers.");
  }
  return tiers;
}

function timestampFor(index) {
  const dayOffset = index % 120;
  const secondOffset = index % 86_400;
  return new Date(FIXED_NOW.getTime() - dayOffset * DAY_MS - secondOffset * 1_000).toISOString();
}

function eventFor(index) {
  const base = {
    id: `benchmark-${String(index).padStart(8, "0")}`,
    timestamp: timestampFor(index),
    attribution: {
      provider: index % 2 === 0 ? "codex" : "runtime",
      model: index % 4 === 0 ? "benchmark-model-a" : "benchmark-model-b",
      projectId: `project-${index % 8}`,
      sessionId: `session-${index % 32}`,
      taskId: `task-${index % 128}`,
    },
  };
  if (index % 3 === 0) {
    return {
      ...base,
      kind: "observed",
      source: { kind: "provider", id: "codex", version: "benchmark" },
      usage: {
        inputTokens: 100 + (index % 500),
        outputTokens: 20 + (index % 100),
        cacheReadTokens: index % 50,
        reasoningTokens: index % 80,
        ...(index % 5 === 0 ? {} : { totalTokens: 150 + (index % 700) }),
      },
    };
  }
  if (index % 3 === 1) {
    const usedTokens = 200 + (index % 300);
    return {
      ...base,
      kind: "avoided",
      metric: "context-tokens",
      consideredTokens: usedTokens + 500 + (index % 1_000),
      usedTokens,
      reason: "deterministic benchmark fixture",
    };
  }
  return {
    ...base,
    kind: "estimated",
    estimatedTokens: 50 + (index % 400),
    method: { id: "benchmark-estimator", version: "1" },
    confidence: ["low", "medium", "high"][index % 3],
    reason: "deterministic benchmark fixture",
  };
}

function envelopeLine(index) {
  return JSON.stringify({ schemaVersion: 1, event: eventFor(index) });
}

function memorySnapshot() {
  const usage = process.memoryUsage();
  return {
    rssBytes: usage.rss,
    heapUsedBytes: usage.heapUsed,
    heapTotalBytes: usage.heapTotal,
    externalBytes: usage.external,
  };
}

function elapsed(start) {
  return Number((performance.now() - start).toFixed(3));
}

function measureSummary(events, range) {
  const aggregateStart = performance.now();
  const aggregate = aggregateDiagnosticEvents(events, range);
  const aggregateMs = elapsed(aggregateStart);
  const attributionStart = performance.now();
  const attribution = aggregateObservedAttribution(events, range);
  const attributionMs = elapsed(attributionStart);
  return {
    aggregate,
    attribution,
    aggregateMs,
    attributionMs,
    totalMs: Number((aggregateMs + attributionMs).toFixed(3)),
  };
}

async function runTier(eventCount) {
  const directory = await mkdtemp(resolve(tmpdir(), "livariant-diagnostics-growth-"));
  try {
    const path = resolve(directory, "diagnostic-events.jsonl");
    const lines = Array.from({ length: eventCount }, (_, index) => envelopeLine(index));
    await writeFile(path, `${lines.join("\n")}\n`, "utf8");
    const fileStats = await stat(path);
    const store = new DiagnosticEventStore(directory);

    const memoryBeforeRead = memorySnapshot();
    const readStart = performance.now();
    const events = await store.readAll();
    const readParseMs = elapsed(readStart);
    const memoryAfterRead = memorySnapshot();

    if (events.length !== eventCount) {
      throw new Error(`Benchmark parser returned ${events.length} events for a ${eventCount}-event fixture.`);
    }

    const shortRange = diagnosticRangeForPreset("7d", FIXED_NOW);
    const shortSummary = measureSummary(events, shortRange);
    const allSummary = measureSummary(events, {});
    const memoryAfterSummaries = memorySnapshot();

    if (allSummary.aggregate.eventCount !== eventCount) {
      throw new Error(`All-history aggregate returned ${allSummary.aggregate.eventCount} events for ${eventCount} parsed events.`);
    }

    return {
      eventCount,
      evidenceBytes: fileStats.size,
      readParseMs,
      shortRange: {
        preset: "7d",
        matchedEvents: shortSummary.aggregate.eventCount,
        aggregateMs: shortSummary.aggregateMs,
        attributionMs: shortSummary.attributionMs,
        totalSummaryMs: shortSummary.totalMs,
      },
      allHistory: {
        matchedEvents: allSummary.aggregate.eventCount,
        aggregateMs: allSummary.aggregateMs,
        attributionMs: allSummary.attributionMs,
        totalSummaryMs: allSummary.totalMs,
      },
      memorySnapshots: {
        beforeRead: memoryBeforeRead,
        afterRead: memoryAfterRead,
        afterSummaries: memoryAfterSummaries,
        note: "Point-in-time Node process memory snapshots; not a peak-memory measurement.",
      },
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function runDiagnosticsHistoryGrowthBenchmark() {
  const sourceSha = requireSourceSha();
  const tiers = parseTiers();
  const results = [];
  for (const tier of tiers) results.push(await runTier(tier));
  return {
    schemaVersion: BENCHMARK_SCHEMA_VERSION,
    benchmark: "diagnostics-history-growth",
    sourceSha,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    fixture: {
      fixedNow: FIXED_NOW.toISOString(),
      tiers,
      storageSchemaVersion: 1,
      parser: "DiagnosticEventStore.readAll canonical JSONL parser/validator",
      summary: "aggregateDiagnosticEvents + aggregateObservedAttribution",
    },
    results,
    interpretation: "Measures deterministic Diagnostics history read/parse and summary scaling for this Livariant source. It is not a universal user-visible latency claim or an acceptance budget.",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await runDiagnosticsHistoryGrowthBenchmark();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
