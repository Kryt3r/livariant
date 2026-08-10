import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { getStatus, initializeProject, inspectInitialization } from "../src/runtime/index.js";

const fixturePath = fileURLToPath(new URL("../../tests/fixtures/existing-messy", import.meta.url));
const protectedFiles = ["package.json","README.md","README-old.md","architecture-notes.md","TODO.md","CLAUDE.md","AGENTS.md",".env","src/index.ts","old-src/legacy.ts","tsconfig.json"] as const;

async function withExistingMessy(run: (projectPath: string) => Promise<void>): Promise<void> {
  const projectPath = await mkdtemp(join(tmpdir(), "pbf-existing-messy-"));
  try { await cp(fixturePath, projectPath, { recursive: true }); await mkdir(resolve(projectPath, ".git")); await run(projectPath); }
  finally { await rm(projectPath, { recursive: true, force: true }); }
}
async function snapshotProtected(projectPath: string): Promise<Map<string, Buffer>> { const snapshot = new Map<string, Buffer>(); for (const file of protectedFiles) snapshot.set(file, await readFile(resolve(projectPath, file))); return snapshot; }
async function readBrainText(projectPath: string): Promise<string> { const files=["project.md","goals.md","decisions.md","knowledge.md","metadata.json"]; return (await Promise.all(files.map((file)=>readFile(resolve(projectPath,".project-brain",file),"utf8")))).join("\n"); }

test("messy project remains adoptable despite malformed package metadata", async () => {
  await withExistingMessy(async (projectPath) => {
    const before=await snapshotProtected(projectPath); const plan=await inspectInitialization(projectPath); const after=await snapshotProtected(projectPath);
    assert.equal(plan.projectState,"existing-project-without-brain"); assert.equal(plan.action,"initialize"); assert.equal(plan.confirmedProjectName,undefined);
    assert.ok(plan.evidence.includes("package.json")); assert.ok(plan.evidence.includes("package.json:unreadable")); assert.ok(plan.evidence.includes("native-agent-instructions:CLAUDE.md")); assert.ok(plan.evidence.includes("native-agent-instructions:AGENTS.md")); assert.ok(plan.evidence.includes("sensitive-file-present:.env")); assert.deepEqual(plan.projectFilesToModify,[]);
    for (const file of protectedFiles) assert.deepEqual(after.get(file),before.get(file));
  });
});

test("messy adoption preserves all project-owned files and does not ingest secrets or resolve conflicts", async () => {
  await withExistingMessy(async (projectPath) => {
    const before=await snapshotProtected(projectPath); await initializeProject(projectPath,{ authorized:true }); const after=await snapshotProtected(projectPath);
    for (const file of protectedFiles) assert.deepEqual(after.get(file),before.get(file));
    const brain=await readBrainText(projectPath); assert.doesNotMatch(brain,/fixture-secret-do-not-ingest|fixture-token-do-not-ingest/); assert.doesNotMatch(brain,/Deployment:\s*(ExampleCloud|OtherCloud|LegacyCloud)/i); assert.doesNotMatch(brain,/SaaS|Discord Profile|Game Profile|Clean Architecture/i); assert.match(brain,/package\.json:unreadable/); assert.match(brain,/sensitive-file-present:\.env/);
    const status=await getStatus(projectPath); assert.equal(status.projectBrain,"present"); assert.equal(status.lifecycle,"initialized");
  });
});

test("messy adopted project cannot be normalized by repeated init", async () => {
  await withExistingMessy(async (projectPath) => {
    await initializeProject(projectPath,{ authorized:true }); const before=await snapshotProtected(projectPath); const plan=await inspectInitialization(projectPath);
    assert.equal(plan.projectState,"existing-project-with-brain"); assert.equal(plan.action,"blocked-existing"); await assert.rejects(()=>initializeProject(projectPath,{ authorized:true }),/already exists|not applicable/i);
    const after=await snapshotProtected(projectPath); for (const file of protectedFiles) assert.deepEqual(after.get(file),before.get(file));
  });
});
