import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  planKnowledgeSchemaTransition,
  assertKnowledgeSchemaTransitionPlanCurrent,
} from "../src/intelligence/knowledge-schema-transition-plan.js";
import { buildProjectKnowledgeProjection } from "../src/intelligence/knowledge-projection.js";
import { PROJECT_CONTEXT_MANAGED_INPUTS, readProjectContextManagedInputs } from "../src/runtime/project-context-material.js";
import { initializeProject } from "../src/runtime/initialization.js";
import { recordAcceptedDecision } from "../src/runtime/canonical-change.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

async function fixture(action: (root: string) => Promise<void>) {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-schema-transition-"));
  try {
    await initializeProject(root, { authorized: true });
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function source(root: string) {
  const brain = resolve(root, ".project-brain");
  const projection = await buildProjectKnowledgeProjection(root);
  assert.equal(projection.state, "ready");
  if (projection.state !== "ready") throw new Error("test fixture projection was blocked");
  const inputs = await readProjectContextManagedInputs(brain);
  return { brain, projection, inputs };
}

test("exact v2 to proposed-v3 transition preserves all markdown and does not write or authorize anything", async () => {
  await fixture(async root => {
    const { brain, projection, inputs } = await source(root);
    const before = await Promise.all(PROJECT_CONTEXT_MANAGED_INPUTS.map(name => readFile(resolve(brain, name))));
    const plan = planKnowledgeSchemaTransition(projection, inputs);
    const again = planKnowledgeSchemaTransition(projection, inputs);
    assert.deepEqual(plan, again);
    assertKnowledgeSchemaTransitionPlanCurrent(plan, projection, inputs);
    assert.equal(plan.state, "plan-only");
    assert.equal(plan.source.schemaVersion, 2);
    assert.equal(plan.proposedTarget.schemaVersion, 3);
    assert.equal(plan.stableProjectIdentity, projection.stableProjectIdentity);
    assert.equal(plan.source.baselineDigest, projection.baseline.digest);
    assert.match(plan.proposedTarget.targetDigest, /^[a-f0-9]{64}$/);
    assert.match(plan.proposedTarget.indexCandidateDigest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(plan.boundaries.createsAuthority, false);
    assert.equal(plan.boundaries.performsMigration, false);
    assert.equal(plan.proposedTarget.writesPerformed, false);
    assert.equal(plan.proposedTarget.protectsTargetIntegrity, false);
    assert.equal(plan.proposedTarget.targetAccepted, false);
    assert.equal(plan.recovery.authorizationAndGuardianProofRequired, true);
    assert.equal(plan.recovery.crossFileTransactionNotImplemented, true);
    assert.equal(JSON.parse(plan.proposedTarget.metadataBytes).projectBrain.schemaVersion, 3);
    assert.equal(JSON.parse(inputs.get("metadata.json")!.toString()).projectBrain.schemaVersion, 2);
    assert.equal(JSON.parse(plan.proposedTarget.knowledgeIndexBytes).records.length, projection.records.length);
    for (const name of ["project.md", "goals.md", "decisions.md", "knowledge.md"] as const) {
      assert.match(plan.source.immutableSourceDigests[name], /^[a-f0-9]{64}$/);
    }
    const after = await Promise.all(PROJECT_CONTEXT_MANAGED_INPUTS.map(name => readFile(resolve(brain, name))));
    assert.deepEqual(after, before);
    await assert.rejects(stat(resolve(brain, "knowledge-registry.json")), { code: "ENOENT" });
  });
});

test("v2->v3 target plan preserves structured decision supersession without duplicating statements", async () => {
  await fixture(async root => {
    await mutateAcceptedFixture(root, async () => {
      await recordAcceptedDecision("Keep explicit consent for changes", root, { authorized: true });
    });
    const { projection, inputs } = await source(root);
    const planned = planKnowledgeSchemaTransition(projection, inputs);
    assert.ok(projection.records.some(record => record.recordType === "decision"));
    assert.ok(!planned.proposedTarget.knowledgeIndexBytes.includes("Keep explicit consent for changes"));
    assert.equal(planned.source.immutableSourceDigests["decisions.md"].length, 64);
  });
});

test("stale or cross-project sources are rejected before computing the proposed target digest", async () => {
  await fixture(async a => {
    await fixture(async b => {
      const left = await source(a), right = await source(b);
      const leftPlan = planKnowledgeSchemaTransition(left.projection, left.inputs);
      assert.throws(() => planKnowledgeSchemaTransition(left.projection, right.inputs), /source bytes differ|project identity/i);
      assert.throws(() => assertKnowledgeSchemaTransitionPlanCurrent(leftPlan, right.projection, right.inputs), /cross-project|tampered/i);
      await mutateAcceptedFixture(a, async () => {
        await recordAcceptedDecision("A newer accepted decision", a, { authorized: true });
      });
      const changed = await source(a);
      assert.throws(() => assertKnowledgeSchemaTransitionPlanCurrent(leftPlan, changed.projection, changed.inputs), /stale/i);
      assert.notEqual(leftPlan.proposedTarget.targetDigest,
        planKnowledgeSchemaTransition(changed.projection, changed.inputs).proposedTarget.targetDigest);
    });
  });
});

test("unknown schemas, malformed metadata, mixed source files and extra managed inputs are blocked", async () => {
  await fixture(async root => {
    const { projection, inputs } = await source(root);
    const wrongSchema = new Map(inputs);
    const metadata = JSON.parse(wrongSchema.get("metadata.json")!.toString()) as {
      projectBrain: { schemaVersion: number; projectId: string };
    };
    metadata.projectBrain.schemaVersion = 3;
    wrongSchema.set("metadata.json", Buffer.from(JSON.stringify(metadata)));
    assert.throws(() => planKnowledgeSchemaTransition(projection, wrongSchema), /source bytes differ|schema/i);
    const invalidMetadata = new Map(inputs);
    invalidMetadata.set("metadata.json", Buffer.from("{"));
    assert.throws(() => planKnowledgeSchemaTransition(projection, invalidMetadata), /source bytes differ|malformed/i);
    const extra = new Map<string, Buffer>(inputs);
    extra.set("knowledge-registry.json", Buffer.from("{}"));
    assert.throws(() => planKnowledgeSchemaTransition(projection, extra as typeof inputs), /five-file|schema-2/i);
    const absent = new Map(inputs);
    absent.delete("decisions.md");
    assert.throws(() => planKnowledgeSchemaTransition(projection, absent), /five-file/i);
    const invalidInput = new Map(inputs);
    invalidInput.set("knowledge.md", Buffer.alloc(2 * 1024 * 1024 + 1));
    assert.throws(() => planKnowledgeSchemaTransition(projection, invalidInput), /size limit/i);
  });
});

test("tampered target digest, index, metadata and recovery claims fail exact replay check", async () => {
  await fixture(async root => {
    const { projection, inputs } = await source(root);
    const original = planKnowledgeSchemaTransition(projection, inputs);
    const mutators: Array<(plan: typeof original) => void> = [
      plan => { plan.proposedTarget.targetDigest = "0".repeat(64); },
      plan => { plan.proposedTarget.knowledgeIndexBytes += " "; },
      plan => { plan.proposedTarget.metadataBytes = plan.proposedTarget.metadataBytes.replace('"schemaVersion": 3', '"schemaVersion": 4'); },
      plan => { (plan.proposedTarget as { writesPerformed: boolean }).writesPerformed = true; },
      plan => { (plan.recovery as { crossFileTransactionNotImplemented: boolean }).crossFileTransactionNotImplemented = false; },
    ];
    for (const mutate of mutators) {
      const candidate = structuredClone(original);
      mutate(candidate);
      assert.throws(() => assertKnowledgeSchemaTransitionPlanCurrent(candidate, projection, inputs), /stale|tampered/i);
    }
    assertKnowledgeSchemaTransitionPlanCurrent(original, projection, inputs);
  });
});

test("migration planner is read-only even if existing project metadata contains added benign fields", async () => {
  await fixture(async root => {
    const { brain } = await source(root);
    const file = resolve(brain, "metadata.json");
    const original = await readFile(file, "utf8");
    const meta = JSON.parse(original) as Record<string, unknown>;
    meta["operatorHint"] = "retained-opaque-metadata";
    await writeFile(file, JSON.stringify(meta, null, 2) + "\n");
    const state = await source(root);
    const planned = planKnowledgeSchemaTransition(state.projection, state.inputs);
    assert.equal(JSON.parse(planned.proposedTarget.metadataBytes).operatorHint, "retained-opaque-metadata");
    assert.equal((await readFile(file, "utf8")), JSON.stringify(meta, null, 2) + "\n");
  });
});
