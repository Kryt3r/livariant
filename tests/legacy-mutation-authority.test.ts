import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { initializeProject } from "../src/runtime/index.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const legacyCliPath = fileURLToPath(new URL("../src/cli/legacy-main.js", import.meta.url));

async function withInitializedProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-legacy-authority-"));
  try {
    await writeFile(resolve(path, "package.json"), JSON.stringify({ name: "legacy-authority-test" }));
    // Test fixture setup uses the already-covered core authorization seam. The
    // public lifecycle CLI is tested separately and may not self-authorize init.
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

function runEntry(path: string, entrypoint: string, args: string[]) {
  return spawnSync(process.execPath, [entrypoint, ...args], {
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

const scenarios = [
  ["goals add", ["goals", "add", "agent supplied goal", "--apply"]],
  ["knowledge add", ["knowledge", "add", "agent supplied fact", "--apply"]],
  ["decisions add", ["decisions", "add", "agent supplied decision", "--apply"]],
  ["decisions supersede", ["decisions", "supersede", "D-00000000-0000-4000-8000-000000000000", "agent replacement", "--apply"]],
] as const;

for (const [entryLabel, entrypoint] of [["public CLI", cliPath], ["direct legacy entrypoint", legacyCliPath]] as const) {
  for (const scenario of scenarios) {
    test(`${entryLabel}: legacy ${scenario[0]} --apply cannot create canonical mutation authority`, async () => {
      await withInitializedProject(async (path) => {
        const before = await semanticBytes(path);
        const result = runEntry(path, entrypoint, [...scenario[1]]);
        assert.equal(result.status, 3, `${result.stdout}\n${result.stderr}`);
        assert.match(`${result.stdout}\n${result.stderr}`, /legacy semantic --apply is retired|does not create mutation Authority/i);
        assert.match(`${result.stdout}\n${result.stderr}`, /Changes made: 0/i);
        assert.deepEqual(await semanticBytes(path), before);
      });
    });
  }
}
