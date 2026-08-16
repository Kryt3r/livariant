import assert from "node:assert/strict";
import test from "node:test";
import { buildUnderstandingReview, understandingCandidateEvidenceId } from "../src/project/understanding-review.js";
import {
  buildUnderstandingAdoptionProposal,
  selectUnderstandingCandidateForAdoption,
  supportedUnderstandingAdoptionDomain,
} from "../src/project/understanding-adoption.js";
import type { BootstrapDiscoveryReport } from "../src/project/bootstrap-discovery.js";

function discovery(): BootstrapDiscoveryReport {
  return {
    projectRoot: "/example",
    projectShape: "existing",
    evidence: [],
    attention: [],
    unknowns: ["project purpose", "project goals", "current product direction", "non-negotiable project rules"],
    changesMade: 0,
  };
}

test("controlled adoption v1 maps only unambiguous supported review response targets", () => {
  assert.equal(supportedUnderstandingAdoptionDomain("unknown:project-goals"), "project-goal");
  assert.equal(supportedUnderstandingAdoptionDomain("unknown:project-purpose"), "project-knowledge");
  assert.equal(supportedUnderstandingAdoptionDomain("unknown:current-product-direction"), null);
  assert.equal(supportedUnderstandingAdoptionDomain("unknown:non-negotiable-project-rules"), null);
});

test("controlled adoption selects exactly one current material-bound candidate response", () => {
  const statement = "Ship a playable alpha.";
  const review = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    responses: [{ questionId: "unknown:project-goals", statement }],
  });
  const candidateId = understandingCandidateEvidenceId("response", "unknown:project-goals", statement);
  const selected = selectUnderstandingCandidateForAdoption(review, candidateId);
  assert.equal(selected.candidateId, candidateId);
  assert.equal(selected.target, "unknown:project-goals");
  assert.equal(selected.statement, statement);
  assert.equal(review.boundaries.candidateEvidenceIsProjectTruth, false);
  assert.equal(review.boundaries.grantsAuthority, false);
  assert.equal(review.boundaries.changesMade, 0);
});

test("controlled adoption rejects statement substitution under the same review target", () => {
  const originalId = understandingCandidateEvidenceId("response", "unknown:project-goals", "Goal A");
  const changed = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    responses: [{ questionId: "unknown:project-goals", statement: "Goal B" }],
  });
  assert.throws(
    () => selectUnderstandingCandidateForAdoption(changed, originalId),
    /exactly one current candidate matching the selected material id/,
  );
});

test("controlled adoption rejects corrections as an alternate canonical path", () => {
  const statement = "Treat this correction as truth.";
  const review = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    corrections: [{ target: "unknown:project-goals", statement }],
  });
  const candidateId = understandingCandidateEvidenceId("correction", "unknown:project-goals", statement);
  assert.throws(
    () => selectUnderstandingCandidateForAdoption(review, candidateId),
    /not supported for controlled adoption v1/,
  );
});

test("controlled adoption rejects unsupported or ambiguous review targets", () => {
  const statement = "Move toward mobile.";
  const review = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    responses: [{ questionId: "unknown:current-product-direction", statement }],
  });
  const candidateId = understandingCandidateEvidenceId("response", "unknown:current-product-direction", statement);
  assert.throws(
    () => selectUnderstandingCandidateForAdoption(review, candidateId),
    /not supported for controlled adoption v1/,
  );
});

test("controlled adoption reuses canonical goal/knowledge scalar validation", async () => {
  const multiline = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    responses: [{ questionId: "unknown:project-goals", statement: "Goal line one\nGoal line two" }],
  });
  await assert.rejects(
    buildUnderstandingAdoptionProposal(multiline, multiline.candidateEvidence[0]!.candidateId, "/path-not-used-before-parse"),
    /single-line scalar value/,
  );

  const oversized = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    responses: [{ questionId: "unknown:project-purpose", statement: "x".repeat(4097) }],
  });
  await assert.rejects(
    buildUnderstandingAdoptionProposal(oversized, oversized.candidateEvidence[0]!.candidateId, "/path-not-used-before-parse"),
    /exceeds the supported size limit/,
  );
});
