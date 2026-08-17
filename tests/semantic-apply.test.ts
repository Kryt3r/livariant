import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  applyActionableProposal,
  buildActionableProposal,
  initializeProject,
  inspectAuthorizationAudit,
  parseSemanticProposalCandidate,
  recordAcceptedDecision,
} from "../src/runtime/index.js";
import type { ActionableProposal } from "../src/runtime/actionable-proposal.js";

const FIXED_AUTH_ID = "33333333-3333-4333-8333-333333333333";

async function projectId(path: string): Promise<string> {
  const metadata = JSON.parse(await readFile(resolve(path, ".project-brain", "metadata.json"), "utf8")) as { projectBrain: { projectId: string } };
  return metadata.projectBrain.projectId;
}

async function cleanupMachineAuthority(path: string): Promise<void> {
  let id: string;
  try { id = await projectId(path); } catch { return; }
  await rm(resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", id), { recursive: true, force: true });
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-semantic-apply-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await cleanupMachineAuthority(path);
    await rm(path, { recursive: true, force: true });
  }
}

function decisionCandidate(statement = "Use passkeys") {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-decision",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "WP-027 Guardian migration boundary test",
    origin: "explicit-user",
  });
}

async function prepare(path: string, statement?: string): Promise<ActionableProposal> {
  const result = await buildActionableProposal(decisionCandidate(statement), path);
  assert.equal(result.state, "actionable-proposal");
  if (result.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  return result.proposal;
}

async function seedSameUserAuthorization(path: string, proposal: ActionableProposal, authorizationId = FIXED_AUTH_ID): Promise<void> {
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

  const machineRoot = resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", proposal.stableProjectIdentity);
  await mkdir(machineRoot, { recursive: true });
  await writeFile(resolve(machineRoot, `${authorizationId}.json`), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization",
    state: "authorized",
    authorizedAt,
  }, null, 2)}\n`, "utf8");
}

test("same-user project and machine authorization evidence cannot establish Semantic Apply Authority without Guardian", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path);
    await seedSameUserAuthorization(path, proposal);
    const before = await readFile(resolve(path, ".project-brain", "decisions.md"));

    await assert.rejects(
      applyActionableProposal(FIXED_AUTH_ID, proposal, path),
      /Protected Livariant Guardian is not ready|Matching active protected Guardian Semantic Authority is missing/i,
    );

    assert.deepEqual(await readFile(resolve(path, ".project-brain", "decisions.md")), before);
    assert.equal((await inspectAuthorizationAudit(path)).active?.state, "authorized");
  });
});

test("same-user authorization cannot exploit beforeConsume to bypass missing Guardian", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Do not trust local receipts");
    await seedSameUserAuthorization(path, proposal);
    let reachedBoundary = false;
    await assert.rejects(
      applyActionableProposal(FIXED_AUTH_ID, proposal, path, {
        beforeConsume: () => { reachedBoundary = true; },
      }),
      /Protected Livariant Guardian is not ready|Matching active protected Guardian Semantic Authority is missing/i,
    );
    assert.equal(reachedBoundary, true);
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "decisions.md"), "utf8"), /Do not trust local receipts/);
  });
});

test("stale baseline is refused before any Guardian Authority can be consumed", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Never spend stale Authority");
    await seedSameUserAuthorization(path, proposal);
    await recordAcceptedDecision("Concurrent durable decision", path, { authorized: true });

    await assert.rejects(
      applyActionableProposal(FIXED_AUTH_ID, proposal, path),
      /no longer matches|cannot reproduce|stale|current trusted Project Brain baseline/i,
    );
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "decisions.md"), "utf8"), /Never spend stale Authority/);
  });
});

test("wrong local authorization id cannot reach the Guardian consumption boundary", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, "Exact operation only");
    await seedSameUserAuthorization(path, proposal);
    await assert.rejects(
      applyActionableProposal("44444444-4444-4444-8444-444444444444", proposal, path),
      /not safely recoverable|not valid for this exact proposal|authorization/i,
    );
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "decisions.md"), "utf8"), /Exact operation only/);
  });
});
