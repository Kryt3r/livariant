import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  getStatus,
  initializeProject,
  type ReleaseDescriptor,
} from "../src/runtime/index.js";
import {
  applyMigrationUpdate as applyMigrationUpdateCore,
  planMigrationUpdate,
} from "../src/runtime/index-core.js";
import { makeLegacySchema1Project } from "./legacy-schema1-fixture.js";
import { createRuntimePackageFixture } from "./runtime-package-fixture.js";
import {
  MIGRATION_TARGET_VERSION,
  NORMAL_TARGET_VERSION,
  TEST_SOURCE_CHANNEL,
  TEST_SOURCE_VERSION,
} from "./release-test-baseline.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const sourceId = "official-local-test-source";

function runCli(projectPath: string, args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
}

async function writeManifest(projectPath: string, release: ReleaseDescriptor): Promise<string> {
  const path = resolve(projectPath, "livariant-release-manifest.json");
  await writeFile(path, `${JSON.stringify([release], null, 2)}\n`, "utf8");
  return path;
}

test("Livariant update CLI plans read-only and fails closed without protected lifecycle Authority", async () => {
  const projectPath = await mkdtemp(resolve(tmpdir(), "livariant-cli-update-"));
  const targetVersion = NORMAL_TARGET_VERSION;
  const fixture = await createRuntimePackageFixture(targetVersion);
  try {
    await initializeProject(projectPath, { authorized: true });
    const release: ReleaseDescriptor = {
      version: targetVersion,
      channel: TEST_SOURCE_CHANNEL,
      projectBrainSchema: 2,
      compatibility: { from: [TEST_SOURCE_VERSION] },
      sourceId,
      artifact: { id: "runtime-node-cli", sha256: fixture.sha256 },
    };
    const manifest = await writeManifest(projectPath, release);
    const beforeMetadata = await readFile(resolve(projectPath, ".project-brain", "metadata.json"));

    const plan = runCli(projectPath, ["update", "--manifest", manifest]);
    assert.equal(plan.status, 0, plan.stderr);
    assert.match(plan.stdout, /Livariant update plan/);
    assert.match(plan.stdout, /Migration required: no/);
    assert.match(plan.stdout, /No changes applied/);
    assert.deepEqual(await readFile(resolve(projectPath, ".project-brain", "metadata.json")), beforeMetadata);

    const missingSource = runCli(projectPath, ["update", "--manifest", manifest, "--apply", "--artifact", fixture.path]);
    assert.equal(missingSource.status, 1);
    assert.match(missingSource.stderr, /trusted-source/i);
    assert.equal((await getStatus(projectPath)).frameworkVersion, TEST_SOURCE_VERSION);

    const blocked = runCli(projectPath, [
      "update", "--manifest", manifest,
      "--apply", "--artifact", fixture.path,
      "--trusted-source", sourceId,
    ]);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /Guardian|lifecycle Authority|--apply expresses intent/i);
    assert.equal((await getStatus(projectPath)).frameworkVersion, TEST_SOURCE_VERSION);
    assert.deepEqual(await readFile(resolve(projectPath, ".project-brain", "metadata.json")), beforeMetadata);
  } finally {
    await fixture.cleanup();
    await rm(projectPath, { recursive: true, force: true });
  }
});

test("schema-changing update CLI fails closed before migration without protected lifecycle Authority", async () => {
  const projectPath = await mkdtemp(resolve(tmpdir(), "livariant-cli-migration-guidance-"));
  const targetVersion = MIGRATION_TARGET_VERSION;
  const fixture = await createRuntimePackageFixture(targetVersion);
  try {
    await initializeProject(projectPath, { authorized: true });
    await makeLegacySchema1Project(projectPath);
    const release: ReleaseDescriptor = {
      version: targetVersion,
      channel: TEST_SOURCE_CHANNEL,
      projectBrainSchema: 2,
      compatibility: { from: [TEST_SOURCE_VERSION] },
      sourceId,
      artifact: { id: "runtime-node-cli", sha256: fixture.sha256 },
    };
    const manifest = await writeManifest(projectPath, release);
    const beforeMetadata = await readFile(resolve(projectPath, ".project-brain", "metadata.json"));
    const blocked = runCli(projectPath, [
      "update", "--manifest", manifest,
      "--apply", "--artifact", fixture.path,
      "--trusted-source", sourceId,
    ]);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stdout, /Migration required: yes/);
    assert.match(blocked.stderr, /Guardian|lifecycle Authority|--apply expresses intent/i);
    assert.deepEqual(await readFile(resolve(projectPath, ".project-brain", "metadata.json")), beforeMetadata);
  } finally {
    await fixture.cleanup();
    await rm(projectPath, { recursive: true, force: true });
  }
});

test("Livariant recover CLI inspects first and bare --apply cannot authorize rollback", async () => {
  const projectPath = await mkdtemp(resolve(tmpdir(), "livariant-cli-recover-"));
  const targetVersion = MIGRATION_TARGET_VERSION;
  const fixture = await createRuntimePackageFixture(targetVersion);
  try {
    await initializeProject(projectPath, { authorized: true });
    await makeLegacySchema1Project(projectPath);
    const release: ReleaseDescriptor = {
      version: targetVersion,
      channel: TEST_SOURCE_CHANNEL,
      projectBrainSchema: 2,
      compatibility: { from: [TEST_SOURCE_VERSION] },
      sourceId,
      artifact: { id: "runtime-node-cli", sha256: fixture.sha256 },
    };
    const migrationPlan = await planMigrationUpdate(projectPath, release);
    await applyMigrationUpdateCore(projectPath, migrationPlan, {
      authorized: true,
      artifact: { sourceId, releaseVersion: targetVersion, artifactId: "runtime-node-cli", path: fixture.path },
      trustedSourceIds: new Set([sourceId]),
      interruptAfterMutation: true,
    });
    assert.equal((await getStatus(projectPath)).lifecycle, "recovery-required");

    const inspect = runCli(projectPath, ["recover"]);
    assert.equal(inspect.status, 0, inspect.stderr);
    assert.match(inspect.stdout, /State: interrupted-migration/);
    assert.match(inspect.stdout, /Checkpoint valid: yes/);
    assert.match(inspect.stdout, /No changes applied/);
    assert.equal((await getStatus(projectPath)).lifecycle, "recovery-required");

    const blocked = runCli(projectPath, ["recover", "--apply"]);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /Guardian|lifecycle Authority|--apply expresses intent/i);
    const status = await getStatus(projectPath);
    assert.equal(status.lifecycle, "recovery-required");
  } finally {
    await fixture.cleanup();
    await rm(projectPath, { recursive: true, force: true });
  }
});
