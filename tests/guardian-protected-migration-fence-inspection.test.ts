import assert from "node:assert/strict";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { assessUntrustedMigrationFenceRecords } from "../src/guardian/protected-migration-fence-inspection.js";
import { SCHEMA_MIGRATION_FENCE_KIND, type SchemaMigrationFenceRecord } from "../src/guardian/schema-migration-fence-contract.js";
import { PROJECT_CONTEXT_BASELINE_DOMAIN } from "../src/runtime/project-context-material.js";
import { PROPOSED_KNOWLEDGE_TARGET_DOMAIN } from "../src/intelligence/knowledge-schema-transition-plan.js";

const ROOT = resolve(tmpdir(), "guardian-fence-a");
const OTHER = resolve(tmpdir(), "guardian-fence-b");
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TX = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
function record(project = A, root = ROOT, phase: SchemaMigrationFenceRecord["phase"] = "armed"): SchemaMigrationFenceRecord {
  return {
    schemaVersion: 1, kind: SCHEMA_MIGRATION_FENCE_KIND, stableProjectIdentity: project,
    transactionId: TX, authorizationOperationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    protectedSourceRecordId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    declaredPhysicalProjectRoot: root, declaredPhysicalProjectBrainRoot: resolve(root, ".project-brain"),
    sourceSchemaVersion: 2, targetSchemaVersion: 3,
    sourceBaselineDomain: PROJECT_CONTEXT_BASELINE_DOMAIN,
    sourceBaselineSha256: "a".repeat(64), sourceProtectedIntegrityMaterialSha256: "b".repeat(64),
    proposedTargetDomain: PROPOSED_KNOWLEDGE_TARGET_DOMAIN,
    proposedTargetSha256: "c".repeat(64), migrationIntentSha256: "d".repeat(64),
    phase, sequence: phase === "armed" ? 0 : 1,
  };
}
function item(value: SchemaMigrationFenceRecord) {
  return { name: value.transactionId + ".json", bytes: Buffer.from(JSON.stringify(value)) };
}
function mustBlock(entries: readonly { name: string; bytes: Buffer }[], project = A, root = ROOT) {
  assert.equal(assessUntrustedMigrationFenceRecords(entries, project, root).state, "blocked");
}

test("raw material alone never authorizes any read or creates migration Authority", () => {
  const empty = assessUntrustedMigrationFenceRecords([], A, ROOT);
  assert.equal(empty.state, "legacy-no-fence");
  mustBlock([item(record())]);
});
test("all migration phases including fake terminal states block the protected v2 boundary", () => {
  for (const phase of ["armed", "authority-consumed", "promotion-started", "target-material-verified",
    "recovery-required", "completed", "disarmed-before-consumption"] as const) {
    mustBlock([item(record(A, ROOT, phase))]);
  }
});
test("fences for unrelated physical projects do not block legacy schema-2", () => {
  assert.equal(assessUntrustedMigrationFenceRecords([item(record(B, OTHER))], A, ROOT).state, "legacy-no-fence");
});
test("copied identity or swapped physical location is ambiguous and blocked", () => {
  mustBlock([item(record(A, OTHER))]);
  mustBlock([item(record(B, ROOT))]);
  const forged = record();
  forged.declaredPhysicalProjectBrainRoot = resolve(OTHER, ".project-brain");
  mustBlock([item(forged)]);
});
test("unknown entries, record ID mismatches, malformed bytes and duplicate names are blocked", () => {
  const valid = item(record());
  const invalid = [
    [{ ...valid, name: "unexpected.lock" }],
    [{ ...valid, name: valid.name.toUpperCase() }],
    [{ ...valid, bytes: Buffer.from("{}") }],
    [{ ...valid, bytes: Buffer.from("{") }],
    [{ ...valid, bytes: Buffer.alloc(0) }],
    [{ ...valid, bytes: Buffer.alloc(32769) }],
    [{ ...valid, name: "ffffffff-ffff-4fff-8fff-ffffffffffff.json" }],
    [valid, valid],
  ];
  for (const entries of invalid) mustBlock(entries);
});
test("invalid expected project ID and oversized namespace fail closed", () => {
  mustBlock([], "not-a-uuid");
  mustBlock(Array.from({length:513}, () => item(record())));
});
