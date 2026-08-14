import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  buildActionableProposal,
  initializeProject,
  inspectAuthorizationAudit,
  parseSemanticProposalCandidate,
} from "../src/runtime/index.js";
import type { ActionableProposal } from "../src/runtime/actionable-proposal.js";
import { buildProviderContext } from "../src/runtime/provider-context.js";
import {
  processProviderReturn,
  providerReturnTaskDigest,
} from "../src/runtime/provider-return.js";
import type { SemanticProposalCandidate } from "../src/runtime/semantic-proposal.js";

const AUTH_ID = "88888888-8888-4888-8888-888888888888";

async function projectId(path: string): Promise<string> {
  const metadata = JSON.parse(await readFile(resolve(path, ".project-brain", "metadata.json"), "utf8")) as {
    projectBrain: { projectId: string };
  };
  return metadata.projectBrain.projectId;
}

function machineRoot(id: string): string {
  return resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", id);
}

async function cleanupMachineAuthority(path: string): Promise<void> {
  try {
    await rm(machineRoot(await projectId(path)), { recursive: true, force: true });
  } catch {
    // Project setup may have failed before identity existed.
  }
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-provider-return-authority-"));
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
    rationale: "Exercise provider roundtrip authority boundary",
    origin: "provider-observation",
  });
}

async function readyContext(path: string, task = "Return one durable candidate") {
  const context = await buildProviderContext("codex", task, path);
  assert.equal(context.state, "ready");
  if (context.state !== "ready") throw new Error("expected ready Provider Context");
  return context;
}

function externalCandidate(candidate: SemanticProposalCandidate) {
  return candidate.domain === "project-decision" && candidate.changeKind === "supersede"
    ? {
        schemaVersion: candidate.schemaVersion,
        domain: candidate.domain,
        changeKind: candidate.changeKind,
        proposedStatement: candidate.proposedStatement,
        rationale: candidate.rationale,
        origin: candidate.originClaim,
        targetDecisionId: candidate.targetDecisionId,
      }
    : {
        schemaVersion: candidate.schemaVersion,
        domain: candidate.domain,
        changeKind: candidate.changeKind,
        proposedStatement: candidate.proposedStatement,
        rationale: candidate.rationale,
        origin: candidate.originClaim,
      };
}

function providerReturn(
  context: Awaited<ReturnType<typeof readyContext>>,
  candidate: SemanticProposalCandidate | null,
) {
  return {
    schemaVersion: 1,
    packetVersion: 1,
    provider: context.provider,
    contextPacketId: context.packetId,
    stableProjectIdentity: context.stableProjectIdentity,
    baselineDigest: context.baseline.digest,
    taskDigest: providerReturnTaskDigest(context.task.value),
    candidate: candidate === null ? null : externalCandidate(candidate),
  };
}

async function actionable(path: string, candidate: SemanticProposalCandidate): Promise<ActionableProposal> {
  const result = await buildActionableProposal(candidate, path);
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

test("provider return never consumes matching existing Authority without an explicit selector", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("Require explicit roundtrip authorization selector");
    const context = await readyContext(path);
    await seedAuthorizedEvidence(path, await actionable(path, candidate));

    const result = await processProviderReturn(context, providerReturn(context, candidate), undefined, path);
    assert.equal(result.state, "candidate-received");
    if (result.state !== "candidate-received") return;
    assert.equal(result.maintenance.state, "authorization-required");
    assert.equal(result.semanticChangesMade, 0);

    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active?.authorizationId, AUTH_ID);
    assert.equal(audit.active?.state, "authorized");
  });
});

test("provider return with the exact explicit selector completes only through existing Semantic Apply", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("Complete exact provider roundtrip mutation");
    const context = await readyContext(path);
    await seedAuthorizedEvidence(path, await actionable(path, candidate));

    const result = await processProviderReturn(context, providerReturn(context, candidate), AUTH_ID, path);
    assert.equal(result.state, "candidate-received");
    if (result.state !== "candidate-received") return;
    assert.equal(result.maintenance.state, "completed");
    assert.equal(result.semanticChangesMade, 1);
    assert.match(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Complete exact provider roundtrip mutation/);

    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
    assert.ok(audit.history.some((record) => record.authorizationId === AUTH_ID && record.state === "completed"));
  });
});

test("terminal Authority cannot be replayed through provider return", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("Provider roundtrip applies once");
    const context = await readyContext(path);
    await seedAuthorizedEvidence(path, await actionable(path, candidate));

    const first = await processProviderReturn(context, providerReturn(context, candidate), AUTH_ID, path);
    assert.equal(first.state, "candidate-received");
    assert.equal(first.semanticChangesMade, 1);

    const second = await processProviderReturn(context, providerReturn(context, candidate), AUTH_ID, path);
    assert.equal(second.state, "stale-context");
    assert.equal(second.semanticChangesMade, 0);

    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.history.filter((record) => record.authorizationId === AUTH_ID && record.state === "completed").length, 1);
  });
});

test("provider return copied from another logical project is rejected against fresh local identity", async () => {
  await withProject(async (pathA) => {
    await withProject(async (pathB) => {
      const contextA = await readyContext(pathA, "Cross-project return attack");
      const result = await processProviderReturn(contextA, providerReturn(contextA, null), undefined, pathB);
      assert.equal(result.state, "mismatched-context");
      if (result.state !== "mismatched-context") return;
      assert.equal(result.phase, "current-project");
      assert.equal(result.semanticChangesMade, 0);
    });
  });
});
