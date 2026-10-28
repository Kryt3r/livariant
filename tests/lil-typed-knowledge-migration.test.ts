import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  planTypedKnowledgeMigration,
  assertTypedKnowledgeMigrationPreviewStillCurrent,
  prepareProtectedTypedKnowledgeMigrationPreview,
} from "../src/intelligence/typed-knowledge-migration.js";
import { buildProjectKnowledgeProjection } from "../src/intelligence/knowledge-projection.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";
import { initializeProject } from "../src/runtime/initialization.js";
import { recordAcceptedDecision, supersedeAcceptedDecision } from "../src/runtime/canonical-change.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

const MANAGED = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"] as const;

async function fixture(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-typed-knowledge-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

async function managedBytes(path: string): Promise<Buffer[]> {
  return Promise.all(MANAGED.map(name => readFile(resolve(path, ".project-brain", name))));
}

test("protected typed migration preview is deterministic, versioned, read-only, and does not create truth", async () => {
  await fixture(async path => {
    const before = await managedBytes(path);
    const projection = await buildProjectKnowledgeProjection(path);
    assert.equal(projection.state, "ready");
    if (projection.state !== "ready") return;
    const first = planTypedKnowledgeMigration(projection);
    const second = planTypedKnowledgeMigration(projection);
    assertTypedKnowledgeMigrationPreviewStillCurrent(first, projection);
    // A local test receipt must NEVER pass the independent Guardian gate.
    const protectedAttempt = await prepareProtectedTypedKnowledgeMigrationPreview(path);
    assert.equal(protectedAttempt.state, "blocked");

    assert.deepEqual(first, second);
    assert.equal(first.schemaVersion, 1);
    assert.match(first.previewDigest, /^[a-f0-9]{64}$/);
    assert.equal(first.source.schemaVersion, 2);
    assert.equal(first.target.kind, "in-place-project-brain-upgrade");
    assert.equal(first.target.migrationCommitted, false);
    assert.equal(first.target.canonicalMutationAvailable, false);
    assert.equal(first.boundaries.grantsAuthority, false);
    assert.equal(first.boundaries.authorizesMigration, false);
    assert.equal(first.boundaries.requiresProposalAuthorizationSemanticApplyVerification, true);
    assert.equal(first.recovery.authorizedRollbackCheckpointRequiredBeforeCommit, true);
    assert.equal(first.recovery.sourceBytesChanged, false);
    assert.equal(first.changesMade, 0);
    assert.ok(first.records.length > 0);
    assert.ok(first.records.every(record => record.domain === "unclassified"
      && record.scope.kind === "unspecified" && record.verification === "not-assessed"
      && record.revision.acceptedAuthorizationId === null
      && record.revision.revisionNumber === null
      && record.grantsAuthority === false));
    assert.ok(first.records.some(record => record.recordType === "observation"));
    assert.ok(first.records.some(record => record.recordType === "open-question"));
    assert.ok(!first.records.some(record => record.recordType === "fact"
      && record.provenance.sourceSection === "Verified discovery evidence"));
    assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
    assert.deepEqual(await managedBytes(path), before);
  });
});

test("typed plan preserves source IDs, historical revisions, provenance and supersession", async () => {
  await fixture(async path => {
    let old!: Awaited<ReturnType<typeof recordAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      old = await recordAcceptedDecision("Use safe component padding", path, { authorized: true });
    });
    const prior = await buildProjectKnowledgeProjection(path);
    assert.equal(prior.state, "ready");
    if (prior.state !== "ready") return;
    const priorTyped = planTypedKnowledgeMigration(prior);
    const oldRecord = priorTyped.records.find(record => record.provenance.sourceRecordId === old.id);
    assert.ok(oldRecord);

    let change!: Awaited<ReturnType<typeof supersedeAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      change = await supersedeAcceptedDecision({
        decisionId: old.id,
        replacement: "Use accessible component padding",
      }, path, { authorized: true });
    });
    const latestProjection = await buildProjectKnowledgeProjection(path);
    assert.equal(latestProjection.state, "ready");
    if (latestProjection.state !== "ready") return;
    const latest = planTypedKnowledgeMigration(latestProjection);
    const historical = latest.records.find(record => record.provenance.sourceRecordId === old.id);
    const replacement = latest.records.find(record => record.provenance.sourceRecordId === change.replacement.id);
    assert.ok(historical && replacement);
    assert.equal(historical.recordId, oldRecord.recordId);
    assert.notEqual(historical.revision.sourceRevisionDigest, oldRecord.revision.sourceRevisionDigest);
    assert.equal(historical.lifecycle, "superseded");
    assert.equal(historical.supersededBySourceId, change.replacement.id);
    assert.equal(replacement.lifecycle, "active");
    assert.ok(latest.relationships.some(link => link.kind === "supersedes"
      && link.fromRecordId === replacement.recordId && link.toRecordId === historical.recordId));
    assert.notEqual(latest.previewDigest, priorTyped.previewDigest);
  });
});

