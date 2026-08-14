import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  applyMigrationUpdate,
  applyRecovery,
  getStatus,
  initializeProject,
  inspectInitialization,
  inspectRecovery,
  planMigrationUpdate,
  planRecovery,
  readMigrationJournal,
  runDoctor,
} from "../src/runtime/index.js";
import { migrationApplyOptions, migrationRelease } from "./migration-runtime-fixture.js";
import { TEST_SOURCE_VERSION } from "./release-test-baseline.js";
import { makeLegacySchema1Project } from "./legacy-schema1-fixture.js";

async function withInterruptedMigration(run: (projectPath: string) => Promise<void>): Promise<void> {
  const projectPath = await mkdtemp(join(tmpdir(), "pbf-recovery-"));
  try {
    await initializeProject(projectPath, { authorized: true });
    await makeLegacySchema1Project(projectPath);
    const plan = await planMigrationUpdate(projectPath, migrationRelease);
    await applyMigrationUpdate(projectPath, plan, migrationApplyOptions({ interruptAfterMutation: true }) as Parameters<typeof applyMigrationUpdate>[2]);
    await run(projectPath);
  } finally { await rm(projectPath, { recursive: true, force: true }); }
}

async function readOwned(projectPath: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const file of ["project.md", "goals.md", "decisions.md", "knowledge.md"]) result[file] = await readFile(resolve(projectPath, ".project-brain", file), "utf8");
  return result;
}

test("interrupted migration recovery inspection is read-only and status reports recovery-required", async () => {
  await withInterruptedMigration(async (projectPath) => {
    const journalBefore = await readFile(resolve(projectPath, ".project-brain", ".lifecycle", "migration-journal.json"), "utf8");
    const metadataBefore = await readFile(resolve(projectPath, ".project-brain", "metadata.json"), "utf8");
    const inspection = await inspectRecovery(projectPath);
    assert.equal(inspection.state, "interrupted-migration"); assert.equal(inspection.checkpointValid, true); assert.equal(inspection.recommendedStrategy, "rollback"); assert.equal(inspection.currentSchema, 2);
    const status = await getStatus(projectPath); assert.equal(status.lifecycle, "recovery-required"); assert.equal(status.lifecycleReason, "interrupted migration");
    assert.equal(await readFile(resolve(projectPath, ".project-brain", ".lifecycle", "migration-journal.json"), "utf8"), journalBefore);
    assert.equal(await readFile(resolve(projectPath, ".project-brain", "metadata.json"), "utf8"), metadataBefore);
  });
});

test("authorized recovery validates checkpoint and rolls back to the exact source state", async () => {
  await withInterruptedMigration(async (projectPath) => {
    const journal = await readMigrationJournal(projectPath); assert.ok(journal); const checkpointOwned: Record<string,string> = {};
    for (const file of ["project.md","goals.md","decisions.md","knowledge.md"]) checkpointOwned[file]=await readFile(resolve(journal.checkpointPath,file),"utf8");
    const recoveryPlan=await planRecovery(projectPath); await assert.rejects(()=>applyRecovery(projectPath,recoveryPlan,{authorized:false}),/authorization/i); await applyRecovery(projectPath,recoveryPlan,{authorized:true});
    const metadata=JSON.parse(await readFile(resolve(projectPath,".project-brain","metadata.json"),"utf8")) as {framework:{version:string};projectBrain:{schemaVersion:number;projectId?:unknown}};
    assert.equal(metadata.framework.version,TEST_SOURCE_VERSION); assert.equal(metadata.projectBrain.schemaVersion,1); assert.equal(metadata.projectBrain.projectId,undefined); assert.deepEqual(await readOwned(projectPath),checkpointOwned);
    const recoveredJournal=await readMigrationJournal(projectPath); assert.equal(recoveredJournal?.state,"failed"); assert.equal(recoveredJournal?.recovery?.state,"rolled-back"); assert.ok(recoveredJournal?.recovery?.recoveredAt);
    const status=await getStatus(projectPath); assert.equal(status.lifecycle,"initialized"); assert.equal(status.frameworkVersion,TEST_SOURCE_VERSION);
    const nextPlan=await planMigrationUpdate(projectPath,migrationRelease); assert.notEqual(nextPlan.operationId,journal.operationId);
  });
});

