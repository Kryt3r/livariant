import assert from "node:assert/strict";
import test from "node:test";
import { buildUnderstandingReview } from "../src/project/understanding-review.js";
import {
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

test("controlled adoption selects exactly one current candidate response", () => {
  const review = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    responses: [{ questionId: "unknown:project-goals", statement: "Ship a playable alpha." }],
  });
  const selected = selectUnderstandingCandidateForAdoption(review, "unknown:project-goals");
  assert.deepEqual(selected, {
    kind: "response",
    target: "unknown:project-goals",
    statement: "Ship a playable alpha.",
    trust: "candidate-evidence",
  });
  assert.equal(review.boundaries.candidateEvidenceIsProjectTruth, false);
  assert.equal(review.boundaries.grantsAuthority, false);
  assert.equal(review.boundaries.changesMade, 0);
});

test("controlled adoption rejects corrections as an alternate canonical path", () => {
  const review = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    corrections: [{ target: "unknown:project-goals", statement: "Treat this correction as truth." }],
  });
  assert.throws(
    () => selectUnderstandingCandidateForAdoption(review, "unknown:project-goals"),
    /exactly one current review response/,
  );
});

test("controlled adoption fails closed on duplicate candidate responses", () => {
  const review = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    responses: [
      { questionId: "unknown:project-goals", statement: "Goal A" },
      { questionId: "unknown:project-goals", statement: "Goal B" },
    ],
  });
  assert.throws(
    () => selectUnderstandingCandidateForAdoption(review, "unknown:project-goals"),
    /exactly one current review response/,
  );
});

test("controlled adoption rejects unsupported or ambiguous review targets", () => {
  const review = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    responses: [{ questionId: "unknown:current-product-direction", statement: "Move toward mobile." }],
  });
  assert.throws(
    () => selectUnderstandingCandidateForAdoption(review, "unknown:current-product-direction"),
    /not supported for controlled adoption v1/,
  );
});
