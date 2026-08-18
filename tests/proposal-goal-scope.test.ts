import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject, parseSemanticProposalCandidate } from "../src/runtime/index.js";
import { buildSemanticProposal } from "../src/runtime/semantic-proposal.js";
import { acceptFixtureProjectBrain } from "./accepted-project-brain-fixture.js";

test("goal match outside confirmed region is a scope conflict", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-goal-scope-"));
  try {
    await initializeProject(path, { authorized: true });
    await writeFile(resolve(path, ".project-brain", "goals.md"), "# Goals\n\n- Confirmed goal\n\n## Notes\n\n- Candidate text\n", "utf8");
    await acceptFixtureProjectBrain(path);
    const candidate = parseSemanticProposalCandidate({ schemaVersion: 1, domain: "project-goal", changeKind: "add", proposedStatement: "Candidate text", rationale: "Review goal placement", origin: "project-evidence" });
    const result = await buildSemanticProposal(candidate, path);
    assert.equal(result.state, "proposal");
    if (result.state !== "proposal") return;
    assert.ok(result.proposal.findings.some((finding) => finding.category === "scope-conflict" && finding.code === "goal-match-outside-confirmed-region"));
    assert.ok(result.proposal.evidence.nonCanonicalMatches?.some((item) => item.value === "Candidate text"));
    assert.equal(result.proposal.changesMade, 0);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});