test("malformed durable migration evidence is recovery-required rather than treated as absent", async () => {
  const projectPath=await mkdtemp(join(tmpdir(),"pbf-corrupt-journal-"));
  try {
    await initializeProject(projectPath,{authorized:true}); await makeLegacySchema1Project(projectPath); const lifecycle=resolve(projectPath,".project-brain",".lifecycle"); await mkdir(lifecycle); await writeFile(resolve(lifecycle,"migration-journal.json"),"{corrupted","utf8");
    await assert.rejects(()=>readMigrationJournal(projectPath),/journal is invalid/i); const status=await getStatus(projectPath); assert.equal(status.lifecycle,"recovery-required"); assert.match(status.lifecycleReason??"",/invalid migration lifecycle evidence/i);
    const doctor=await runDoctor(projectPath); assert.equal(doctor.state,"recovery-required"); assert.equal(doctor.findings[0]?.code,"invalid-migration-evidence"); const recovery=await inspectRecovery(projectPath); assert.equal(recovery.state,"recovery-required"); assert.match(recovery.reason??"",/invalid/i);
    await assert.rejects(()=>planMigrationUpdate(projectPath,migrationRelease),/journal is invalid/i); const metadata=JSON.parse(await readFile(resolve(projectPath,".project-brain","metadata.json"),"utf8")) as {framework:{version:string};projectBrain:{schemaVersion:number;projectId?:unknown}}; assert.equal(metadata.framework.version,TEST_SOURCE_VERSION); assert.equal(metadata.projectBrain.schemaVersion,1); assert.equal(metadata.projectBrain.projectId,undefined);
  } finally { await rm(projectPath,{recursive:true,force:true}); }
});

test("missing checkpoint blocks automatic recovery", async () => {
  await withInterruptedMigration(async(projectPath)=>{const journal=await readMigrationJournal(projectPath); assert.ok(journal); await rm(journal.checkpointPath,{recursive:true,force:true}); const inspection=await inspectRecovery(projectPath); assert.equal(inspection.state,"recovery-required"); assert.equal(inspection.checkpointValid,false); await assert.rejects(()=>planRecovery(projectPath),/checkpoint|unavailable|invalid/i); assert.equal((await getStatus(projectPath)).lifecycle,"recovery-required");});
});

test("checkpoint with mismatched source metadata blocks automatic recovery", async () => {
  await withInterruptedMigration(async(projectPath)=>{const journal=await readMigrationJournal(projectPath); assert.ok(journal); const metadataPath=resolve(journal.checkpointPath,"metadata.json"); const metadata=JSON.parse(await readFile(metadataPath,"utf8")) as {framework:{version:string;channel:string};projectBrain:{schemaVersion:number}}; metadata.projectBrain.schemaVersion=2; await writeFile(metadataPath,`${JSON.stringify(metadata,null,2)}\n`,`utf8`); const inspection=await inspectRecovery(projectPath); assert.equal(inspection.state,"recovery-required"); assert.match(inspection.reason??"",/schema|integrity/i); await assert.rejects(()=>planRecovery(projectPath),/schema|integrity/i);});
});

test("recovery promotion failure leaves interrupted state recoverable instead of guessing through", async () => {
  await withInterruptedMigration(async(projectPath)=>{const plan=await planRecovery(projectPath); await assert.rejects(()=>applyRecovery(projectPath,plan,{authorized:true,failBeforePromote:true}),/promotion failure/i); assert.equal((await getStatus(projectPath)).lifecycle,"recovery-required"); const inspection=await inspectRecovery(projectPath); assert.equal(inspection.state,"interrupted-migration"); assert.equal(inspection.checkpointValid,true);});
});

test("tampered operation identity cannot substitute the active Project Brain as a checkpoint", async () => {
  await withInterruptedMigration(async (projectPath) => {
    const journalPath = resolve(projectPath, ".project-brain", ".lifecycle", "migration-journal.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8")) as Record<string, unknown>;
    journal.operationId = "x/../.project-brain";
    journal.checkpointPath = resolve(projectPath, ".project-brain");
    await writeFile(journalPath, `${JSON.stringify(journal, null, 2)}\n`, "utf8");

    const brainBefore = await readFile(resolve(projectPath, ".project-brain", "project.md"), "utf8");
    const inspection = await inspectRecovery(projectPath);
    assert.equal(inspection.state, "recovery-required");
    assert.equal(inspection.checkpointValid, false);
    assert.match(inspection.reason ?? "", /operation identity is invalid/i);
    await assert.rejects(() => planRecovery(projectPath), /operation identity is invalid/i);
    assert.equal(await readFile(resolve(projectPath, ".project-brain", "project.md"), "utf8"), brainBefore);
  });
});

test("hard interruption between recovery swap renames remains fail-closed and blocks fresh init", async () => {
  await withInterruptedMigration(async (projectPath) => {
    const displaced = resolve(projectPath, `.project-brain.recovery-displaced-${randomUUID()}`);
    await rename(resolve(projectPath, ".project-brain"), displaced);

    const status = await getStatus(projectPath);
    assert.equal(status.lifecycle, "recovery-required");
    assert.equal(status.projectBrain, "needs-diagnosis");
    assert.match(status.lifecycleReason ?? "", /stranded lifecycle artifacts/i);

    const doctor = await runDoctor(projectPath);
    assert.equal(doctor.state, "recovery-required");
    assert.equal(doctor.findings[0]?.code, "stranded-lifecycle-state");

    const recovery = await inspectRecovery(projectPath);
    assert.equal(recovery.state, "recovery-required");
    assert.match(recovery.reason ?? "", /stranded lifecycle artifacts/i);

    const init = await inspectInitialization(projectPath);
    assert.equal(init.action, "blocked-diagnosis");
    await assert.rejects(() => initializeProject(projectPath, { authorized: true }), /diagnosis|required|stranded/i);
  });
});
