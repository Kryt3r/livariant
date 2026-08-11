import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  applyMigrationUpdate,
  applyRecovery,
  initializeProject,
  inspectRecovery,
  planMigrationUpdate,
  planRecovery,
  readMigrationJournal,
} from "../src/runtime/index.js";
import { migrationApplyOptions, migrationRelease } from "./migration-runtime-fixture.js";
import { TEST_SOURCE_VERSION } from "./release-test-baseline.js";

test("late displaced cleanup failure keeps restored brain and last valid checkpoint", async () => {
  const projectPath = await mkdtemp(resolve(tmpdir(), "livariant-recovery-cleanup-"));
  try {
    await initializeProject(projectPath, { authorized: true });
    const migrationPlan = await planMigrationUpdate(projectPath, migrationRelease);
    await applyMigrationUpdate(
      projectPath,
      migrationPlan,
      migrationApplyOptions({ interruptAfterMutation: true }) as Parameters<typeof applyMigrationUpdate>[2],
    );

    const interruptedJournal = await readMigrationJournal(projectPath);
    assert.ok(interruptedJournal);
    const checkpointPath = interruptedJournal.checkpointPath;
    const checkpointProject = await readFile(resolve(checkpointPath, "project.md"), "utf8");

    const recoveryPlan = await planRecovery(projectPath);
    await assert.rejects(
      () => applyRecovery(projectPath, recoveryPlan, { authorized: true, failDisplacedCleanup: true }),
      /displaced recovery cleanup failure/i,
    );

    const restoredMetadata = JSON.parse(await readFile(resolve(projectPath, ".project-brain", "metadata.json"), "utf8")) as {
      framework: { version: string };
      projectBrain: { schemaVersion: number };
    };
    assert.equal(restoredMetadata.framework.version, TEST_SOURCE_VERSION);
    assert.equal(restoredMetadata.projectBrain.schemaVersion, 1);
    assert.equal(await readFile(resolve(projectPath, ".project-brain", "project.md"), "utf8"), checkpointProject);

    const checkpointStats = await stat(checkpointPath);
    assert.equal(checkpointStats.isDirectory(), true);
    assert.equal(await readFile(resolve(checkpointPath, "project.md"), "utf8"), checkpointProject);

    const committedJournal = await readMigrationJournal(projectPath);
    assert.equal(committedJournal?.state, "failed");
    assert.equal(committedJournal?.recovery?.state, "rolled-back");

    const restartInspection = await inspectRecovery(projectPath);
    assert.equal(restartInspection.state, "none");
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
});
