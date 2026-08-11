import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";
import { installVerifiedRuntime } from "../src/distribution/runtime-installation.js";
import type { LocalReleaseArtifact, ReleaseIdentity } from "../src/distribution/release-integrity.js";
import { createRuntimePackageFixture } from "./runtime-package-fixture.js";

const version = "0.0.1-development.1";

test("runtime installation preserves literal Windows metacharacters in project and artifact paths", { skip: process.platform !== "win32" }, async () => {
  const fixture = await createRuntimePackageFixture(version);
  const root = await mkdtemp(join(tmpdir(), "livariant-win-meta-"));
  const projectPath = join(root, "project & literal (path)");
  const artifactDir = join(root, "artifact ^ literal & path");
  try {
    await mkdir(projectPath, { recursive: true });
    await mkdir(artifactDir, { recursive: true });
    const artifactPath = join(artifactDir, basename(fixture.path));
    await copyFile(fixture.path, artifactPath);

    const identity: ReleaseIdentity = {
      version,
      channel: "development",
      sourceId: "official-local-test-source",
      artifactId: "runtime-node-cli",
      artifactSha256: fixture.sha256,
    };
    const artifact: LocalReleaseArtifact = {
      sourceId: identity.sourceId,
      releaseVersion: version,
      artifactId: identity.artifactId,
      path: artifactPath,
    };

    const installed = await installVerifiedRuntime(projectPath, identity, artifact, new Set([identity.sourceId]));
    assert.equal(installed.version, version);
    assert.match(installed.installRoot, /project & literal \(path\)/i);
  } finally {
    await fixture.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});
