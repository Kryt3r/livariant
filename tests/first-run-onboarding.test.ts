import test from "node:test";
import assert from "node:assert/strict";
import {
  addOnboardingAdditionalRepository,
  answerOnboardingQuestion,
  completeFirstRunOnboarding,
  createFirstRunOnboardingState,
  moveFirstRunOnboardingTo,
  selectOnboardingProject,
  setOnboardingPrimaryRepository,
  setOnboardingProviders,
  skipOnboardingQuestion,
} from "../src/project/first-run-onboarding.js";
import type { UnderstandingReviewReport } from "../src/project/understanding-review.js";

function review(): UnderstandingReviewReport {
  return {
    schemaVersion: 1,
    projectRoot: "C:/projects/example",
    projectShape: "existing",
    confirmed: [],
    stronglyInferred: [],
    uncertain: [],
    attention: [],
    questions: [
      { id: "unknown:project-purpose", topic: "project purpose", prompt: "What is this project for?", reason: "Unknown." },
      { id: "unknown:project-goals", topic: "project goals", prompt: "What are the goals?", reason: "Unknown." },
    ],
    candidateEvidence: [],
    boundaries: {
      evidenceIsProjectTruth: false,
      candidateEvidenceIsProjectTruth: false,
      grantsAuthority: false,
      changesMade: 0,
    },
  };
}

test("onboarding starts read-only with canonical understanding questions open", () => {
  const state = createFirstRunOnboardingState(review());
  assert.equal(state.currentStep, "welcome");
  assert.equal(state.completed, false);
  assert.equal(state.understanding.questions.length, 2);
  assert.deepEqual(state.understanding.questions.map((question) => question.state), ["open", "open"]);
  assert.equal(state.health.openQuestionCount, 2);
  assert.equal(state.boundaries.unansweredQuestionGetsDefault, false);
  assert.equal(state.boundaries.onboardingEvidenceIsProjectTruth, false);
  assert.equal(state.boundaries.grantsAuthority, false);
  assert.equal(state.boundaries.mutationAuthorized, false);
});

test("skipped questions remain explicitly skipped without inferred answers and can be revisited", () => {
  let state = createFirstRunOnboardingState(review());
  state = skipOnboardingQuestion(state, "unknown:project-purpose");
  const skipped = state.understanding.questions[0]!;
  assert.equal(skipped.state, "skipped");
  assert.equal(skipped.response, undefined);
  assert.equal(state.health.skippedQuestionCount, 1);

  state = answerOnboardingQuestion(state, "unknown:project-purpose", "A developer reliability tool.");
  assert.equal(state.understanding.questions[0]?.state, "answered");
  assert.equal(state.understanding.questions[0]?.response, "A developer reliability tool.");
});

test("project source setup uses one primary repository and described additional repositories", () => {
  let state = createFirstRunOnboardingState(review());
  state = selectOnboardingProject(state, { projectId: "project-1", localRoot: "C:/projects/example" });
  state = setOnboardingPrimaryRepository(state, {
    identity: { provider: "github", repositoryId: "Kryt3r/example", displayName: "example", remoteUrl: "https://github.com/Kryt3r/example" },
    local: { localPath: "C:/projects/example" },
  });
  state = addOnboardingAdditionalRepository(state, {
    identity: { provider: "github", repositoryId: "Kryt3r/example-internal", displayName: "example-internal" },
    description: "Internal governance and development control state.",
  });

  assert.equal(state.project.sourceRegistry?.primary.identity.repositoryId, "Kryt3r/example");
  assert.equal(state.project.sourceRegistry?.additional.length, 1);
  assert.equal(state.project.sourceRegistry?.additional[0]?.description, "Internal governance and development control state.");
  assert.equal(state.project.sourceRegistry?.boundaries.repositoryDescriptionGrantsAuthority, false);
  assert.equal(state.health.hasSourceRegistry, true);
});

test("additional repository still requires the source-registry description invariant", () => {
  let state = createFirstRunOnboardingState(review());
  state = selectOnboardingProject(state, { projectId: "project-1" });
  state = setOnboardingPrimaryRepository(state, {
    identity: { provider: "github", repositoryId: "Kryt3r/example", displayName: "example" },
  });
  assert.throws(() => addOnboardingAdditionalRepository(state, {
    identity: { provider: "github", repositoryId: "Kryt3r/other", displayName: "other" },
    description: "   ",
  }), /description must not be empty/);
});

test("partial onboarding is resumable and provider setup can be deferred without authority", () => {
  let state = createFirstRunOnboardingState(review());
  state = moveFirstRunOnboardingTo(state, "providers");
  state = setOnboardingProviders(state, [], { deferred: true });
  assert.equal(state.currentStep, "providers");
  assert.equal(state.providers.deferred, true);
  assert.equal(state.completed, false);
  assert.equal(state.health.readyForMainUi, false);
  assert.equal(state.boundaries.grantsAuthority, false);

  state = moveFirstRunOnboardingTo(state, "health");
  assert.equal(state.health.reviewed, true);
  assert.equal(state.health.readyForMainUi, true);

  state = completeFirstRunOnboarding(state);
  assert.equal(state.completed, true);
  assert.equal(state.currentStep, "complete");
});
