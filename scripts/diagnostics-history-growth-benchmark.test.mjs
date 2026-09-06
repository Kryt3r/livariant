import assert from "node:assert/strict";
import test from "node:test";
import { runDiagnosticsHistoryGrowthBenchmark } from "./diagnostics-history-growth-benchmark.mjs";

const SOURCE_SHA = "0123456789abcdef0123456789abcdef01234567";

test("diagnostics history benchmark emits source-bound deterministic fixture metadata", async () => {
  const previousSha = process.env.LIVARIANT_BENCHMARK_SOURCE_SHA;
  const previousTiers = process.env.LIVARIANT_DIAGNOSTICS_BENCHMARK_TIERS;
  process.env.LIVARIANT_BENCHMARK_SOURCE_SHA = SOURCE_SHA;
  process.env.LIVARIANT_DIAGNOSTICS_BENCHMARK_TIERS = "12,48";
  try {
    const result = await runDiagnosticsHistoryGrowthBenchmark();
    assert.equal(result.schemaVersion, 1);
    assert.equal(result.benchmark, "diagnostics-history-growth");
    assert.equal(result.sourceSha, SOURCE_SHA);
    assert.deepEqual(result.fixture.tiers, [12, 48]);
    assert.equal(result.results.length, 2);
    assert.deepEqual(result.results.map((entry) => entry.eventCount), [12, 48]);
    for (const entry of result.results) {
      assert.ok(entry.evidenceBytes > 0);
      assert.ok(entry.readParseMs >= 0);
      assert.equal(entry.allHistory.matchedEvents, entry.eventCount);
      assert.ok(entry.shortRange.matchedEvents < entry.eventCount);
    }
  } finally {
    if (previousSha === undefined) delete process.env.LIVARIANT_BENCHMARK_SOURCE_SHA;
    else process.env.LIVARIANT_BENCHMARK_SOURCE_SHA = previousSha;
    if (previousTiers === undefined) delete process.env.LIVARIANT_DIAGNOSTICS_BENCHMARK_TIERS;
    else process.env.LIVARIANT_DIAGNOSTICS_BENCHMARK_TIERS = previousTiers;
  }
});

test("diagnostics history benchmark refuses unbound source identity", async () => {
  const previousSha = process.env.LIVARIANT_BENCHMARK_SOURCE_SHA;
  delete process.env.LIVARIANT_BENCHMARK_SOURCE_SHA;
  try {
    await assert.rejects(runDiagnosticsHistoryGrowthBenchmark(), /exact 40-character Git SHA/);
  } finally {
    if (previousSha !== undefined) process.env.LIVARIANT_BENCHMARK_SOURCE_SHA = previousSha;
  }
});
