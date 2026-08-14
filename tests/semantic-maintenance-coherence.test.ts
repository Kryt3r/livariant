import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  initializeProject,
  inspectAuthorizationAudit,
  maintainSemanticProjectState,
  parseSemanticProposalCandidate,
} from "../src/runtime/index.js";

async function projectId(path: string): Promise<string> {
  const metadata = JSON.parse(await readFile(resolve(path, ".project-brain", "metadata.json"), "utf8")) as { projectBrain: { projectId: string } };
  return metadata.projectBrain.projectId;
}

test("managed-state change between semantic review and actionable reconstruction fails closed before Authority", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-maintenance-coherence-"));
  let id: string | null = null;
  try {
    await initializeProject(path, { authorized: true });
    id = await projectId(path);
    const statement = "Composition must use one coherent Project Brain baseline";
    const candidate = parseSemanticProposalCandidate({
      schemaVersion: 1,
      domain: "project-goal",
      changeKind: "add",
      proposedStatement: statement,
      rationale: "Attack the review-to-actionable composition boundary",
      origin: "project-evidence",
    });

    const result = await maintainSemanticProjectState(candidate, undefined, path, {
      afterReviewBeforePrepare: async () => {
        await writeFile(
          resolve(path, ".project-brain", "goals.md"),
          `# Goals\n\n## Confirmed goals\n\n- ${statement}\n\n## Deferred goals\n\n- None recorded\n`,
          "utf8",
        );
      },
    });

    assert.equal(result.state, "blocked");
    if (result.state !== "blocked") throw new Error("expected blocked");
    assert.equal(result.phase, "actionable-proposal");
    assert.match(result.message, /changed between semantic review and actionable proposal reconstruction/i);
    assert.equal(result.recoveryRequired, false);
    assert.equal(result.mutationOutcome, "not-applied");
    assert.equal(result.semanticChangesMade, 0);

    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
    assert.deepEqual(audit.history, []);
  } finally {
    if (id) {
      await rm(resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", id), { recursive: true, force: true });
    }
    await rm(path, { recursive: true, force: true });
  }
});
