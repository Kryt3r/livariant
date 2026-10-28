import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/initialization.js";
import { buildProjectKnowledgeProjection } from "../src/intelligence/knowledge-projection.js";
import { planKnowledgeSchemaTransition } from "../src/intelligence/knowledge-schema-transition-plan.js";
import { buildKnowledgeMigrationIntentCandidate } from "../src/intelligence/knowledge-schema-migration-intent.js";
import { readProjectContextManagedInputs } from "../src/runtime/project-context-material.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";
import { recordAcceptedDecision } from "../src/runtime/canonical-change.js";

const TX = "11111111-1111-4111-8111-111111111111";
const AUTH = "22222222-2222-4222-8222-222222222222";
const RECEIPT = "33333333-3333-4333-8333-333333333333";

async function fixture<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-migration-intent-"));
  try {
    await initializeProject(root, { authorized: true });
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function scenario(root: string) {
  const sourceProjection = await buildProjectKnowledgeProjection(root);
  assert.equal(sourceProjection.state, "ready");
  if (sourceProjection.state !== "ready") throw Error("expected ready source projection");
  const originalInputs = await readProjectContextManagedInputs(resolve(root, ".project-brain"));
  const plan = planKnowledgeSchemaTransition(sourceProjection, originalInputs);
  const args = {
    plan, sourceProjection, originalInputs,
    transactionId: TX,
    authorizationOperationId: AUTH,
    protectedSourceRecordId: RECEIPT,
    declaredPhysicalProjectRoot: root,
    declaredPhysicalBrainRoot: resolve(root, ".project-brain"),
  };
  return args;
}

test("migration approval material binds exact source and target but is explicitly NOT issuable", async () => {
  await fixture(async root => {
    const args = await scenario(root);
    const first = buildKnowledgeMigrationIntentCandidate(args);
    const replay = buildKnowledgeMigrationIntentCandidate(args);
    assert.deepEqual(first, replay);
    assert.match(first.materialSha256, /^[a-f0-9]{64}$/);
    assert.equal(first.state, "untrusted-approval-material-only");
    assert.equal(first.stableProjectIdentity, args.sourceProjection.stableProjectIdentity);
    assert.equal(first.sourceBaselineSha256, args.plan.source.baselineDigest);
    assert.equal(first.targetMaterialSha256, args.plan.proposedTarget.targetDigest);
    assert.deepEqual(first.boundaries, {
      physicalPathsIndependentlyVerified: false,
      sourceGuardianRecordIndependentlyVerified: false,
      explicitUserApprovalReceived: false,
      protectedMigrationFenceArmed: false,
      guardianRequestIssuable: false,
      oneShotAuthorityUsable: false,
      canonicalWritesAllowed: false,
      targetAccepted: false,
      changesMade: 0,
    });
    await assert.rejects(stat(resolve(root, ".project-brain", "knowledge-registry.json")), { code: "ENOENT" });
  });
});

test("independent operation, protected receipt and declared paths change exact intent digest", async () => {
  await fixture(async root => {
    const args = await scenario(root);
    const old = buildKnowledgeMigrationIntentCandidate(args).materialSha256;
    const changes = [
      { transactionId: "44444444-4444-4444-8444-444444444444" },
      { authorizationOperationId: "55555555-5555-4555-8555-555555555555" },
      { protectedSourceRecordId: "66666666-6666-4666-8666-666666666666" },
      { declaredPhysicalProjectRoot: resolve(root, "relocated"), declaredPhysicalBrainRoot: resolve(root, "relocated", ".project-brain") },
    ];
    for (const change of changes) {
      const next = buildKnowledgeMigrationIntentCandidate({ ...args, ...change });
      assert.notEqual(old, next.materialSha256);
    }
  });
});

test("source edits, copied project and altered proposed target cannot reuse an intent", async () => {
  await fixture(async a => {
    await fixture(async b => {
      const left = await scenario(a);
      const right = await scenario(b);
      const aDigest = buildKnowledgeMigrationIntentCandidate(left).materialSha256;
      const bDigest = buildKnowledgeMigrationIntentCandidate(right).materialSha256;
      assert.notEqual(aDigest, bDigest);
      assert.throws(() => buildKnowledgeMigrationIntentCandidate({
        ...left, sourceProjection: right.sourceProjection, originalInputs: right.originalInputs,
      }), /stale|tampered|source bytes differ/);
      const forgedPlan = structuredClone(left.plan);
      forgedPlan.proposedTarget.targetDigest = "f".repeat(64);
      assert.throws(() => buildKnowledgeMigrationIntentCandidate({ ...left, plan: forgedPlan }), /stale|tampered/);
      await mutateAcceptedFixture(a, async () => {
        await recordAcceptedDecision("Accepted future migration evidence", a, { authorized: true });
      });
      const newer = await scenario(a);
      assert.throws(() => buildKnowledgeMigrationIntentCandidate({
        ...newer, plan: left.plan,
      }), /stale|tampered/);
      assert.notEqual(aDigest, buildKnowledgeMigrationIntentCandidate(newer).materialSha256);
    });
  });
});

test("invalid or reused identities, relative roots and mismatched Project Brain root fail closed", async () => {
  await fixture(async root => {
    const args = await scenario(root);
    assert.throws(() => buildKnowledgeMigrationIntentCandidate({ ...args, transactionId: "not-a-uuid" }), /transaction id/);
    assert.throws(() => buildKnowledgeMigrationIntentCandidate({ ...args, authorizationOperationId: TX }), /must be distinct/);
    assert.throws(() => buildKnowledgeMigrationIntentCandidate({ ...args, protectedSourceRecordId: AUTH }), /must be distinct/);
    assert.throws(() => buildKnowledgeMigrationIntentCandidate({ ...args, declaredPhysicalProjectRoot: "./relative" }), /normalized absolute path/);
    assert.throws(() => buildKnowledgeMigrationIntentCandidate({ ...args, declaredPhysicalBrainRoot: root }), /does not match project root/);
    assert.throws(() => buildKnowledgeMigrationIntentCandidate({ ...args, declaredPhysicalBrainRoot: resolve(root, "other-brain") }), /does not match project root/);
  });
});
