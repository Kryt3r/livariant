import assert from "node:assert/strict";
import test from "node:test";
import { runVerificationTraceTokenBenchmark } from "./verification-trace-token-benchmark.mjs";

test("verification trace compact projection preserves critical assessment information", () => {
  const result = runVerificationTraceTokenBenchmark();

  assert.equal(result.workload, "requirement-implementation-verification-trace");
  assert.equal(result.reliabilityAssertions.coverage, "attention-required");
  assert.equal(result.reliabilityAssertions.supported, 1);
  assert.equal(result.reliabilityAssertions.contradicted, 1);
  assert.equal(result.reliabilityAssertions.unproven, 1);
  assert.equal(result.reliabilityAssertions.assessmentStatesPreserved, true);
  assert.equal(result.reliabilityAssertions.sourceReferencesPreserved, true);
  assert.equal(result.reliabilityAssertions.grantsAuthority, false);
});

test("verification trace compact projection is smaller than the full assessment for the representative fixture", () => {
  const result = runVerificationTraceTokenBenchmark();

  assert.ok(
    result.measurements.compactConsumerProjection.bytes < result.measurements.fullAssessment.bytes,
    "compact projection should use fewer serialized bytes than the full assessment",
  );
  assert.ok(
    result.measurements.compactConsumerProjection.tokenProxy < result.measurements.fullAssessment.tokenProxy,
    "compact projection should use a lower deterministic token proxy than the full assessment",
  );
  assert.ok(result.compactProjectionReductionVsFullAssessment.ratio > 0);
});
