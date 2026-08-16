import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-discover-cli-"));
  try {
    await writeFile(resolve(path, "package.json"), JSON.stringify({
      name: "discover-cli",
      dependencies: { react: "1.0.0" },
    }));
    await writeFile(resolve(path, "README.md"), "# Discovery CLI\n");
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

test("discover CLI renders compact read-only project evidence", async () => {
  await withProject(async (path) => {
    const result = runCli(path, ["discover"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Read-only project discovery/);
    assert.match(result.stdout, /README documentation \(README\.md\)/);
    assert.match(result.stdout, /React \(package\.json dependency:react\)/);
    assert.match(result.stdout, /Evidence is not automatically accepted as Project Brain truth/);
    assert.match(result.stdout, /Changes made: 0/);
  });
});

test("discover CLI JSON is structured, non-mutating evidence", async () => {
  await withProject(async (path) => {
    const result = runCli(path, ["discover", "--json"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const output = JSON.parse(result.stdout.trim()) as {
      projectShape: string;
      evidence: Array<{ kind: string; confidence: string; provenance: string }>;
      attention: unknown[];
      unknowns: string[];
      changesMade: number;
    };
    assert.equal(output.projectShape, "existing");
    assert.equal(output.changesMade, 0);
    assert.ok(output.evidence.some((item) => item.kind === "documentation" && item.provenance === "README.md"));
    assert.ok(output.evidence.some((item) => item.kind === "stack" && item.confidence === "strongly_inferred"));
    assert.ok(output.unknowns.includes("project purpose"));
  });
});

test("discover CLI rejects unsupported arguments fail-closed", async () => {
  await withProject(async (path) => {
    const result = runCli(path, ["discover", "--apply"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /supports only optional --json/i);
  });
});
