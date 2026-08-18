import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyMigrationUpdate,
  getStatus,
  initializeProject,
  planMigrationUpdate,
  type ReleaseDescriptor,
} from "../src/runtime/index.js";
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

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("Livariant update CLI plans read-only, requires explicit trust, and activates an attested Runtime", async () => {
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

    const untrusted = runCli(projectPath, ["update", "--manifest", manifest, "--apply", "--artifact", fixture.path]);
    assert.equal(untrusted.status, 1);
    assert.match(untrusted.stderr, /trusted-source/i);
    assert.equal((await getStatus(projectPath)).frameworkVersion, TEST_SOURCE_VERSION);

    const applied = runCli(projectPath, [
      "update", "--manifest", manifest,
      "--apply", "--artifact", fixture.path,
      "--trusted-source", sourceId,
    ]);
    assert.equal(applied.status, 0, applied.stderr);
    assert.match(applied.stdout, new RegExp(`Livariant update completed: ${escaped(TEST_SOURCE_VERSION)} -> ${escaped(targetVersion)}`));
    assert.doesNotMatch(applied.stdout, /Protected integrity: required for the changed Project Brain state/i);
    assert.equal((await getStatus(projectPath)).frameworkVersion, targetVersion);
  } finally {
    await fixture.cleanup();
    await rm(projectPath, { recursive: true, force: true });
  }
});

test("schema-changing update CLI explains protected integrity acceptance for the migrated Project Brain", async () => {
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
    const applied = runCli(projectPath, [
      "update", "--manifest", manifest,
      "--apply", "--artifact", fixture.path,
      "--trusted-source", sourceId,
    ]);
    assert.equal(applied.status, 0, `${applied.stdout}\n${applied.stderr}`);
    assert.match(applied.stdout, /Migration required: yes/);
    assert.match(applied.stdout, /Protected integrity: required for the changed Project Brain state/i);
    assert.match(applied.stdout, /integrity inspect/i);
    assert.match(applied.stdout, /integrity accept-current/i);
  } finally {
    await fixture.cleanup();
    await rm(projectPath, { recursive: true, force: true });
  }
});

test("Livariant recover CLI inspects first and only rolls back after explicit apply", async () => {
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
    await applyMigrationUpdate(projectPath, migrationPlan, {
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

    const applied = runCli(projectPath, ["recover", "--apply"]);
    assert.equal(applied.status, 0, applied.stderr);
    assert.match(applied.stdout, /Recovery completed/);
    assert.match(applied.stdout, /Protected integrity: inspect the restored Project Brain/i);
    assert.match(applied.stdout, /integrity accept-current/i);
    const status = await getStatus(projectPath);
    assert.equal(status.lifecycle, "initialized");
    assert.equal(status.frameworkVersion, TEST_SOURCE_VERSION);
  } finally {
    await fixture.cleanup();
    await rm(projectPath, { recursive: true, force: true });
  }
});
