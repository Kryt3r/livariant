import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  initializeProject,
  inspectRecovery,
  planMigrationUpdate,
  planRecovery,
  readMigrationJournal,
} from "../src/runtime/index.js";
import { applyMigrationUpdate } from "../src/lifecycle/migration.js";
import { makeLegacySchema1Project } from "./legacy-schema1-fixture.js";
import { migrationApplyOptions, migrationRelease } from "./migration-runtime-fixture.js";

async function withInterruptedMigration(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(join(tmpdir(), "pbf-checkpoint-integrity-"));
  try {
    await initializeProject(path, { authorized: true });
    await makeLegacySchema1Project(path);
    const plan = await planMigrationUpdate(path, migrationRelease);
    await applyMigrationUpdate(path, plan, {
      ...migrationApplyOptions(),
      interruptAfterMutation: true,
    } as Parameters<typeof applyMigrationUpdate>[2]);
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("checkpoint knowledge tampering is detected even when source version and schema still match", async () => {
  await withInterruptedMigration(async (path) => {
    const journal = await readMigrationJournal(path);
    assert.ok(journal);
    const currentBrainKnowledge = await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8");
    const checkpointKnowledge = resolve(journal.checkpointPath, "knowledge.md");
    await writeFile(checkpointKnowledge, `${await readFile(checkpointKnowledge, "utf8")}\nTAMPERED CHECKPOINT CONTENT\n`, "utf8");

    const inspection = await inspectRecovery(path);
    assert.equal(inspection.state, "recovery-required");
    assert.equal(inspection.checkpointValid, false);
    assert.match(inspection.reason ?? "", /integrity mismatch.*knowledge\.md/i);
    await assert.rejects(() => planRecovery(path), /integrity mismatch.*knowledge\.md/i);

    assert.equal(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), currentBrainKnowledge);
  });
});
