import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  buildResumeContext,
  initializeProject,
  recordAcceptedDecision,
  supersedeAcceptedDecision,
} from "../src/runtime/index.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(join(tmpdir(), "pbf-stale-knowledge-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("superseded canonical decision remains historical but is no longer active resume truth", async () => {
  await withProject(async (path) => {
    const original = await recordAcceptedDecision("Use architecture A", path, { authorized: true });
    const staleResume = await buildResumeContext(path);
    assert.deepEqual(staleResume.activeDecisions, ["Use architecture A"]);

    const result = await supersedeAcceptedDecision(
      {
        decisionId: original.id,
        replacement: "Use architecture B",
        reason: "Architecture B supersedes the earlier accepted direction",
      },
      path,
      { authorized: true },
    );

    const currentResume = await buildResumeContext(path);
    assert.deepEqual(currentResume.activeDecisions, ["Use architecture B"]);
    assert.equal(result.superseded.status, "superseded");
    assert.equal(result.superseded.supersededBy, result.replacement.id);
    assert.equal(result.replacement.status, "active");

    const decisions = await readFile(resolve(path, ".project-brain", "decisions.md"), "utf8");
    assert.match(decisions, /\(superseded by .*\) Use architecture A/);
    assert.match(decisions, /\(active\) Use architecture B/);
    assert.match(decisions, /reason: Architecture B supersedes the earlier accepted direction/);

    assert.deepEqual(staleResume.activeDecisions, ["Use architecture A"]);
    assert.doesNotMatch(JSON.stringify(staleResume), /Use architecture B/);
  });
});
