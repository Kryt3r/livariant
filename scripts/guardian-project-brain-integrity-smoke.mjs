import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cp, lstat, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { buildGuardianAuthorityRecord } from "../dist/src/guardian/authority-record.js";
import { buildGuardianAuthorityRequest } from "../dist/src/guardian/authority-client.js";
import { buildProjectBrainIntegrityGuardianRequest } from "../dist/src/guardian/project-brain-integrity-authority.js";
import { ProjectBrainStore } from "../dist/src/project-brain/store.js";
import {
  inspectProjectBrainIntegrity,
  recordAcceptedProjectBrainState,
} from "../dist/src/project-brain/integrity.js";
import { inspectProtectedProjectBrainIntegrity, establishProtectedProjectBrainIntegrityState } from "../dist/src/project-brain/protected-integrity.js";
import { issueSemanticGuardianAuthority, consumeSemanticGuardianAuthority } from "../dist/src/guardian/semantic-authority-transition.js";
import { buildActionableProposal } from "../dist/src/runtime/actionable-proposal.js";
import { parseSemanticProposalCandidate } from "../dist/src/runtime/semantic-proposal.js";
import { buildProtectedProjectContextSnapshot } from "../dist/src/runtime/protected-context.js";
import { runProtectedDoctor } from "../dist/src/runtime/protected-doctor.js";
import { prepareProtectedKnowledgeSchemaTransition } from "../dist/src/intelligence/protected-knowledge-schema-transition.js";
import { buildProtectedProviderContext } from "../dist/src/runtime/protected-provider-context.js";
import { buildProtectedResumeContext } from "../dist/src/runtime/protected-resume.js";
import { FRAMEWORK_VERSION } from "../dist/src/lifecycle/state.js";
import { inspectGuardianMigrationFenceStorage } from "../dist/src/guardian/protected-helper.js";
import { buildProtectedSemanticProposal } from "../dist/src/runtime/protected-semantic-proposal.js";
import { applyActionableProposal } from "../dist/src/runtime/semantic-apply.js";
import { readDesktopProjectKnowledge, readDesktopProjectKnowledgeExplorer } from "../dist/src/project/desktop-project-knowledge.js";

const RECORD_ID = "55555555-5555-4555-8555-555555555555";
const MALFORMED_RECORD_ID = "66666666-6666-4666-8666-666666666666";

function fail(command, result) {
  const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
  throw new Error(`${command} failed: ${String(detail).trim()}`);
}

function protectedConsumerDirectory() {
  if (process.platform === "linux") return "/var/lib/livariant-guardian/v1/records/project-brain-integrity";
  if (process.platform === "win32") return "C:\\ProgramData\\Livariant\\Guardian\\v1\\records\\project-brain-integrity";
  throw new Error("Protected Project Brain Integrity smoke supports Linux and Windows only.");
}

function protectedRecordPath(recordId) {
  return resolve(protectedConsumerDirectory(), `${recordId}.json`);
}

function installProtectedRecord(source, destination) {
  if (process.platform === "linux") {
    const result = spawnSync("/usr/bin/sudo", ["install", "-o", "root", "-g", "root", "-m", "0444", source, destination], {
      encoding: "utf8",
      shell: false,
    });
    if (result.error || result.status !== 0) fail("sudo install protected Project Brain Integrity Authority", result);
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
    if (result.error || result.status !== 0) fail("install protected Project Brain Integrity Authority on Windows", result);
    return;
  }
  throw new Error("unsupported platform");
}

function removeProtectedRecord(destination) {
  if (process.platform === "linux") {
    const result = spawnSync("/usr/bin/sudo", ["rm", "-f", destination], { encoding: "utf8", shell: false });
    if (result.error || result.status !== 0) fail("sudo remove protected Project Brain Integrity Authority", result);
    return;
  }
  if (process.platform === "win32") {
    const result = spawnSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$ErrorActionPreference='Stop'; if (Test-Path -LiteralPath $env:LIVARIANT_TEST_RECORD_DEST) { Remove-Item -LiteralPath $env:LIVARIANT_TEST_RECORD_DEST -Force }",
    ], {
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      env: { ...process.env, LIVARIANT_TEST_RECORD_DEST: destination },
    });
    if (result.error || result.status !== 0) fail("remove protected Project Brain Integrity Authority on Windows", result);
    return;
  }
  throw new Error("unsupported platform");
}


