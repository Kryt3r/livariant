import test from "node:test";
import assert from "node:assert/strict";
import {
  answerOnboardingQuestion,
  createFirstRunOnboardingState,
  setOnboardingUnderstandingReview,
} from "../src/project/first-run-onboarding.js";
import type { UnderstandingReviewReport } from "../src/project/understanding-review.js";

function review(projectRoot: string): UnderstandingReviewReport {
  return {
    schemaVersion: 1,
    projectRoot,
    projectShape: "existing",
    confirmed: [],
    stronglyInferred: [],
    uncertain: [],
    attention: [],
    questions: [{ id: "unknown:project-purpose", topic: "project purpose", prompt: "What is this project for?", reason: "Purpose remains unknown." }],
    candidateEvidence: [],
    boundaries: { evidenceIsProjectTruth: false, candidateEvidenceIsProjectTruth: false, grantsAuthority: false, changesMade: 0 },
  };
}

test("rehydrating the same project preserves explicit answers", () => {
  let state = createFirstRunOnboardingState(review("C:/projects/one"));
  state = answerOnboardingQuestion(state, "unknown:project-purpose", "A local-first orchestration tool.");
  state = setOnboardingUnderstandingReview(state, review("C:/projects/one"));
  assert.equal(state.understanding.questions[0]?.state, "answered");
  assert.equal(state.understanding.questions[0]?.response, "A local-first orchestration tool.");
});

test("switching project roots never carries candidate answers across projects", () => {
  let state = createFirstRunOnboardingState(review("C:/projects/one"));
  state = answerOnboardingQuestion(state, "unknown:project-purpose", "Project one purpose.");
  state = setOnboardingUnderstandingReview(state, review("C:/projects/two"));
  assert.equal(state.understanding.projectRoot, "C:/projects/two");
  assert.equal(state.understanding.questions[0]?.state, "open");
  assert.equal(state.understanding.questions[0]?.response, undefined);
});
