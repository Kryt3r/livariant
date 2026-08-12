import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { addConfirmedGoal, addConfirmedKnowledge, buildResumeContext, initializeProject } from "../src/runtime/index.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

function runCli(projectPath: string, args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-semantic-cli-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("goal, knowledge, and decision changes are plan-first and require explicit apply", async () => {
  await withProject(async (path) => {
    const goalsPath = resolve(path, ".project-brain", "goals.md");
    const beforeGoals = await readFile(goalsPath, "utf8");

    const goalPlan = runCli(path, ["goals", "add", "Ship a safe public preview"]);
    assert.equal(goalPlan.status, 0, goalPlan.stderr);
    assert.match(goalPlan.stdout, /Canonical knowledge change plan/);
    assert.match(goalPlan.stdout, /Changes made: 0/);
    assert.match(goalPlan.stdout, /No changes applied/);
    assert.equal(await readFile(goalsPath, "utf8"), beforeGoals);

    const goalApply = runCli(path, ["goals", "add", "Ship a safe public preview", "--apply"]);
    assert.equal(goalApply.status, 0, goalApply.stderr);
    assert.match(goalApply.stdout, /recorded and verified/);

    const knowledgeApply = runCli(path, ["knowledge", "add", "The public preview is distributed through GitHub Releases", "--apply"]);
    assert.equal(knowledgeApply.status, 0, knowledgeApply.stderr);
    assert.match(knowledgeApply.stdout, /recorded and verified/);

    const decisionApply = runCli(path, ["decisions", "add", "Use GitHub Releases for preview distribution", "--apply"]);
    assert.equal(decisionApply.status, 0, decisionApply.stderr);
    const decisionId = /verified: (D-[A-Za-z0-9-]+)/.exec(decisionApply.stdout)?.[1];
    assert.ok(decisionId, decisionApply.stdout);

    const context = await buildResumeContext(path);
    assert.deepEqual(context.confirmedGoals, ["Ship a safe public preview"]);
    assert.ok(context.knownFacts.includes("The public preview is distributed through GitHub Releases"));
    assert.deepEqual(context.activeDecisions, ["Use GitHub Releases for preview distribution"]);

    const resume = runCli(path, ["resume"]);
    assert.equal(resume.status, 0, resume.stderr);
    assert.match(resume.stdout, /Confirmed goals:/);
    assert.match(resume.stdout, /Ship a safe public preview/);
    assert.match(resume.stdout, /Known facts:/);
    assert.match(resume.stdout, /GitHub Releases/);

    const supersedePlan = runCli(path, ["decisions", "supersede", decisionId, "Use signed release infrastructure", "--reason", "Distribution model changed"]);
    assert.equal(supersedePlan.status, 0, supersedePlan.stderr);
    assert.match(supersedePlan.stdout, /Changes made: 0/);
    assert.deepEqual((await buildResumeContext(path)).activeDecisions, ["Use GitHub Releases for preview distribution"]);

    const supersedeApply = runCli(path, ["decisions", "supersede", decisionId, "Use signed release infrastructure", "--reason", "Distribution model changed", "--apply"]);
    assert.equal(supersedeApply.status, 0, supersedeApply.stderr);
    assert.match(supersedeApply.stdout, /superseded by/);
    assert.deepEqual((await buildResumeContext(path)).activeDecisions, ["Use signed release infrastructure"]);
  });
});

test("semantic knowledge APIs reject mutation without explicit authorization", async () => {
  await withProject(async (path) => {
    await assert.rejects(addConfirmedGoal("Unauthorized goal", path), /explicit authorization/i);
    await assert.rejects(addConfirmedKnowledge("Unauthorized fact", path), /explicit authorization/i);
  });
});

test("duplicate goal and knowledge changes fail instead of silently rewriting canonical state", async () => {
  await withProject(async (path) => {
    await addConfirmedGoal("Keep project state coherent", path, { authorized: true });
    await addConfirmedKnowledge("Provider memory is not canonical truth", path, { authorized: true });

    await assert.rejects(addConfirmedGoal("Keep project state coherent", path, { authorized: true }), /identical confirmed goal/i);
    await assert.rejects(addConfirmedKnowledge("Provider memory is not canonical truth", path, { authorized: true }), /identical confirmed project knowledge/i);
  });
});
