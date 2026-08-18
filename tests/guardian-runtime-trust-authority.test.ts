import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { guardianAuthorityMaterialDigest } from "../src/guardian/authority-record.js";
import { buildRuntimeTrustGuardianRequest } from "../src/guardian/runtime-trust-authority.js";

function material() {
  const projectRoot = resolve(process.cwd(), "fixture-project");
  const installRoot = resolve(projectRoot, ".framework-runtime", "releases", "1.2.3");
  const packageRoot = resolve(installRoot, "node_modules", "livariant");
  return {
    runtimeTrustSchemaVersion: 1 as const,
    packageName: "livariant" as const,
    version: "1.2.3",
    channel: "preview" as const,
    sourceId: "fixture-source",
    artifactId: "livariant-1.2.3.tgz",
    artifactSha256: "1".repeat(64),
    packageTreeSha256: "2".repeat(64),
    physicalProjectRoot: projectRoot,
    physicalInstallRoot: installRoot,
    physicalPackageRoot: packageRoot,
    physicalCliPath: resolve(packageRoot, "dist", "src", "cli", "index.js"),
  };
}

test("C-03 Guardian Runtime trust is persistent and consumer-domain separated", () => {
  const built = buildRuntimeTrustGuardianRequest(material());
  assert.equal(built.request.consumer, "runtime-trust");
  assert.equal(built.request.mode, "persistent");
  assert.equal(built.materialSha256, guardianAuthorityMaterialDigest("runtime-trust", built.request.materialFields));
  assert.notEqual(built.materialSha256, guardianAuthorityMaterialDigest("project-brain-integrity", built.request.materialFields));
  assert.notEqual(built.materialSha256, guardianAuthorityMaterialDigest("release-authorization", built.request.materialFields));
});

test("C-03 Guardian Runtime trust changes for exact artifact, tree, project, install, package, or CLI identity", () => {
  const base = material();
  const original = buildRuntimeTrustGuardianRequest(base).materialSha256;
  const variants = [
    { ...base, artifactSha256: "3".repeat(64) },
    { ...base, packageTreeSha256: "4".repeat(64) },
    { ...base, physicalProjectRoot: resolve(base.physicalProjectRoot, "other") },
    { ...base, physicalInstallRoot: resolve(base.physicalInstallRoot, "other") },
    { ...base, physicalPackageRoot: resolve(base.physicalPackageRoot, "other") },
    { ...base, physicalCliPath: resolve(base.physicalCliPath, "other") },
  ];
  for (const variant of variants) {
    assert.notEqual(buildRuntimeTrustGuardianRequest(variant).materialSha256, original);
  }
});

test("C-03 Guardian Runtime trust refuses malformed digest, relative path, and unsafe identity framing", () => {
  const base = material();
  assert.throws(
    () => buildRuntimeTrustGuardianRequest({ ...base, artifactSha256: "bad" }),
    /SHA-256 digest/i,
  );
  assert.throws(
    () => buildRuntimeTrustGuardianRequest({ ...base, physicalInstallRoot: "relative-runtime" }),
    /absolute physical path/i,
  );
  assert.throws(
    () => buildRuntimeTrustGuardianRequest({ ...base, artifactId: "bad\nartifact" }),
    /artifact id is invalid/i,
  );
});
