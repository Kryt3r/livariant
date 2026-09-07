import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { buildAdoptionSurfaceInventory } from "../src/project/adoption-inventory.js";
import { reviewAdoptionSurfaces } from "../src/project/adoption-review.js";

async function withProject(run: (projectPath: string) => Promise<void>): Promise<void> {
  const projectPath = await mkdtemp(join(tmpdir(), "livariant-adoption-review-"));
  try {
    await run(projectPath);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
}

test("adoption content review reads only explicitly selected inventoried surfaces as evidence", async () => {
  await withProject(async (projectPath) => {
    await writeFile(resolve(projectPath, "AGENTS.md"), "Root guidance evidence.\n");
    await writeFile(resolve(projectPath, "CLAUDE.md"), "Unselected provider guidance.\n");
    await writeFile(resolve(projectPath, "ARCHITECTURE.md"), "Architecture evidence.\n");

    const inventory = buildAdoptionSurfaceInventory(projectPath);
    const review = reviewAdoptionSurfaces(projectPath, inventory, ["AGENTS.md", "ARCHITECTURE.md"]);

    assert.deepEqual(review.reviewed.map((item) => item.path), ["AGENTS.md", "ARCHITECTURE.md"]);
    assert.equal(review.reviewed.find((item) => item.path === "AGENTS.md")?.content, "Root guidance evidence.\n");
    assert.equal(review.reviewed.some((item) => item.path === "CLAUDE.md"), false);
    assert.equal(review.boundaries.evidenceIsProjectTruth, false);
    assert.equal(review.boundaries.contentReviewIsAcceptance, false);
    assert.equal(review.boundaries.grantsAuthority, false);
    assert.equal(review.boundaries.automaticConflictResolution, false);
    assert.equal(review.boundaries.changesMade, 0);
    assert.ok(review.reviewed.every((item) => item.trust === "evidence-only" && item.status === "observed-text"));
  });
});

test("scoped guidance discovery is bounded and review exposes overlapping scope without choosing precedence", async () => {
  await withProject(async (projectPath) => {
    await mkdir(resolve(projectPath, "packages", "api"), { recursive: true });
    await writeFile(resolve(projectPath, "AGENTS.md"), "Use the root convention.\n");
    await writeFile(resolve(projectPath, "packages", "api", "AGENTS.md"), "Use the API-local convention.\n");

    const inventory = buildAdoptionSurfaceInventory(projectPath);
    assert.ok(inventory.surfaces.some((item) => item.path === "AGENTS.md" && item.kind === "agent-guidance"));
    assert.ok(inventory.surfaces.some((item) => item.path === "packages/api/AGENTS.md" && item.kind === "agent-guidance"));

    const review = reviewAdoptionSurfaces(projectPath, inventory, ["AGENTS.md", "packages/api/AGENTS.md"]);
    const rootGuidance = review.reviewed.find((item) => item.path === "AGENTS.md");
    const nestedGuidance = review.reviewed.find((item) => item.path === "packages/api/AGENTS.md");
    assert.equal(rootGuidance?.scope, ".");
    assert.equal(nestedGuidance?.scope, "packages/api");

    const overlap = review.attention.find((item) => item.code === "adoption-review-overlapping-guidance");
    assert.ok(overlap);
    assert.deepEqual(overlap.provenance, ["AGENTS.md", "packages/api/AGENTS.md"]);
    assert.match(overlap.message, /does not select precedence/i);
    assert.match(overlap.message, /does not .* resolve semantic conflict automatically/i);
  });
});

test("adoption review refuses uninventoried paths and enforces bounded content reads", async () => {
  await withProject(async (projectPath) => {
    await writeFile(resolve(projectPath, "AGENTS.md"), "0123456789abcdefghijklmnopqrstuvwxyz\n");
    await writeFile(resolve(projectPath, "outside.md"), "must not be read through an uninventoried selection\n");

    const inventory = buildAdoptionSurfaceInventory(projectPath);
    const review = reviewAdoptionSurfaces(
      projectPath,
      inventory,
      ["../outside.md", "outside.md", "AGENTS.md"],
      { maxBytesPerSurface: 8, maxTotalBytes: 8, maxSurfaces: 3 },
    );

    assert.equal(review.reviewed.length, 1);
    assert.equal(review.reviewed[0]?.path, "AGENTS.md");
    assert.equal(review.reviewed[0]?.content, "01234567");
    assert.equal(review.reviewed[0]?.bytesRead, 8);
    assert.equal(review.reviewed[0]?.truncated, true);
    assert.ok(review.attention.some((item) => item.code === "adoption-review-uninventoried-selection" && item.provenance.includes("../outside.md")));
    assert.ok(review.attention.some((item) => item.code === "adoption-review-uninventoried-selection" && item.provenance.includes("outside.md")));
    assert.ok(review.attention.some((item) => item.code === "adoption-review-truncated-surface" && item.provenance.includes("AGENTS.md")));
    assert.equal(JSON.stringify(review).includes("must not be read"), false);
  });
});
