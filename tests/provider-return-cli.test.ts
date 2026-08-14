import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { initializeProject } from "../src/runtime/index.js";
import { buildProviderContext } from "../src/runtime/provider-context.js";
import { providerReturnTaskDigest } from "../src/runtime/provider-return.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const managedFiles = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"];

function runCli(projectPath: string, args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
}

async function captureManaged(path: string): Promise<Map<string, Buffer>> {
  return new Map(await Promise.all(managedFiles.map(async (name) => [name, await readFile(resolve(path, ".project-brain", name))] as const)));
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-provider-return-cli-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("provider-return CLI reports authorization-required without mutation", async () => {
  await withProject(async (path) => {
    const context = await buildProviderContext("claude-code", "Review one durable candidate", path);
    assert.equal(context.state, "ready");
    if (context.state !== "ready") return;
    const contextPath = resolve(path, "provider-context.json");
    const returnPath = resolve(path, "provider-return.json");
    await writeFile(contextPath, JSON.stringify(context), "utf8");
    await writeFile(returnPath, JSON.stringify({
      schemaVersion: 1,
      packetVersion: 1,
      provider: context.provider,
      contextPacketId: context.packetId,
      stableProjectIdentity: context.stableProjectIdentity,
      baselineDigest: context.baseline.digest,
      taskDigest: providerReturnTaskDigest(context.task.value),
      candidate: {
        schemaVersion: 1,
        domain: "project-knowledge",
        changeKind: "add",
        proposedStatement: "Provider-returned candidates remain untrusted evidence",
        rationale: "Observed during agent work",
        origin: "provider-observation",
      },
    }), "utf8");
    const before = await captureManaged(path);

    const result = runCli(path, ["provider-return", "--context", contextPath, "--input", returnPath, "--json"]);
    assert.equal(result.status, 3, result.stderr);
    const parsed = JSON.parse(result.stdout) as { state: string; maintenance: { state: string }; semanticChangesMade: number };
    assert.equal(parsed.state, "candidate-received");
    assert.equal(parsed.maintenance.state, "authorization-required");
    assert.equal(parsed.semanticChangesMade, 0);

    for (const name of managedFiles) assert.deepEqual(await readFile(resolve(path, ".project-brain", name)), before.get(name));
  });
});

test("provider-return CLI no-candidate path is successful and read-only", async () => {
  await withProject(async (path) => {
    const context = await buildProviderContext("codex", "Check whether durable truth changed", path);
    assert.equal(context.state, "ready");
    if (context.state !== "ready") return;
    const contextPath = resolve(path, "provider-context.json");
    const returnPath = resolve(path, "provider-return.json");
    await writeFile(contextPath, JSON.stringify(context), "utf8");
    await writeFile(returnPath, JSON.stringify({
      schemaVersion: 1,
      packetVersion: 1,
      provider: context.provider,
      contextPacketId: context.packetId,
      stableProjectIdentity: context.stableProjectIdentity,
      baselineDigest: context.baseline.digest,
      taskDigest: providerReturnTaskDigest(context.task.value),
      candidate: null,
    }), "utf8");

    const result = runCli(path, ["provider-return", "--context", contextPath, "--input", returnPath, "--json"]);
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout) as { state: string; semanticChangesMade: number };
    assert.equal(parsed.state, "no-candidate");
    assert.equal(parsed.semanticChangesMade, 0);
  });
});
