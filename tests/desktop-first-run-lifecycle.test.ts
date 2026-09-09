import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDesktopFirstRunInitialState,
  desktopFirstRunLifecycleSnapshot,
  firstRunSourceReviewReady,
  parsePersistedFirstRunOnboardingState,
  transitionDesktopFirstRunState,
} from "../src/project/desktop-first-run-lifecycle.js";

function withProject<T>(run: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), "livariant-first-run-"));
  try {
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "sample-project", private: true }), "utf8");
    writeFileSync(join(root, "README.md"), "# Sample project\n", "utf8");
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

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

test("selecting a local project hydrates canonical understanding questions from discovery", () => withProject((root) => {
  let state = createDesktopFirstRunInitialState();
  state = transitionDesktopFirstRunState(state, {
    type: "select-project",
    projectId: "sample-project",
    localRoot: root,
  });
  assert.equal(state.project.localRoot, root);
  assert.equal(state.understanding.projectRoot, root);
  assert.ok(state.understanding.questions.length > 0);
  assert.ok(state.understanding.questions.every((question) => question.state === "open"));
  assert.equal(state.boundaries.onboardingEvidenceIsProjectTruth, false);
}));

test("lifecycle actions delegate to canonical first-run transitions", () => withProject((root) => {
  let state = createDesktopFirstRunInitialState();
  state = transitionDesktopFirstRunState(state, { type: "move", step: "project" });
  state = transitionDesktopFirstRunState(state, {
    type: "select-project",
    projectId: "livariant",
    localRoot: root,
  });
  state = transitionDesktopFirstRunState(state, {
    type: "set-primary-repository",
    identity: {
      provider: "github",
      repositoryId: "Kryt3r/livariant",
      displayName: "livariant",
      remoteUrl: "https://github.com/Kryt3r/livariant",
    },
    localPath: root,
  });
  state = transitionDesktopFirstRunState(state, {
    type: "add-additional-repository",
    identity: {
      provider: "github",
      repositoryId: "Kryt3r/livariant-internal",
      displayName: "livariant-internal",
    },
    description: "Internal governance and development control state.",
  });

  assert.equal(state.project.sourceRegistry?.primary.identity.repositoryId, "Kryt3r/livariant");
  assert.equal(state.project.sourceRegistry?.additional[0]?.description, "Internal governance and development control state.");
  assert.equal(firstRunSourceReviewReady(state), true);
}));

test("project localRoot is never silently promoted to primary repository binding", () => withProject((root) => {
  let state = createDesktopFirstRunInitialState();
  state = transitionDesktopFirstRunState(state, {
    type: "select-project",
    projectId: "livariant",
    localRoot: root,
  });
  state = transitionDesktopFirstRunState(state, {
    type: "set-primary-repository",
    identity: { provider: "github", repositoryId: "Kryt3r/livariant", displayName: "livariant" },
  });

  assert.equal(state.project.localRoot, root);
  assert.equal(state.project.sourceRegistry?.primary.local, undefined);
  assert.equal(firstRunSourceReviewReady(state), false);
}));

test("completed onboarding remains non-authoritative and may be incomplete by conscious user choice", () => {
  let state = createDesktopFirstRunInitialState();
  state = transitionDesktopFirstRunState(state, { type: "complete" });
  const snapshot = desktopFirstRunLifecycleSnapshot(state, true);
  assert.equal(snapshot.status, "complete");
  assert.equal(snapshot.sourceReviewReady, false);
  assert.equal(snapshot.onboardingState.boundaries.grantsAuthority, false);
  assert.equal(snapshot.onboardingState.boundaries.mutationAuthorized, false);
});

test("malformed, invalid-path or authority-claiming state fails closed", () => {
  const state = createDesktopFirstRunInitialState();
  assert.throws(() => parsePersistedFirstRunOnboardingState({ ...state, schemaVersion: 2 }), /schemaVersion/);
  assert.throws(() => parsePersistedFirstRunOnboardingState({
    ...state,
    boundaries: { ...state.boundaries, grantsAuthority: true },
  }), /grantsAuthority/);
  assert.throws(() => transitionDesktopFirstRunState(state, { type: "unknown" }), /Unsupported/);
  assert.throws(() => transitionDesktopFirstRunState(state, {
    type: "select-project",
    projectId: "missing",
    localRoot: join(tmpdir(), "livariant-definitely-missing-project"),
  }));
});
