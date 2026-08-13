import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { buildSemanticProposal, initializeProject, parseSemanticProposalCandidate } from "../src/runtime/index.js";

test("proposal domain is material to deterministic identity", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-proposal-domain-"));
  try {
    await initializeProject(path, { authorized: true });
    const common = { schemaVersion: 1 as const, changeKind: "add" as const, proposedStatement: "Keep state local", rationale: "Compare domains", origin: "project-evidence" as const };
    const goal = await buildSemanticProposal(parseSemanticProposalCandidate({ ...common, domain: "project-goal" }), path);
    const knowledge = await buildSemanticProposal(parseSemanticProposalCandidate({ ...common, domain: "project-knowledge" }), path);
    assert.equal(goal.state, "proposal");
    assert.equal(knowledge.state, "proposal");
    if (goal.state !== "proposal" || knowledge.state !== "proposal") return;
    assert.notEqual(goal.proposal.proposalId, knowledge.proposal.proposalId);
    assert.notEqual(goal.proposal.materialDigest.digest, knowledge.proposal.materialDigest.digest);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});
