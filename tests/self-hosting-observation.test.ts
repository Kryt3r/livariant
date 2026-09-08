import assert from "node:assert/strict";
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildAdoptionSurfaceInventory } from "../src/project/adoption-inventory.js";
import { reviewAdoptionSurfaces } from "../src/project/adoption-review.js";
import {
  adoptionReviewedEvidenceId,
  adoptionReviewedEvidenceMaterialDigest,
  bindAdoptionReviewDecisions,
  buildAdoptionReviewProposal,
} from "../src/project/adoption-review-decisions.js";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const protectedProjectFiles = [
  "README.md",
  "SECURITY.md",
  "package.json",
  "tsconfig.json",
  ".github/workflows/ci.yml",
] as const;

async function snapshotProjectFiles(): Promise<Map<string, Buffer>> {
  const snapshot = new Map<string, Buffer>();
  for (const path of protectedProjectFiles) {
    snapshot.set(path, await readFile(resolve(repositoryRoot, path)));
  }
  return snapshot;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

test("Livariant observes its own repository through the normal adoption path without mutation or Authority", async () => {
  const brainPath = resolve(repositoryRoot, ".project-brain");
  const beforeFiles = await snapshotProjectFiles();
  const brainExistedBefore = await pathExists(brainPath);

  const inventory = buildAdoptionSurfaceInventory(repositoryRoot);

  assert.equal(inventory.boundaries.evidenceIsProjectTruth, false);
  assert.equal(inventory.boundaries.contentsInterpreted, false);
  assert.equal(inventory.boundaries.grantsAuthority, false);
  assert.equal(inventory.boundaries.changesMade, 0);
  assert.ok(inventory.surfaces.some((item) => item.path === "README.md" && item.kind === "documentation" && item.trust === "evidence-only"));
  assert.ok(inventory.surfaces.some((item) => item.path === "SECURITY.md" && item.kind === "project-rules" && item.trust === "evidence-only"));
  assert.ok(inventory.surfaces.some((item) => item.path === "package.json" && item.kind === "tooling" && item.trust === "evidence-only"));
  assert.ok(inventory.surfaces.some((item) => item.path === "tests" && item.kind === "tests" && item.trust === "evidence-only"));
  assert.ok(inventory.surfaces.some((item) => item.path === ".github/workflows/ci.yml" && item.kind === "ci" && item.trust === "evidence-only"));
  assert.ok(inventory.attention.every((item) => item.severity === "review"));

  const review = reviewAdoptionSurfaces(repositoryRoot, inventory, ["README.md", "SECURITY.md"]);
  assert.deepEqual(review.reviewed.map((item) => item.path), ["README.md", "SECURITY.md"]);
  assert.equal(review.boundaries.evidenceIsProjectTruth, false);
  assert.equal(review.boundaries.contentReviewIsAcceptance, false);
  assert.equal(review.boundaries.grantsAuthority, false);
  assert.equal(review.boundaries.automaticConflictResolution, false);
  assert.equal(review.boundaries.changesMade, 0);

  const readme = review.reviewed.find((item) => item.path === "README.md");
  const security = review.reviewed.find((item) => item.path === "SECURITY.md");
  assert.ok(readme);
  assert.ok(security);

  const decisions = bindAdoptionReviewDecisions(review, [
    {
      evidenceId: adoptionReviewedEvidenceId(readme),
      materialDigest: adoptionReviewedEvidenceMaterialDigest(readme),
      decision: "accept-as-candidate",
    },
    {
      evidenceId: adoptionReviewedEvidenceId(security),
      materialDigest: adoptionReviewedEvidenceMaterialDigest(security),
      decision: "reject",
    },
  ]);
  const proposal = buildAdoptionReviewProposal(review, decisions);

  assert.equal(proposal.status, "ready-for-authorization-review");
  assert.equal(proposal.candidates.length, 1);
  assert.equal(proposal.candidates[0]?.path, "README.md");
  assert.equal(proposal.candidates[0]?.trust, "candidate-evidence");
  assert.equal(proposal.boundaries.evidenceIsProjectTruth, false);
  assert.equal(proposal.boundaries.decisionsAreProjectTruth, false);
  assert.equal(proposal.boundaries.proposalIsAuthorization, false);
  assert.equal(proposal.boundaries.grantsAuthority, false);
  assert.equal(proposal.boundaries.changesMade, 0);

  const changedReview = structuredClone(review);
  const changedReadme = changedReview.reviewed.find((item) => item.path === "README.md");
  assert.ok(changedReadme);
  changedReadme.content += "\nMaterial changed after review.\n";
  changedReadme.bytesRead = Buffer.byteLength(changedReadme.content);

  assert.throws(
    () => bindAdoptionReviewDecisions(changedReview, decisions),
    /not present in the current content review|stale/i,
  );

  const afterFiles = await snapshotProjectFiles();
  for (const [path, before] of beforeFiles) assert.deepEqual(afterFiles.get(path), before, `${path} changed during self-observation`);
  assert.equal(await pathExists(brainPath), brainExistedBefore, "Self-observation must not create or remove Project Brain state.");
});
