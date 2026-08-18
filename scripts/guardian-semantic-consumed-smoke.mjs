import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
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
const RECOVERY_AUTH_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const RECOVERY_RECORD_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const EXACT_STATEMENT = "Protected Guardian consumed state unlocks exactly one semantic mutation";
const RECOVERY_STATEMENT = "Consumed before expiry remains valid only for exact delayed recovery";

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

async function seedApplyingAudit(path, proposal, authorizationId = AUTH_ID) {
  const authorizedAt = new Date().toISOString();
  const binding = {
    authorizationId,
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
  await writeFile(resolve(machineRoot, `${authorizationId}.json`), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization",
    state: "applying",
    authorizedAt,
  }, null, 2)}\n`, "utf8");
  return machineRoot;
}

function goalCandidate(statement, rationale) {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: statement,
    rationale,
    origin: "explicit-user",
  });
}

async function actionable(path, statement, rationale) {
  const prepared = await buildActionableProposal(goalCandidate(statement, rationale), path);
  assert.equal(prepared.state, "actionable-proposal");
  if (prepared.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  return prepared.proposal;
}

async function stageConsumedRecord({
  staging,
  project,
  proposal,
  authorizationId,
  recordId,
  issuedAt,
  expiresAt,
  consumedAt,
}) {
  const material = buildSemanticGuardianAuthorityRequest({
    authorizationId,
    physicalProjectRoot: await realpath(project),
    proposal,
  });
  const active = buildGuardianAuthorityRecord({
    consumer: "semantic-mutation",
    mode: "one-shot",
    materialSha256: material.materialSha256,
    issuedAt,
    expiresAt,
    recordId,
  });
  const consumed = consumeGuardianAuthorityRecord(active, consumedAt);
  const stagedRecord = resolve(staging, `${recordId}.json`);
  await writeFile(stagedRecord, `${JSON.stringify(consumed, null, 2)}\n`, "utf8");
  installProtectedRecord(stagedRecord, protectedRecordPath(recordId));
  return { material, consumed };
}

const project = await mkdtemp(resolve(tmpdir(), "livariant-guardian-semantic-smoke-"));
const crossProject = await mkdtemp(resolve(tmpdir(), "livariant-guardian-semantic-cross-project-"));
const recoveryProject = await mkdtemp(resolve(tmpdir(), "livariant-guardian-semantic-recovery-"));
const staging = await mkdtemp(resolve(tmpdir(), "livariant-guardian-semantic-record-"));
const machineRoots = new Set();
try {
  await initializeProject(project, { authorized: true });
  const proposal = await actionable(
    project,
    EXACT_STATEMENT,
    "WP-027 protected consumed Semantic Authority integration smoke",
  );
  machineRoots.add(await seedApplyingAudit(project, proposal));

  const now = Date.now();
  await stageConsumedRecord({
    staging,
    project,
    proposal,
    authorizationId: AUTH_ID,
    recordId: RECORD_ID,
    issuedAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 9 * 60_000).toISOString(),
    consumedAt: new Date(now).toISOString(),
  });

  const result = await applyActionableProposal(AUTH_ID, proposal, project);
  assert.equal(result.state, "completed");
  assert.equal(result.semanticChangesMade, 1);
  assert.equal(result.mutationAuthorizationConsumed, true);
  assert.match(await readFile(resolve(project, ".project-brain", "goals.md"), "utf8"), new RegExp(EXACT_STATEMENT));
  const audit = await inspectAuthorizationAudit(project);
  assert.equal(audit.active, null);
  assert.equal(audit.history.filter((item) => item.authorizationId === AUTH_ID && item.state === "completed").length, 1);

  await assert.rejects(
    applyActionableProposal(AUTH_ID, proposal, project),
    /No active|no longer matches|cannot reproduce|not safely recoverable|replay/i,
  );

  const substituted = await actionable(
    project,
    "Substituted scope must not reuse consumed Guardian state",
    "WP-027 substitution attack",
  );
  await assert.rejects(
    applyActionableProposal(AUTH_ID, substituted, project),
    /No active|not safely recoverable|Guardian|authorization/i,
  );
  assert.doesNotMatch(await readFile(resolve(project, ".project-brain", "goals.md"), "utf8"), /Substituted scope must not reuse consumed Guardian state/);

  // Cross-project acceptance: use the exact same semantic statement and operation
  // id in a different initialized project. Same-user audit/recovery evidence is
  // present there, but the only protected consumed record is bound to the first
  // project's stable identity and physical root, so it must not be reusable.
  await initializeProject(crossProject, { authorized: true });
  const crossProposal = await actionable(
    crossProject,
    EXACT_STATEMENT,
    "WP-027 cross-project protected-state reuse attack",
  );
  machineRoots.add(await seedApplyingAudit(crossProject, crossProposal));
  await assert.rejects(
    applyActionableProposal(AUTH_ID, crossProposal, crossProject),
    /not safely recoverable|Guardian|Authority|authorization/i,
  );
  assert.doesNotMatch(await readFile(resolve(crossProject, ".project-brain", "goals.md"), "utf8"), new RegExp(EXACT_STATEMENT));
  assert.equal((await inspectAuthorizationAudit(crossProject)).active?.state, "applying");

  // Delayed recovery acceptance: expiry bounds the initial one-shot consumption,
  // not recovery of an operation that was already consumed while valid. Install
  // a protected record whose expiry is now in the past but whose consumedAt is
  // strictly before that expiry. Only the exact project/proposal/operation may
  // recover from it, and it still must remain non-replayable after completion.
  await initializeProject(recoveryProject, { authorized: true });
  const recoveryProposal = await actionable(
    recoveryProject,
    RECOVERY_STATEMENT,
    "WP-027 delayed recovery after legitimate pre-expiry Guardian consumption",
  );
  machineRoots.add(await seedApplyingAudit(recoveryProject, recoveryProposal, RECOVERY_AUTH_ID));
  const recoveryNow = Date.now();
  await stageConsumedRecord({
    staging,
    project: recoveryProject,
    proposal: recoveryProposal,
    authorizationId: RECOVERY_AUTH_ID,
    recordId: RECOVERY_RECORD_ID,
    issuedAt: new Date(recoveryNow - 20 * 60_000).toISOString(),
    expiresAt: new Date(recoveryNow - 10 * 60_000).toISOString(),
    consumedAt: new Date(recoveryNow - 11 * 60_000).toISOString(),
  });

  const recovered = await applyActionableProposal(RECOVERY_AUTH_ID, recoveryProposal, recoveryProject);
  assert.equal(recovered.state, "completed");
  assert.equal(recovered.semanticChangesMade, 1);
  assert.equal(recovered.mutationAuthorizationConsumed, true);
  assert.match(await readFile(resolve(recoveryProject, ".project-brain", "goals.md"), "utf8"), new RegExp(RECOVERY_STATEMENT));
  const recoveryAudit = await inspectAuthorizationAudit(recoveryProject);
  assert.equal(recoveryAudit.active, null);
  assert.equal(recoveryAudit.history.filter((item) => item.authorizationId === RECOVERY_AUTH_ID && item.state === "completed").length, 1);
  await assert.rejects(
    applyActionableProposal(RECOVERY_AUTH_ID, recoveryProposal, recoveryProject),
    /No active|no longer matches|cannot reproduce|not safely recoverable|replay/i,
  );

  console.log("Protected consumed Semantic Authority acceptance passed: exact mutation succeeded; replay, scope substitution, and cross-project reuse were refused; legitimate pre-expiry consumption supported exact delayed recovery only.");
} finally {
  for (const machineRoot of machineRoots) await rm(machineRoot, { recursive: true, force: true });
  await rm(project, { recursive: true, force: true });
  await rm(crossProject, { recursive: true, force: true });
  await rm(recoveryProject, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
}
