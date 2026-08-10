import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { initializeProject, recordAcceptedDecision, runDoctor } from "../src/runtime/index.js";
import { applyMigrationUpdate, planMigrationUpdate, type MigrationJournal } from "../src/lifecycle/migration.js";
import { inspectRecovery } from "../src/lifecycle/recovery.js";
import { migrationApplyOptions, migrationRelease } from "./migration-runtime-fixture.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(join(tmpdir(), "pbf-boundary-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("symlinked decisions surface is diagnosed and cannot write outside Project Brain", async () => {
  await withProject(async (path) => {
    const external = resolve(path, "external-decisions.txt");
    await writeFile(external, "DO NOT CHANGE\n", "utf8");
    const decisions = resolve(path, ".project-brain", "decisions.md");
    await unlink(decisions);
    await symlink(external, decisions);
    const report = await runDoctor(path);
    assert.equal(report.state, "partial-or-damaged");
    await assert.rejects(() => recordAcceptedDecision("must not escape", path, { authorized: true }), /valid Project Brain/i);
    assert.equal(await readFile(external, "utf8"), "DO NOT CHANGE\n");
  });
});

test("symlinked metadata blocks migration before mutation", async () => {
  await withProject(async (path) => {
    const external = resolve(path, "external-metadata.json");
    const metadata = resolve(path, ".project-brain", "metadata.json");
    const original = await readFile(metadata, "utf8");
    await writeFile(external, original, "utf8");
    await unlink(metadata);
    await symlink(external, metadata);
    await assert.rejects(() => planMigrationUpdate(path, migrationRelease), /valid Project Brain/i);
    assert.equal(await readFile(external, "utf8"), original);
  });
});

test("symlinked lifecycle directory blocks journal writes outside Project Brain", async () => {
  await withProject(async (path) => {
    const externalDir = resolve(path, "external-lifecycle");
    await mkdir(externalDir);
    const lifecycle = resolve(path, ".project-brain", ".lifecycle");
    await symlink(externalDir, lifecycle, "dir");
    const plan = await planMigrationUpdate(path, migrationRelease).catch(() => null);
    assert.equal(plan, null, "Project Brain inspection must reject symlinked lifecycle directory before migration planning");
    await assert.rejects(() => recordAcceptedDecision("still blocked", path, { authorized: true }), /valid Project Brain/i);
    const externalEntries = await import("node:fs/promises").then(({ readdir }) => readdir(externalDir));
    assert.deepEqual(externalEntries, []);
  });
});

test("tampered recovery checkpoint path outside project root is rejected", async () => {
  await withProject(async (path) => {
    const plan = await planMigrationUpdate(path, migrationRelease);
    await applyMigrationUpdate(path, plan, { ...migrationApplyOptions(), interruptAfterMutation: true } as Parameters<typeof applyMigrationUpdate>[2]);
    const lifecycle = resolve(path, ".project-brain", ".lifecycle");
    const journalPath = resolve(lifecycle, "migration-journal.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8")) as MigrationJournal;
    const outside = await mkdtemp(join(tmpdir(), "pbf-outside-checkpoint-"));
    try {
      await writeFile(journalPath, `${JSON.stringify({ ...journal, checkpointPath: outside }, null, 2)}\n`, "utf8");
      const inspection = await inspectRecovery(path);
      assert.equal(inspection.state, "recovery-required");
      assert.equal(inspection.checkpointValid, false);
      assert.match(inspection.reason ?? "", /escapes its authorized root|does not match/i);
    } finally { await rm(outside, { recursive: true, force: true }); }
  });
});
