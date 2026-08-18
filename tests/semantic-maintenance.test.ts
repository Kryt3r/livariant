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
import { addConfirmedGoal } from "../src/runtime/canonical-knowledge-change.js";
import type { ActionableProposal } from "../src/runtime/actionable-proposal.js";
import type { SemanticProposalCandidate } from "../src/runtime/semantic-proposal.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

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

async function seedSameUserAuthorization(path: string, proposal: ActionableProposal, authorizationId = AUTH_A): Promise<void> {
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

test("maintain without authorization id never consumes matching same-user evidence implicitly", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("Require explicit authorization selector");
    const proposal = await prepare(path, candidate);
    await seedSameUserAuthorization(path, proposal);

    const result = await maintainSemanticProjectState(candidate, undefined, path);
    assert.equal(result.state, "authorization-required");
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active?.authorizationId, AUTH_A);
    assert.equal(audit.active?.state, "authorized");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Require explicit authorization selector/);
  });
});

test("matching same-user authorization selector is blocked without Guardian and truthfully reports not-applied", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("Finish composed maintenance");
    const proposal = await prepare(path, candidate);
    await seedSameUserAuthorization(path, proposal);

    const result = await maintainSemanticProjectState(candidate, AUTH_A, path);
    assert.equal(result.state, "blocked");
    if (result.state !== "blocked") throw new Error("expected blocked");
    assert.equal(result.phase, "apply");
    assert.equal(result.recoveryRequired, false);
    assert.equal(result.mutationOutcome, "not-applied");
    assert.equal(result.semanticChangesMade, 0);
    assert.match(result.message, /Guardian/i);
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Finish composed maintenance/);
    assert.equal((await inspectAuthorizationAudit(path)).active?.state, "authorized");
  });
});

test("wrong authorization id fails closed without consuming the exact active local audit", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("Reject wrong authorization selector");
    const proposal = await prepare(path, candidate);
    await seedSameUserAuthorization(path, proposal, AUTH_A);

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

test("candidate changed after local authorization remains definitely not-applied", async () => {
  await withProject(async (path) => {
    const authorizedCandidate = goalCandidate("Authorized exact candidate");
    const authorizedProposal = await prepare(path, authorizedCandidate);
    await seedSameUserAuthorization(path, authorizedProposal, AUTH_A);

    const changedCandidate = goalCandidate("Different candidate after authorization");
    const result = await maintainSemanticProjectState(changedCandidate, AUTH_A, path);
    assert.equal(result.state, "blocked");
    if (result.state !== "blocked") throw new Error("expected blocked");
    assert.equal(result.recoveryRequired, false);
    assert.equal(result.mutationOutcome, "not-applied");
    assert.equal(result.semanticChangesMade, 0);
    assert.equal((await inspectAuthorizationAudit(path)).active?.state, "authorized");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Different candidate after authorization/);
  });
});

test("exact duplicate returns review-required without consulting or consuming selected Authority", async () => {
  await withProject(async (path) => {
    await mutateAcceptedFixture(path, async () => {
      await addConfirmedGoal("Already confirmed goal", path, { authorized: true });
    });
    const duplicate = goalCandidate("Already confirmed goal");
    const result = await maintainSemanticProjectState(duplicate, AUTH_A, path);
    assert.equal(result.state, "review-required");
    if (result.state !== "review-required") throw new Error("expected review-required");
    assert.equal(result.semanticChangesMade, 0);
    assert.equal((await inspectAuthorizationAudit(path)).active, null);
  });
});

test("same-user evidence cannot be promoted into a completed maintain result by replay", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("One composed mutation only");
    const proposal = await prepare(path, candidate);
    await seedSameUserAuthorization(path, proposal, AUTH_A);

    const first = await maintainSemanticProjectState(candidate, AUTH_A, path);
    assert.equal(first.state, "blocked");
    const second = await maintainSemanticProjectState(candidate, AUTH_A, path);
    assert.equal(second.state, "blocked");
    assert.equal((await inspectAuthorizationAudit(path)).active?.state, "authorized");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /One composed mutation only/);
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
