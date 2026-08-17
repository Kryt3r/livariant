import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

async function withInitializedProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-legacy-authority-"));
  try {
    await writeFile(resolve(path, "package.json"), JSON.stringify({ name: "legacy-authority-test" }));
    const init = runCli(path, ["init", "--apply"]);
    assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

function runCli(path: string, args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
}

async function semanticBytes(path: string): Promise<Record<string, string>> {
  const brain = resolve(path, ".project-brain");
  return {
    goals: await readFile(resolve(brain, "goals.md"), "utf8"),
    knowledge: await readFile(resolve(brain, "knowledge.md"), "utf8"),
    decisions: await readFile(resolve(brain, "decisions.md"), "utf8"),
  };
}

for (const scenario of [
  ["goals add", ["goals", "add", "agent supplied goal", "--apply"]],
  ["knowledge add", ["knowledge", "add", "agent supplied fact", "--apply"]],
  ["decisions add", ["decisions", "add", "agent supplied decision", "--apply"]],
  ["decisions supersede", ["decisions", "supersede", "D-00000000-0000-4000-8000-000000000000", "agent replacement", "--apply"]],
] as const) {
  test(`legacy ${scenario[0]} --apply cannot create canonical mutation authority`, async () => {
    await withInitializedProject(async (path) => {
      const before = await semanticBytes(path);
      const result = runCli(path, [...scenario[1]]);
      assert.equal(result.status, 3, `${result.stdout}\n${result.stderr}`);
      assert.match(`${result.stdout}\n${result.stderr}`, /legacy semantic --apply is retired|does not create mutation Authority/i);
      assert.match(`${result.stdout}\n${result.stderr}`, /Changes made: 0/i);
      assert.deepEqual(await semanticBytes(path), before);
    });
  });
}
