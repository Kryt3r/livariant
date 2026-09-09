import test from "node:test";
import assert from "node:assert/strict";
import { projectDesktopFirstRunSourceReviewRequest } from "../src/project/desktop-first-run-source-review-projection.js";
import type { FirstRunOnboardingState } from "../src/project/first-run-onboarding.js";

function state(): FirstRunOnboardingState {
  return {
    schemaVersion: 1,
    currentStep: "complete",
    completed: true,
    project: {
      projectId: "livariant",
      localRoot: "C:/projects/livariant",
      sourceRegistry: {
        projectId: "livariant",
        primary: {
          kind: "primary",
          identity: { provider: "github", repositoryId: "Kryt3r/livariant", displayName: "livariant" },
          local: { localPath: "C:/projects/livariant" },
        },
        additional: [{
          kind: "additional",
          identity: { provider: "github", repositoryId: "Kryt3r/livariant-internal", displayName: "livariant-internal" },
          description: "Internal governance and development control state.",
          local: { localPath: "C:/projects/livariant-internal" },
        }],
        boundaries: {
          repositoryDescriptionGrantsAuthority: false,
          repositoryAssociationIsProjectTruth: false,
          disconnectDeletesRemoteRepository: false,
          disconnectDeletesLocalCheckout: false,
        },
      },
    },
    understanding: { projectRoot: "C:/projects/livariant", questions: [] },
    providers: { configuredProviderIds: [], deferred: true },
    health: {
      reviewed: true,
      readyForMainUi: true,
      openQuestionCount: 0,
      skippedQuestionCount: 0,
      hasProjectSelection: true,
      hasSourceRegistry: true,
    },
    boundaries: {
      unansweredQuestionGetsDefault: false,
      skippedQuestionBecomesKnown: false,
      onboardingEvidenceIsProjectTruth: false,
      repositoryDescriptionGrantsAuthority: false,
      grantsAuthority: false,
      mutationAuthorized: false,
      changesProjectOwnedFiles: false,
    },
  };
}

test("projects accepted first-run state into bounded writer input", () => {
  const projected = projectDesktopFirstRunSourceReviewRequest({
    schemaVersion: 1,
    onboardingState: state(),
    selectedReviewPaths: ["README.md"],
    decisions: [],
  });
  assert.equal(projected.projectId, "livariant");
  assert.equal(projected.primary.localPath, "C:/projects/livariant");
  assert.equal(projected.additional[0]?.description, "Internal governance and development control state.");
  assert.deepEqual(projected.selectedReviewPaths, ["README.md"]);
  assert.equal("observations" in projected, false);
});

test("fails closed instead of inferring primary local binding", () => {
  const value = state();
  if (value.project.sourceRegistry) value.project.sourceRegistry.primary = {
    kind: "primary",
    identity: value.project.sourceRegistry.primary.identity,
  };
  assert.throws(() => projectDesktopFirstRunSourceReviewRequest({
    schemaVersion: 1,
    onboardingState: value,
  }), /explicit local binding/);
});

test("rejects malformed wrapper requests before projection", () => {
  assert.throws(() => projectDesktopFirstRunSourceReviewRequest({ schemaVersion: 2, onboardingState: state() }), /schemaVersion/);
  assert.throws(() => projectDesktopFirstRunSourceReviewRequest({ schemaVersion: 1, onboardingState: state(), selectedReviewPaths: "README.md" }), /selectedReviewPaths/);
});
