import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-autonomy-cli-"));
  try {
    await writeFile(resolve(path, "package.json"), JSON.stringify({ name: "autonomy-cli-test" }));
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

test("autonomy show uses balanced default before stable project identity exists", async () => {
  await withProject(async (path) => {
    const result = runCli(path, ["autonomy", "show", "--json"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const state = JSON.parse(result.stdout.trim()) as {
      profile: string;
      persisted: boolean;
      stableProjectIdentity: string | null;
      policy: { confirmation: { authorityRequired: boolean }; boundaries: { grantsAuthority: boolean } };
    };
    assert.equal(state.profile, "ask-important");
    assert.equal(state.persisted, false);
    assert.equal(state.stableProjectIdentity, null);
    assert.equal(state.policy.confirmation.authorityRequired, true);
    assert.equal(state.policy.boundaries.grantsAuthority, false);
  });
});

test("autonomy set refuses persistence before stable project identity exists", async () => {
  await withProject(async (path) => {
    const before = (await readdir(path)).sort();
    const result = runCli(path, ["autonomy", "set", "--profile", "ask-always", "--json"]);
    assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
    const state = JSON.parse(result.stdout.trim()) as { state: string; authorityGranted: boolean; projectFilesChanged: number; error: { message: string } };
    assert.equal(state.state, "blocked");
    assert.equal(state.authorityGranted, false);
    assert.equal(state.projectFilesChanged, 0);
    assert.match(state.error.message, /stable project identity/i);
    assert.deepEqual((await readdir(path)).sort(), before);
  });
});

test("high-autonomy persistence requires explicit risk acknowledgement", async () => {
  await withProject(async (path) => {
    const result = runCli(path, ["autonomy", "set", "--profile", "continue-without-confirmation", "--json"]);
    assert.equal(result.status, 2);
    const state = JSON.parse(result.stdout.trim()) as { state: string; error: { message: string } };
    assert.equal(state.state, "blocked");
    assert.match(state.error.message, /--acknowledge-risk/i);
  });
});

test("first-run carries autonomy choice without persisting it or granting authority", async () => {
  await withProject(async (path) => {
    const before = (await readdir(path)).sort();
    const result = runCli(path, ["first-run", "--language", "Deutsch", "--autonomy-profile", "ask-always", "--json"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(result.stdout.trim()) as {
      autonomy: {
        selectedProfile: string;
        persistedByFirstRun: boolean;
        persistenceRequiresExplicitAction: boolean;
        policy: { confirmation: { routine: boolean; important: boolean; authorityRequired: boolean }; boundaries: { grantsAuthority: boolean } };
      };
      boundaries: { autonomyProfileIsAuthority: boolean; grantsAuthority: boolean; changesMade: number };
      nextActions: Array<{ id: string; command?: string; changesProject: boolean; changesMachineLocalState?: boolean }>;
    };
    assert.equal(report.autonomy.selectedProfile, "ask-always");
    assert.equal(report.autonomy.persistedByFirstRun, false);
    assert.equal(report.autonomy.persistenceRequiresExplicitAction, true);
    assert.equal(report.autonomy.policy.confirmation.routine, true);
    assert.equal(report.autonomy.policy.confirmation.important, true);
    assert.equal(report.autonomy.policy.confirmation.authorityRequired, true);
    assert.equal(report.autonomy.policy.boundaries.grantsAuthority, false);
    assert.equal(report.boundaries.autonomyProfileIsAuthority, false);
    assert.equal(report.boundaries.grantsAuthority, false);
    assert.equal(report.boundaries.changesMade, 0);
    const persist = report.nextActions.find((item) => item.id === "persist-autonomy");
    assert.equal(persist?.command, "livariant autonomy set --profile ask-always");
    assert.equal(persist?.changesProject, false);
    assert.equal(persist?.changesMachineLocalState, true);
    assert.deepEqual((await readdir(path)).sort(), before);
  });
});

test("first-run high-autonomy JSON mode requires explicit acknowledgement", async () => {
  await withProject(async (path) => {
    const blocked = runCli(path, ["first-run", "--language", "English", "--autonomy-profile", "continue-without-confirmation", "--json"]);
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /--acknowledge-autonomy-risk/i);

    const accepted = runCli(path, [
      "first-run",
      "--language", "English",
      "--autonomy-profile", "continue-without-confirmation",
      "--acknowledge-autonomy-risk",
      "--json",
    ]);
    assert.equal(accepted.status, 0, `${accepted.stdout}\n${accepted.stderr}`);
    const report = JSON.parse(accepted.stdout.trim()) as {
      autonomy: { selectedProfile: string; policy: { warning?: string; confirmation: { authorityRequired: boolean } } };
      nextActions: Array<{ id: string; command?: string }>;
    };
    assert.equal(report.autonomy.selectedProfile, "continue-without-confirmation");
    assert.match(report.autonomy.policy.warning ?? "", /higher autonomy/i);
    assert.equal(report.autonomy.policy.confirmation.authorityRequired, true);
    assert.equal(
      report.nextActions.find((item) => item.id === "persist-autonomy")?.command,
      "livariant autonomy set --profile continue-without-confirmation --acknowledge-risk",
    );
  });
});
