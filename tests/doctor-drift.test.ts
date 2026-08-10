import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { initializeProject, runDoctor } from "../src/runtime/index.js";
import { ProjectBrainStore } from "../src/project-brain/store.js";
import { applyMigrationUpdate, planMigrationUpdate } from "../src/lifecycle/migration.js";
import { migrationApplyOptions, migrationRelease } from "./migration-runtime-fixture.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(join(tmpdir(), "pbf-doctor-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
    await rm(`${path}.unused`, { recursive: true, force: true });
  }
}

async function snapshotTree(root: string): Promise<Record<string, Buffer>> {
  const result: Record<string, Buffer> = {};
  async function walk(path: string, prefix: string): Promise<void> {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = resolve(path, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(absolute, relative);
      else result[relative] = await readFile(absolute);
    }
  }
  await walk(root, "");
  return result;
}

async function mutateMetadata(path: string, mutate: (metadata: Record<string, any>) => void): Promise<void> {
  const metadataPath = resolve(path, ".project-brain", "metadata.json");
  const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as Record<string, any>;
  mutate(metadata);
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

test("doctor reports healthy state without mutation", async () => {
  await withProject(async (path) => {
    const before = await snapshotTree(path); const report = await runDoctor(path); const after = await snapshotTree(path);
    assert.equal(report.state, "healthy"); assert.equal(report.changesMade, 0); assert.deepEqual(after, before);
  });
});

test("runtime build identity differing from project active version is not alone drift", async () => {
  await withProject(async (path) => { await new ProjectBrainStore(path).updateFrameworkLifecycle("0.0.5-development.1", "development"); assert.equal((await runDoctor(path)).state, "healthy"); });
});

test("unknown manual Framework version is classified unsupported and remains untouched", async () => {
  await withProject(async (path) => {
    await mutateMetadata(path, (metadata) => { metadata.framework.version = "8.4.2"; }); const before=await snapshotTree(path); const report=await runDoctor(path); const after=await snapshotTree(path);
    assert.equal(report.state,"unsupported-manual-state"); assert.ok(report.findings.some((finding)=>finding.code==="unsupported-framework-state")); assert.deepEqual(after,before);
  });
});

test("unsupported update channel is classified unsupported and remains untouched", async () => {
  await withProject(async (path) => {
    await mutateMetadata(path,(metadata)=>{metadata.framework.channel="mystery";}); const before=await snapshotTree(path); const report=await runDoctor(path); const after=await snapshotTree(path);
    assert.equal(report.state,"unsupported-manual-state"); assert.ok(report.findings.some((finding)=>finding.code==="unsupported-update-channel")); assert.deepEqual(after,before);
  });
});

test("schema 2 without schema-2 postconditions is drift rather than accepted state", async () => {
  await withProject(async (path) => {
    await mutateMetadata(path,(metadata)=>{metadata.projectBrain.schemaVersion=2; delete metadata.lifecycle;}); const before=await snapshotTree(path); const report=await runDoctor(path); const after=await snapshotTree(path);
    assert.equal(report.state,"drift-detected"); assert.ok(report.findings.some((finding)=>finding.code==="schema-postcondition-mismatch")); assert.deepEqual(after,before);
  });
});

test("Project Brain identity conflicting with package.json is diagnosed without reconciliation", async () => {
  await withProject(async (path) => {
    await writeFile(resolve(path,"package.json"),JSON.stringify({name:"project-b"}),"utf8"); await writeFile(resolve(path,".project-brain","project.md"),"# Project\n\n## Identity\n\n- Confirmed package name: project-a\n","utf8");
    const before=await snapshotTree(path); const report=await runDoctor(path); const after=await snapshotTree(path); assert.equal(report.state,"drift-detected"); assert.ok(report.findings.some((finding)=>finding.code==="identity-conflict")); assert.deepEqual(after,before);
  });
});

test("partial Project Brain is diagnosed without automatic init or repair", async () => {
  await withProject(async (path) => { await rm(resolve(path,".project-brain","goals.md")); const before=await snapshotTree(path); const report=await runDoctor(path); const after=await snapshotTree(path); assert.equal(report.state,"partial-or-damaged"); assert.equal(report.changesMade,0); assert.deepEqual(after,before); });
});

test("open migration journal narrows doctor state to recovery-required", async () => {
  await withProject(async (path) => {
    const plan=await planMigrationUpdate(path,migrationRelease); await applyMigrationUpdate(path,plan,{...migrationApplyOptions(),interruptAfterMutation:true} as Parameters<typeof applyMigrationUpdate>[2]);
    const before=await snapshotTree(path); const report=await runDoctor(path); const after=await snapshotTree(path); assert.equal(report.state,"recovery-required"); assert.ok(report.findings.some((finding)=>finding.code==="interrupted-migration")); assert.deepEqual(after,before);
  });
});
