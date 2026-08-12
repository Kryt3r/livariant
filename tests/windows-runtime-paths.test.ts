import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { basename, join, resolve } from "node:path";
import test from "node:test";
import { installVerifiedRuntime } from "../src/distribution/runtime-installation.js";
import type { LocalReleaseArtifact, ReleaseIdentity } from "../src/distribution/release-integrity.js";
import { createRuntimePackageFixture } from "./runtime-package-fixture.js";

const version = "0.0.1-development.1";

function machineTestTrustRoot(label: string): string {
  return resolve(userInfo().homedir, ".livariant", "trust", "runtimes", `test-${label}-${randomUUID()}`);
}

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

test("npm packaging helpers never route through cmd.exe or ComSpec", async () => {
  const paths = [
    "scripts/package-smoke.mjs",
    "scripts/build-release-bundle.mjs",
    "scripts/release-bundle-smoke.mjs",
    "tests/runtime-package-fixture.ts",
    "tests/pretrust-runtime-authorization.test.ts",
  ];

  for (const path of paths) {
    const source = await readFile(resolve(process.cwd(), path), "utf8");
    assert.doesNotMatch(source, /ComSpec|cmd\.exe/i, `${path} must not invoke npm through the Windows command shell`);
    assert.match(source, /npm-cli\.js/, `${path} must use the shell-free npm CLI entry point on Windows`);
  }
});

test("runtime installation preserves literal Windows metacharacters in project and artifact paths", { skip: process.platform !== "win32" }, async () => {
  const fixture = await createRuntimePackageFixture(version);
  const root = await mkdtemp(join(tmpdir(), "livariant-win-meta-"));
  const projectPath = join(root, "project & literal (path)");
  const artifactDir = join(root, "artifact ^ literal & path");
  const trustRoot = machineTestTrustRoot("win-meta");
  const previousTrustRoot = process.env.LIVARIANT_TRUST_ROOT;
  process.env.LIVARIANT_TRUST_ROOT = trustRoot;
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
    await rm(trustRoot, { recursive: true, force: true });
  }
});

test("runtime installation treats valid Windows cmd metacharacters as literal path data without whitespace", { skip: process.platform !== "win32" }, async () => {
  const fixture = await createRuntimePackageFixture(version);
  const root = await mkdtemp(join(tmpdir(), "livariant-win-meta-nowhitespace-"));
  const trustRoot = machineTestTrustRoot("win-nowhitespace");
  const previousTrustRoot = process.env.LIVARIANT_TRUST_ROOT;
  process.env.LIVARIANT_TRUST_ROOT = trustRoot;

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
    await rm(trustRoot, { recursive: true, force: true });
  }
});
