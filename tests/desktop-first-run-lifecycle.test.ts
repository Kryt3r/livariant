import test from "node:test";
import assert from "node:assert/strict";
import {
  createDesktopFirstRunInitialState,
  desktopFirstRunLifecycleSnapshot,
  firstRunSourceReviewReady,
  parsePersistedFirstRunOnboardingState,
  transitionDesktopFirstRunState,
} from "../src/project/desktop-first-run-lifecycle.js";

test("fresh Desktop lifecycle begins at canonical welcome without fabricated project state", () => {
  const state = createDesktopFirstRunInitialState();
  const snapshot = desktopFirstRunLifecycleSnapshot(state, false);
  assert.equal(snapshot.status, "required");
  assert.equal(snapshot.onboardingState.currentStep, "welcome");
  assert.equal(snapshot.onboardingState.completed, false);
  assert.equal(snapshot.onboardingState.project.projectId, undefined);
  assert.equal(snapshot.onboardingState.project.sourceRegistry, undefined);
  assert.equal(snapshot.sourceReviewReady, false);
  assert.equal(snapshot.boundaries.rendererMutatesCanonicalStateDirectly, false);
  assert.equal(snapshot.boundaries.persistedStateIsProjectTruth, false);
  assert.equal(snapshot.boundaries.lifecycleGrantsAuthority, false);
});

test("lifecycle actions delegate to canonical first-run transitions", () => {
  let state = createDesktopFirstRunInitialState();
  state = transitionDesktopFirstRunState(state, { type: "move", step: "project" });
  state = transitionDesktopFirstRunState(state, {
    type: "select-project",
    projectId: "livariant",
    localRoot: "C:/projects/livariant",
  });
  state = transitionDesktopFirstRunState(state, {
    type: "set-primary-repository",
    identity: {
      provider: "github",
      repositoryId: "Kryt3r/livariant",
      displayName: "livariant",
      remoteUrl: "https://github.com/Kryt3r/livariant",
    },
    localPath: "C:/projects/livariant",
  });
  state = transitionDesktopFirstRunState(state, {
    type: "add-additional-repository",
    identity: {
      provider: "github",
      repositoryId: "Kryt3r/livariant-internal",
      displayName: "livariant-internal",
    },
    description: "Internal governance and development control state.",
    localPath: "C:/projects/livariant-internal",
  });

  assert.equal(state.project.sourceRegistry?.primary.identity.repositoryId, "Kryt3r/livariant");
  assert.equal(state.project.sourceRegistry?.additional[0]?.description, "Internal governance and development control state.");
  assert.equal(firstRunSourceReviewReady(state), true);
});

test("project localRoot is never silently promoted to primary repository binding", () => {
  let state = createDesktopFirstRunInitialState();
  state = transitionDesktopFirstRunState(state, {
    type: "select-project",
    projectId: "livariant",
    localRoot: "C:/projects/livariant",
  });
  state = transitionDesktopFirstRunState(state, {
    type: "set-primary-repository",
    identity: { provider: "github", repositoryId: "Kryt3r/livariant", displayName: "livariant" },
  });

  assert.equal(state.project.localRoot, "C:/projects/livariant");
  assert.equal(state.project.sourceRegistry?.primary.local, undefined);
  assert.equal(firstRunSourceReviewReady(state), false);
});

test("completed onboarding remains non-authoritative and may be incomplete by conscious user choice", () => {
  let state = createDesktopFirstRunInitialState();
  state = transitionDesktopFirstRunState(state, { type: "complete" });
  const snapshot = desktopFirstRunLifecycleSnapshot(state, true);
  assert.equal(snapshot.status, "complete");
  assert.equal(snapshot.sourceReviewReady, false);
  assert.equal(snapshot.onboardingState.boundaries.grantsAuthority, false);
  assert.equal(snapshot.onboardingState.boundaries.mutationAuthorized, false);
});

test("malformed or authority-claiming persisted state fails closed", () => {
  const state = createDesktopFirstRunInitialState();
  assert.throws(() => parsePersistedFirstRunOnboardingState({ ...state, schemaVersion: 2 }), /schemaVersion/);
  assert.throws(() => parsePersistedFirstRunOnboardingState({
    ...state,
    boundaries: { ...state.boundaries, grantsAuthority: true },
  }), /grantsAuthority/);
  assert.throws(() => transitionDesktopFirstRunState(state, { type: "unknown" }), /Unsupported/);
});
