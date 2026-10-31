import assert from "node:assert/strict";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { PROJECT_CONTEXT_BASELINE_DOMAIN } from "../src/runtime/project-context-material.js";
import { PROPOSED_KNOWLEDGE_TARGET_DOMAIN } from "../src/intelligence/knowledge-schema-transition-plan.js";
import {
  parseSchemaMigrationFenceRecord,
  assertSchemaMigrationFenceTransition,
  classifyUntrustedSchemaMigrationFenceObservation,
  SCHEMA_MIGRATION_FENCE_KIND,
  type SchemaMigrationFenceRecord,
  type SchemaMigrationFencePhase,
} from "../src/guardian/schema-migration-fence-contract.js";

const ROOT = resolve(tmpdir(), "livariant-migration-fence-contract-project");
const INITIAL: SchemaMigrationFenceRecord = {
  schemaVersion: 1,
  kind: SCHEMA_MIGRATION_FENCE_KIND,
  stableProjectIdentity: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  transactionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  authorizationOperationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  protectedSourceRecordId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  declaredPhysicalProjectRoot: ROOT,
  declaredPhysicalProjectBrainRoot: resolve(ROOT, ".project-brain"),
  sourceSchemaVersion: 2,
  targetSchemaVersion: 3,
  sourceBaselineDomain: PROJECT_CONTEXT_BASELINE_DOMAIN,
  sourceBaselineSha256: "a".repeat(64),
  sourceProtectedIntegrityMaterialSha256: "b".repeat(64),
  proposedTargetDomain: PROPOSED_KNOWLEDGE_TARGET_DOMAIN,
  proposedTargetSha256: "c".repeat(64),
  migrationIntentSha256: "d".repeat(64),
  phase: "armed",
  sequence: 0,
};

function phase(name: SchemaMigrationFencePhase, sequence: number): SchemaMigrationFenceRecord {
  return { ...INITIAL, phase: name, sequence };
}

function blocked(value: unknown) {
  const result = classifyUntrustedSchemaMigrationFenceObservation(value);
  assert.equal(result.state, "blocked-until-independent-guardian-verification");
  assert.equal(result.mayReadSchema2, false);
  assert.equal(result.mayReadSchema3, false);
  assert.equal(result.mayConsumeAuthority, false);
  assert.equal(result.mayWriteCanonicalFiles, false);
  assert.equal(result.mayClearFence, false);
  assert.equal(result.changesMade, 0);
  return result;
}

test("strict protected migration fence schema parses but never authenticates or grants read/write", () => {
  const parsed = parseSchemaMigrationFenceRecord(structuredClone(INITIAL));
  assert.deepEqual(parsed, INITIAL);
  assert.equal(blocked(parsed).observedPhase, "armed");
  assert.equal(blocked(null).observedPhase, null);
  assert.equal(blocked({ state: "healthy" }).observedPhase, null);
  assert.equal(blocked(phase("completed", 4)).observedPhase, "completed");
  assert.equal(blocked(phase("disarmed-before-consumption", 1)).observedPhase, "disarmed-before-consumption");
});

test("only ordered armed -> consumed -> promotion -> post-verified -> completed shape is allowed", () => {
  const happy: SchemaMigrationFenceRecord[] = [
    INITIAL, phase("authority-consumed", 1), phase("promotion-started", 2),
    phase("target-material-verified", 3), phase("completed", 4),
  ];
  for (let i = 1; i < happy.length; i++) {
    assert.doesNotThrow(() => assertSchemaMigrationFenceTransition(happy[i - 1], happy[i]));
  }
  assert.doesNotThrow(() => assertSchemaMigrationFenceTransition(INITIAL, phase("disarmed-before-consumption", 1)));
  for (const current of [INITIAL, ...happy.slice(1, -1)]) {
    assert.doesNotThrow(() => assertSchemaMigrationFenceTransition(current, phase("recovery-required", current.sequence + 1)));
  }
});

test("post-consumption rollback/rearm/reissue, arbitrary skips and terminal recovery are blocked", () => {
  const cases: Array<[SchemaMigrationFenceRecord, SchemaMigrationFenceRecord]> = [
    [phase("authority-consumed", 1), phase("disarmed-before-consumption", 2)],
    [phase("authority-consumed", 1), INITIAL],
    [phase("authority-consumed", 1), phase("completed", 2)],
    [INITIAL, phase("promotion-started", 1)],
    [phase("promotion-started", 2), phase("completed", 3)],
    [phase("recovery-required", 2), phase("armed", 0)],
    [phase("completed", 4), phase("armed", 0)],
    [phase("disarmed-before-consumption", 1), phase("armed", 0)],
    [INITIAL, phase("authority-consumed", 8)],
    [INITIAL, INITIAL],
  ];
  for (const [from, to] of cases) {
    assert.throws(() => assertSchemaMigrationFenceTransition(from, to), /rejected/i);
    blocked(to);
  }
});

test("cross-project, cross-transaction, source or target substitution cannot be a valid transition", () => {
  const tampering: Array<Partial<SchemaMigrationFenceRecord>> = [
    { stableProjectIdentity: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" },
    { transactionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" },
    { authorizationOperationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" },
    { protectedSourceRecordId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" },
    { declaredPhysicalProjectRoot: resolve(ROOT, "different"), declaredPhysicalProjectBrainRoot: resolve(ROOT, "different", ".project-brain") },
    { sourceBaselineSha256: "e".repeat(64) },
    { sourceProtectedIntegrityMaterialSha256: "e".repeat(64) },
    { proposedTargetSha256: "e".repeat(64) },
    { migrationIntentSha256: "e".repeat(64) },
  ];
  for (const altered of tampering) {
    assert.throws(() => assertSchemaMigrationFenceTransition(INITIAL, { ...phase("authority-consumed", 1), ...altered }), /changed|rejected/i);
  }
});

test("unexpected fields, malformed paths and digests, alias schemas and invalid sequences fail closed", () => {
  const invalid = [
    { ...INITIAL, schemaVersion: 2 },
    { ...INITIAL, kind: "local-migration-receipt" },
    { ...INITIAL, sourceSchemaVersion: 3 },
    { ...INITIAL, targetSchemaVersion: 4 },
    { ...INITIAL, sequence: -1 },
    { ...INITIAL, sequence: 1 },
    { ...INITIAL, phase: "completed", sequence: 0 },
    { ...INITIAL, phase: "unknown" },
    { ...INITIAL, sequence: Number.MAX_SAFE_INTEGER + 1 },
    { ...INITIAL, sourceBaselineSha256: "AA".repeat(32) },
    { ...INITIAL, declaredPhysicalProjectRoot: "./relative", declaredPhysicalProjectBrainRoot: "./relative/.project-brain" },
    { ...INITIAL, declaredPhysicalProjectBrainRoot: resolve(ROOT, "unrelated") },
    { ...INITIAL, transactionId: INITIAL.authorizationOperationId },
    { ...INITIAL, extra: "not supported" },
    { ...INITIAL, sourceBaselineDomain: "wrong" },
    Object.create({ ...INITIAL }),
    null, [],
  ];
  for (const candidate of invalid) {
    assert.throws(() => parseSchemaMigrationFenceRecord(candidate), /rejected/i);
    blocked(candidate);
  }
});
