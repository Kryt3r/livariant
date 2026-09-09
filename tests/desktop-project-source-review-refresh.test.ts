import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  parseDesktopProjectSourceReviewRefreshInput,
  refreshDesktopProjectSourceReviewPresentation,
} from "../src/project/desktop-project-source-review-refresh.js";

test("refresh input rejects ambiguous or incomplete source state", () => {
  assert.throws(() => parseDesktopProjectSourceReviewRefreshInput({}), /schemaVersion/i);
  assert.throws(() => parseDesktopProjectSourceReviewRefreshInput({ schemaVersion: 1, projectId: "livariant" }), /primary/i);
});

test("refresh runtime rebuilds bounded presentation from the current project material", async () => {
  const root = await mkdtemp(join(tmpdir(), "livariant-source-review-refresh-"));
  try {
    const inputPath = join(root, "input.json");
    const outputPath = join(root, "presentation.json");
    await writeFile(inputPath, JSON.stringify({
      schemaVersion: 1,
      projectId: "livariant",
      primary: {
        identity: {
          provider: "github",
          repositoryId: "Kryt3r/livariant",
          displayName: "Livariant",
          remoteUrl: "https://github.com/Kryt3r/livariant",
        },
        localPath: process.cwd(),
      },
      additional: [{
        identity: {
          provider: "github",
          repositoryId: "Kryt3r/livariant-internal",
          displayName: "Livariant Internal",
          remoteUrl: "https://github.com/Kryt3r/livariant-internal",
        },
        description: "Internal control-plane and governance source for Livariant development.",
      }],
      selectedReviewPaths: ["README.md", "SECURITY.md"],
      observations: [{
        identity: {
          provider: "github",
          repositoryId: "Kryt3r/livariant",
          displayName: "Livariant",
        },
        reachability: "reachable",
        branch: "main",
        revision: "test-revision",
        observedAt: "2026-09-09T15:00:00+02:00",
        stale: false,
      }],
    }), "utf8");

    await refreshDesktopProjectSourceReviewPresentation(inputPath, outputPath);
    const presentation = JSON.parse(await readFile(outputPath, "utf8")) as {
      projectId: string;
      sources: Array<{ reachability: string }>;
      review: { authorizationState: string; applyState: string; boundaries: { changesMade: number } };
      boundaries: { changesMade: number };
    };

    assert.equal(presentation.projectId, "livariant");
    assert.equal(presentation.sources.length, 2);
    assert.equal(presentation.sources[0]?.reachability, "reachable");
    assert.equal(presentation.sources[1]?.reachability, "unknown");
    assert.equal(presentation.review.authorizationState, "not-authorized");
    assert.equal(presentation.review.applyState, "not-applied");
    assert.equal(presentation.review.boundaries.changesMade, 0);
    assert.equal(presentation.boundaries.changesMade, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
