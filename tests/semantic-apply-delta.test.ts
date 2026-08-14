import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  addConfirmedKnowledge,
  applyActionableProposal,
  buildActionableProposal,
  initializeProject,
  inspectAuthorizationAudit,
  parseSemanticProposalCandidate,
} from "../src/runtime/index.js";
import type { ActionableProposal } from "../src/runtime/actionable-proposal.js";

const AUTH_ID = "66666666-6666-4666-8666-666666666666";

async function projectId(path: string): Promise<string> {
  const metadata = JSON.parse(await readFile(resolve(path, ".project-brain", "metadata.json"), "utf8")) as { projectBrain: { projectId: string } };
  return metadata.projectBrain.projectId;
}

function machineRoot(projectIdValue: string): string {
  return resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", projectIdValue);
}

async function cleanupMachineAuthority(path: string): Promise<void> {
  let id: string;
  try { id = await projectId(path); } catch { return; }
  await rm(machineRoot(id), { recursive: true, force: true });
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-apply-delta-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await cleanupMachineAuthority(path);
    await rm(path, { recursive: true, force: true });
  }
}

function goalCandidate(statement: string) {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "Verify exact same-process managed delta",
    origin: "explicit-user",
  });
}

async function prepare(path: string, statement: string): Promise<ActionableProposal> {
  const result = await buildActionableProposal(goalCandidate(statement), path);
  assert.equal(result.state, "actionable-proposal");
  if (result.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  return result.proposal;
}

async function seedAuthorizedEvidence(path: string, proposal: ActionableProposal): Promise<void> {
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
  await writeFile(resolve(projectRoot, "active.json"), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization-audit",
    state: "authorized",
    authorizedAt,
  }, null, 2)}\n`, "utf8");

  const root = machineRoot(proposal.stableProjectIdentity);
  await mkdir(root, { recursive: true });
  await writeFile(resolve(root, `${AUTH_ID}.json`), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization",
    state: "authorized",
    authorizedAt,
  }, null, 2)}\n`, "utf8");
}

async function machineState(proposal: ActionableProposal): Promise<string> {
  const receipt = JSON.parse(await readFile(resolve(machineRoot(proposal.stableProjectIdentity), `${AUTH_ID}.json`), "utf8")) as { state: string };
  return receipt.state;
}

async function assertFailedTerminal(path: string, proposal: ActionableProposal): Promise<void> {
  const audit = await inspectAuthorizationAudit(path);
  assert.equal(audit.active, null);
  assert.ok(audit.history.some((record) => record.authorizationId === AUTH_ID && record.state === "failed-recovery-required"));
  assert.equal(await machineState(proposal), "failed-recovery-required");
}

test("unrelated managed change after authorized promote blocks completion", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Only this goal is authorized");
    await seedAuthorizedEvidence(path, proposal);

    await assert.rejects(
      applyActionableProposal(AUTH_ID, proposal, path, {
        afterPromoteBeforeVerify: async () => {
          await addConfirmedKnowledge("Concurrent unrelated managed fact", path, { authorized: true });
        },
      }),
      /unrelated managed Project Brain change|recovery-required/i,
    );

    assert.match(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Only this goal is authorized/);
    assert.match(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), /Concurrent unrelated managed fact/);
    await assertFailedTerminal(path, proposal);
  });
});

test("managed state change after semantic verification blocks terminal completion", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Verify before completing Authority");
    await seedAuthorizedEvidence(path, proposal);

    await assert.rejects(
      applyActionableProposal(AUTH_ID, proposal, path, {
        beforeComplete: async () => {
          await addConfirmedKnowledge("Changed after semantic verification", path, { authorized: true });
        },
      }),
      /changed after Semantic Apply verification|recovery-required/i,
    );

    assert.match(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Verify before completing Authority/);
    assert.match(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), /Changed after semantic verification/);
    await assertFailedTerminal(path, proposal);
  });
});
