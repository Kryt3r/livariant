import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyMigrationUpdate,
  applyNormalUpdate,
  getStatus,
  initializeProject,
  inspectInitialization,
  planMigrationUpdate,
  planNormalUpdate,
  type ReleaseDescriptor,
} from "../src/runtime/index.js";
import { migrationApplyOptions, migrationRelease } from "./migration-runtime-fixture.js";

const normalArtifactPath = fileURLToPath(new URL("../../tests/fixtures/releases/runtime-normal.artifact", import.meta.url));
const trustedSourceIds = new Set(["official-local-test-source"]);

const normalRelease: ReleaseDescriptor = {
  version: "0.0.1-development.1",
  channel: "development",
  projectBrainSchema: 1,
  compatibility: { from: ["0.0.0-development"] },
  sourceId: "official-local-test-source",
  artifact: { id: "runtime-node-cli", sha256: "92aec86650434112d3e4655385deaa9aa633330af26ad7cff6e8697c8b01cbca" },
};

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(join(tmpdir(), "pbf-deep-chaos-"));
  try { await run(path); } finally { await rm(path, { recursive: true, force: true }); }
}

test("discovery observes but never ingests a symlinked package manifest", async () => {
  await withProject(async (path) => {
    const external = resolve(path, "external-package.json");
    const secretName = "do-not-ingest-external-project-identity";
    await writeFile(external, JSON.stringify({ name: secretName }), "utf8");
    await symlink(external, resolve(path, "package.json"));
    const plan = await inspectInitialization(path);
    assert.equal(plan.projectState, "existing-project-without-brain");
    assert.ok(plan.evidence.includes("package.json"));
    assert.ok(plan.evidence.includes("package.json:unsafe"));
    assert.equal(plan.confirmedProjectName, undefined);
    await initializeProject(path, { authorized: true });
    const projectDoc = await readFile(resolve(path, ".project-brain", "project.md"), "utf8");
    assert.doesNotMatch(projectDoc, new RegExp(secretName));
    assert.equal(await readFile(external, "utf8"), JSON.stringify({ name: secretName }));
  });
});

test("an interrupted migration blocks a previously valid normal-update plan", async () => {
  await withProject(async (path) => {
    await initializeProject(path, { authorized: true });
    const normalPlan = await planNormalUpdate(path, [normalRelease]);
    assert.ok(normalPlan);
    const migrationPlan = await planMigrationUpdate(path, migrationRelease);
    await applyMigrationUpdate(path, migrationPlan, { ...migrationApplyOptions(), interruptAfterMutation: true } as Parameters<typeof applyMigrationUpdate>[2]);
    const beforeMetadata = await readFile(resolve(path, ".project-brain", "metadata.json"));
    await assert.rejects(
      () => applyNormalUpdate(path, normalPlan, {
        authorized: true,
        artifact: { sourceId: "official-local-test-source", releaseVersion: normalRelease.version, artifactId: normalRelease.artifact.id, path: normalArtifactPath },
        trustedSourceIds,
      }),
      /recovery is required|lifecycle evidence/i,
    );
    assert.deepEqual(await readFile(resolve(path, ".project-brain", "metadata.json")), beforeMetadata);
    assert.equal((await getStatus(path)).lifecycle, "recovery-required");
  });
});

test("normal update planning is blocked while migration recovery is unresolved", async () => {
  await withProject(async (path) => {
    await initializeProject(path, { authorized: true });
    const migrationPlan = await planMigrationUpdate(path, migrationRelease);
    await applyMigrationUpdate(path, migrationPlan, { ...migrationApplyOptions(), interruptAfterMutation: true } as Parameters<typeof applyMigrationUpdate>[2]);
    await assert.rejects(() => planNormalUpdate(path, [normalRelease]), /recovery is required|lifecycle evidence/i);
  });
});
