import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/initialization.js";
import { buildProjectKnowledgeProjection } from "../src/intelligence/knowledge-projection.js";
import { planKnowledgeSchemaTransition } from "../src/intelligence/knowledge-schema-transition-plan.js";
import {
  assessKnowledgeMigrationRecoverySnapshot,
  type ReportedMigrationCheckpoint,
} from "../src/intelligence/knowledge-schema-recovery-assessment.js";
import { readProjectContextManagedInputs } from "../src/runtime/project-context-material.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";
import { recordAcceptedDecision } from "../src/runtime/canonical-change.js";

async function fixture<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-knowledge-recovery-"));
  try {
    await initializeProject(root, { authorized: true });
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function situation(root: string) {
  const projection = await buildProjectKnowledgeProjection(root);
  assert.equal(projection.state, "ready");
  if (projection.state !== "ready") throw Error("fixture unavailable");
  const originalInputs = await readProjectContextManagedInputs(resolve(root, ".project-brain"));
  const plan = planKnowledgeSchemaTransition(projection, originalInputs);
  const original = new Map<string, Buffer>(originalInputs);
  const target = new Map<string, Buffer>(original);
  target.set("metadata.json", Buffer.from(plan.proposedTarget.metadataBytes, "utf8"));
  target.set("knowledge-registry.json", Buffer.from(plan.proposedTarget.knowledgeIndexBytes, "utf8"));
  return { projection, originalInputs, plan, original, target };
}

function assess(s: Awaited<ReturnType<typeof situation>>, observedCanonical: Map<string, Buffer>,
  reportedCheckpoint: ReportedMigrationCheckpoint, observedStaging?: Map<string, Buffer>) {
  return assessKnowledgeMigrationRecoverySnapshot({
    plan: s.plan, sourceProjection: s.projection, originalInputs: s.originalInputs,
    observedCanonical, reportedCheckpoint, observedStaging,
  });
}

function cannotExerciseAuthority(result: ReturnType<typeof assess>) {
  assert.equal(result.boundaries.guardianAuthorityVerified, false);
  assert.equal(result.boundaries.authorityUnconsumedProven, false);
  assert.equal(result.boundaries.v3IntegrityEstablished, false);
  assert.equal(result.boundaries.transactionRecoveryVerified, false);
  assert.equal(result.boundaries.mayResumePromotion, false);
  assert.equal(result.boundaries.mayCleanupStaging, false);
  assert.equal(result.boundaries.mayRollback, false);
  assert.equal(result.boundaries.mayAcceptSchema3, false);
  assert.equal(result.boundaries.writesPerformed, false);
  assert.equal(result.boundaries.changesMade, 0);
}

test("exact source before reported consumption is observation only, with no cleanup or apply authority", async () => {
  await fixture(async root => {
    const s = await situation(root);
    const r = assess(s, s.original, "before-authority-consumption");
    assert.equal(r.state, "source-intact-unverified");
    assert.equal(r.observedMaterial, "source-v2-exact-untrusted");
    assert.equal(r.stableProjectIdentity, s.plan.stableProjectIdentity);
    cannotExerciseAuthority(r);
    await assert.rejects(stat(resolve(root, ".project-brain", "knowledge-registry.json")), { code: "ENOENT" });
  });
});

test("Authority reported consumed means protected recovery even when all original bytes still match", async () => {
  await fixture(async root => {
    const s = await situation(root);
    for (const phase of ["authority-consumed", "canonical-promotion-started",
      "post-state-checkpoint-reported", "unknown-or-conflicted"] as const) {
      const r = assess(s, s.original, phase);
      assert.equal(r.state, "protected-recovery-required");
      assert.equal(r.observedMaterial, "source-v2-exact-untrusted");
      cannotExerciseAuthority(r);
    }
  });
});

test("a complete exact proposed target remains untrusted, even when completion is claimed", async () => {
  await fixture(async root => {
    const s = await situation(root);
    for (const phase of ["before-authority-consumption", "authority-consumed",
      "post-state-checkpoint-reported"] as const) {
      const r = assess(s, s.target, phase);
      assert.equal(r.state, "protected-recovery-required");
      assert.equal(r.observedMaterial, "target-v3-exact-untrusted");
      assert.equal(r.comparisonTargetDigest, s.plan.proposedTarget.targetDigest);
      cannotExerciseAuthority(r);
    }
  });
});

test("mixed schema, partial writes, aliases, missing or unexpected files always require recovery", async () => {
  await fixture(async root => {
    const s = await situation(root);
    const cases: Array<[string, Map<string, Buffer>]> = [];
    const missingIndex = new Map(s.target); missingIndex.delete("knowledge-registry.json");
    cases.push(["only updated metadata", missingIndex]);
    const oldMetadata = new Map(s.target); oldMetadata.set("metadata.json", s.original.get("metadata.json")!);
    cases.push(["v3 index with v2 metadata", oldMetadata]);
    const overwrittenKnowledge = new Map(s.target); overwrittenKnowledge.set("knowledge.md", Buffer.from("changed"));
    cases.push(["unapproved markdown replacement", overwrittenKnowledge]);
    const alias = new Map(s.target); alias.delete("knowledge-registry.json"); alias.set("KNOWLEDGE-REGISTRY.JSON", s.target.get("knowledge-registry.json")!);
    cases.push(["case alias", alias]);
    const extra = new Map(s.original); extra.set("unknown-backup.txt", Buffer.from("untrusted"));
    cases.push(["stray backup", extra]);
    for (const [name, material] of cases) {
      const r = assess(s, material, "before-authority-consumption");
      assert.equal(r.state, "protected-recovery-required", name);
      assert.equal(r.observedMaterial, "interrupted-or-ambiguous", name);
      cannotExerciseAuthority(r);
    }
  });
});

test("any reported staging or backup material needs independent protected review even if source is intact", async () => {
  await fixture(async root => {
    const s = await situation(root);
    for (const staged of [new Map<string, Buffer>(), new Map(s.target),
      new Map<string, Buffer>([["forged", Buffer.from("x")]])]) {
      const r = assess(s, s.original, "before-authority-consumption", staged);
      assert.equal(r.state, "protected-recovery-required");
      assert.equal(r.observedMaterial, "source-v2-exact-untrusted");
      cannotExerciseAuthority(r);
    }
  });
});

test("cross-project, stale plan, malformed checkpoint or later accepted edits cannot be replayed", async () => {
  await fixture(async a => {
    await fixture(async b => {
      const source = await situation(a);
      const foreign = await situation(b);
      const attempt = assessKnowledgeMigrationRecoverySnapshot({
        plan: source.plan, sourceProjection: foreign.projection,
        originalInputs: foreign.originalInputs, observedCanonical: source.target,
        reportedCheckpoint: "before-authority-consumption",
      });
      assert.equal(attempt.state, "protected-recovery-required");
      cannotExerciseAuthority(attempt);

      const injected = assessKnowledgeMigrationRecoverySnapshot({
        plan: source.plan, sourceProjection: source.projection,
        originalInputs: source.originalInputs, observedCanonical: source.original,
        reportedCheckpoint: "forged-proof" as ReportedMigrationCheckpoint,
      });
      assert.equal(injected.state, "protected-recovery-required");
      cannotExerciseAuthority(injected);

      await mutateAcceptedFixture(a, async () => {
        await recordAcceptedDecision("New reviewed project decision", a, { authorized: true });
      });
      const changed = await situation(a);
      const stale = assessKnowledgeMigrationRecoverySnapshot({
        plan: source.plan, sourceProjection: changed.projection,
        originalInputs: changed.originalInputs, observedCanonical: changed.original,
        reportedCheckpoint: "before-authority-consumption",
      });
      assert.equal(stale.state, "protected-recovery-required");
      cannotExerciseAuthority(stale);
    });
  });
});
