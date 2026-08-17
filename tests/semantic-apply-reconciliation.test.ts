import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  addConfirmedGoal,
  applyActionableProposal,
  buildActionableProposal,
  initializeProject,
  inspectAuthorizationAudit,
  parseSemanticProposalCandidate,
  recordAcceptedDecision,
} from "../src/runtime/index.js";
import type { ActionableProposal } from "../src/runtime/actionable-proposal.js";
import {
  reconcileFailedAuthorizationApplication,
  reconcilePreMutationAuthorization,
} from "../src/runtime/semantic-apply-reconciliation.js";

type ProjectState = "authorized" | "applying";
type MachineState = "authorized" | "applying" | "completed" | "failed-recovery-required";

const AUTH_ID = "55555555-5555-4555-8555-555555555555";

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
  const path = await mkdtemp(resolve(tmpdir(), "livariant-apply-reconcile-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await cleanupMachineAuthority(path);
    await rm(path, { recursive: true, force: true });
  }
}

function goalCandidate(statement = "Ship exact semantic apply") {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "Exercise interrupted local audit state",
    origin: "explicit-user",
  });
}

async function prepare(path: string, statement?: string): Promise<ActionableProposal> {
  const result = await buildActionableProposal(goalCandidate(statement), path);
  assert.equal(result.state, "actionable-proposal");
  if (result.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  return result.proposal;
}

async function seedSplit(
  path: string,
  proposal: ActionableProposal,
  projectState: ProjectState,
  machineState: MachineState,
  mutateMachine?: (receipt: Record<string, unknown>) => void,
): Promise<void> {
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
    state: projectState,
    authorizedAt,
  }, null, 2)}\n`, "utf8");

  const root = machineRoot(proposal.stableProjectIdentity);
  await mkdir(root, { recursive: true });
  const receipt: Record<string, unknown> = {
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization",
    state: machineState,
    authorizedAt,
  };
  mutateMachine?.(receipt);
  await writeFile(resolve(root, `${AUTH_ID}.json`), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

async function machineState(path: string, proposal: ActionableProposal): Promise<string> {
  const receipt = JSON.parse(await readFile(resolve(machineRoot(proposal.stableProjectIdentity), `${AUTH_ID}.json`), "utf8")) as { state: string };
  return receipt.state;
}

test("local authorized/applying split may align audit evidence forward but does not itself apply semantic state", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path);
    await seedSplit(path, proposal, "authorized", "applying");
    assert.equal(await reconcilePreMutationAuthorization(AUTH_ID, proposal, path), "applying");
    assert.equal((await inspectAuthorizationAudit(path)).active?.state, "applying");
    assert.equal(await machineState(path, proposal), "applying");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Ship exact semantic apply/);
  });
});

test("local applying/applying split is idempotent audit recovery only", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Resume exact pre-state");
    await seedSplit(path, proposal, "applying", "applying");
    assert.equal(await reconcilePreMutationAuthorization(AUTH_ID, proposal, path), "applying");
    assert.equal(await machineState(path, proposal), "applying");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Resume exact pre-state/);
  });
});

test("guarded apply refuses local authorized/applying recovery when protected consumed Guardian evidence is absent", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Local recovery is not Authority");
    await seedSplit(path, proposal, "authorized", "applying");
    await assert.rejects(
      applyActionableProposal(AUTH_ID, proposal, path),
      /Protected Livariant Guardian is not ready|consumed Semantic Authority|Guardian-bound reconciliation/i,
    );
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Local recovery is not Authority/);
  });
});

test("authorized/applying split refuses stale canonical baseline before Guardian-bound recovery", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Do not replay stale Authority");
    await seedSplit(path, proposal, "authorized", "applying");
    await recordAcceptedDecision("Concurrent unrelated decision", path, { authorized: true });
    await assert.rejects(applyActionableProposal(AUTH_ID, proposal, path), /not safely recoverable|changed|reconciliation refused/i);
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Do not replay stale Authority/);
  });
});

test("applying/applying with changed baseline refuses replay even when desired semantic postcondition exists", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Postcondition alone is not recovery proof");
    await seedSplit(path, proposal, "applying", "applying");
    await addConfirmedGoal("Postcondition alone is not recovery proof", path, { authorized: true });
    await assert.rejects(applyActionableProposal(AUTH_ID, proposal, path), /not safely recoverable|changed|reconciliation refused/i);
    assert.equal((await inspectAuthorizationAudit(path)).active?.state, "applying");
  });
});

test("local failed/applying evidence may be aligned to terminal failure without becoming Authority", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Never resurrect failed Authority");
    await seedSplit(path, proposal, "applying", "failed-recovery-required");
    const failed = await reconcileFailedAuthorizationApplication(AUTH_ID, proposal, path);
    assert.equal(failed.state, "failed-recovery-required");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Never resurrect failed Authority/);
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
    assert.ok(audit.history.some((item) => item.authorizationId === AUTH_ID && item.state === "failed-recovery-required"));
  });
});

test("unsupported authorized/completed local state pair remains fail-closed", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Unsupported state pair");
    await seedSplit(path, proposal, "authorized", "completed");
    await assert.rejects(reconcilePreMutationAuthorization(AUTH_ID, proposal, path), /not eligible/i);
    assert.equal((await inspectAuthorizationAudit(path)).active?.state, "authorized");
  });
});

test("active machine transition lock blocks local reconciliation", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Respect active machine lock");
    await seedSplit(path, proposal, "authorized", "applying");
    await mkdir(resolve(machineRoot(proposal.stableProjectIdentity), `${AUTH_ID}.lock`));
    await assert.rejects(reconcilePreMutationAuthorization(AUTH_ID, proposal, path), /transition lock/i);
  });
});

test("local reconciliation rejects machine receipt with unsupported nested scope material", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Reject loose machine receipt");
    await seedSplit(path, proposal, "authorized", "applying", (receipt) => {
      receipt.mutationScope = { ...(receipt.mutationScope as Record<string, unknown>), injectedAuthority: true };
    });
    await assert.rejects(reconcilePreMutationAuthorization(AUTH_ID, proposal, path), /scope.*shape|unsupported/i);
  });
});
