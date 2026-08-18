import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import test from "node:test";
import { guardianAuthorityMaterialDigest } from "../src/guardian/authority-record.js";
import { buildProjectBrainIntegrityGuardianRequest } from "../src/guardian/project-brain-integrity-authority.js";

function material() {
  const projectRoot = resolve(process.cwd(), "fixture-project");
  return {
    stableProjectIdentity: randomUUID().toLowerCase(),
    physicalProjectRoot: projectRoot,
    physicalProjectBrainRoot: resolve(projectRoot, ".project-brain"),
    integritySchemaVersion: 1 as const,
    baseline: {
      algorithm: "sha256" as const,
      domain: "livariant:project-brain-integrity-material:v1" as const,
      digest: "1".repeat(64),
      schemaVersion: 2 as const,
    },
  };
}

test("C-02 Guardian request is persistent and consumer-domain separated", () => {
  const built = buildProjectBrainIntegrityGuardianRequest(material());
  assert.equal(built.request.consumer, "project-brain-integrity");
  assert.equal(built.request.mode, "persistent");
  assert.equal(built.materialSha256, guardianAuthorityMaterialDigest("project-brain-integrity", built.request.materialFields));
  assert.notEqual(built.materialSha256, guardianAuthorityMaterialDigest("runtime-trust", built.request.materialFields));
});

test("C-02 Guardian material changes for project identity, location, Project Brain location, or accepted baseline", () => {
  const base = material();
  const original = buildProjectBrainIntegrityGuardianRequest(base).materialSha256;
  const variants = [
    { ...base, stableProjectIdentity: randomUUID().toLowerCase() },
    { ...base, physicalProjectRoot: resolve(base.physicalProjectRoot, "other") },
    { ...base, physicalProjectBrainRoot: resolve(base.physicalProjectRoot, ".other-brain") },
    { ...base, baseline: { ...base.baseline, digest: "2".repeat(64) } },
  ];
  for (const variant of variants) {
    assert.notEqual(buildProjectBrainIntegrityGuardianRequest(variant).materialSha256, original);
  }
});

test("C-02 Guardian request refuses malformed identity, relative location, and invalid baseline", () => {
  const base = material();
  assert.throws(
    () => buildProjectBrainIntegrityGuardianRequest({ ...base, stableProjectIdentity: "not-a-project-id" }),
    /stable project identity/i,
  );
  assert.throws(
    () => buildProjectBrainIntegrityGuardianRequest({ ...base, physicalProjectRoot: "relative-project" }),
    /absolute physical path/i,
  );
  assert.throws(
    () => buildProjectBrainIntegrityGuardianRequest({ ...base, baseline: { ...base.baseline, digest: "bad" } }),
    /baseline is invalid/i,
  );
});