const MIGRATION_TEST_TX = "77777777-7777-4777-8777-777777777777";
function fenceDirectory() {
  return resolve(process.platform === "linux"
    ? "/var/lib/livariant-guardian/v1/records/schema-migration"
    : "C:\\ProgramData\\Livariant\\Guardian\\v1\\records\\schema-migration");
}
function protectedCommand(result, label) {
  if (result.error || result.status !== 0) fail(label, result);
}
function createProtectedFenceDirectory() {
  const directory = fenceDirectory();
  if (process.platform === "linux") {
    protectedCommand(spawnSync("/usr/bin/sudo",
      ["install", "-d", "-o", "root", "-g", "root", "-m", "0555", directory],
      { encoding: "utf8", shell: false }), "install protected migration test namespace");
  } else if (process.platform === "win32") {
    const script = [
      "$ErrorActionPreference='Stop'",
      "$path=$env:LIVARIANT_TEST_FENCE_DIRECTORY",
      "if([System.IO.Directory]::Exists($path)){throw 'Migration test namespace unexpectedly exists'}",
      "[void][System.IO.Directory]::CreateDirectory($path)",
      "$acl=[System.IO.Directory]::GetAccessControl($path)",
      "$acl.SetOwner((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')))",
      "$acl.SetAccessRuleProtection($true,$false)",
      "$acl.Access | ForEach-Object { [void]$acl.RemoveAccessRule($_) }",
      "$allow=[System.Security.AccessControl.AccessControlType]::Allow",
      "$inherit=[System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [System.Security.AccessControl.InheritanceFlags]::ObjectInherit",
      "$none=[System.Security.AccessControl.PropagationFlags]::None",
      "$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')),'FullControl',$inherit,$none,$allow)))",
      "$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')),'FullControl',$inherit,$none,$allow)))",
      "$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-545')),'ReadAndExecute',$inherit,$none,$allow)))",
      "[System.IO.Directory]::SetAccessControl($path,$acl)",
    ].join("; ");
    protectedCommand(spawnSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { encoding: "utf8", shell: false, windowsHide: true,
        env: { ...process.env, LIVARIANT_TEST_FENCE_DIRECTORY: directory } }),
      "install Windows protected migration test namespace");
  } else throw new Error("unsupported platform");
}
function removeProtectedFenceDirectory() {
  if (process.platform === "linux") {
    protectedCommand(spawnSync("/usr/bin/sudo", ["rmdir", fenceDirectory()],
      { encoding: "utf8", shell: false }), "remove protected migration test namespace");
  } else if (process.platform === "win32") {
    protectedCommand(spawnSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command",
        "$ErrorActionPreference='Stop'; [System.IO.Directory]::Delete($env:LIVARIANT_TEST_FENCE_DIRECTORY)"],
      { encoding: "utf8", shell: false, windowsHide: true,
        env: { ...process.env, LIVARIANT_TEST_FENCE_DIRECTORY: fenceDirectory() } }),
      "remove protected Windows migration test namespace");
  } else throw new Error("unsupported platform");
}

