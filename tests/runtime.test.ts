import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { getStatus, getVersionInfo, initializeProject, inspectInitialization } from "../src/runtime/index.js";

async function withTempProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(join(tmpdir(), "pbf-runtime-"));
  try { await run(path); } finally { await rm(path, { recursive: true, force: true }); }
}

async function snapshotBrain(projectPath: string): Promise<Record<string, string>> {
  const brainPath = resolve(projectPath, ".project-brain");
  const files = (await readdir(brainPath)).sort();
  const snapshot: Record<string, string> = {};
  for (const file of files) snapshot[file] = await readFile(resolve(brainPath, file), "utf8");
  return snapshot;
}

test("version reports RC preview identity", () => {
  const version = getVersionInfo(); assert.equal(version.frameworkVersion, "0.1.0-rc.2"); assert.equal(version.channel, "preview"); assert.equal(version.runtime, "node");
});

test("status on a fresh directory is read-only and uninitialized", async () => {
  await withTempProject(async (projectPath) => { const before=await readdir(projectPath); const status=await getStatus(projectPath); const after=await readdir(projectPath); assert.deepEqual(before,[]); assert.deepEqual(after,[]); assert.equal(status.projectBrain,"not-found"); assert.equal(status.lifecycle,"uninitialized"); assert.equal(status.changesMade,0); });
});

test("runtime status API is callable independently of CLI", async () => { await withTempProject(async(projectPath)=>{assert.equal((await getStatus(projectPath)).projectRoot,projectPath);}); });

test("unknown CLI command fails in a controlled way", () => {
  const cliPath=fileURLToPath(new URL("../src/cli/index.js",import.meta.url)); const result=spawnSync(process.execPath,[cliPath,"definitely-unknown"],{encoding:"utf8"}); assert.equal(result.status,2); assert.match(result.stderr,/Unknown command: definitely-unknown/); assert.doesNotMatch(result.stderr,/\bat\s+\S+\s*\(/);
});

test("fresh empty project produces an initialize plan without mutation", async () => {
  await withTempProject(async(projectPath)=>{const plan=await inspectInitialization(projectPath); assert.equal(plan.projectState,"empty"); assert.equal(plan.projectBrainHealth,"not-found"); assert.equal(plan.action,"initialize"); assert.deepEqual(plan.projectFilesToModify,[]); assert.equal(plan.filesToCreate.length,5); assert.deepEqual(await readdir(projectPath),[]);});
});

test("runtime initialization requires explicit authorization before mutation", async () => {
  await withTempProject(async(projectPath)=>{await assert.rejects(()=>initializeProject(projectPath,{authorized:false}),/explicit authorization/i); assert.deepEqual(await readdir(projectPath),[]);});
});

test("fresh initialization creates exactly the minimal Project Brain", async () => {
  await withTempProject(async(projectPath)=>{await initializeProject(projectPath,{authorized:true}); const files=(await readdir(resolve(projectPath,".project-brain"))).sort(); assert.deepEqual(files,["decisions.md","goals.md","knowledge.md","metadata.json","project.md"]); const status=await getStatus(projectPath); assert.equal(status.projectBrain,"present"); assert.equal(status.lifecycle,"initialized");});
});

test("existing project files remain byte-identical during initialization", async () => {
  await withTempProject(async(projectPath)=>{const existingPath=resolve(projectPath,"existing.bin"); const original=Buffer.from([0,1,2,3,255,9,8,7]); await writeFile(existingPath,original); const plan=await inspectInitialization(projectPath); assert.equal(plan.projectState,"existing-project-without-brain"); await initializeProject(projectPath,{authorized:true}); assert.deepEqual(await readFile(existingPath),original);});
});

test("repeated init never overwrites an existing valid Project Brain", async () => {
  await withTempProject(async(projectPath)=>{await initializeProject(projectPath,{authorized:true}); const before=await snapshotBrain(projectPath); const plan=await inspectInitialization(projectPath); assert.equal(plan.projectState,"existing-project-with-brain"); assert.equal(plan.action,"blocked-existing"); await assert.rejects(()=>initializeProject(projectPath,{authorized:true}),/already exists|not applicable/i); assert.deepEqual(await snapshotBrain(projectPath),before);});
});

test("partial Project Brain routes to diagnosis instead of reinitialization", async () => {
  await withTempProject(async(projectPath)=>{const brainPath=resolve(projectPath,".project-brain"); await mkdir(brainPath); await writeFile(resolve(brainPath,"project.md"),"# Existing partial state\n","utf8"); const plan=await inspectInitialization(projectPath); assert.equal(plan.projectState,"partial-or-damaged-brain"); assert.equal(plan.action,"blocked-diagnosis"); assert.deepEqual(plan.filesToCreate,[]); await assert.rejects(()=>initializeProject(projectPath,{authorized:true}),/diagnosis|requires/i); assert.equal(await readFile(resolve(brainPath,"project.md"),"utf8"),"# Existing partial state\n");});
});

test("failure before promotion leaves no apparently valid Project Brain", async () => {
  await withTempProject(async(projectPath)=>{await assert.rejects(()=>initializeProject(projectPath,{authorized:true,beforePromote:()=>{throw new Error("simulated bootstrap interruption");}}),/simulated bootstrap interruption/); await assert.rejects(()=>access(resolve(projectPath,".project-brain"))); const leftovers=(await readdir(projectPath)).filter((entry)=>entry.startsWith(".project-brain.tmp-")); assert.deepEqual(leftovers,[]);});
});

test("bootstrap metadata records separate framework, channel, and schema identity", async () => {
  await withTempProject(async(projectPath)=>{await initializeProject(projectPath,{authorized:true}); const metadata=JSON.parse(await readFile(resolve(projectPath,".project-brain","metadata.json"),"utf8")) as {framework:{version:string;channel:string};projectBrain:{schemaVersion:number}}; assert.equal(metadata.framework.version,"0.1.0-rc.2"); assert.equal(metadata.framework.channel,"preview"); assert.equal(metadata.projectBrain.schemaVersion,1);});
});

test("bootstrap preserves unknown intent instead of inventing project assumptions", async () => {
  await withTempProject(async(projectPath)=>{await initializeProject(projectPath,{authorized:true}); const project=await readFile(resolve(projectPath,".project-brain","project.md"),"utf8"); const goals=await readFile(resolve(projectPath,".project-brain","goals.md"),"utf8"); const knowledge=await readFile(resolve(projectPath,".project-brain","knowledge.md"),"utf8"); const combined=`${project}\n${goals}\n${knowledge}`; assert.match(project,/Project name: Unknown/); assert.match(goals,/No confirmed project goals/); assert.doesNotMatch(combined,/SaaS|Vercel|microservice|server action/i);});
});

test("package name is recorded only when directly evidenced by package.json", async () => {
  await withTempProject(async(projectPath)=>{await writeFile(resolve(projectPath,"package.json"),JSON.stringify({name:"evidence-app"}),"utf8"); const plan=await inspectInitialization(projectPath); assert.equal(plan.confirmedProjectName,"evidence-app"); assert.ok(plan.evidence.includes("package.json")); assert.ok(plan.evidence.includes("package-name:evidence-app")); await initializeProject(projectPath,{authorized:true}); const project=await readFile(resolve(projectPath,".project-brain","project.md"),"utf8"); assert.match(project,/Confirmed package name: evidence-app/);});
});
