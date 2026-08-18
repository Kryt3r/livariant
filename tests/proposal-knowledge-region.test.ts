import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/index-core.js";
import { buildSemanticProposal, parseSemanticProposalCandidate } from "../src/runtime/semantic-proposal.js";
import { acceptFixtureProjectBrain } from "./accepted-project-brain-fixture.js";

test("knowledge candidate matching unresolved region stays noncanonical", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-knowledge-region-"));
  try {
    await initializeProject(path, { authorized: true });
    const knowledgePath = resolve(path, ".project-brain", "knowledge.md");
    await writeFile(knowledgePath, "# Knowledge\n\n## Confirmed project knowledge\n\n- Existing fact\n\n## Known unknowns\n\n- Future location\n", "utf8");
    await acceptFixtureProjectBrain(path);
    const candidate = parseSemanticProposalCandidate({ schemaVersion: 1, domain: "project-knowledge", changeKind: "add", proposedStatement: "Future location", rationale: "Review current classification", origin: "project-evidence" });
    const result = await buildSemanticProposal(candidate, path);
    assert.equal(result.state, "proposal");
    if (result.state !== "proposal") return;
    assert.ok(result.proposal.findings.some((finding) => finding.code === "knowledge-matches-unresolved-unknown"));
    assert.ok(result.proposal.evidence.unresolvedUnknownMatches?.some((item) => item.value === "Future location"));
    assert.equal(result.proposal.changesMade, 0);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});
