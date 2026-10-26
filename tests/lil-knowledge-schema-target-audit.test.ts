import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/initialization.js";
import { buildProjectKnowledgeProjection } from "../src/intelligence/knowledge-projection.js";
import {
  planKnowledgeSchemaTransition,
} from "../src/intelligence/knowledge-schema-transition-plan.js";
import {
  auditProposedKnowledgeSchemaTarget,
  PROPOSED_SCHEMA3_MANAGED_FILES,
} from "../src/intelligence/knowledge-schema-target-audit.js";
import { readProjectContextManagedInputs } from "../src/runtime/project-context-material.js";
import { recordAcceptedDecision } from "../src/runtime/canonical-change.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

async function fixture<T>(action: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-target-audit-"));
  try {
    await initializeProject(root, { authorized: true });
    return await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function situation(root: string) {
  const projection = await buildProjectKnowledgeProjection(root);
  assert.equal(projection.state, "ready");
  if (projection.state !== "ready") throw new Error("fixture projection is not ready");
  const inputs = await readProjectContextManagedInputs(resolve(root, ".project-brain"));
  const plan = planKnowledgeSchemaTransition(projection, inputs);
  const target = new Map<string, Buffer>(inputs);
  target.set("metadata.json", Buffer.from(plan.proposedTarget.metadataBytes, "utf8"));
  target.set("knowledge-registry.json", Buffer.from(plan.proposedTarget.knowledgeIndexBytes, "utf8"));
  return { projection, inputs, plan, target };
}

test("proposed v3 complete six-file material is byte-exact but NEVER accepted, authorized or written", async () => {
  await fixture(async root => {
    const { projection, inputs, plan, target } = await situation(root);
    assert.equal(PROPOSED_SCHEMA3_MANAGED_FILES.length, 6);
    const result = auditProposedKnowledgeSchemaTarget(plan, projection, inputs, target);
    assert.equal(result.state, "material-exact-untrusted");
    if (result.state !== "material-exact-untrusted") return;
    assert.equal(result.stableProjectIdentity, projection.stableProjectIdentity);
    assert.equal(result.proposedTargetDigest, plan.proposedTarget.targetDigest);
    assert.equal(result.sourceBaselineDigest, projection.baseline.digest);
    assert.equal(result.grantsAuthority, false);
    assert.equal(result.guardianTargetVerified, false);
    assert.equal(result.filesystemOwnershipVerified, false);
    assert.equal(result.transactionRecoveryVerified, false);
    assert.equal(result.acceptsTargetSchema, false);
    assert.equal(result.writesPerformed, false);
    assert.equal(result.changesMade, 0);
    // The purely hypothetical v3 file is never created on the real project.
    await assert.rejects(stat(resolve(root, ".project-brain", "knowledge-registry.json")), { code: "ENOENT" });
  });
});

test("mixed schema, interrupted file promotion and missing/extra/aliased files fail closed", async () => {
  await fixture(async root => {
    const { projection, inputs, plan, target } = await situation(root);
    const cases: Array<[string, Map<string, Buffer>]> = [];
    const absentIndex = new Map(target);
    absentIndex.delete("knowledge-registry.json");
    cases.push(["missing registry", absentIndex]);
    const oldMetadata = new Map(target);
    oldMetadata.set("metadata.json", Buffer.from(inputs.get("metadata.json")!));
    cases.push(["pre-promotion metadata", oldMetadata]);
    const wrongMarkdown = new Map(target);
    wrongMarkdown.set("knowledge.md", Buffer.from("- injected authoritative fact\n"));
    cases.push(["different markdown", wrongMarkdown]);
    const forgedIndex = new Map(target);
    forgedIndex.set("knowledge-registry.json", Buffer.from("{}"));
    cases.push(["forged registry", forgedIndex]);
    const aliasedIndex = new Map(target);
    aliasedIndex.delete("knowledge-registry.json");
    aliasedIndex.set("KNOWLEDGE-REGISTRY.JSON", Buffer.from(plan.proposedTarget.knowledgeIndexBytes));
    cases.push(["case-aliased file", aliasedIndex]);
    const duplicateIndex = new Map(target);
    duplicateIndex.set("knowledge-registry.json.", Buffer.from(plan.proposedTarget.knowledgeIndexBytes));
    cases.push(["extra Windows alias", duplicateIndex]);
    const extra = new Map(target);
    extra.set("backup.json", Buffer.from("{}"));
    cases.push(["unexpected backup", extra]);
    for (const [label, candidate] of cases) {
      const result = auditProposedKnowledgeSchemaTarget(plan, projection, inputs, candidate);
      assert.equal(result.state, "blocked", label);
      assert.equal(result.acceptsTargetSchema, false, label);
      assert.equal(result.grantsAuthority, false, label);
      assert.equal(result.writesPerformed, false, label);
    }
    assert.equal(auditProposedKnowledgeSchemaTarget(plan, projection, inputs, target).state, "material-exact-untrusted");
  });
});

test("stale baseline, cross-project target and forged comparison digests are rejected", async () => {
  await fixture(async a => {
    await fixture(async b => {
      const left = await situation(a);
      const right = await situation(b);
      assert.equal(auditProposedKnowledgeSchemaTarget(left.plan, right.projection, right.inputs, left.target).state, "blocked");
      assert.equal(auditProposedKnowledgeSchemaTarget(left.plan, left.projection, left.inputs, right.target).state, "blocked");
      const forged = structuredClone(left.plan);
      forged.proposedTarget.targetDigest = "0".repeat(64);
      assert.equal(auditProposedKnowledgeSchemaTarget(forged, left.projection, left.inputs, left.target).state, "blocked");
      await mutateAcceptedFixture(a, async () => {
        await recordAcceptedDecision("New accepted project-specific direction", a, { authorized: true });
      });
      const fresh = await situation(a);
      assert.equal(auditProposedKnowledgeSchemaTarget(left.plan, fresh.projection, fresh.inputs, left.target).state, "blocked");
      assert.equal(auditProposedKnowledgeSchemaTarget(fresh.plan, fresh.projection, fresh.inputs, left.target).state, "blocked");
      assert.equal(auditProposedKnowledgeSchemaTarget(fresh.plan, fresh.projection, fresh.inputs, fresh.target).state, "material-exact-untrusted");
    });
  });
});

test("invalid buffers or altered registry relationship material cannot be a canonical target", async () => {
  await fixture(async root => {
    const { projection, inputs, plan, target } = await situation(root);
    const notBuffer = new Map(target);
    notBuffer.set("metadata.json", "not a Buffer" as unknown as Buffer);
    assert.equal(auditProposedKnowledgeSchemaTarget(plan, projection, inputs, notBuffer).state, "blocked");
    const empty = new Map(target);
    empty.set("project.md", Buffer.alloc(0));
    assert.equal(auditProposedKnowledgeSchemaTarget(plan, projection, inputs, empty).state, "blocked");
    const tooLarge = new Map(target);
    tooLarge.set("knowledge-registry.json", Buffer.alloc(8 * 1024 * 1024 + 1));
    assert.equal(auditProposedKnowledgeSchemaTarget(plan, projection, inputs, tooLarge).state, "blocked");
    const alteredRelationship = new Map(target);
    const parsed = JSON.parse(target.get("knowledge-registry.json")!.toString("utf8")) as {
      relationships: unknown[];
    };
    parsed.relationships.push({ kind: "supersedes", fromRecordId: "forged", toRecordId: "forged" });
    alteredRelationship.set("knowledge-registry.json", Buffer.from(JSON.stringify(parsed) + "\n"));
    assert.equal(auditProposedKnowledgeSchemaTarget(plan, projection, inputs, alteredRelationship).state, "blocked");
  });
});