function installedHelperCommand(args) {
  const root = resolve(protectedConsumerDirectory(), "..", "..");
  const helper = resolve(root, "guardian-helper.js");
  const interpreter = resolve(root, process.platform === "win32" ? "guardian-node.exe" : "guardian-node");
  return process.platform === "linux"
    ? { executable: "/usr/bin/sudo", args: [interpreter, helper, ...args] }
    : { executable: interpreter, args: [helper, ...args] };
}
async function invokeInstalledHelper(args) {
  const command = installedHelperCommand(args);
  return new Promise((resolveResult, reject) => {
    const child = spawn(command.executable, command.args, { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", status => resolveResult({ status, stdout, stderr }));
  });
}

async function bootstrap(project) {
  const store = new ProjectBrainStore(project);
  await store.bootstrap(
    {
      framework: { version: FRAMEWORK_VERSION, channel: "preview" },
      projectBrain: { schemaVersion: 2, projectId: randomUUID().toLowerCase() },
    },
    { projectName: "guardian-integrity-smoke", evidence: [], unknowns: [] },
  );
  await recordAcceptedProjectBrainState(project, "manual-bootstrap");
  return store;
}

async function localMatch(project) {
  const state = await inspectProjectBrainIntegrity(project);
  assert.equal(state.state, "match");
  if (state.state !== "match") throw new Error("expected local integrity match");
  return state;
}

async function stageExactProtectedRecord(project, staging, recordId = RECORD_ID) {
  const local = await localMatch(project);
  const material = buildProjectBrainIntegrityGuardianRequest({
    stableProjectIdentity: local.receipt.stableProjectIdentity,
    physicalProjectRoot: await realpath(project),
    physicalProjectBrainRoot: await realpath(resolve(project, ".project-brain")),
    integritySchemaVersion: 1,
    baseline: local.current,
  });
  const record = buildGuardianAuthorityRecord({
    consumer: "project-brain-integrity",
    mode: "persistent",
    materialSha256: material.materialSha256,
    recordId,
  });
  const source = resolve(staging, `${recordId}.json`);
  await writeFile(source, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  installProtectedRecord(source, protectedRecordPath(recordId));
  return { local, material, record };
}

const project = await mkdtemp(resolve(tmpdir(), "livariant-guardian-integrity-smoke-"));
const copiedProject = await mkdtemp(resolve(tmpdir(), "livariant-guardian-integrity-copy-"));
const staging = await mkdtemp(resolve(tmpdir(), "livariant-guardian-integrity-record-"));
const unrelatedProject = await mkdtemp(resolve(tmpdir(), "livariant-guardian-unrelated-"));
const unrelatedIntegrityId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const unrelatedConsumeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
try {
  const store = await bootstrap(project);
  const originalMetadata = await readFile(resolve(project, ".project-brain", "metadata.json"), "utf8");
  const originalKnowledge = await store.readKnowledgeDocument();
  const staged = await stageExactProtectedRecord(project, staging);

  const protectedMatch = await inspectProtectedProjectBrainIntegrity(project);
  assert.equal(protectedMatch.state, "match");
  if (protectedMatch.state !== "match") throw new Error("expected protected integrity match");
  assert.equal(protectedMatch.guardian.recordId, RECORD_ID);
  assert.equal((await runProtectedDoctor(project)).state, "healthy");

  // WP-058: only actual independently Guardian-protected source material may
  // produce a proposed-v3 REVIEW PLAN. A digest or local receipt is not approval.
  const protectedTransition = await prepareProtectedKnowledgeSchemaTransition(project);
  assert.equal(protectedTransition.state, "protected-plan-only");
  assert.equal(protectedTransition.grantsAuthority, false);
  assert.equal(protectedTransition.acceptsTargetSchema, false);
  assert.equal(protectedTransition.writesPerformed, false);
  assert.equal(protectedTransition.changesMade, 0);
  assert.equal(protectedTransition.plan.source.schemaVersion, 2);
  assert.equal(protectedTransition.plan.proposedTarget.schemaVersion, 3);
  assert.equal(protectedTransition.plan.proposedTarget.writesPerformed, false);
  assert.equal((await readFile(resolve(project, ".project-brain", "metadata.json"), "utf8")), originalMetadata);

  // Positive release-relevant product-surface proof: exact protected Guardian
  // acceptance must permit canonical Context, Resume, and Provider Context reads.
  const protectedContext = await buildProtectedProjectContextSnapshot(project);
  assert.equal(protectedContext.safetyState, "clear");
  assert.equal(protectedContext.stableProjectIdentity, staged.local.receipt.stableProjectIdentity);
  assert.equal(protectedContext.changesMade, 0);
  assert.notEqual(protectedContext.context, null);

  const protectedResume = await buildProtectedResumeContext(project);
  assert.equal(protectedResume.lifecycle, "initialized");
  assert.ok(Array.isArray(protectedResume.confirmedGoals));
  assert.ok(Array.isArray(protectedResume.activeDecisions));

  const protectedProvider = await buildProtectedProviderContext(
    "codex",
    "Protected C-02 product-surface acceptance",
    project,
  );
  assert.equal(protectedProvider.state, "ready");
  if (protectedProvider.state !== "ready") throw new Error("expected protected provider context ready state");
  assert.equal(protectedProvider.safetyState, "clear");
  assert.equal(protectedProvider.stableProjectIdentity, staged.local.receipt.stableProjectIdentity);
  assert.equal(protectedProvider.task.authorityClass, "session-ephemeral");
  assert.equal(protectedProvider.mutationAuthorization, false);
  assert.equal(protectedProvider.changesMade, 0);
  assert.equal(typeof protectedProvider.packetId, "string");


  // WP-058 real OS-protected read-gate integration: a deliberately staged
  // mock fence is NOT a real issuance, migration or user project mutation.
  // Its mere protected presence must block all canonical read surfaces.
  const fenceSource = resolve(staging, MIGRATION_TEST_TX + ".json");
  const fencePath = resolve(fenceDirectory(), MIGRATION_TEST_TX + ".json");
  const physical = await realpath(project);
  const sourceBaseline = (await import("../dist/src/runtime/project-context-material.js"))
    .buildProjectContextBaseline(
      await (await import("../dist/src/runtime/project-context-material.js"))
        .readProjectContextManagedInputs(resolve(project, ".project-brain")), 2);
  const fenceRecord = {
    schemaVersion: 1, kind: "livariant-guardian-schema-migration-fence",
    stableProjectIdentity: staged.local.receipt.stableProjectIdentity,
    transactionId: MIGRATION_TEST_TX,
    authorizationOperationId: "88888888-8888-4888-8888-888888888888",
    protectedSourceRecordId: RECORD_ID,
    declaredPhysicalProjectRoot: physical,
    declaredPhysicalProjectBrainRoot: await realpath(resolve(project, ".project-brain")),
    sourceSchemaVersion: 2, targetSchemaVersion: 3,
    sourceBaselineDomain: sourceBaseline.domain,
    sourceBaselineSha256: sourceBaseline.digest,
    sourceProtectedIntegrityMaterialSha256: staged.material.materialSha256,
    proposedTargetDomain: protectedTransition.plan.proposedTarget.targetDigestDomain,
    proposedTargetSha256: protectedTransition.plan.proposedTarget.targetDigest,
    migrationIntentSha256: "f".repeat(64), phase: "armed", sequence: 0,
  };
  await writeFile(fenceSource, JSON.stringify(fenceRecord, null, 2) + "\n", "utf8");
  const semanticCandidate = parseSemanticProposalCandidate({
    schemaVersion: 1, domain: "project-decision", changeKind: "add",
    proposedStatement: "Keep migration authorization distinct from existing semantic changes",
    rationale: "Verify an existing mutation path cannot run across a schema migration fence",
    origin: "explicit-user",
  });
  const preparedSemantic = await buildActionableProposal(semanticCandidate, project);
  assert.equal(preparedSemantic.state, "actionable-proposal");
  if (preparedSemantic.state !== "actionable-proposal") throw new Error("Expected legacy schema-2 proposal fixture");
  createProtectedFenceDirectory();
  try {
    installProtectedRecord(fenceSource, fencePath);
    const blockedFence = await inspectProtectedProjectBrainIntegrity(project);
    assert.equal(blockedFence.state, "invalid", "protected migration fence must override healthy v2 integrity");
    assert.notEqual((await runProtectedDoctor(project)).state, "healthy");
    assert.equal((await buildProtectedProjectContextSnapshot(project)).safetyState, "blocked");
    assert.equal((await buildProtectedProviderContext("codex", "migration fence safety acceptance", project)).state, "blocked");
    await assert.rejects(buildProtectedResumeContext(project));
    // No local accepted-state receipt may be advanced before fenced integrity
    // is refused. Existing Semantic Authority cannot be issued or consumed
    // while an independently protected schema migration status is present.
    let localReceiptCommitAttempted = false;
    await assert.rejects(establishProtectedProjectBrainIntegrityState(project, "manual-bootstrap", {
      beforeCommit: () => { localReceiptCommitAttempted = true; },
    }), /migration.fence/i);
    assert.equal(localReceiptCommitAttempted, false);
    const semanticAuthorization = "99999999-9999-4999-8999-999999999999";
    await assert.rejects(issueSemanticGuardianAuthority(
      semanticAuthorization, preparedSemantic.proposal, project,
    ), /migration.fence/i);
    await assert.rejects(consumeSemanticGuardianAuthority(
      semanticAuthorization, preparedSemantic.proposal, project,
    ), /migration.fence/i);
  } finally {
    removeProtectedRecord(fencePath);
    removeProtectedFenceDirectory();
  }
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "match");
  assert.equal((await runProtectedDoctor(project)).state, "healthy");

  // Direct managed-byte mutation must be detected before any local receipt rewrite.
  const mutatedKnowledge = `${originalKnowledge.trimEnd()}\n\n## Confirmed project knowledge\n\n- same-user direct mutation attack\n`;
  await store.replaceKnowledgeDocument(originalKnowledge, mutatedKnowledge);
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "mismatch");
  assert.notEqual((await runProtectedDoctor(project)).state, "healthy");
  const rejectedTransition = await prepareProtectedKnowledgeSchemaTransition(project);
  assert.equal(rejectedTransition.state, "blocked");
  assert.equal(rejectedTransition.plan, null);
  assert.equal(rejectedTransition.writesPerformed, false);

  // S-03 attack: the same user can rewrite the local receipt to bless the new bytes,
  // but the protected Guardian still binds the original exact material. The forged
  // local receipt therefore must not restore protected accepted-state truth.
  await recordAcceptedProjectBrainState(project, "manual-bootstrap");
  assert.equal((await inspectProjectBrainIntegrity(project)).state, "match");
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "unprotected");
  assert.notEqual((await runProtectedDoctor(project)).state, "healthy");

  // Restore the exact previously protected bytes; exact material may become valid
  // again, because the persistent Guardian record is byte/location/identity bound.
  await store.replaceKnowledgeDocument(mutatedKnowledge, originalKnowledge);
  await recordAcceptedProjectBrainState(project, "manual-bootstrap");
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "match");
  assert.equal((await runProtectedDoctor(project)).state, "healthy");

  // Stable project identity substitution plus a freshly forged local receipt must
  // also fail because stable identity participates in the protected material digest.
  const substitutedMetadata = JSON.parse(originalMetadata);
  substitutedMetadata.projectBrain.projectId = randomUUID().toLowerCase();
  await writeFile(resolve(project, ".project-brain", "metadata.json"), `${JSON.stringify(substitutedMetadata, null, 2)}\n`, "utf8");
  await recordAcceptedProjectBrainState(project, "manual-bootstrap");
  assert.equal((await inspectProjectBrainIntegrity(project)).state, "match");
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "unprotected");
  assert.notEqual((await runProtectedDoctor(project)).state, "healthy");

  await writeFile(resolve(project, ".project-brain", "metadata.json"), originalMetadata, "utf8");
  await recordAcceptedProjectBrainState(project, "manual-bootstrap");
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "match");
  assert.equal((await runProtectedDoctor(project)).state, "healthy");

  // Copy exact Project Brain bytes to another physical project and forge its local
  // receipt. Physical path binding must prevent portability of the accepted state.
  await rm(resolve(copiedProject, ".project-brain"), { recursive: true, force: true });
  await cp(resolve(project, ".project-brain"), resolve(copiedProject, ".project-brain"), { recursive: true });
  await recordAcceptedProjectBrainState(copiedProject, "manual-bootstrap");
  assert.equal((await inspectProjectBrainIntegrity(copiedProject)).state, "match");
  assert.equal((await inspectProtectedProjectBrainIntegrity(copiedProject)).state, "unprotected");
  assert.notEqual((await runProtectedDoctor(copiedProject)).state, "healthy");

  // Guardian removal must fail closed and must not fall back to the still-matching
  // same-user local receipt.
  removeProtectedRecord(protectedRecordPath(RECORD_ID));
  assert.equal((await inspectProjectBrainIntegrity(project)).state, "match");
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "unprotected");
  assert.notEqual((await runProtectedDoctor(project)).state, "healthy");

  // Malformed protected state fails closed as invalid rather than being ignored in
  // favor of local evidence.
  const malformedSource = resolve(staging, `${MALFORMED_RECORD_ID}.json`);
  await writeFile(malformedSource, "{not-json\n", "utf8");
  installProtectedRecord(malformedSource, protectedRecordPath(MALFORMED_RECORD_ID));
  const malformed = await inspectProtectedProjectBrainIntegrity(project);
  assert.equal(malformed.state, "invalid");
  assert.notEqual((await runProtectedDoctor(project)).state, "healthy");

  // Actual installed, OS-protected writer. This quarantines only disposable CI
  // fixtures and intentionally leaves recovery artifacts for workflow teardown.
  // It never arms a migration, grants Authority or changes canonical documents.
  assert.equal(process.env.GITHUB_ACTIONS, "true", "Durable quarantine smoke requires the disposable GitHub Actions Guardian fixture");
  removeProtectedRecord(protectedRecordPath(MALFORMED_RECORD_ID));
  installProtectedRecord(resolve(staging, RECORD_ID + ".json"), protectedRecordPath(RECORD_ID));
  assert.equal((await runProtectedDoctor(project)).state, "healthy");
  const durableRequest = { ...fenceRecord, phase: "recovery-required", sequence: 1 };
  await bootstrap(unrelatedProject);
  const unrelated = await stageExactProtectedRecord(unrelatedProject, staging, unrelatedIntegrityId);
  assert.equal((await runProtectedDoctor(unrelatedProject)).state, "healthy");
  const durableRequestPath = resolve(staging, "deny-request.json");
  await writeFile(durableRequestPath, JSON.stringify(durableRequest) + "\n", "utf8");
  const armed = await invokeInstalledHelper(["arm-migration-fence", "--request", durableRequestPath]);
  assert.notEqual(armed.status, 0);
  assert.match(armed.stderr, /disabled|unproven/i);
  let created;
  // The snapshot is already being assembled when a separate privileged process
  // commits the denial. Its protected completion check must reject the result.
  const racingSnapshot = await buildProtectedProjectContextSnapshot(project, {
    beforeRevalidate: async () => {
      const attempts = await Promise.all([
        invokeInstalledHelper(["deny-migration-fence", "--request", durableRequestPath]),
        invokeInstalledHelper(["deny-migration-fence", "--request", durableRequestPath]),
      ]);
      assert.equal(attempts.filter(result => result.status === 0).length, 1, JSON.stringify(attempts));
      created = attempts.find(result => result.status === 0);
    },
  });
  assert.equal(racingSnapshot.safetyState, "blocked");
  assert.ok(created);
  const createdResult = JSON.parse(created.stdout);
  assert.equal(createdResult.state, "recovery-required");
  assert.equal(createdResult.armed, false);
  assert.equal(createdResult.migrationAuthorityIssued, false);
  assert.equal(createdResult.canonicalWritesPerformed, false);
  const records = resolve(protectedConsumerDirectory(), "..");
  const durableState = await inspectGuardianMigrationFenceStorage(records);
  assert.equal(durableState.activated, true);
  assert.equal(durableState.transactions.length, 1);
  assert.equal((await runProtectedDoctor(unrelatedProject)).state, "healthy", "Never-migrated project B remains readable");
  const unrelatedMaterial = buildGuardianAuthorityRequest({ consumer: "semantic-mutation", mode: "one-shot", materialFields: [
    { label: "stable-project-identity", value: unrelated.local.receipt.stableProjectIdentity },
    { label: "physical-project-root", value: await realpath(unrelatedProject) },
  ] });
  const unrelatedRecord = buildGuardianAuthorityRecord({ consumer: "semantic-mutation", mode: "one-shot",
    materialSha256: unrelatedMaterial.materialSha256, recordId: unrelatedConsumeId,
    expiresAt: new Date(Date.now() + 600000).toISOString() });
  const unrelatedSource = resolve(staging, "unrelated-authority.json");
  await writeFile(unrelatedSource, JSON.stringify(unrelatedRecord) + "\n");
  const semanticDirectory = resolve(protectedConsumerDirectory(), "..", "semantic-mutation");
  // Consumer directory is normally provisioned by issuance; provision this
  // fixture without minting any interactive Authority or changing a project.
  if (process.platform === "linux") {
    protectedCommand(spawnSync("/usr/bin/sudo", ["install", "-d", "-o", "root", "-g", "root", "-m", "0755", semanticDirectory], { encoding: "utf8", shell: false }), "provision unrelated Authority fixture directory");
  } else {
    protectedCommand(spawnSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "[void][System.IO.Directory]::CreateDirectory($env:LIVARIANT_TEST_FENCE_DIRECTORY)"], { encoding: "utf8", shell: false, windowsHide: true, env: { ...process.env, LIVARIANT_TEST_FENCE_DIRECTORY: semanticDirectory } }), "provision unrelated Authority fixture directory");
  }
  installProtectedRecord(unrelatedSource, resolve(semanticDirectory, unrelatedConsumeId + ".json"));
  const unrelatedRequestPath = resolve(staging, "unrelated-consume.json");
  await writeFile(unrelatedRequestPath, JSON.stringify(unrelatedMaterial.request) + "\n");
  const consumedB = await invokeInstalledHelper(["consume-authority", "--consumer", "semantic-mutation", "--record", unrelatedConsumeId,
    "--material", unrelatedMaterial.materialSha256, "--request", unrelatedRequestPath]);
  if (consumedB.status !== 0) fail("unrelated project B protected consumption", consumedB);
  assert.equal(JSON.parse(consumedB.stdout).authority.state, "consumed");
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "invalid");
  assert.notEqual((await runProtectedDoctor(project)).state, "healthy");
  assert.equal((await buildProtectedProjectContextSnapshot(project)).safetyState, "blocked");
  assert.equal((await buildProtectedProviderContext("codex", "Durable quarantine", project)).state, "blocked");
  await assert.rejects(buildProtectedResumeContext(project));
  assert.equal((await buildProtectedSemanticProposal(semanticCandidate, project)).state, "blocked");
  await assert.rejects(readDesktopProjectKnowledge(project), /blocked|protection/i);
  await assert.rejects(readDesktopProjectKnowledgeExplorer(project), /blocked|protection/i);
  await assert.rejects(applyActionableProposal(randomUUID(), preparedSemantic.proposal, project), /migration.fence/i);
  await assert.rejects(establishProtectedProjectBrainIntegrityState(project, "manual-bootstrap"), /migration.fence/i);
  await assert.rejects(issueSemanticGuardianAuthority(randomUUID(), preparedSemantic.proposal, project), /migration.fence/i);
  await assert.rejects(consumeSemanticGuardianAuthority(randomUUID(), preparedSemantic.proposal, project), /migration.fence/i);
  // A separate installed process cannot clear or promote this terminal denial.
  for (const command of ["complete-migration-fence", "clear-migration-fence"]) {
    assert.notEqual((await invokeInstalledHelper([command])).status, 0);
  }
  assert.equal(await readFile(resolve(project, ".project-brain", "metadata.json"), "utf8"), originalMetadata);
  assert.equal(await store.readKnowledgeDocument(), originalKnowledge);
  // Two privileged processes contend on the production transition lock. No
  // replay succeeds; a failed transition may conservatively retain its lock.
  const replays = await Promise.all([
    invokeInstalledHelper(["deny-migration-fence", "--request", durableRequestPath]),
    invokeInstalledHelper(["deny-migration-fence", "--request", durableRequestPath]),
  ]);
  assert.ok(replays.every(result => result.status !== 0));
  await assert.rejects(lstat(resolve(records, ".guardian-transition.lock")), { code: "ENOENT" }, "Known replay denial must not leave a global lock");
  // Simulate loss of the committed journal using explicit fixture-only admin
  // deletion. The inventory/anchor/lock must preserve denial after restart.
  removeProtectedRecord(resolve(records, "schema-migration-v1", durableRequest.transactionId + ".jsonl"));
  await assert.rejects(inspectGuardianMigrationFenceStorage(records), /journal|inventory|anchor|disagree|lost/i);
  assert.notEqual((await runProtectedDoctor(project)).state, "healthy");
  console.log("Durable deny-only fence: installed privileged writer, restart inspection, protected consumer denial, concurrent replay refusal and lost-journal fail-closed passed; productive arming and Windows power-loss proof remain disabled/unproven.");

  console.log("Protected Project Brain Integrity acceptance passed: exact Guardian acceptance enabled protected Context, Resume, Provider Context, and Doctor; direct mutation, forged local re-acceptance, stable-id substitution, physical copy, Guardian removal, and malformed protected state all failed closed.");
} finally {
  removeProtectedRecord(protectedRecordPath(RECORD_ID));
  removeProtectedRecord(protectedRecordPath(MALFORMED_RECORD_ID));
  removeProtectedRecord(protectedRecordPath(unrelatedIntegrityId));
  removeProtectedRecord(resolve(protectedConsumerDirectory(), "..", "semantic-mutation", unrelatedConsumeId + ".json"));
  await rm(project, { recursive: true, force: true });
  await rm(copiedProject, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
  await rm(unrelatedProject, { recursive: true, force: true });
}