test("typed previews are project/baseline-bound and cannot silently transfer across projects", async () => {
  await fixture(async a => {
    await fixture(async b => {
      const sourceA = await buildProjectKnowledgeProjection(a);
      const sourceB = await buildProjectKnowledgeProjection(b);
      assert.equal(sourceA.state, "ready");
      assert.equal(sourceB.state, "ready");
      if (sourceA.state !== "ready" || sourceB.state !== "ready") return;
      const first = planTypedKnowledgeMigration(sourceA);
      const second = planTypedKnowledgeMigration(sourceB);
      assert.notEqual(first.projectId, second.projectId);
      assert.notEqual(first.previewDigest, second.previewDigest);
    });
  });
});

test("unsupported and authority-bearing source content cannot generate a typed migration plan", async () => {
  await fixture(async path => {
    const source = await buildProjectKnowledgeProjection(path);
    assert.equal(source.state, "ready");
    if (source.state !== "ready") return;

    const withAuthority = structuredClone(source);
    (withAuthority.records[0] as { grantsAuthority: boolean }).grantsAuthority = true;
    assert.throws(() => planTypedKnowledgeMigration(withAuthority), /authority-bearing|unsupported/i);

    const withScope = structuredClone(source);
    (withScope.records[0] as { scope: string }).scope = "project-wide";
    assert.throws(() => planTypedKnowledgeMigration(withScope), /authority-bearing|unsupported/i);

    const brokenLink = structuredClone(source);
    brokenLink.relationships.push({
      type: "supersedes", fromRecordId: source.records[0].recordId,
      toRecordId: "missing-record", grantsAuthority: false,
    });
    assert.throws(() => planTypedKnowledgeMigration(brokenLink), /relationship/i);
  });
});

test("stale typed preview is rejected even when newer material is itself locally accepted", async () => {
  await fixture(async path => {
    const before = await buildProjectKnowledgeProjection(path);
    assert.equal(before.state, "ready");
    if (before.state !== "ready") return;
    const plan = planTypedKnowledgeMigration(before);
    await mutateAcceptedFixture(path, async () => {
      await recordAcceptedDecision("Introduce a new valid decision", path, { authorized: true });
    });
    const after = await buildProjectKnowledgeProjection(path);
    assert.equal(after.state, "ready");
    if (after.state !== "ready") return;
    assert.throws(() => assertTypedKnowledgeMigrationPreviewStillCurrent(plan, after), /differs|baseline/i);
    assert.notEqual(plan.previewDigest, planTypedKnowledgeMigration(after).previewDigest);
    const attempt = await prepareProtectedTypedKnowledgeMigrationPreview(path, {
      beforeRevalidate: () => { throw new Error("An unprotected fixture must not reach the revalidation hook."); },
    });
    assert.equal(attempt.state, "blocked");
    if (attempt.state !== "blocked") return;
    assert.deepEqual(attempt.records, []);
    assert.equal(attempt.grantsAuthority, false);
  });
});

test("unaccepted tampering blocks protected typed migration, preserving recovery boundaries", async () => {
  await fixture(async path => {
    const store = new ProjectBrainStore(path);
    const old = await store.readKnowledgeDocument();
    await writeFile(resolve(path, ".project-brain", "knowledge.md"), old + "\n- Unapproved migration rule.\n");
    const result = await prepareProtectedTypedKnowledgeMigrationPreview(path);
    assert.equal(result.state, "blocked");
    if (result.state !== "blocked") return;
    assert.deepEqual(result.records, []);
    assert.equal(result.grantsAuthority, false);
  });
});
