import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { activateInstalledRuntime, installVerifiedRuntime, readActiveRuntimePointer } from "../src/distribution/runtime-installation.js";
import type { LocalReleaseArtifact, ReleaseIdentity } from "../src/distribution/release-integrity.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";
import { getStatus, initializeProject, runDoctor } from "../src/runtime/index.js";
import { createRuntimePackageFixture } from "./runtime-package-fixture.js";

const version = "0.0.1-development.1";

function releaseInputs(path: string, sha256: string, artifactId = "runtime-node-cli") {
  const identity: ReleaseIdentity = { version, channel: "development", sourceId: "official-local-test-source", artifactId, artifactSha256: sha256 };
  const artifact: LocalReleaseArtifact = { sourceId: identity.sourceId, releaseVersion: version, artifactId, path };
  const trusted = new Set([identity.sourceId]);
  return { identity, artifact, trusted };
}

test("an exact verified Runtime release can be reused idempotently after an interrupted attempt", async () => {
  const fixture = await createRuntimePackageFixture(version);
  const project = await mkdtemp(join(tmpdir(), "pbf-runtime-reuse-"));
  try {
    const { identity, artifact, trusted } = releaseInputs(fixture.path, fixture.sha256);
    const first = await installVerifiedRuntime(project, identity, artifact, trusted);
    const second = await installVerifiedRuntime(project, identity, artifact, trusted);
    assert.equal(second.installRoot, first.installRoot);
    assert.equal(second.cliPath, first.cliPath);
    assert.equal(second.version, version);
  } finally { await fixture.cleanup(); await rm(project, { recursive: true, force: true }); }
});

test("same version cannot reuse an installed Runtime under a different artifact identity", async () => {
  const fixture = await createRuntimePackageFixture(version);
  const project = await mkdtemp(join(tmpdir(), "pbf-runtime-conflict-"));
  try {
    const first = releaseInputs(fixture.path, fixture.sha256, "runtime-node-cli-a");
    await installVerifiedRuntime(project, first.identity, first.artifact, first.trusted);
    const conflicting = releaseInputs(fixture.path, fixture.sha256, "runtime-node-cli-b");
    await assert.rejects(
      () => installVerifiedRuntime(project, conflicting.identity, conflicting.artifact, conflicting.trusted),
      /does not match the requested verified release identity/i,
    );
  } finally { await fixture.cleanup(); await rm(project, { recursive: true, force: true }); }
});

test("post-install Runtime file drift invalidates reuse and active execution evidence", async () => {
  const fixture = await createRuntimePackageFixture(version);
  const project = await mkdtemp(join(tmpdir(), "pbf-runtime-drift-"));
  try {
    const { identity, artifact, trusted } = releaseInputs(fixture.path, fixture.sha256);
    const installed = await installVerifiedRuntime(project, identity, artifact, trusted);
    await activateInstalledRuntime(project, installed);
    const original = await readFile(installed.cliPath, "utf8");
    await writeFile(installed.cliPath, `${original}\n// post-install drift\n`, "utf8");

    await assert.rejects(() => readActiveRuntimePointer(project), /package tree integrity mismatch/i);
    await assert.rejects(
      () => installVerifiedRuntime(project, identity, artifact, trusted),
      /package tree integrity mismatch/i,
    );
  } finally { await fixture.cleanup(); await rm(project, { recursive: true, force: true }); }
});

test("tampered prepared Runtime evidence narrows status and doctor without changing the Project pin", async () => {
  const fixture = await createRuntimePackageFixture(version);
  const project = await mkdtemp(join(tmpdir(), "pbf-runtime-drift-status-"));
  try {
    await initializeProject(project, { authorized: true });
    const { identity, artifact, trusted } = releaseInputs(fixture.path, fixture.sha256);
    const installed = await installVerifiedRuntime(project, identity, artifact, trusted);
    await activateInstalledRuntime(project, installed);
    const sourcePin = (await new ProjectBrainStore(project).readMetadata()).framework.version;

    const original = await readFile(installed.cliPath, "utf8");
    await writeFile(installed.cliPath, `${original}\n// tampered prepared Runtime\n`, "utf8");

    const status = await getStatus(project);
    assert.equal(status.lifecycle, "recovery-required");
    assert.match(status.lifecycleReason ?? "", /invalid active Runtime evidence.*integrity mismatch/i);
    assert.equal(status.frameworkVersion, sourcePin);

    const doctor = await runDoctor(project);
    assert.equal(doctor.state, "recovery-required");
    assert.equal(doctor.findings[0]?.code, "invalid-runtime-evidence");
    assert.match(doctor.findings[0]?.message ?? "", /integrity mismatch/i);
    assert.equal((await new ProjectBrainStore(project).readMetadata()).framework.version, sourcePin);
  } finally { await fixture.cleanup(); await rm(project, { recursive: true, force: true }); }
});

test("tampered Runtime matching the Project pin is never delegated to by the launcher", async () => {
  const fixture = await createRuntimePackageFixture(version);
  const project = await mkdtemp(join(tmpdir(), "pbf-runtime-drift-delegation-"));
  try {
    await initializeProject(project, { authorized: true });
    const { identity, artifact, trusted } = releaseInputs(fixture.path, fixture.sha256);
    const installed = await installVerifiedRuntime(project, identity, artifact, trusted);
    await activateInstalledRuntime(project, installed);
    await new ProjectBrainStore(project).updateFrameworkLifecycle(version, "development");

    const original = await readFile(installed.cliPath, "utf8");
    await writeFile(installed.cliPath, `${original}\n// tampered active Runtime\n`, "utf8");

    const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
    const result = spawnSync(process.execPath, [cliPath, "version", "--json"], {
      cwd: project,
      encoding: "utf8",
      shell: false,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /package tree integrity mismatch/i);
    assert.doesNotMatch(result.stdout, new RegExp(version.replaceAll(".", "\\.")));
  } finally { await fixture.cleanup(); await rm(project, { recursive: true, force: true }); }
});
