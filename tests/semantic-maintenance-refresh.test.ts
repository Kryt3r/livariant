import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  buildActionableProposal,
  initializeProject,
  inspectAuthorizationAudit,
  maintainSemanticProjectState,
  parseSemanticProposalCandidate,
} from "../src/runtime/index.js";
import type { ActionableProposal } from "../src/runtime/actionable-proposal.js";

const AUTH_ID = "88888888-8888-4888-8888-888888888888";

async function projectId(path: string): Promise<string> {
  const metadata = JSON.parse(await readFile(resolve(path, ".project-brain", "metadata.json"), "utf8")) as { projectBrain: { projectId: string } };
  return metadata.projectBrain.projectId;
}

async function seedSameUserEvidence(path: string, proposal: ActionableProposal): Promise<void> {
  const authorizedAt = new Date().toISOString();
  const binding = {
    authorizationId: AUTH_ID,
    stableProjectIdentity: proposal.stableProjectIdentity,
    actionableProposalId: proposal.actionableProposalId,
    actionableProposalVersion: 1,
    proposalDigest: proposal.materialDigest.digest,
    mutationScope: proposal.mutationScope,
    baseline: proposal.baseline,
  };
  const projectRoot = resolve(path, ".project-brain", ".authorizations");
  await mkdir(resolve(projectRoot, "history"), { recursive: true });
  await writeFile(resolve(projectRoot, "active.json"), `${JSON.stringify({ ...binding, schemaVersion: 1, kind: "semantic-mutation-authorization-audit", state: "authorized", authorizedAt }, null, 2)}\n`, "utf8");
  const machineRoot = resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", proposal.stableProjectIdentity);
  await mkdir(machineRoot, { recursive: true });
  await writeFile(resolve(machineRoot, `${AUTH_ID}.json`), `${JSON.stringify({ ...binding, schemaVersion: 1, kind: "semantic-mutation-authorization", state: "authorized", authorizedAt }, null, 2)}\n`, "utf8");
}

function candidate(statement: string) {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-knowledge",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "Exercise post-apply context boundary",
    origin: "explicit-user",
  });
}

async function prepare(path: string, statement: string): Promise<{ candidate: ReturnType<typeof candidate>; proposal: ActionableProposal }> {
  const parsed = candidate(statement);
  const prepared = await buildActionableProposal(parsed, path);
  assert.equal(prepared.state, "actionable-proposal");
  if (prepared.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  return { candidate: parsed, proposal: prepared.proposal };
}

for (const behavior of ["block-context", "throw-refresh"] as const) {
  test(`post-apply refresh ${behavior} cannot be reached from same-user evidence without Guardian`, async () => {
    const path = await mkdtemp(resolve(tmpdir(), "livariant-maintenance-refresh-"));
    let machineProjectId: string | null = null;
    try {
      await initializeProject(path, { authorized: true });
      machineProjectId = await projectId(path);
      const statement = `Guardian precedes post-apply refresh ${behavior}`;
      const { candidate: parsed, proposal } = await prepare(path, statement);
      await seedSameUserEvidence(path, proposal);
      let refreshHookReached = false;

      const result = await maintainSemanticProjectState(parsed, AUTH_ID, path, {
        afterApplyBeforeRefresh: async () => {
          refreshHookReached = true;
          if (behavior === "throw-refresh") throw new Error("unreachable simulated refresh failure");
        },
      });

      assert.equal(result.state, "blocked");
      if (result.state !== "blocked") throw new Error("expected blocked");
      assert.equal(result.recoveryRequired, false);
      assert.equal(result.mutationOutcome, "not-applied");
      assert.equal(result.semanticChangesMade, 0);
      assert.equal(refreshHookReached, false);
      assert.match(result.message, /Guardian/i);
      assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), new RegExp(statement));
      assert.equal((await inspectAuthorizationAudit(path)).active?.state, "authorized");
    } finally {
      if (machineProjectId) {
        await rm(resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", machineProjectId), { recursive: true, force: true });
      }
      await rm(path, { recursive: true, force: true });
    }
  });
}
