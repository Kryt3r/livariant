import test from "node:test";
import assert from "node:assert/strict";
import {
  addOnboardingAdditionalRepository,
  createFirstRunOnboardingState,
  selectOnboardingProject,
  setOnboardingPrimaryRepository,
} from "../src/project/first-run-onboarding.js";
import { projectSourceReviewConfigurationFromFirstRun } from "../src/project/first-run-source-review-configuration.js";
import type { UnderstandingReviewReport } from "../src/project/understanding-review.js";

function review(): UnderstandingReviewReport {
  return {
    schemaVersion: 1,
    projectRoot: "C:/projects/livariant",
    projectShape: "existing",
    confirmed: [],
    stronglyInferred: [],
    uncertain: [],
    attention: [],
    questions: [],
    candidateEvidence: [],
    boundaries: {
      evidenceIsProjectTruth: false,
      candidateEvidenceIsProjectTruth: false,
      grantsAuthority: false,
      changesMade: 0,
    },
  };
}

function configuredState() {
  let state = createFirstRunOnboardingState(review());
  state = selectOnboardingProject(state, { projectId: "livariant", localRoot: "C:/projects/livariant" });
  state = setOnboardingPrimaryRepository(state, {
    identity: {
      provider: "github",
      repositoryId: "Kryt3r/livariant",
      displayName: "livariant",
      remoteUrl: "https://github.com/Kryt3r/livariant",
    },
    local: { localPath: "C:/projects/livariant" },
  });
  state = addOnboardingAdditionalRepository(state, {
    identity: {
      provider: "github",
      repositoryId: "Kryt3r/livariant-internal",
      displayName: "livariant-internal",
    },
    description: "Internal development control and governance evidence.",
    local: { localPath: "C:/projects/livariant-internal" },
  });
  return state;
}

test("projects accepted first-run source state into the bounded review configuration shape", () => {
  const projected = projectSourceReviewConfigurationFromFirstRun(configuredState(), {
    selectedReviewPaths: ["README.md", "docs/architecture-and-safety.md"],
  });
  assert.equal(projected.projectId, "livariant");
  assert.equal(projected.primary.identity.repositoryId, "Kryt3r/livariant");
  assert.equal(projected.primary.localPath, "C:/projects/livariant");
  assert.equal(projected.additional[0]?.identity.repositoryId, "Kryt3r/livariant-internal");
  assert.equal(projected.additional[0]?.description, "Internal development control and governance evidence.");
  assert.deepEqual(projected.selectedReviewPaths, ["README.md", "docs/architecture-and-safety.md"]);
  assert.equal(projected.boundaries.projectionCreatesObservedEvidence, false);
  assert.equal(projected.boundaries.projectionGrantsAuthority, false);
  assert.equal(projected.boundaries.performsSemanticApply, false);
});

test("does not infer project localRoot as the primary repository binding", () => {
  let state = createFirstRunOnboardingState(review());
  state = selectOnboardingProject(state, { projectId: "livariant", localRoot: "C:/projects/livariant" });
  state = setOnboardingPrimaryRepository(state, {
    identity: { provider: "github", repositoryId: "Kryt3r/livariant", displayName: "livariant" },
  });
  assert.throws(
    () => projectSourceReviewConfigurationFromFirstRun(state),
    /explicit local binding/,
  );
});

test("fails closed on mismatched project identities and unbounded review paths", () => {
  const state = configuredState();
  const mismatched = {
    ...state,
    project: {
      ...state.project,
      sourceRegistry: { ...state.project.sourceRegistry!, projectId: "other" },
    },
  };
  assert.throws(() => projectSourceReviewConfigurationFromFirstRun(mismatched), /do not match/);
  assert.throws(
    () => projectSourceReviewConfigurationFromFirstRun(state, { selectedReviewPaths: ["../secret.txt"] }),
    /bounded repository-relative path/,
  );
  assert.throws(
    () => projectSourceReviewConfigurationFromFirstRun(state, { selectedReviewPaths: ["README.md", "readme.md"] }),
    /Duplicate selected review path/,
  );
});

test("decisions remain explicit and require selected review material", () => {
  const state = configuredState();
  assert.throws(() => projectSourceReviewConfigurationFromFirstRun(state, {
    decisions: [{ evidenceId: "e1", materialDigest: "abc", decision: "defer" }],
  }), /require selected review paths/);

  const projected = projectSourceReviewConfigurationFromFirstRun(state, {
    selectedReviewPaths: ["README.md"],
    decisions: [{ evidenceId: "e1", materialDigest: "abc", decision: "defer" }],
  });
  assert.deepEqual(projected.decisions, [{ evidenceId: "e1", materialDigest: "abc", decision: "defer" }]);
});
