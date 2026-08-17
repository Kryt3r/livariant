import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { addConfirmedGoal, initializeProject } from "../src/runtime/index.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-maintenance-cli-"));
  try {
    await initializeProject(path, { authorized: true });
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

async function candidateFile(path: string, statement: string): Promise<string> {
  const input = resolve(path, `candidate-${statement.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`);
  await writeFile(input, `${JSON.stringify({
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "Exercise maintain CLI state",
    origin: "explicit-user",
  })}\n`, "utf8");
  return input;
}

test("maintain CLI returns authorization-required as distinct non-mutating exit state", async () => {
  await withProject(async (path) => {
    const input = await candidateFile(path, "Compose through CLI");
    const result = runCli(path, ["maintain", "--input", input, "--json"]);
    assert.equal(result.status, 3, `${result.stdout}\n${result.stderr}`);
    const output = JSON.parse(result.stdout.trim()) as {
      state: string;
      semanticChangesMade: number;
      authorizationRequired: boolean;
      actionableProposal: { mutationScope: { proposedStatement: string } };
    };
    assert.equal(output.state, "authorization-required");
    assert.equal(output.authorizationRequired, true);
    assert.equal(output.semanticChangesMade, 0);
    assert.equal(output.actionableProposal.mutationScope.proposedStatement, "Compose through CLI");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Compose through CLI/);
  });
});

test("maintain CLI exact duplicate returns review-required and zero mutation", async () => {
  await withProject(async (path) => {
    await mutateAcceptedFixture(path, () => addConfirmedGoal("Already canonical through CLI", path, { authorized: true }));
    const input = await candidateFile(path, "Already canonical through CLI");
    const result = runCli(path, ["maintain", "--input", input, "--json"]);
    assert.equal(result.status, 3, `${result.stdout}\n${result.stderr}`);
    const output = JSON.parse(result.stdout.trim()) as { state: string; semanticChangesMade: number };
    assert.equal(output.state, "review-required");
    assert.equal(output.semanticChangesMade, 0);
  });
});

test("maintain CLI argument surface rejects missing input, duplicate authorization and unknown flags", async () => {
  await withProject(async (path) => {
    const input = await candidateFile(path, "Argument boundary");
    const missing = runCli(path, ["maintain", "--json"]);
    assert.equal(missing.status, 2);
    const duplicate = runCli(path, [
      "maintain", "--input", input,
      "--authorization", "11111111-1111-4111-8111-111111111111",
      "--authorization", "22222222-2222-4222-8222-222222222222",
      "--json",
    ]);
    assert.equal(duplicate.status, 2);
    const unknown = runCli(path, ["maintain", "--input", input, "--yes", "--json"]);
    assert.equal(unknown.status, 2);
  });
});
