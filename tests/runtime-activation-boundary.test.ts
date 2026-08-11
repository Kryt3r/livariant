import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { initializeProject, getStatus } from "../src/runtime/index.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";
import { activateInstalledRuntime, installVerifiedRuntime } from "../src/distribution/runtime-installation.js";
import type { LocalReleaseArtifact, ReleaseIdentity } from "../src/distribution/release-integrity.js";
import { createRuntimePackageFixture } from "./runtime-package-fixture.js";
import { NORMAL_TARGET_VERSION, TEST_SOURCE_CHANNEL, TEST_SOURCE_VERSION } from "./release-test-baseline.js";

const targetVersion = NORMAL_TARGET_VERSION;

function runSourceStatus(projectPath: string): string {
  const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
  const result = spawnSync(process.execPath, [cliPath, "status"], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

test("a prepared Runtime cannot execute until the canonical Project pin activates the same release", async () => {
  const projectPath = await mkdtemp(join(tmpdir(), "pbf-runtime-activation-"));
  const fixture = await createRuntimePackageFixture(targetVersion);
  try {
    await initializeProject(projectPath, { authorized: true });
    const identity: ReleaseIdentity = {
      version: targetVersion,
      channel: TEST_SOURCE_CHANNEL,
      sourceId: "official-local-test-source",
      artifactId: "runtime-node-cli",
      artifactSha256: fixture.sha256,
    };
    const artifact: LocalReleaseArtifact = {
      sourceId: identity.sourceId,
      releaseVersion: targetVersion,
      artifactId: identity.artifactId,
      path: fixture.path,
    };
    const installed = await installVerifiedRuntime(projectPath, identity, artifact, new Set([identity.sourceId]));
    await activateInstalledRuntime(projectPath, installed);

    const prepared = await getStatus(projectPath);
    assert.equal(prepared.frameworkVersion, TEST_SOURCE_VERSION);
    assert.equal(prepared.executingRuntimeVersion, TEST_SOURCE_VERSION);
    assert.equal(prepared.preparedRuntimeVersion, targetVersion);
    assert.equal(prepared.activatedRuntimeVersion, undefined);
    assert.match(runSourceStatus(projectPath), new RegExp(`Executing Runtime: ${TEST_SOURCE_VERSION.replaceAll(".", "\\.")}`));

    await new ProjectBrainStore(projectPath).updateFrameworkLifecycle(targetVersion, TEST_SOURCE_CHANNEL);

    const activated = await getStatus(projectPath);
    assert.equal(activated.frameworkVersion, targetVersion);
    assert.equal(activated.activatedRuntimeVersion, targetVersion);
    assert.equal(activated.preparedRuntimeVersion, undefined);
    assert.match(runSourceStatus(projectPath), new RegExp(`Executing Runtime: ${targetVersion.replaceAll(".", "\\.")}`));
  } finally {
    await fixture.cleanup();
    await rm(projectPath, { recursive: true, force: true });
  }
});
