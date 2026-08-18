import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject, parseSemanticProposalCandidate } from "../src/runtime/index.js";
import { buildSemanticProposal } from "../src/runtime/semantic-proposal.js";

test("goal proposal fails closed when managed state changes during construction", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-goal-concurrency-"));
  try {
    await initializeProject(path, { authorized: true });
    const candidate = parseSemanticProposalCandidate({ schemaVersion: 1, domain: "project-goal", changeKind: "add", proposedStatement: "Keep context coherent", rationale: "Review goal", origin: "project-evidence" });
    const result = await buildSemanticProposal(candidate, path, {
      beforeRevalidate: async () => {
        await writeFile(resolve(path, ".project-brain", "knowledge.md"), "# Knowledge\n\n- Concurrent edit\n", "utf8");
      },
    });
    assert.equal(result.state, "blocked");
    if (result.state !== "blocked") return;
    assert.ok(result.findings.some((finding) => "code" in finding && finding.code === "proposal-concurrent-change"));
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});
