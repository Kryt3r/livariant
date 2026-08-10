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

const targetVersion = "0.0.1-development.1";

function runSourceCli(projectPath: string): { frameworkVersion?: string } {
  const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
  const result = spawnSync(process.execPath, [cliPath, "version", "--json"], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout) as { frameworkVersion?: string };
}

test("a prepared Runtime cannot execute until the canonical Project pin activates the same release", async () => {
  const projectPath = await mkdtemp(join(tmpdir(), "pbf-runtime-activation-"));
  const fixture = await createRuntimePackageFixture(targetVersion);
  try {
    await initializeProject(projectPath, { authorized: true });
    const identity: ReleaseIdentity = {
      version: targetVersion,
      channel: "development",
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
    assert.equal(prepared.frameworkVersion, "0.0.0-development");
    assert.equal(prepared.executingRuntimeVersion, "0.0.0-development");
    assert.equal(prepared.preparedRuntimeVersion, targetVersion);
    assert.equal(prepared.activatedRuntimeVersion, undefined);
    assert.equal(runSourceCli(projectPath).frameworkVersion, "0.0.0-development");

    await new ProjectBrainStore(projectPath).updateFrameworkLifecycle(targetVersion, "development");

    const activated = await getStatus(projectPath);
    assert.equal(activated.frameworkVersion, targetVersion);
    assert.equal(activated.activatedRuntimeVersion, targetVersion);
    assert.equal(activated.preparedRuntimeVersion, undefined);
    assert.equal(runSourceCli(projectPath).frameworkVersion, targetVersion);
  } finally {
    await fixture.cleanup();
    await rm(projectPath, { recursive: true, force: true });
  }
});
