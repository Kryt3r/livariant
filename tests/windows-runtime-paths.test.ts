import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";
import { installVerifiedRuntime } from "../src/distribution/runtime-installation.js";
import type { LocalReleaseArtifact, ReleaseIdentity } from "../src/distribution/release-integrity.js";
import { createRuntimePackageFixture } from "./runtime-package-fixture.js";

const version = "0.0.1-development.1";

function releaseInputs(path: string, sha256: string): { identity: ReleaseIdentity; artifact: LocalReleaseArtifact } {
  const identity: ReleaseIdentity = {
    version,
    channel: "development",
    sourceId: "official-local-test-source",
    artifactId: "runtime-node-cli",
    artifactSha256: sha256,
  };
  return {
    identity,
    artifact: {
      sourceId: identity.sourceId,
      releaseVersion: version,
      artifactId: identity.artifactId,
      path,
    },
  };
}

test("runtime installation preserves literal Windows metacharacters in project and artifact paths", { skip: process.platform !== "win32" }, async () => {
  const fixture = await createRuntimePackageFixture(version);
  const root = await mkdtemp(join(tmpdir(), "livariant-win-meta-"));
  const projectPath = join(root, "project & literal (path)");
  const artifactDir = join(root, "artifact ^ literal & path");
  const previousTrustRoot = process.env.LIVARIANT_TRUST_ROOT;
  process.env.LIVARIANT_TRUST_ROOT = join(root, "trust");
  try {
    await mkdir(projectPath, { recursive: true });
    await mkdir(artifactDir, { recursive: true });
    const artifactPath = join(artifactDir, basename(fixture.path));
    await copyFile(fixture.path, artifactPath);

    const { identity, artifact } = releaseInputs(artifactPath, fixture.sha256);
    const installed = await installVerifiedRuntime(projectPath, identity, artifact, new Set([identity.sourceId]));
    assert.equal(installed.version, version);
    assert.match(installed.installRoot, /project & literal \(path\)/i);
  } finally {
    if (previousTrustRoot === undefined) delete process.env.LIVARIANT_TRUST_ROOT;
    else process.env.LIVARIANT_TRUST_ROOT = previousTrustRoot;
    await fixture.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("runtime installation treats valid Windows cmd metacharacters as literal path data without whitespace", { skip: process.platform !== "win32" }, async () => {
  const fixture = await createRuntimePackageFixture(version);
  const root = await mkdtemp(join(tmpdir(), "livariant-win-meta-nowhitespace-"));
  const previousTrustRoot = process.env.LIVARIANT_TRUST_ROOT;
  process.env.LIVARIANT_TRUST_ROOT = join(root, "trust");

  // `|` and `"` are not legal Windows filename characters, so they cannot occur
  // in the filesystem paths passed to this installation API. These cases cover
  // cmd metacharacters that are legal in Windows path components.
  const cases = ["a&b", "a^b", "a%b", "a(b)", "a!b"];

  try {
    for (let index = 0; index < cases.length; index += 1) {
      const literal = cases[index]!;
      const projectPath = join(root, `project-${index}-${literal}`);
      const artifactDir = join(root, `artifact-${index}-${literal}`);
      await mkdir(projectPath, { recursive: true });
      await mkdir(artifactDir, { recursive: true });
      const artifactPath = join(artifactDir, basename(fixture.path));
      await copyFile(fixture.path, artifactPath);

      const { identity, artifact } = releaseInputs(artifactPath, fixture.sha256);
      const installed = await installVerifiedRuntime(projectPath, identity, artifact, new Set([identity.sourceId]));
      assert.equal(installed.version, version, `literal path case ${literal}`);
      assert.ok(installed.installRoot.includes(literal), `install root should preserve literal ${literal}`);
    }
  } finally {
    if (previousTrustRoot === undefined) delete process.env.LIVARIANT_TRUST_ROOT;
    else process.env.LIVARIANT_TRUST_ROOT = previousTrustRoot;
    await fixture.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});
