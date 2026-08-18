import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { buildGuardianAuthorityRecord } from "../dist/src/guardian/authority-record.js";
import { buildProjectBrainIntegrityGuardianRequest } from "../dist/src/guardian/project-brain-integrity-authority.js";
import { ProjectBrainStore } from "../dist/src/project-brain/store.js";
import {
  inspectProjectBrainIntegrity,
  recordAcceptedProjectBrainState,
} from "../dist/src/project-brain/integrity.js";
import { inspectProtectedProjectBrainIntegrity } from "../dist/src/project-brain/protected-integrity.js";
import { FRAMEWORK_VERSION } from "../dist/src/lifecycle/state.js";

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

async function stageExactProtectedRecord(project, staging) {
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
    recordId: RECORD_ID,
  });
  const source = resolve(staging, `${RECORD_ID}.json`);
  await writeFile(source, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  installProtectedRecord(source, protectedRecordPath(RECORD_ID));
  return { local, material, record };
}

const project = await mkdtemp(resolve(tmpdir(), "livariant-guardian-integrity-smoke-"));
const copiedProject = await mkdtemp(resolve(tmpdir(), "livariant-guardian-integrity-copy-"));
const staging = await mkdtemp(resolve(tmpdir(), "livariant-guardian-integrity-record-"));
try {
  const store = await bootstrap(project);
  const originalMetadata = await readFile(resolve(project, ".project-brain", "metadata.json"), "utf8");
  const originalKnowledge = await store.readKnowledgeDocument();
  await stageExactProtectedRecord(project, staging);

  const protectedMatch = await inspectProtectedProjectBrainIntegrity(project);
  assert.equal(protectedMatch.state, "match");
  if (protectedMatch.state !== "match") throw new Error("expected protected integrity match");
  assert.equal(protectedMatch.guardian.recordId, RECORD_ID);

  // Direct managed-byte mutation must be detected before any local receipt rewrite.
  const mutatedKnowledge = `${originalKnowledge.trimEnd()}\n\n## Confirmed project knowledge\n\n- same-user direct mutation attack\n`;
  await store.replaceKnowledgeDocument(originalKnowledge, mutatedKnowledge);
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "mismatch");

  // S-03 attack: the same user can rewrite the local receipt to bless the new bytes,
  // but the protected Guardian still binds the original exact material. The forged
  // local receipt therefore must not restore protected accepted-state truth.
  await recordAcceptedProjectBrainState(project, "manual-bootstrap");
  assert.equal((await inspectProjectBrainIntegrity(project)).state, "match");
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "unprotected");

  // Restore the exact previously protected bytes; exact material may become valid
  // again, because the persistent Guardian record is byte/location/identity bound.
  await store.replaceKnowledgeDocument(mutatedKnowledge, originalKnowledge);
  await recordAcceptedProjectBrainState(project, "manual-bootstrap");
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "match");

  // Stable project identity substitution plus a freshly forged local receipt must
  // also fail because stable identity participates in the protected material digest.
  const substitutedMetadata = JSON.parse(originalMetadata);
  substitutedMetadata.projectBrain.projectId = randomUUID().toLowerCase();
  await writeFile(resolve(project, ".project-brain", "metadata.json"), `${JSON.stringify(substitutedMetadata, null, 2)}\n`, "utf8");
  await recordAcceptedProjectBrainState(project, "manual-bootstrap");
  assert.equal((await inspectProjectBrainIntegrity(project)).state, "match");
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "unprotected");

  await writeFile(resolve(project, ".project-brain", "metadata.json"), originalMetadata, "utf8");
  await recordAcceptedProjectBrainState(project, "manual-bootstrap");
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "match");

  // Copy exact Project Brain bytes to another physical project and forge its local
  // receipt. Physical path binding must prevent portability of the accepted state.
  await rm(resolve(copiedProject, ".project-brain"), { recursive: true, force: true });
  await cp(resolve(project, ".project-brain"), resolve(copiedProject, ".project-brain"), { recursive: true });
  await recordAcceptedProjectBrainState(copiedProject, "manual-bootstrap");
  assert.equal((await inspectProjectBrainIntegrity(copiedProject)).state, "match");
  assert.equal((await inspectProtectedProjectBrainIntegrity(copiedProject)).state, "unprotected");

  // Guardian removal must fail closed and must not fall back to the still-matching
  // same-user local receipt.
  removeProtectedRecord(protectedRecordPath(RECORD_ID));
  assert.equal((await inspectProjectBrainIntegrity(project)).state, "match");
  assert.equal((await inspectProtectedProjectBrainIntegrity(project)).state, "unprotected");

  // Malformed protected state fails closed as invalid rather than being ignored in
  // favor of local evidence.
  const malformedSource = resolve(staging, `${MALFORMED_RECORD_ID}.json`);
  await writeFile(malformedSource, "{not-json\n", "utf8");
  installProtectedRecord(malformedSource, protectedRecordPath(MALFORMED_RECORD_ID));
  const malformed = await inspectProtectedProjectBrainIntegrity(project);
  assert.equal(malformed.state, "invalid");

  console.log("Protected Project Brain Integrity acceptance passed: exact protected state matched; direct mutation, forged local re-acceptance, stable-id substitution, physical copy, Guardian removal, and malformed protected state all failed closed.");
} finally {
  removeProtectedRecord(protectedRecordPath(RECORD_ID));
  removeProtectedRecord(protectedRecordPath(MALFORMED_RECORD_ID));
  await rm(project, { recursive: true, force: true });
  await rm(copiedProject, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
}
