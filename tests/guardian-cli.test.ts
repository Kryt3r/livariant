import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { guardianBootstrapHasInteractiveTerminal } from "../src/guardian/bootstrap.js";
import {
  parseProtectedGuardianRequest,
  protectedGuardianMaterialDigest,
} from "../src/guardian/protected-helper.js";
import { guardianAuthorityMaterialDigest } from "../src/guardian/authority-record.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const bootstrapPath = fileURLToPath(new URL("../src/guardian/bootstrap.js", import.meta.url));
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
  assert.ok(guardianRoute < delegation, "Guardian diagnostics must be handled locally before active Runtime delegation");
});

test("protected Stage-B core still requires both input and output to be interactive terminals", () => {
  assert.equal(guardianBootstrapHasInteractiveTerminal(true, true), true);
  assert.equal(guardianBootstrapHasInteractiveTerminal(false, true), false);
  assert.equal(guardianBootstrapHasInteractiveTerminal(true, false), false);
  assert.equal(guardianBootstrapHasInteractiveTerminal(false, false), false);
  assert.equal(guardianBootstrapHasInteractiveTerminal(undefined, true), false);
  assert.equal(guardianBootstrapHasInteractiveTerminal(true, undefined), false);
});

test("Windows Stage-B hardening gives leaf files effective requester read without recursive inheritance-only ACLs", async () => {
  const builtBootstrap = await readFile(bootstrapPath, "utf8");
  assert.match(builtBootstrap, /function hardenWindowsDirectory\(/u);
  assert.match(builtBootstrap, /function hardenWindowsFile\(/u);
  assert.match(builtBootstrap, /WINDOWS_USERS_SID}:\(OI\)\(CI\)RX/u);
  assert.match(builtBootstrap, /WINDOWS_USERS_SID}:RX/u);
  assert.doesNotMatch(builtBootstrap, /"\/T"/u, "Stage-B must not apply one inheritance-shaped ACL recursively to leaf files");
  assert.match(builtBootstrap, /hardenWindowsFile\(descriptor\)/u);
  assert.match(builtBootstrap, /hardenWindowsFile\(helper\)/u);
});

test("guardian status is read-only machine-readiness diagnostics with a next action", async () => {
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
      protectedSource: { state: string; changesMade: number };
      guardian: { ready: boolean };
      lifecycleAuthorizationReady: boolean;
      grantsAuthority: boolean;
      changesMade: number;
      nextStep: string;
    };
    assert.equal(report.schemaVersion, 1);
    assert.ok(["ready", "protected-source-required", "guardian-bootstrap-required", "unsafe", "unsupported-platform"].includes(report.state));
    assert.ok(["ready", "missing", "unsafe", "unsupported-platform"].includes(report.protectedSource.state));
    assert.equal(typeof report.guardian.ready, "boolean");
    assert.equal(typeof report.lifecycleAuthorizationReady, "boolean");
    assert.equal(report.grantsAuthority, false);
    assert.equal(report.protectedSource.changesMade, 0);
    assert.equal(report.changesMade, 0);
    assert.ok(report.nextStep.length > 0);
  });
});

test("ordinary global guardian bootstrap is guidance only and never runs requester-controlled bytes privileged", async () => {
  await withProject(async (project) => {
    const result = spawnSync(process.execPath, [cliPath, "guardian", "bootstrap", "--json"], {
      cwd: project,
      encoding: "utf8",
      shell: false,
      env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout) as {
      state: string;
      protectedSource: { state: string };
      authorityIssued: boolean;
      changesMade: number;
      nextStep: string;
      boundary: string;
    };
    assert.equal(report.authorityIssued, false);
    assert.equal(report.changesMade, 0);
    assert.match(report.boundary, /ordinary global CLI does not execute privileged Guardian bootstrap/i);
    assert.ok(report.nextStep.length > 0);
    if (report.protectedSource.state === "missing") assert.match(report.nextStep, /Stage-A|exact verified/i);
  });
});

test("protected Guardian helper exposes bounded authority transition commands", () => {
  const version = spawnSync(process.execPath, [helperPath, "version"], { encoding: "utf8", shell: false });
  assert.equal(version.status, 0, version.stderr);
  const parsed = JSON.parse(version.stdout) as {
    schemaVersion: number;
    kind: string;
    guardianVersion: number;
    authorityIssuanceSupported: boolean;
    authorityConsumptionSupported: boolean;
  };
  assert.deepEqual(parsed, {
    schemaVersion: 1,
    kind: "livariant-guardian-helper",
    guardianVersion: 1,
    authorityIssuanceSupported: true,
    authorityConsumptionSupported: true,
  });

  const issue = spawnSync(process.execPath, [helperPath, "issue-authority", "--request", "missing.json"], { encoding: "utf8", shell: false });
  assert.notEqual(issue.status, 0);
  assert.match(`${issue.stdout}\n${issue.stderr}`, /fixed protected production root/i);
});

test("protected helper and requester-side authority model derive the same domain-separated material digest", () => {
  const request = parseProtectedGuardianRequest({
    schemaVersion: 1,
    kind: "livariant-guardian-authority-request",
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialFields: [
      { label: "project", value: "project-1" },
      { label: "proposal", value: "proposal-1" },
      { label: "baseline", value: "baseline-1" },
    ],
  });
  assert.equal(
    protectedGuardianMaterialDigest(request.consumer, request.materialFields),
    guardianAuthorityMaterialDigest(request.consumer, request.materialFields),
  );
  assert.throws(() => parseProtectedGuardianRequest({ ...request, attacker: true }), /unsupported field/u);
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