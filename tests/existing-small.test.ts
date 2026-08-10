import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { getStatus, initializeProject, inspectInitialization } from "../src/runtime/index.js";

const fixturePath = fileURLToPath(new URL("../../tests/fixtures/existing-small", import.meta.url));
const protectedFiles = ["package.json", "tsconfig.json", "README.md", "src/index.ts", ".gitignore"] as const;

async function withExistingSmall(run: (projectPath: string) => Promise<void>): Promise<void> {
  const projectPath = await mkdtemp(join(tmpdir(), "pbf-existing-small-"));
  try {
    await cp(fixturePath, projectPath, { recursive: true });
    await mkdir(resolve(projectPath, ".git"));
    await run(projectPath);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
}

async function snapshotProtected(projectPath: string): Promise<Map<string, Buffer>> {
  const snapshot = new Map<string, Buffer>();
  for (const file of protectedFiles) snapshot.set(file, await readFile(resolve(projectPath, file)));
  return snapshot;
}

test("existing small project is classified without mutation", async () => {
  await withExistingSmall(async (projectPath) => {
    const before = await snapshotProtected(projectPath);
    const plan = await inspectInitialization(projectPath);
    const after = await snapshotProtected(projectPath);
    assert.equal(plan.projectState, "existing-project-without-brain");
    assert.equal(plan.action, "initialize");
    assert.deepEqual(plan.projectFilesToModify, []);
    assert.equal(plan.confirmedProjectName, "existing-small-app");
    assert.ok(plan.evidence.includes("package.json"));
    assert.ok(plan.evidence.includes("typescript"));
    assert.ok(plan.evidence.includes("git"));
    assert.ok(plan.evidence.includes("README.md"));
    assert.ok(plan.evidence.includes("src-directory"));
    for (const file of protectedFiles) assert.deepEqual(after.get(file), before.get(file));
  });
});

test("existing small adoption only adds Project Brain state", async () => {
  await withExistingSmall(async (projectPath) => {
    const before = await snapshotProtected(projectPath);
    await initializeProject(projectPath, { authorized: true });
    const after = await snapshotProtected(projectPath);
    for (const file of protectedFiles) assert.deepEqual(after.get(file), before.get(file));
    const project = await readFile(resolve(projectPath, ".project-brain", "project.md"), "utf8");
    const goals = await readFile(resolve(projectPath, ".project-brain", "goals.md"), "utf8");
    const knowledge = await readFile(resolve(projectPath, ".project-brain", "knowledge.md"), "utf8");
    const combined = `${project}\n${goals}\n${knowledge}`;
    assert.match(project, /Confirmed package name: existing-small-app/);
    assert.match(goals, /No confirmed project goals/);
    assert.doesNotMatch(combined, /ExampleCloud|SaaS|Discord Profile|Game Profile|Clean Architecture|Vercel/i);
    const status = await getStatus(projectPath);
    assert.equal(status.projectBrain, "present");
    assert.equal(status.lifecycle, "initialized");
  });
});

test("existing small project cannot be reinitialized after adoption", async () => {
  await withExistingSmall(async (projectPath) => {
    await initializeProject(projectPath, { authorized: true });
    const before = await snapshotProtected(projectPath);
    const plan = await inspectInitialization(projectPath);
    assert.equal(plan.projectState, "existing-project-with-brain");
    assert.equal(plan.action, "blocked-existing");
    await assert.rejects(() => initializeProject(projectPath, { authorized: true }), /already exists|not applicable/i);
    const after = await snapshotProtected(projectPath);
    for (const file of protectedFiles) assert.deepEqual(after.get(file), before.get(file));
  });
});
