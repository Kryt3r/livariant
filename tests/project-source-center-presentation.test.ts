import test from "node:test";
import assert from "node:assert/strict";
import { buildProjectSourceCenterPresentation } from "../src/project/project-source-center-presentation.js";
import {
  addAdditionalProjectRepository,
  createProjectSourceRegistry,
} from "../src/project/source-registry.js";
import type { AdoptionDesktopPresentation } from "../src/project/adoption-desktop-presentation.js";

function registry() {
  let value = createProjectSourceRegistry("livariant", {
    identity: {
      provider: "github",
      repositoryId: "Kryt3r/livariant",
      displayName: "livariant",
      remoteUrl: "https://github.com/Kryt3r/livariant",
    },
    local: { localPath: "C:/projects/livariant" },
  });
  value = addAdditionalProjectRepository(value, {
    identity: {
      provider: "github",
      repositoryId: "Kryt3r/livariant-internal",
      displayName: "livariant-internal",
      remoteUrl: "https://github.com/Kryt3r/livariant-internal",
    },
    description: "Internal governance and development control state.",
  }).registry;
  return value;
}

function review(): AdoptionDesktopPresentation {
  return {
    schemaVersion: 1,
    state: "blocked",
    proposalId: null,
    evidence: [],
    attention: [{ code: "needs-review", severity: "review", message: "Review this source.", provenance: ["README.md"] }],
    blockers: [{ code: "blocked", message: "Decision required.", provenance: ["README.md"] }],
    authorizationState: "not-authorized",
    applyState: "not-applied",
    requiresReviewAgain: true,
    boundaries: {
      evidenceIsProjectTruth: false,
      uiDecisionIsProjectTruth: false,
      uiDecisionGrantsAuthority: false,
      proposalIsAuthorization: false,
      authorizationIsApplyCompletion: false,
      projectOwnedFilesAreReadOnly: true,
      hiddenConflictResolution: false,
      changesMade: 0,
    },
  };
}

test("source center distinguishes remote identity from local checkout without inventing observations", () => {
  const presentation = buildProjectSourceCenterPresentation(registry());
  assert.equal(presentation.sources.length, 2);
  assert.equal(presentation.sources[0]?.kind, "primary");
  assert.equal(presentation.sources[0]?.localPath, "C:/projects/livariant");
  assert.equal(presentation.sources[0]?.localState, "linked");
  assert.equal(presentation.sources[0]?.remoteState, "recorded");
  assert.equal(presentation.sources[0]?.reachability, "unknown");
  assert.equal(presentation.sources[0]?.branch, null);
  assert.equal(presentation.sources[0]?.revision, null);
  assert.equal(presentation.sources[1]?.kind, "additional");
  assert.equal(presentation.sources[1]?.description, "Internal governance and development control state.");
  assert.equal(presentation.sources[1]?.localState, "not-linked");
  assert.equal(presentation.sources[1]?.remoteState, "recorded");
  assert.match(presentation.sources[1]?.attention.join(" ") ?? "", /No local checkout/);
  assert.equal(presentation.summary.localCheckoutCount, 1);
  assert.equal(presentation.summary.remoteOnlyCount, 1);
  assert.equal(presentation.boundaries.remoteIdentityIsProjectTruth, false);
  assert.equal(presentation.boundaries.remoteIdentityGrantsAuthority, false);
  assert.equal(presentation.boundaries.localBindingGrantsAuthority, false);
});

test("source observations expose reachability revision stale attention as evidence only", () => {
  const presentation = buildProjectSourceCenterPresentation(registry(), [
    {
      identity: { provider: "github", repositoryId: "Kryt3r/livariant", displayName: "livariant" },
      reachability: "reachable",
      branch: "main",
      revision: "abc123",
      observedAt: "2026-09-08T20:30:00Z",
      stale: false,
    },
    {
      identity: { provider: "github", repositoryId: "Kryt3r/livariant-internal", displayName: "livariant-internal" },
      reachability: "unreachable",
      observedAt: "2026-09-08T20:00:00Z",
      stale: true,
      attention: ["Last known revision may no longer be current."],
    },
  ]);

  assert.equal(presentation.sources[0]?.branch, "main");
  assert.equal(presentation.sources[0]?.revision, "abc123");
  assert.equal(presentation.sources[1]?.reachability, "unreachable");
  assert.equal(presentation.sources[1]?.stale, true);
  assert.match(presentation.sources[1]?.attention.join(" ") ?? "", /unreachable/);
  assert.match(presentation.sources[1]?.attention.join(" ") ?? "", /stale/);
  assert.equal(presentation.summary.unavailableCount, 1);
  assert.equal(presentation.summary.staleCount, 1);
  assert.equal(presentation.sources[1]?.boundaries.observationIsProjectTruth, false);
});

test("source center composes canonical adoption desktop presentation without becoming an authority engine", () => {
  const presentation = buildProjectSourceCenterPresentation(registry(), [], review());
  assert.equal(presentation.review?.state, "blocked");
  assert.equal(presentation.summary.reviewAttentionCount, 1);
  assert.equal(presentation.summary.reviewBlockerCount, 1);
  assert.equal(presentation.boundaries.reviewPresentationGrantsAuthority, false);
  assert.equal(presentation.boundaries.hiddenConflictResolution, false);
});

test("source center fails closed for duplicate or unconfigured observations", () => {
  const duplicate = {
    identity: { provider: "github" as const, repositoryId: "Kryt3r/livariant", displayName: "livariant" },
    reachability: "reachable" as const,
    observedAt: "2026-09-08T20:30:00Z",
    stale: false,
  };
  assert.throws(() => buildProjectSourceCenterPresentation(registry(), [duplicate, duplicate]), /Duplicate project source observation/);
  assert.throws(() => buildProjectSourceCenterPresentation(registry(), [{
    identity: { provider: "github", repositoryId: "Kryt3r/other", displayName: "other" },
    reachability: "reachable",
    observedAt: "2026-09-08T20:30:00Z",
    stale: false,
  }]), /unconfigured source/);
});
