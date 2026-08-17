import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const helperPath = fileURLToPath(new URL("../src/guardian/protected-helper.js", import.meta.url));

async function withProject(run: (project: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-guardian-cli-"));
  const project = resolve(root, "project");
  await mkdir(project);
  try {
    await run(project);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("Guardian routing remains local before any active Runtime delegation", async () => {
  const builtCli = await readFile(cliPath, "utf8");
  const guardianRoute = builtCli.indexOf('if (command === "guardian")');
  const delegation = builtCli.indexOf("await delegateToActiveRuntime()");
  assert.notEqual(guardianRoute, -1, "compiled CLI must contain the Guardian local route");
  assert.notEqual(delegation, -1, "compiled CLI must contain active Runtime delegation for non-Guardian commands");
  assert.ok(
    guardianRoute < delegation,
    "Guardian status/bootstrap must be handled by the current protected CLI before any active Runtime can intercept the command",
  );
});

test("guardian status is read-only structured diagnostics", async () => {
  await withProject(async (project) => {
    const result = spawnSync(process.execPath, [cliPath, "guardian", "status", "--json"], {
      cwd: project,
      encoding: "utf8",
      shell: false,
      env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout) as {
      schemaVersion: number;
      state: string;
      guardianReady: boolean;
      changesMade: number;
      limitations: string[];
    };
    assert.equal(report.schemaVersion, 1);
    assert.ok(["ready", "unavailable", "unsafe", "unsupported-platform"].includes(report.state));
    assert.equal(typeof report.guardianReady, "boolean");
    assert.equal(report.changesMade, 0);
    assert.ok(report.limitations.some((value) => /does not by itself grant/i.test(value)));
  });
});

test("guardian bootstrap cannot use requester-controlled package bytes as privileged source", async () => {
  await withProject(async (project) => {
    const result = spawnSync(process.execPath, [cliPath, "guardian", "bootstrap", "--json"], {
      cwd: project,
      encoding: "utf8",
      shell: false,
      env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
    });
    assert.notEqual(result.status, 0);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /protected Guardian bootstrap source is not provisioned|refuses requester-controlled code/i,
    );
  });
});

test("protected Guardian helper exposes only a non-authorizing foundation version surface", () => {
  const version = spawnSync(process.execPath, [helperPath, "version"], { encoding: "utf8", shell: false });
  assert.equal(version.status, 0, version.stderr);
  const parsed = JSON.parse(version.stdout) as {
    schemaVersion: number;
    kind: string;
    guardianVersion: number;
    authorityIssuanceSupported: boolean;
  };
  assert.deepEqual(parsed, {
    schemaVersion: 1,
    kind: "livariant-guardian-helper",
    guardianVersion: 1,
    authorityIssuanceSupported: false,
  });

  const issue = spawnSync(process.execPath, [helperPath, "issue-authority"], { encoding: "utf8", shell: false });
  assert.notEqual(issue.status, 0);
  assert.match(`${issue.stdout}\n${issue.stderr}`, /does not issue Authority/i);
});

test("guardian command refuses unsupported mutating-looking subcommands", async () => {
  await withProject(async (project) => {
    const result = spawnSync(process.execPath, [cliPath, "guardian", "install"], {
      cwd: project,
      encoding: "utf8",
      shell: false,
      env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /guardian status.*guardian bootstrap/i);
  });
});
