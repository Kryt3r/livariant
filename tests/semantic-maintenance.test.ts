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
import type { SemanticProposalCandidate } from "../src/runtime/semantic-proposal.js";

const AUTH_A = "66666666-6666-4666-8666-666666666666";
const AUTH_B = "77777777-7777-4777-8777-777777777777";

async function projectId(path: string): Promise<string> {
  const metadata = JSON.parse(await readFile(resolve(path, ".project-brain", "metadata.json"), "utf8")) as { projectBrain: { projectId: string } };
  return metadata.projectBrain.projectId;
}

function machineRoot(id: string): string {
  return resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", id);
}

async function cleanupMachineAuthority(path: string): Promise<void> {
  let id: string;
  try { id = await projectId(path); } catch { return; }
  await rm(machineRoot(id), { recursive: true, force: true });
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-maintenance-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await cleanupMachineAuthority(path);
    await rm(path, { recursive: true, force: true });
  }
}

function goalCandidate(statement: string): SemanticProposalCandidate {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "Exercise composed semantic maintenance",
    origin: "explicit-user",
  });
}

async function prepare(path: string, candidate: SemanticProposalCandidate): Promise<ActionableProposal> {
  const result = await buildActionableProposal(candidate, path);
  assert.equal(result.state, "actionable-proposal");
  if (result.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  return result.proposal;
}

async function seedAuthorizedEvidence(path: string, proposal: ActionableProposal, authorizationId = AUTH_A): Promise<void> {
  const authorizedAt = new Date().toISOString();
  const binding = {
    authorizationId,
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
  await writeFile(resolve(root, `${authorizationId}.json`), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization",
    state: "authorized",
    authorizedAt,
  }, null, 2)}\n`, "utf8");
}

test("eligible candidate without authorization returns exact authorization-required proposal and makes no mutation", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("Compose safe maintenance");
    const result = await maintainSemanticProjectState(candidate, undefined, path);
    assert.equal(result.state, "authorization-required");
    if (result.state !== "authorization-required") throw new Error("expected authorization-required");
    assert.equal(result.actionableProposal.mutationScope.proposedStatement, "Compose safe maintenance");
    assert.equal(result.semanticChangesMade, 0);
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Compose safe maintenance/);
  });
});

test("maintain without authorization id never consumes matching existing Authority implicitly", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("Require explicit authorization selector");
    const proposal = await prepare(path, candidate);
    await seedAuthorizedEvidence(path, proposal);

    const result = await maintainSemanticProjectState(candidate, undefined, path);
    assert.equal(result.state, "authorization-required");
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active?.authorizationId, AUTH_A);
    assert.equal(audit.active?.state, "authorized");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Require explicit authorization selector/);
  });
});

test("exact separately authorized candidate completes once and returns fresh clear context", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("Finish composed maintenance");
    const proposal = await prepare(path, candidate);
    await seedAuthorizedEvidence(path, proposal);

    const result = await maintainSemanticProjectState(candidate, AUTH_A, path);
    assert.equal(result.state, "completed");
    if (result.state !== "completed") throw new Error("expected completed");
    assert.equal(result.semanticChangesMade, 1);
    assert.equal(result.apply.authorizationId, AUTH_A);
    assert.equal(result.context.safetyState, "clear");
    assert.match(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /- Finish composed maintenance/);
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
    assert.ok(audit.history.some((record) => record.authorizationId === AUTH_A && record.state === "completed"));
  });
});

test("wrong authorization id fails closed without consuming the exact active Authority", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("Reject wrong authorization selector");
    const proposal = await prepare(path, candidate);
    await seedAuthorizedEvidence(path, proposal, AUTH_A);

    const result = await maintainSemanticProjectState(candidate, AUTH_B, path);
    assert.equal(result.state, "blocked");
    if (result.state !== "blocked") throw new Error("expected blocked");
    assert.equal(result.recoveryRequired, false);
    assert.equal(result.mutationOutcome, "not-applied");
    assert.equal(result.semanticChangesMade, 0);
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active?.authorizationId, AUTH_A);
    assert.equal(audit.active?.state, "authorized");
  });
});

test("candidate changed after authorization cannot consume prior Authority and does not overclaim a zero-write outcome", async () => {
  await withProject(async (path) => {
    const authorizedCandidate = goalCandidate("Authorized exact candidate");
    const authorizedProposal = await prepare(path, authorizedCandidate);
    await seedAuthorizedEvidence(path, authorizedProposal, AUTH_A);

    const changedCandidate = goalCandidate("Different candidate after authorization");
    const result = await maintainSemanticProjectState(changedCandidate, AUTH_A, path);
    assert.equal(result.state, "blocked");
    if (result.state !== "blocked") throw new Error("expected blocked");
    assert.equal(result.recoveryRequired, true);
    assert.equal(result.mutationOutcome, "unknown-recovery-required");
    assert.equal(result.semanticChangesMade, "unknown");
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active?.state, "authorized");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Different candidate after authorization/);
  });
});

test("exact duplicate returns review-required and does not consume even explicitly selected matching Authority", async () => {
  await withProject(async (path) => {
    const initial = goalCandidate("Already confirmed goal");
    const initialProposal = await prepare(path, initial);
    await seedAuthorizedEvidence(path, initialProposal, AUTH_B);
    await maintainSemanticProjectState(initial, AUTH_B, path);

    const duplicate = goalCandidate("Already confirmed goal");
    const duplicateProposal = await prepare(path, duplicate);
    await seedAuthorizedEvidence(path, duplicateProposal, AUTH_A);

    const result = await maintainSemanticProjectState(duplicate, AUTH_A, path);
    assert.equal(result.state, "review-required");
    if (result.state !== "review-required") throw new Error("expected review-required");
    assert.equal(result.semanticChangesMade, 0);
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active?.authorizationId, AUTH_A);
    assert.equal(audit.active?.state, "authorized");
  });
});

test("completed authorization cannot be replayed through maintain", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("One composed mutation only");
    const proposal = await prepare(path, candidate);
    await seedAuthorizedEvidence(path, proposal, AUTH_A);
    const first = await maintainSemanticProjectState(candidate, AUTH_A, path);
    assert.equal(first.state, "completed");

    const second = await maintainSemanticProjectState(candidate, AUTH_A, path);
    assert.equal(second.state, "review-required");
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
    assert.equal(audit.history.filter((record) => record.authorizationId === AUTH_A && record.state === "completed").length, 1);
  });
});

test("candidate schema cannot smuggle prior approval into maintain", () => {
  assert.throws(() => parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: "Do not trust provider approval claims",
    rationale: "Attack candidate authority boundary",
    origin: "provider-observation",
    userApproved: true,
  }), /unsupported field/i);
});
