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
const AUTH_THROW = "99999999-9999-4999-8999-999999999999";

async function projectId(path: string): Promise<string> {
  const metadata = JSON.parse(await readFile(resolve(path, ".project-brain", "metadata.json"), "utf8")) as { projectBrain: { projectId: string } };
  return metadata.projectBrain.projectId;
}

async function seedAuthorized(path: string, proposal: ActionableProposal, authorizationId: string): Promise<void> {
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
  await writeFile(resolve(projectRoot, "active.json"), `${JSON.stringify({ ...binding, schemaVersion: 1, kind: "semantic-mutation-authorization-audit", state: "authorized", authorizedAt }, null, 2)}\n`, "utf8");
  const machineRoot = resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", proposal.stableProjectIdentity);
  await mkdir(machineRoot, { recursive: true });
  await writeFile(resolve(machineRoot, `${authorizationId}.json`), `${JSON.stringify({ ...binding, schemaVersion: 1, kind: "semantic-mutation-authorization", state: "authorized", authorizedAt }, null, 2)}\n`, "utf8");
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

test("completed mutation with blocked post-apply context is reported truthfully and Authority remains terminal", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-maintenance-refresh-"));
  let machineProjectId: string | null = null;
  try {
    await initializeProject(path, { authorized: true });
    machineProjectId = await projectId(path);
    const { candidate: parsed, proposal } = await prepare(path, "Refresh failure must not make completed Authority replayable");
    await seedAuthorized(path, proposal, AUTH_ID);

    const metadataPath = resolve(path, ".project-brain", "metadata.json");
    const originalMetadata = await readFile(metadataPath, "utf8");
    const result = await maintainSemanticProjectState(parsed, AUTH_ID, path, {
      afterApplyBeforeRefresh: async () => {
        const metadata = JSON.parse(originalMetadata) as { projectBrain: { schemaVersion: number; projectId?: string } };
        delete metadata.projectBrain.projectId;
        await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
      },
    });

    assert.equal(result.state, "completed-context-blocked");
    if (result.state !== "completed-context-blocked") throw new Error("expected completed-context-blocked");
    assert.equal(result.semanticChangesMade, 1);
    assert.ok(result.context);
    assert.equal(result.context?.safetyState, "blocked");
    assert.match(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), /Refresh failure must not make completed Authority replayable/);

    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
    assert.ok(audit.history.some((record) => record.authorizationId === AUTH_ID && record.state === "completed"));

    await writeFile(metadataPath, originalMetadata, "utf8");
    const replay = await maintainSemanticProjectState(parsed, AUTH_ID, path);
    assert.equal(replay.state, "review-required");
  } finally {
    if (machineProjectId) {
      await rm(resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", machineProjectId), { recursive: true, force: true });
    }
    await rm(path, { recursive: true, force: true });
  }
});

test("thrown post-apply refresh failure remains completed-context-blocked and never becomes a zero-write input error", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-maintenance-refresh-throw-"));
  let machineProjectId: string | null = null;
  try {
    await initializeProject(path, { authorized: true });
    machineProjectId = await projectId(path);
    const statement = "Thrown refresh failure must preserve completed mutation truth";
    const { candidate: parsed, proposal } = await prepare(path, statement);
    await seedAuthorized(path, proposal, AUTH_THROW);

    const result = await maintainSemanticProjectState(parsed, AUTH_THROW, path, {
      afterApplyBeforeRefresh: () => {
        throw new Error("simulated refresh transport/read failure");
      },
    });

    assert.equal(result.state, "completed-context-blocked");
    if (result.state !== "completed-context-blocked") throw new Error("expected completed-context-blocked");
    assert.equal(result.semanticChangesMade, 1);
    assert.equal(result.context, null);
    assert.match(result.refreshError ?? "", /simulated refresh transport\/read failure/);
    assert.match(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), new RegExp(statement));

    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
    assert.ok(audit.history.some((record) => record.authorizationId === AUTH_THROW && record.state === "completed"));

    const replay = await maintainSemanticProjectState(parsed, AUTH_THROW, path);
    assert.equal(replay.state, "review-required");
  } finally {
    if (machineProjectId) {
      await rm(resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", machineProjectId), { recursive: true, force: true });
    }
    await rm(path, { recursive: true, force: true });
  }
});
