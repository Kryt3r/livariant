import assert from "node:assert/strict";
import test from "node:test";
import {
  assertGuardianAuthorityMatches,
  buildGuardianAuthorityRecord,
  consumeGuardianAuthorityRecord,
  guardianAuthorityMaterialDigest,
  parseGuardianAuthorityRecord,
} from "../src/guardian/authority-record.js";

test("Guardian Authority material digest is consumer-domain separated", () => {
  const fields = [
    { label: "project", value: "project-1" },
    { label: "material", value: "same-bytes" },
  ] as const;
  const semantic = guardianAuthorityMaterialDigest("semantic-mutation", fields);
  const runtime = guardianAuthorityMaterialDigest("runtime-trust", fields);
  assert.match(semantic, /^[a-f0-9]{64}$/u);
  assert.notEqual(semantic, runtime);
});

test("Guardian Authority material rejects duplicate labels", () => {
  assert.throws(
    () => guardianAuthorityMaterialDigest("semantic-mutation", [
      { label: "project", value: "a" },
      { label: "project", value: "b" },
    ]),
    /duplicated/u,
  );
});

test("one-shot Guardian Authority is exact-material-bound and non-reusable", () => {
  const materialSha256 = guardianAuthorityMaterialDigest("semantic-mutation", [
    { label: "project", value: "project-1" },
    { label: "proposal", value: "proposal-1" },
  ]);
  const record = buildGuardianAuthorityRecord({
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialSha256,
    issuedAt: "2026-08-17T17:00:00.000Z",
    expiresAt: "2026-08-17T18:00:00.000Z",
    recordId: "123e4567-e89b-42d3-a456-426614174000",
  });

  assert.doesNotThrow(() => assertGuardianAuthorityMatches(record, {
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialSha256,
  }, new Date("2026-08-17T17:30:00.000Z")));

  const consumed = consumeGuardianAuthorityRecord(record, "2026-08-17T17:31:00.000Z");
  assert.equal(consumed.state, "consumed");
  assert.throws(() => assertGuardianAuthorityMatches(consumed, {
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialSha256,
  }), /already been consumed/u);
  assert.throws(() => consumeGuardianAuthorityRecord(consumed), /already been consumed/u);
});

test("Guardian Authority refuses cross-consumer and material substitution", () => {
  const materialSha256 = guardianAuthorityMaterialDigest("release-authorization", [
    { label: "artifact", value: "a" },
  ]);
  const record = buildGuardianAuthorityRecord({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256,
    recordId: "123e4567-e89b-42d3-a456-426614174001",
  });

  assert.throws(() => assertGuardianAuthorityMatches(record, {
    consumer: "runtime-trust",
    mode: "one-shot",
    materialSha256,
  }), /different consumer/u);

  assert.throws(() => assertGuardianAuthorityMatches(record, {
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256: "0".repeat(64),
  }), /exact consequential material/u);
});

test("Guardian Authority refuses expired one-shot records", () => {
  const materialSha256 = guardianAuthorityMaterialDigest("release-authorization", [
    { label: "artifact", value: "a" },
  ]);
  const record = buildGuardianAuthorityRecord({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256,
    issuedAt: "2026-08-17T17:00:00.000Z",
    expiresAt: "2026-08-17T17:01:00.000Z",
    recordId: "123e4567-e89b-42d3-a456-426614174002",
  });
  assert.throws(() => assertGuardianAuthorityMatches(record, {
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256,
  }, new Date("2026-08-17T17:01:00.000Z")), /expired/u);
});

test("persistent Guardian Runtime trust cannot carry one-shot state", () => {
  const materialSha256 = guardianAuthorityMaterialDigest("runtime-trust", [
    { label: "artifact", value: "runtime-a" },
  ]);
  const record = buildGuardianAuthorityRecord({
    consumer: "runtime-trust",
    mode: "persistent",
    materialSha256,
    recordId: "123e4567-e89b-42d3-a456-426614174003",
  });
  assert.equal(parseGuardianAuthorityRecord(record).mode, "persistent");
  assert.throws(() => buildGuardianAuthorityRecord({
    consumer: "runtime-trust",
    mode: "persistent",
    materialSha256,
    expiresAt: "2026-08-18T17:00:00.000Z",
  }), /must not use one-shot expiry semantics/u);
});

test("strict Guardian Authority parsing rejects extra fields and malformed consumed state", () => {
  const materialSha256 = guardianAuthorityMaterialDigest("project-brain-integrity", [
    { label: "baseline", value: "abc" },
  ]);
  const record = buildGuardianAuthorityRecord({
    consumer: "project-brain-integrity",
    mode: "one-shot",
    materialSha256,
    recordId: "123e4567-e89b-42d3-a456-426614174004",
  });

  assert.throws(() => parseGuardianAuthorityRecord({ ...record, attacker: true }), /unsupported field/u);
  assert.throws(() => parseGuardianAuthorityRecord({ ...record, state: "consumed" }), /requires a consumed timestamp/u);
});
