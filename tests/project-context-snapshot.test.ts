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
  buildProjectContextSnapshot,
  initializeProject,
  recordAcceptedDecision,
} from "../src/runtime/index.js";
import { isStableProjectIdentity } from "../src/project-brain/identity.js";

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
  const path = await mkdtemp(resolve(tmpdir(), "livariant-context-snapshot-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("healthy snapshot exposes provenance-aware canonical context and remains read-only", async () => {
  await withProject(async (path) => {
    await addConfirmedGoal("Ship coherent project context", path, { authorized: true });
    await addConfirmedKnowledge("Provider memory is not canonical truth", path, { authorized: true });
    await recordAcceptedDecision("Context projection is read-only", path, { authorized: true });

    const managed = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"];
    const before = new Map(await Promise.all(managed.map(async (name) => [name, await readFile(resolve(path, ".project-brain", name))] as const)));

    const snapshot = await buildProjectContextSnapshot(path);
    assert.equal(snapshot.safetyState, "clear");
    if (snapshot.safetyState !== "clear") return;

    assert.equal(snapshot.changesMade, 0);
    assert.ok(isStableProjectIdentity(snapshot.stableProjectIdentity));
    assert.equal(snapshot.projection.derived, true);
    assert.equal(snapshot.projection.mutationAuthorization, false);
    assert.equal(snapshot.projection.returnedCopiesTrusted, false);
    assert.equal(snapshot.projection.materialActionsRequireRevalidation, true);
    assert.equal(snapshot.baseline.algorithm, "sha256");
    assert.match(snapshot.baseline.digest, /^[a-f0-9]{64}$/);
    assert.ok(snapshot.context.confirmedGoals.some((item) => item.value === "Ship coherent project context" && item.authorityClass === "canonical-project"));
    assert.ok(snapshot.context.knownFacts.some((item) => item.value === "Provider memory is not canonical truth" && item.authorityClass === "canonical-project"));
    assert.ok(snapshot.context.activeDecisions.some((item) => item.value === "Context projection is read-only" && item.authorityClass === "canonical-project"));
    assert.ok(snapshot.context.unresolvedUnknowns.every((item) => item.authorityClass === "unresolved-project"));

    for (const name of managed) assert.deepEqual(await readFile(resolve(path, ".project-brain", name)), before.get(name));
  });
});

test("material baseline is stable across unchanged reads and changes with managed bytes", async () => {
  await withProject(async (path) => {
    const first = await buildProjectContextSnapshot(path);
    const second = await buildProjectContextSnapshot(path);
    assert.equal(first.safetyState, "clear");
    assert.equal(second.safetyState, "clear");
    if (first.safetyState !== "clear" || second.safetyState !== "clear") return;
    assert.equal(first.baseline.digest, second.baseline.digest);
    assert.equal(first.stableProjectIdentity, second.stableProjectIdentity);
    assert.notEqual(first.generatedAt, "");

    await addConfirmedGoal("Change the material baseline", path, { authorized: true });
    const changed = await buildProjectContextSnapshot(path);
    assert.equal(changed.safetyState, "clear");
    if (changed.safetyState !== "clear") return;
    assert.notEqual(changed.baseline.digest, first.baseline.digest);
    assert.equal(changed.stableProjectIdentity, first.stableProjectIdentity);
  });
});

test("snapshot fails closed when Project Brain changes during construction", async () => {
  await withProject(async (path) => {
    const goalsPath = resolve(path, ".project-brain", "goals.md");
    const result = await buildProjectContextSnapshot(path, {
      beforeRevalidate: async () => {
        await writeFile(goalsPath, "# Goals\n\n- Concurrent human change\n", "utf8");
      },
    });
    assert.equal(result.safetyState, "blocked");
    assert.equal(result.context, null);
    assert.ok(result.findings.some((finding) => finding.code === "snapshot-concurrent-change"));
  });
});

test("missing Project Brain produces structured blocked JSON with non-zero process status", async () => {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-context-missing-"));
  try {
    const api = await buildProjectContextSnapshot(path);
    assert.equal(api.safetyState, "blocked");
    assert.equal(api.baseline, null);
    assert.equal(api.context, null);

    const result = runCli(path, ["context", "--json"]);
    assert.equal(result.status, 3, result.stderr);
    const parsed = JSON.parse(result.stdout) as { safetyState: string; context: unknown; changesMade: number };
    assert.equal(parsed.safetyState, "blocked");
    assert.equal(parsed.context, null);
    assert.equal(parsed.changesMade, 0);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});

test("human and JSON CLI preserve authority distinctions and derived-output warning", async () => {
  await withProject(async (path) => {
    await addConfirmedGoal("Make agent context trustworthy", path, { authorized: true });

    const human = runCli(path, ["context"]);
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /Safety state: clear/);
    assert.match(human.stdout, /Projection: derived, not mutation authorization/);
    assert.match(human.stdout, /\[canonical-project\] Make agent context trustworthy/);
    assert.match(human.stdout, /Unresolved unknowns:/);
    assert.match(human.stdout, /\[unresolved-project\]/);
    assert.match(human.stdout, /Changes made: 0/);

    const json = runCli(path, ["context", "--json"]);
    assert.equal(json.status, 0, json.stderr);
    const parsed = JSON.parse(json.stdout) as {
      safetyState: string;
      stableProjectIdentity: unknown;
      projection: { mutationAuthorization: boolean; returnedCopiesTrusted: boolean };
      context: { confirmedGoals: Array<{ authorityClass: string }> };
    };
    assert.equal(parsed.safetyState, "clear");
    assert.ok(isStableProjectIdentity(parsed.stableProjectIdentity));
    assert.equal(parsed.projection.mutationAuthorization, false);
    assert.equal(parsed.projection.returnedCopiesTrusted, false);
    assert.equal(parsed.context.confirmedGoals[0]?.authorityClass, "canonical-project");
  });
});

test("damaged managed file never produces clean context", async () => {
  await withProject(async (path) => {
    await rm(resolve(path, ".project-brain", "knowledge.md"));
    const snapshot = await buildProjectContextSnapshot(path);
    assert.equal(snapshot.safetyState, "blocked");
    assert.equal(snapshot.context, null);
    assert.ok(snapshot.findings.some((finding) => finding.severity === "error"));

    const cli = runCli(path, ["context"]);
    assert.equal(cli.status, 3, cli.stderr);
    assert.match(cli.stdout, /Safety state: blocked/);
    assert.ok(cli.stdout.indexOf("Safety state: blocked") < cli.stdout.indexOf("Blocking findings:"));
  });
});
