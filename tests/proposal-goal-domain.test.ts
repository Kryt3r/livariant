import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  addConfirmedGoal,
  buildSemanticProposal,
  initializeProject,
  parseSemanticProposalCandidate,
} from "../src/runtime/index.js";

test("goal proposal detects exact confirmed duplicate without writing", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-goal-proposal-"));
  try {
    await initializeProject(path, { authorized: true });
    await addConfirmedGoal("Ship offline snapshots", path, { authorized: true });
    const goalsPath = resolve(path, ".project-brain", "goals.md");
    const before = await readFile(goalsPath);
    const candidate = parseSemanticProposalCandidate({
      schemaVersion: 1,
      domain: "project-goal",
      changeKind: "add",
      proposedStatement: "Ship offline snapshots",
      rationale: "Review existing goal",
      origin: "project-evidence",
    });
    const result = await buildSemanticProposal(candidate, path);
    assert.equal(result.state, "proposal");
    if (result.state !== "proposal") return;
    assert.equal(result.proposal.candidate.domain, "project-goal");
    assert.ok(result.proposal.findings.some((finding) => finding.code === "exact-confirmed-goal-duplicate"));
    assert.equal(result.proposal.actionability.reviewOnly, true);
    assert.equal(result.proposal.actionability.applySupported, false);
    assert.equal(result.proposal.changesMade, 0);
    assert.deepEqual(await readFile(goalsPath), before);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});
