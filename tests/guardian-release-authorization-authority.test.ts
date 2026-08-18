import assert from "node:assert/strict";
import test from "node:test";
import { guardianAuthorityMaterialDigest } from "../src/guardian/authority-record.js";
import { buildReleaseAuthorizationGuardianRequest } from "../src/guardian/release-authorization-authority.js";

function material() {
  return {
    releaseAuthorizationSchemaVersion: 1 as const,
    packageName: "livariant" as const,
    version: "1.2.3",
    channel: "preview" as const,
    sourceId: "fixture-source",
    artifactId: "livariant-1.2.3.tgz",
    artifactSha256: "1".repeat(64),
  };
}

test("C-04 Guardian release authorization is persistent and consumer-domain separated", () => {
  const built = buildReleaseAuthorizationGuardianRequest(material());
  assert.equal(built.request.consumer, "release-authorization");
  assert.equal(built.request.mode, "persistent");
  assert.equal(built.materialSha256, guardianAuthorityMaterialDigest("release-authorization", built.request.materialFields));
  assert.notEqual(built.materialSha256, guardianAuthorityMaterialDigest("runtime-trust", built.request.materialFields));
  assert.notEqual(built.materialSha256, guardianAuthorityMaterialDigest("project-brain-integrity", built.request.materialFields));
});

test("C-04 Guardian release authorization binds exact release and artifact identity", () => {
  const base = material();
  const original = buildReleaseAuthorizationGuardianRequest(base).materialSha256;
  const variants = [
    { ...base, version: "1.2.4" },
    { ...base, channel: "stable" as const },
    { ...base, sourceId: "other-source" },
    { ...base, artifactId: "other-artifact.tgz" },
    { ...base, artifactSha256: "2".repeat(64) },
  ];
  for (const variant of variants) {
    assert.notEqual(buildReleaseAuthorizationGuardianRequest(variant).materialSha256, original);
  }
});

test("C-04 Guardian release authorization refuses malformed digest and unsafe identity framing", () => {
  const base = material();
  assert.throws(
    () => buildReleaseAuthorizationGuardianRequest({ ...base, artifactSha256: "bad" }),
    /SHA-256 digest/i,
  );
  assert.throws(
    () => buildReleaseAuthorizationGuardianRequest({ ...base, artifactId: "bad\nartifact" }),
    /artifact id is invalid/i,
  );
  assert.throws(
    () => buildReleaseAuthorizationGuardianRequest({ ...base, sourceId: "bad\u0000source" }),
    /source id is invalid/i,
  );
});
