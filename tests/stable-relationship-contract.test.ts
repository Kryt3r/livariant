import assert from "node:assert/strict";
import test from "node:test";
import {
  createStableRelationship,
  stableRelationshipIdentity,
  validateStableRelationship,
} from "../src/relationships/index.js";

test("supersedes points from replacement decision to superseded decision", () => {
  const relationship = createStableRelationship({
    schemaVersion: 1,
    type: "supersedes",
    from: { kind: "decision", id: "D-042" },
    to: { kind: "decision", id: "D-018" },
    grantsAuthority: false,
  });

  assert.equal(relationship.type, "supersedes");
  assert.deepEqual(relationship.from, { kind: "decision", id: "D-042" });
  assert.deepEqual(relationship.to, { kind: "decision", id: "D-018" });
  assert.equal(relationship.grantsAuthority, false);
  assert.equal(relationship.relationshipId, stableRelationshipIdentity(relationship));
});

test("derived-from points from derived evidence to source evidence", () => {
  const relationship = createStableRelationship({
    schemaVersion: 1,
    type: "derived-from",
    from: { kind: "evidence", id: "evidence:summary-1" },
    to: { kind: "evidence", id: "evidence:source-1" },
    grantsAuthority: false,
  });

  assert.equal(relationship.type, "derived-from");
  assert.equal(relationship.from.kind, "evidence");
  assert.equal(relationship.to.kind, "evidence");
  assert.equal(relationship.grantsAuthority, false);
});

test("relationship identity is deterministic and direction-sensitive", () => {
  const forward = createStableRelationship({
    schemaVersion: 1,
    type: "supersedes",
    from: { kind: "decision", id: "D-002" },
    to: { kind: "decision", id: "D-001" },
    grantsAuthority: false,
  });
  const same = createStableRelationship({
    schemaVersion: 1,
    type: "supersedes",
    from: { kind: "decision", id: "D-002" },
    to: { kind: "decision", id: "D-001" },
    grantsAuthority: false,
  });
  const reversed = createStableRelationship({
    schemaVersion: 1,
    type: "supersedes",
    from: { kind: "decision", id: "D-001" },
    to: { kind: "decision", id: "D-002" },
    grantsAuthority: false,
  });

  assert.equal(forward.relationshipId, same.relationshipId);
  assert.notEqual(forward.relationshipId, reversed.relationshipId);
});

test("relationship presence cannot claim truth, freshness, confidence or Authority", () => {
  const base = createStableRelationship({
    schemaVersion: 1,
    type: "derived-from",
    from: { kind: "evidence", id: "evidence:derived" },
    to: { kind: "evidence", id: "evidence:source" },
    grantsAuthority: false,
  });

  assert.throws(() => validateStableRelationship({ ...base, current: true }), /unsupported field 'current'/);
  assert.throws(() => validateStableRelationship({ ...base, confirmed: true }), /unsupported field 'confirmed'/);
  assert.throws(() => validateStableRelationship({ ...base, confidence: "strong" }), /unsupported field 'confidence'/);
  assert.throws(() => validateStableRelationship({ ...base, grantsAuthority: true }), /must never grant Authority/);
});

test("relationship types enforce endpoint semantics", () => {
  const badSupersedes = {
    schemaVersion: 1,
    relationshipId: "relationship-v1:" + "a".repeat(64),
    type: "supersedes",
    from: { kind: "evidence", id: "evidence:new" },
    to: { kind: "evidence", id: "evidence:old" },
    grantsAuthority: false,
  };
  const badDerivedFrom = {
    schemaVersion: 1,
    relationshipId: "relationship-v1:" + "b".repeat(64),
    type: "derived-from",
    from: { kind: "decision", id: "D-002" },
    to: { kind: "decision", id: "D-001" },
    grantsAuthority: false,
  };

  assert.throws(() => validateStableRelationship(badSupersedes), /replacement decision/);
  assert.throws(() => validateStableRelationship(badDerivedFrom), /derived evidence/);
});

test("self relationships and forged deterministic identities fail closed", () => {
  const valid = createStableRelationship({
    schemaVersion: 1,
    type: "derived-from",
    from: { kind: "evidence", id: "evidence:derived" },
    to: { kind: "evidence", id: "evidence:source" },
    grantsAuthority: false,
  });

  assert.throws(
    () => createStableRelationship({
      schemaVersion: 1,
      type: "derived-from",
      from: { kind: "evidence", id: "evidence:same" },
      to: { kind: "evidence", id: "evidence:same" },
      grantsAuthority: false,
    }),
    /cannot point an entity to itself/,
  );

  assert.throws(
    () => validateStableRelationship({ ...valid, relationshipId: "relationship-v1:" + "0".repeat(64) }),
    /does not match the relationship endpoints and type/,
  );
});
