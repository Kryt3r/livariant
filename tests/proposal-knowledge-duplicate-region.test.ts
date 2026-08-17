import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { buildSemanticProposal, initializeProject, parseSemanticProposalCandidate } from "../src/runtime/index.js";
import { acceptFixtureProjectBrain } from "./accepted-project-brain-fixture.js";

test("knowledge proposal detects exact confirmed fact", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-knowledge-confirmed-"));
  try {
    await initializeProject(path, { authorized: true });
    await writeFile(resolve(path, ".project-brain", "knowledge.md"), "# Knowledge\n\n## Confirmed project knowledge\n\n- Snapshot format is versioned\n\n## Known unknowns\n", "utf8");
    await acceptFixtureProjectBrain(path);
    const candidate = parseSemanticProposalCandidate({ schemaVersion: 1, domain: "project-knowledge", changeKind: "add", proposedStatement: "Snapshot format is versioned", rationale: "Review existing fact", origin: "project-evidence" });
    const result = await buildSemanticProposal(candidate, path);
    assert.equal(result.state, "proposal");
    if (result.state !== "proposal") return;
    assert.ok(result.proposal.findings.some((finding) => finding.code === "exact-confirmed-knowledge-duplicate"));
    assert.equal(result.proposal.changesMade, 0);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});
