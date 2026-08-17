import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import {
  buildActionableProposal,
  initializeProject,
  inspectAuthorizationAudit,
  parseSemanticProposalCandidate,
} from "../dist/src/runtime/index.js";
import {
  buildGuardianAuthorityRecord,
  consumeGuardianAuthorityRecord,
} from "../dist/src/guardian/authority-record.js";
import { buildSemanticGuardianAuthorityRequest } from "../dist/src/guardian/semantic-authority.js";
import { applyActionableProposal } from "../dist/src/runtime/semantic-apply.js";

const AUTH_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RECORD_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function fail(command, result) {
  const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
  throw new Error(`${command} failed: ${String(detail).trim()}`);
}

function installProtectedRecord(source, destination) {
  if (process.platform === "linux") {
    const result = spawnSync("/usr/bin/sudo", ["install", "-o", "root", "-g", "root", "-m", "0444", source, destination], {
      encoding: "utf8",
      shell: false,
    });
    if (result.error || result.status !== 0) fail("sudo install protected Semantic Authority", result);
    return;
  }
  if (process.platform === "win32") {
    const result = spawnSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$ErrorActionPreference='Stop'; Copy-Item -LiteralPath $env:LIVARIANT_TEST_RECORD_SOURCE -Destination $env:LIVARIANT_TEST_RECORD_DEST -Force; $acl=[System.IO.File]::GetAccessControl($env:LIVARIANT_TEST_RECORD_DEST); $acl.SetOwner((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544'))); $acl.SetAccessRuleProtection($true,$false); $acl.Access | ForEach-Object { [void]$acl.RemoveAccessRule($_) }; $inherit=[System.Security.AccessControl.InheritanceFlags]::None; $prop=[System.Security.AccessControl.PropagationFlags]::None; $allow=[System.Security.AccessControl.AccessControlType]::Allow; $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')),'FullControl',$inherit,$prop,$allow))); $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')),'FullControl',$inherit,$prop,$allow))); $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-545')),'ReadAndExecute',$inherit,$prop,$allow))); [System.IO.File]::SetAccessControl($env:LIVARIANT_TEST_RECORD_DEST,$acl)",
    ], {
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        LIVARIANT_TEST_RECORD_SOURCE: source,
        LIVARIANT_TEST_RECORD_DEST: destination,
      },
    });
    if (result.error || result.status !== 0) fail("install protected Semantic Authority on Windows", result);
    return;
  }
  throw new Error("Protected Semantic Authority smoke supports Linux and Windows only.");
}

function protectedRecordPath(recordId) {
  if (process.platform === "linux") return `/var/lib/livariant-guardian/v1/records/semantic-mutation/${recordId}.json`;
  if (process.platform === "win32") return `C:\\ProgramData\\Livariant\\Guardian\\v1\\records\\semantic-mutation\\${recordId}.json`;
  throw new Error("unsupported platform");
}

async function projectId(path) {
  const metadata = JSON.parse(await readFile(resolve(path, ".project-brain", "metadata.json"), "utf8"));
  return metadata.projectBrain.projectId;
}

async function seedApplyingAudit(path, proposal) {
  const authorizedAt = new Date().toISOString();
  const binding = {
    authorizationId: AUTH_ID,
    stableProjectIdentity: proposal.stableProjectIdentity,
    actionableProposalId: proposal.actionableProposalId,
    actionableProposalVersion: 1,
    proposalDigest: proposal.materialDigest.digest,
    mutationScope: proposal.mutationScope,
    baseline: proposal.baseline,
  };
  const projectRoot = resolve(path, ".project-brain", ".authorizations");
  await mkdir(resolve(projectRoot, "history"), { recursive: true });
  await writeFile(resolve(projectRoot, "active.json"), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization-audit",
    state: "applying",
    authorizedAt,
  }, null, 2)}\n`, "utf8");

  const machineRoot = resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", proposal.stableProjectIdentity);
  await mkdir(machineRoot, { recursive: true });
  await writeFile(resolve(machineRoot, `${AUTH_ID}.json`), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization",
    state: "applying",
    authorizedAt,
  }, null, 2)}\n`, "utf8");
}

const project = await mkdtemp(resolve(tmpdir(), "livariant-guardian-semantic-smoke-"));
const staging = await mkdtemp(resolve(tmpdir(), "livariant-guardian-semantic-record-"));
let machineRoot = null;
try {
  await initializeProject(project, { authorized: true });
  const candidate = parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: "Protected Guardian consumed state unlocks exactly one semantic mutation",
    rationale: "WP-027 protected consumed Semantic Authority integration smoke",
    origin: "explicit-user",
  });
  const prepared = await buildActionableProposal(candidate, project);
  assert.equal(prepared.state, "actionable-proposal");
  if (prepared.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  const proposal = prepared.proposal;
  await seedApplyingAudit(project, proposal);
  machineRoot = resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", await projectId(project));

  const material = buildSemanticGuardianAuthorityRequest({
    authorizationId: AUTH_ID,
    physicalProjectRoot: project,
    proposal,
  });
  const issuedAt = new Date(Date.now() - 60_000).toISOString();
  const expiresAt = new Date(Date.now() + 9 * 60_000).toISOString();
  const active = buildGuardianAuthorityRecord({
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialSha256: material.materialSha256,
    issuedAt,
    expiresAt,
    recordId: RECORD_ID,
  });
  const consumed = consumeGuardianAuthorityRecord(active, new Date().toISOString());
  const stagedRecord = resolve(staging, `${RECORD_ID}.json`);
  await writeFile(stagedRecord, `${JSON.stringify(consumed, null, 2)}\n`, "utf8");
  installProtectedRecord(stagedRecord, protectedRecordPath(RECORD_ID));

  const result = await applyActionableProposal(AUTH_ID, proposal, project);
  assert.equal(result.state, "completed");
  assert.equal(result.semanticChangesMade, 1);
  assert.equal(result.mutationAuthorizationConsumed, true);
  assert.match(await readFile(resolve(project, ".project-brain", "goals.md"), "utf8"), /Protected Guardian consumed state unlocks exactly one semantic mutation/);
  const audit = await inspectAuthorizationAudit(project);
  assert.equal(audit.active, null);
  assert.equal(audit.history.filter((item) => item.authorizationId === AUTH_ID && item.state === "completed").length, 1);

  await assert.rejects(
    applyActionableProposal(AUTH_ID, proposal, project),
    /No active|no longer matches|cannot reproduce|not safely recoverable|replay/i,
  );

  const substitutedCandidate = parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: "Substituted scope must not reuse consumed Guardian state",
    rationale: "WP-027 substitution attack",
    origin: "explicit-user",
  });
  const substituted = await buildActionableProposal(substitutedCandidate, project);
  assert.equal(substituted.state, "actionable-proposal");
  if (substituted.state !== "actionable-proposal") throw new Error("expected substituted actionable proposal");
  await assert.rejects(
    applyActionableProposal(AUTH_ID, substituted.proposal, project),
    /No active|not safely recoverable|Guardian|authorization/i,
  );
  assert.doesNotMatch(await readFile(resolve(project, ".project-brain", "goals.md"), "utf8"), /Substituted scope must not reuse consumed Guardian state/);

  console.log("Protected consumed Semantic Authority smoke passed: exact protected consumed state enabled one mutation; replay and substitution were refused.");
} finally {
  if (machineRoot) await rm(machineRoot, { recursive: true, force: true });
  await rm(project, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
}
