import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildDesktopProjectReviewPathInventory } from "../src/project/desktop-project-review-path-inventory.js";

function input(localPath: string, selectedReviewPaths: string[] = []) {
  return {
    schemaVersion: 1 as const,
    projectId: "livariant",
    primary: {
      identity: {
        provider: "github" as const,
        repositoryId: "Kryt3r/livariant",
        displayName: "livariant",
      },
      localPath,
    },
    additional: [],
    observations: [],
    selectedReviewPaths,
    decisions: [],
  };
}

test("Desktop review path inventory reuses adoption surfaces without reading test directories or fixture guidance as review material", () => {
  const root = mkdtempSync(join(tmpdir(), "livariant-review-paths-"));
  try {
    mkdirSync(join(root, "docs"));
    mkdirSync(join(root, "tests", "fixtures", "existing-messy"), { recursive: true });
    writeFileSync(join(root, "README.md"), "# Project\n");
    writeFileSync(join(root, "SECURITY.md"), "# Security\n");
    writeFileSync(join(root, "docs", "architecture.md"), "# Architecture\n");
    writeFileSync(join(root, "tests", "example.test.ts"), "test\n");
    writeFileSync(join(root, "tests", "fixtures", "existing-messy", "AGENTS.md"), "fixture guidance\n");
    writeFileSync(join(root, "tests", "fixtures", "existing-messy", "CLAUDE.md"), "fixture guidance\n");

    const inventory = buildDesktopProjectReviewPathInventory(input(root, ["README.md"]));

    assert.equal(inventory.state, "ready");
    assert.equal(inventory.projectId, "livariant");
    assert.deepEqual(inventory.selectedReviewPaths, ["README.md"]);
    assert.ok(inventory.candidates.some((candidate) => candidate.path === "README.md" && candidate.kind === "documentation" && candidate.scope === "."));
    assert.ok(inventory.candidates.some((candidate) => candidate.path === "SECURITY.md" && candidate.kind === "project-rules" && candidate.scope === "."));
    assert.ok(inventory.candidates.some((candidate) => candidate.path === "docs/architecture.md" && candidate.kind === "architecture"));
    assert.ok(!inventory.candidates.some((candidate) => candidate.kind === "tests"));
    assert.ok(!inventory.candidates.some((candidate) => candidate.path.startsWith("tests/fixtures/")));
    assert.ok(!inventory.attention.some((item) => item.provenance.some((path) => path.startsWith("tests/fixtures/"))));
    assert.equal(inventory.boundaries.evidenceIsProjectTruth, false);
    assert.equal(inventory.boundaries.contentsInterpreted, false);
    assert.equal(inventory.boundaries.grantsAuthority, false);
    assert.equal(inventory.boundaries.changesMade, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Desktop review path inventory rejects missing or non-directory primary checkouts", () => {
  const root = mkdtempSync(join(tmpdir(), "livariant-review-paths-invalid-"));
  try {
    const file = join(root, "not-a-checkout.txt");
    writeFileSync(file, "not a directory\n");
    assert.throws(() => buildDesktopProjectReviewPathInventory(input(file)), /regular directory/);
    assert.throws(() => buildDesktopProjectReviewPathInventory(input(join(root, "missing"))));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
