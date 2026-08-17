import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  addConfirmedGoal,
  addConfirmedKnowledge,
  buildResumeContext,
  initializeProject,
  recordAcceptedDecision,
} from "../src/runtime/index.js";
import { acceptFixtureProjectBrain, mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

function runCli(projectPath: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1", ...extraEnv },
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

test("legacy goal, knowledge, and decision commands remain plan-first while direct --apply is retired", async () => {
  await withProject(async (path) => {
    const goalsPath = resolve(path, ".project-brain", "goals.md");
    const knowledgePath = resolve(path, ".project-brain", "knowledge.md");
    const decisionsPath = resolve(path, ".project-brain", "decisions.md");
    const before = {
      goals: await readFile(goalsPath, "utf8"),
      knowledge: await readFile(knowledgePath, "utf8"),
      decisions: await readFile(decisionsPath, "utf8"),
    };

    const goalPlan = runCli(path, ["goals", "add", "Ship a safe public preview"]);
    assert.equal(goalPlan.status, 0, goalPlan.stderr);
    assert.match(goalPlan.stdout, /Canonical knowledge change plan/);
    assert.match(goalPlan.stdout, /Changes made: 0/);
    assert.match(goalPlan.stdout, /No changes applied/);

    for (const args of [
      ["goals", "add", "Ship a safe public preview", "--apply"],
      ["knowledge", "add", "The public preview is distributed through GitHub Releases", "--apply"],
      ["decisions", "add", "Use GitHub Releases for preview distribution", "--apply"],
      ["decisions", "supersede", "D-00000000-0000-4000-8000-000000000000", "Use signed release infrastructure", "--apply"],
    ]) {
      const result = runCli(path, args);
      assert.equal(result.status, 3, `${result.stdout}\n${result.stderr}`);
      assert.match(`${result.stdout}\n${result.stderr}`, /Legacy semantic --apply is retired/);
      assert.match(`${result.stdout}\n${result.stderr}`, /Changes made: 0/);
    }

    assert.equal(await readFile(goalsPath, "utf8"), before.goals);
    assert.equal(await readFile(knowledgePath, "utf8"), before.knowledge);
    assert.equal(await readFile(decisionsPath, "utf8"), before.decisions);
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
    await mutateAcceptedFixture(path, () => addConfirmedGoal("Keep project state coherent", path, { authorized: true }));
    await mutateAcceptedFixture(path, () => addConfirmedKnowledge("Provider memory is not canonical truth", path, { authorized: true }));

    await assert.rejects(addConfirmedGoal("Keep project state coherent", path, { authorized: true }), /identical confirmed goal/i);
    await assert.rejects(addConfirmedKnowledge("Provider memory is not canonical truth", path, { authorized: true }), /identical confirmed project knowledge/i);
  });
});

test("goal and knowledge additions preserve unrelated human-authored canonical content", async () => {
  await withProject(async (path) => {
    const goalsPath = resolve(path, ".project-brain", "goals.md");
    const knowledgePath = resolve(path, ".project-brain", "knowledge.md");

    await writeFile(goalsPath, "# Goals\n\nHuman context that must remain.\n\n- Existing goal\n\n## Notes\n\nDo not rewrite this paragraph.\n\n- This is a note, not a goal\n", "utf8");
    await writeFile(knowledgePath, "# Knowledge\n\n## Verified discovery evidence\n\n- package-name:example\n\nHuman explanation that must remain.\n\n## Known unknowns\n\n- deployment target\n", "utf8");
    await acceptFixtureProjectBrain(path);

    await mutateAcceptedFixture(path, () => addConfirmedGoal("New goal", path, { authorized: true }));
    await mutateAcceptedFixture(path, () => addConfirmedKnowledge("New confirmed fact", path, { authorized: true }));

    const goals = await readFile(goalsPath, "utf8");
    assert.match(goals, /Human context that must remain/);
    assert.match(goals, /- Existing goal/);
    assert.match(goals, /- New goal/);
    assert.match(goals, /## Notes\n\nDo not rewrite this paragraph/);
    assert.match(goals, /- This is a note, not a goal/);
    assert.ok(goals.indexOf("- New goal") < goals.indexOf("## Notes"));
    assert.deepEqual((await buildResumeContext(path)).confirmedGoals, ["Existing goal", "New goal"]);

    const knowledge = await readFile(knowledgePath, "utf8");
    assert.match(knowledge, /package-name:example/);
    assert.match(knowledge, /Human explanation that must remain/);
    assert.match(knowledge, /## Confirmed project knowledge\n\n- New confirmed fact/);
    assert.match(knowledge, /## Known unknowns\n\n- deployment target/);
  });
});

test("semantic writes reject concurrent project-owned changes instead of overwriting them", async () => {
  await withProject(async (path) => {
    const goalsPath = resolve(path, ".project-brain", "goals.md");
    const decisionsPath = resolve(path, ".project-brain", "decisions.md");

    await assert.rejects(
      addConfirmedGoal("New goal", path, {
        authorized: true,
        beforePromote: async () => {
          await writeFile(goalsPath, "# Goals\n\n- Human concurrent goal\n", "utf8");
        },
      }),
      /changed concurrently/i,
    );
    assert.match(await readFile(goalsPath, "utf8"), /Human concurrent goal/);
    assert.doesNotMatch(await readFile(goalsPath, "utf8"), /New goal/);

    // The first concurrency attack deliberately left a different Project Brain on disk.
    // Accept it only as the fixture baseline for the independent decision concurrency attack below.
    await acceptFixtureProjectBrain(path);

    await assert.rejects(
      recordAcceptedDecision("Runtime decision", path, {
        authorized: true,
        beforePromote: async () => {
          await writeFile(decisionsPath, "# Decisions\n\n- Human concurrent decision\n", "utf8");
        },
      }),
      /changed concurrently/i,
    );
    assert.match(await readFile(decisionsPath, "utf8"), /Human concurrent decision/);
    assert.doesNotMatch(await readFile(decisionsPath, "utf8"), /Runtime decision/);
  });
});

test("semantic write surfaces reject symlinked managed files", async () => {
  if (process.platform === "win32") return;
  const { symlink } = await import("node:fs/promises");
  await withProject(async (path) => {
    const outside = resolve(path, "outside.txt");
    const goalsPath = resolve(path, ".project-brain", "goals.md");
    await writeFile(outside, "outside must remain unchanged\n", "utf8");
    await rm(goalsPath);
    await symlink(outside, goalsPath);

    await assert.rejects(addConfirmedGoal("Unsafe goal", path, { authorized: true }), /symbolic link|regular file|valid Project Brain/i);
    assert.equal(await readFile(outside, "utf8"), "outside must remain unchanged\n");
  });
});
