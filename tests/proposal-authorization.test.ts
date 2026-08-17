import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstat, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  buildActionableProposal,
  buildSemanticProposal,
  initializeProject,
  parseActionableProposal,
  parseSemanticProposalCandidate,
  recordAcceptedDecision,
} from "../src/runtime/index.js";
import {
  assertAuthorizationReadyForApply,
  authorizeActionableProposal,
  beginAuthorizationApplication,
  completeAuthorizationApplication,
  failAuthorizationApplication,
  inspectAuthorizationAudit,
} from "../src/runtime/authorization.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const FIXED_AUTH_ID = "22222222-2222-4222-8222-222222222222";

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

async function seedAuthorizedEvidence(path: string, proposal: Awaited<ReturnType<typeof prepared>>, authorizationId = FIXED_AUTH_ID): Promise<void> {
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

function runInteractiveAuthorize(path: string, proposalPath: string, challenge: string) {
  const command = `${JSON.stringify(process.execPath)} ${JSON.stringify(cliPath)} authorize --input ${JSON.stringify(proposalPath)} --json`;
  return spawnSync("script", ["-qfec", command, "/dev/null"], {
    cwd: path,
    input: `${challenge}\n`,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
}

async function assertMissing(path: string): Promise<void> {
  await assert.rejects(lstat(path), (error: unknown) => error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT");
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

test("authorization binds current baseline and refuses stale actionable proposal before user-presence prompt", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    await recordAcceptedDecision("Concurrent durable decision", path, { authorized: true });
    await assert.rejects(authorizeActionableProposal(proposal, path), /no longer matches|cannot reproduce/);
    assert.equal((await inspectAuthorizationAudit(path)).active, null);
  });
});

test("non-interactive authorization is blocked before project or machine audit state is created", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    const projectAuthorityRoot = resolve(path, ".project-brain", ".authorizations");
    const machineAuthorityRoot = resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", proposal.stableProjectIdentity);
    await assert.rejects(authorizeActionableProposal(proposal, path), /interactive local terminal/);
    await assertMissing(projectAuthorityRoot);
    await assertMissing(machineAuthorityRoot);
    assert.deepEqual(await inspectAuthorizationAudit(path), { active: null, history: [] });
  });
});

test("authorization audit inspection is read-only when no authorization state exists", async () => {
  await withProject(async (path) => {
    const root = resolve(path, ".project-brain", ".authorizations");
    assert.deepEqual(await inspectAuthorizationAudit(path), { active: null, history: [] });
    await assertMissing(root);
  });
});

test("interactive local CLI does not report successful authorization when Guardian is unavailable", { skip: process.platform === "win32" }, async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    const proposalPath = resolve(path, "actionable.json");
    await writeFile(proposalPath, `${JSON.stringify(proposal)}\n`, "utf8");
    const before = new Map(await Promise.all(semanticFiles.map(async (name) => [name, await readFile(resolve(path, ".project-brain", name))] as const)));
    const result = runInteractiveAuthorize(path, proposalPath, `AUTHORIZE ${proposal.materialDigest.digest.slice(0, 12)}`);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /Protected Livariant Guardian is not ready|Guardian root is not provisioned/i);
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active?.state, "authorized");
    assert.ok(audit.active?.authorizationId);
    await assertAuthorizationReadyForApply(audit.active!.authorizationId, proposal, path);
    for (const name of semanticFiles) assert.deepEqual(await readFile(resolve(path, ".project-brain", name)), before.get(name));
  });
});

test("project-local authorization-looking bytes alone cannot establish local readiness", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    const root = resolve(path, ".project-brain", ".authorizations");
    await mkdir(resolve(root, "history"), { recursive: true });
    await writeFile(resolve(root, "active.json"), `${JSON.stringify({
      schemaVersion: 1,
      kind: "semantic-mutation-authorization-audit",
      state: "authorized",
      authorizedAt: new Date().toISOString(),
      authorizationId: FIXED_AUTH_ID,
      stableProjectIdentity: proposal.stableProjectIdentity,
      actionableProposalId: proposal.actionableProposalId,
      actionableProposalVersion: 1,
      proposalDigest: proposal.materialDigest.digest,
      mutationScope: proposal.mutationScope,
      baseline: proposal.baseline,
    }, null, 2)}\n`, "utf8");
    await assert.rejects(assertAuthorizationReadyForApply(FIXED_AUTH_ID, proposal, path), /machine-local authorization is missing|Matching independent machine-local authorization is missing/i);
  });
});

test("machine-local receipt alone cannot establish local readiness without matching project audit", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    await seedAuthorizedEvidence(path, proposal);
    await rm(resolve(path, ".project-brain", ".authorizations", "active.json"));
    await assert.rejects(assertAuthorizationReadyForApply(FIXED_AUTH_ID, proposal, path), /No active project-local authorization audit/);
  });
});

test("unsupported project authorization entries fail closed", async () => {
  await withProject(async (path) => {
    const root = resolve(path, ".project-brain", ".authorizations");
    await mkdir(resolve(root, "history"), { recursive: true });
    await writeFile(resolve(root, "shadow.json"), "{}\n", "utf8");
    await assert.rejects(inspectAuthorizationAudit(path), /unsupported or ambiguous entry/);
  });
});

test("concurrent local audit consumers cannot both transition the same record to applying", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    await seedAuthorizedEvidence(path, proposal);
    const attempts = await Promise.allSettled([
      beginAuthorizationApplication(FIXED_AUTH_ID, proposal, path),
      beginAuthorizationApplication(FIXED_AUTH_ID, proposal, path),
    ]);
    assert.equal(attempts.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((item) => item.status === "rejected").length, 1);
    assert.equal((await inspectAuthorizationAudit(path)).active?.state, "applying");
    await failAuthorizationApplication(FIXED_AUTH_ID, path);
  });
});

test("completed local audit is terminal and cannot be replayed", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    await seedAuthorizedEvidence(path, proposal);
    await beginAuthorizationApplication(FIXED_AUTH_ID, proposal, path);
    const completed = await completeAuthorizationApplication(FIXED_AUTH_ID, path);
    assert.equal(completed.state, "completed");
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
    assert.ok(audit.history.some((record) => record.authorizationId === FIXED_AUTH_ID && record.state === "completed"));
    await assert.rejects(beginAuthorizationApplication(FIXED_AUTH_ID, proposal, path), /No active authorization exists/);
  });
});

test("failed local audit is terminal and cannot be reused", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    await seedAuthorizedEvidence(path, proposal);
    await beginAuthorizationApplication(FIXED_AUTH_ID, proposal, path);
    const failed = await failAuthorizationApplication(FIXED_AUTH_ID, path);
    assert.equal(failed.state, "failed-recovery-required");
    await assert.rejects(assertAuthorizationReadyForApply(FIXED_AUTH_ID, proposal, path), /No active project-local authorization audit/);
  });
});
