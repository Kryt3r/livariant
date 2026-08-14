import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  assertAuthorizationReadyForApply,
  authorizeActionableProposal,
  buildActionableProposal,
  buildSemanticProposal,
  initializeProject,
  inspectAuthorizationAudit,
  parseActionableProposal,
  parseSemanticProposalCandidate,
  recordAcceptedDecision,
} from "../src/runtime/index.js";
import {
  beginAuthorizationApplication,
  completeAuthorizationApplication,
  failAuthorizationApplication,
} from "../src/runtime/authorization.js";

function candidate(statement = "Use passkeys") {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-decision",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "Explicitly review the project direction",
    origin: "explicit-user",
  });
}

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
  const path = await mkdtemp(resolve(tmpdir(), "livariant-proposal-auth-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await cleanupMachineAuthority(path);
    await rm(path, { recursive: true, force: true });
  }
}

async function prepared(path: string, statement = "Use passkeys") {
  const result = await buildActionableProposal(candidate(statement), path);
  assert.equal(result.state, "actionable-proposal");
  if (result.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  return result.proposal;
}

const semanticFiles = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"] as const;

test("review-only proposal remains permanently non-actionable while actionable proposal is structurally distinct", async () => {
  await withProject(async (path) => {
    const input = candidate();
    const review = await buildSemanticProposal(input, path);
    const action = await buildActionableProposal(input, path);
    assert.equal(review.state, "proposal");
    assert.equal(action.state, "actionable-proposal");
    if (review.state !== "proposal" || action.state !== "actionable-proposal") return;

    assert.equal(review.proposal.actionability.reviewOnly, true);
    assert.equal(review.proposal.actionability.mutationAuthorization, false);
    assert.equal(review.proposal.actionability.applySupported, false);
    assert.equal(review.proposal.actionability.authorizationEligible, false);
    assert.equal(action.proposal.actionability.authorizationEligible, true);
    assert.equal(action.proposal.actionability.mutationAuthorization, false);
    assert.equal(action.proposal.actionability.applySupported, false);
    assert.equal(action.proposal.actionability.authorizationRequired, true);
    assert.notEqual(action.proposal.actionableProposalId, review.proposal.proposalId);
    assert.notEqual(action.proposal.materialDigest.digest, review.proposal.materialDigest.digest);
  });
});

test("actionable proposal is deterministic for identical material and changes with mutation scope", async () => {
  await withProject(async (path) => {
    const first = await prepared(path, "Use passkeys");
    const same = await prepared(path, "Use passkeys");
    const changed = await prepared(path, "Use hardware keys");
    assert.equal(first.actionableProposalId, same.actionableProposalId);
    assert.equal(first.materialDigest.digest, same.materialDigest.digest);
    assert.notEqual(first.actionableProposalId, changed.actionableProposalId);
  });
});

test("tampering with actionable proposal material invalidates its digest", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    const tampered = structuredClone(proposal) as unknown as Record<string, unknown>;
    const scope = structuredClone(proposal.mutationScope) as unknown as Record<string, unknown>;
    scope.proposedStatement = "Injected replacement";
    tampered.mutationScope = scope;
    assert.throws(() => parseActionableProposal(tampered), /digest does not match/);
  });
});

test("authorization binds current baseline and refuses stale actionable proposal", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    await recordAcceptedDecision("Concurrent durable decision", path, { authorized: true });
    await assert.rejects(authorizeActionableProposal(proposal, path), /no longer matches|cannot reproduce/);
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
  });
});

test("authorization creates dual evidence without changing semantic Project Brain files", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    const before = new Map(await Promise.all(semanticFiles.map(async (name) => [name, await readFile(resolve(path, ".project-brain", name))] as const)));
    const result = await authorizeActionableProposal(proposal, path);
    assert.equal(result.machineAuthorityVerified, true);
    assert.equal(result.mutationAuthorization, true);
    assert.equal(result.applySupported, false);
    assert.equal(result.semanticChangesMade, 0);
    assert.equal(result.authorization.state, "authorized");
    await assertAuthorizationReadyForApply(result.authorization.authorizationId, proposal, path);
    for (const name of semanticFiles) assert.deepEqual(await readFile(resolve(path, ".project-brain", name)), before.get(name));
  });
});

test("project-local authorization-looking bytes alone cannot establish authority", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    const authorizationId = "11111111-1111-4111-8111-111111111111";
    const root = resolve(path, ".project-brain", ".authorizations");
    await mkdir(resolve(root, "history"), { recursive: true });
    await writeFile(resolve(root, "active.json"), `${JSON.stringify({
      schemaVersion: 1,
      kind: "semantic-mutation-authorization-audit",
      state: "authorized",
      authorizedAt: new Date().toISOString(),
      authorizationId,
      stableProjectIdentity: proposal.stableProjectIdentity,
      actionableProposalId: proposal.actionableProposalId,
      actionableProposalVersion: 1,
      proposalDigest: proposal.materialDigest.digest,
      mutationScope: proposal.mutationScope,
      baseline: proposal.baseline,
    }, null, 2)}\n`, "utf8");
    await assert.rejects(assertAuthorizationReadyForApply(authorizationId, proposal, path), /machine-local authorization is missing|Matching independent machine-local authorization is missing/i);
  });
});

test("machine-local receipt alone cannot establish authority without matching project audit", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    const result = await authorizeActionableProposal(proposal, path);
    await rm(resolve(path, ".project-brain", ".authorizations", "active.json"));
    await assert.rejects(assertAuthorizationReadyForApply(result.authorization.authorizationId, proposal, path), /No active project-local authorization audit/);
  });
});

test("concurrent consumers cannot both transition the same authorization to applying", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    const result = await authorizeActionableProposal(proposal, path);
    const attempts = await Promise.allSettled([
      beginAuthorizationApplication(result.authorization.authorizationId, proposal, path),
      beginAuthorizationApplication(result.authorization.authorizationId, proposal, path),
    ]);
    assert.equal(attempts.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((item) => item.status === "rejected").length, 1);
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active?.state, "applying");
    await failAuthorizationApplication(result.authorization.authorizationId, path);
  });
});

test("completed authorization is terminal and cannot be replayed", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    const result = await authorizeActionableProposal(proposal, path);
    await beginAuthorizationApplication(result.authorization.authorizationId, proposal, path);
    const completed = await completeAuthorizationApplication(result.authorization.authorizationId, path);
    assert.equal(completed.state, "completed");
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
    assert.ok(audit.history.some((record) => record.authorizationId === result.authorization.authorizationId && record.state === "completed"));
    await assert.rejects(beginAuthorizationApplication(result.authorization.authorizationId, proposal, path), /No active authorization exists/);
  });
});

test("failed-recovery-required authorization is terminal and cannot be reused", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    const result = await authorizeActionableProposal(proposal, path);
    await beginAuthorizationApplication(result.authorization.authorizationId, proposal, path);
    const failed = await failAuthorizationApplication(result.authorization.authorizationId, path);
    assert.equal(failed.state, "failed-recovery-required");
    await assert.rejects(assertAuthorizationReadyForApply(result.authorization.authorizationId, proposal, path), /No active project-local authorization audit/);
  });
});

test("authorization revalidates concurrent managed change immediately before commit", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    await assert.rejects(authorizeActionableProposal(proposal, path, {
      beforeCommit: async () => {
        await recordAcceptedDecision("Changed before authorization commit", path, { authorized: true });
      },
    }), /no longer matches|cannot reproduce/);
    assert.equal((await inspectAuthorizationAudit(path)).active, null);
  });
});