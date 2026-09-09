import assert from "node:assert/strict";
import test from "node:test";
import { buildAdoptionSurfaceInventory } from "../src/project/adoption-inventory.js";
import { reviewAdoptionSurfaces } from "../src/project/adoption-review.js";
import {
  produceProjectSourceReviewPresentation,
  produceProjectSourceReviewSnapshot,
  serializeProjectSourceReviewPresentation,
} from "../src/project/project-source-review-producer.js";
import { addAdditionalProjectRepository, createProjectSourceRegistry } from "../src/project/source-registry.js";

function registry(root: string) {
  let value = createProjectSourceRegistry("livariant", {
    identity: {
      provider: "github",
      repositoryId: "Kryt3r/livariant",
      displayName: "Livariant",
      remoteUrl: "https://github.com/Kryt3r/livariant",
    },
    local: { localPath: root },
  });
  value = addAdditionalProjectRepository(value, {
    identity: {
      provider: "github",
      repositoryId: "Kryt3r/livariant-internal",
      displayName: "Livariant Internal",
      remoteUrl: "https://github.com/Kryt3r/livariant-internal",
    },
    description: "Internal control-plane and governance source for Livariant development.",
  }).registry;
  return value;
}

test("producer composes canonical source and adoption presentation without granting authority", () => {
  const root = process.cwd();
  const inventory = buildAdoptionSurfaceInventory(root);
  const review = reviewAdoptionSurfaces(root, inventory, ["README.md", "SECURITY.md"]);
  const presentation = produceProjectSourceReviewPresentation({
    registry: registry(root),
    observations: [{
      identity: {
        provider: "github",
        repositoryId: "Kryt3r/livariant",
        displayName: "Livariant",
        remoteUrl: "https://github.com/Kryt3r/livariant",
      },
      reachability: "reachable",
      branch: "main",
      revision: "test-revision",
      observedAt: "2026-09-09T12:00:00+02:00",
      stale: false,
    }],
    review,
  });

  assert.equal(presentation.projectId, "livariant");
  assert.equal(presentation.sources.length, 2);
  assert.equal(presentation.sources[0]?.reachability, "reachable");
  assert.equal(presentation.sources[1]?.reachability, "unknown");
  assert.ok(presentation.review);
  assert.equal(presentation.review.authorizationState, "not-authorized");
  assert.equal(presentation.review.applyState, "not-applied");
  assert.equal(presentation.boundaries.reviewPresentationGrantsAuthority, false);
  assert.equal(presentation.boundaries.changesMade, 0);
});

test("producer refuses lifecycle evidence without a current review", () => {
  assert.throws(
    () => produceProjectSourceReviewPresentation({
      registry: registry(process.cwd()),
      decisions: [{
        evidenceId: "stale",
        materialDigest: "stale",
        path: "README.md",
        decision: "reject",
      }],
    }),
    /without a current adoption review/i,
  );
});

test("snapshot and serialized presentation preserve non-authoritative boundaries", () => {
  const input = { registry: registry(process.cwd()) };
  const snapshot = produceProjectSourceReviewSnapshot(input, "2026-09-09T12:00:00+02:00");
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.boundaries.snapshotIsProjectTruth, false);
  assert.equal(snapshot.boundaries.snapshotGrantsAuthority, false);
  assert.equal(snapshot.boundaries.producerChangesProjectOwnedFiles, false);
  assert.equal(snapshot.boundaries.producerPerformsSemanticApply, false);

  const serialized = JSON.parse(serializeProjectSourceReviewPresentation(input)) as { projectId: string; boundaries: { changesMade: number } };
  assert.equal(serialized.projectId, "livariant");
  assert.equal(serialized.boundaries.changesMade, 0);
});
