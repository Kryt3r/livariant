import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import {
  buildGuardianAuthorityRecord,
  consumeGuardianAuthorityRecord,
} from "../dist/src/guardian/authority-record.js";
import {
  findMatchingActiveGuardianAuthority,
  findMatchingConsumedGuardianAuthority,
} from "../dist/src/guardian/authority-client.js";
import { buildReleaseAuthorizationGuardianRequest } from "../dist/src/guardian/release-authorization-authority.js";
import { ensureReleaseAuthorizationGuardianAuthority } from "../dist/src/guardian/release-authorization-authority-transition.js";

const EXACT_ID = "11111111-1111-4111-8111-111111111111";
const DUPLICATE_ID = "22222222-2222-4222-8222-222222222222";
const EXPIRED_ID = "33333333-3333-4333-8333-333333333333";
const MALFORMED_ID = "44444444-4444-4444-8444-444444444444";
const WRONG_CONSUMER_ID = "55555555-5555-4555-8555-555555555555";

function fail(command, result) {
  const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
  throw new Error(`${command} failed: ${String(detail).trim()}`);
}

function consumerDirectory() {
  if (process.platform === "linux") return "/var/lib/livariant-guardian/v1/records/release-authorization";
  if (process.platform === "win32") return "C:\\ProgramData\\Livariant\\Guardian\\v1\\records\\release-authorization";
  throw new Error("C-04 protected acceptance supports Linux and Windows only.");
}

function recordPath(recordId) {
  return resolve(consumerDirectory(), `${recordId}.json`);
}

function installProtectedFile(source, destination) {
  if (process.platform === "linux") {
    const result = spawnSync("/usr/bin/sudo", ["install", "-o", "root", "-g", "root", "-m", "0444", source, destination], {
      encoding: "utf8",
      shell: false,
    });
    if (result.error || result.status !== 0) fail("install protected C-04 record", result);
    return;
  }
  const result = spawnSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "$ErrorActionPreference='Stop'; Copy-Item -LiteralPath $env:LIVARIANT_SOURCE -Destination $env:LIVARIANT_DEST -Force; $acl=[System.IO.File]::GetAccessControl($env:LIVARIANT_DEST); $acl.SetOwner((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544'))); $acl.SetAccessRuleProtection($true,$false); $acl.Access | ForEach-Object { [void]$acl.RemoveAccessRule($_) }; $allow=[System.Security.AccessControl.AccessControlType]::Allow; $none=[System.Security.AccessControl.InheritanceFlags]::None; $prop=[System.Security.AccessControl.PropagationFlags]::None; $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')),'FullControl',$none,$prop,$allow))); $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')),'FullControl',$none,$prop,$allow))); $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule((New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-545')),'ReadAndExecute',$none,$prop,$allow))); [System.IO.File]::SetAccessControl($env:LIVARIANT_DEST,$acl)",
  ], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: { ...process.env, LIVARIANT_SOURCE: source, LIVARIANT_DEST: destination },
  });
  if (result.error || result.status !== 0) fail("install protected C-04 record on Windows", result);
}

function removeProtectedFile(destination) {
  if (process.platform === "linux") {
    const result = spawnSync("/usr/bin/sudo", ["rm", "-f", destination], { encoding: "utf8", shell: false });
    if (result.error || result.status !== 0) fail("remove protected C-04 record", result);
    return;
  }
  const result = spawnSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "$ErrorActionPreference='Stop'; if (Test-Path -LiteralPath $env:LIVARIANT_DEST) { Remove-Item -LiteralPath $env:LIVARIANT_DEST -Force }",
  ], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: { ...process.env, LIVARIANT_DEST: destination },
  });
  if (result.error || result.status !== 0) fail("remove protected C-04 record on Windows", result);
}

async function stageRecord(staging, record, suffix = "") {
  const source = resolve(staging, `${record.recordId}${suffix}.json`);
  await writeFile(source, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  installProtectedFile(source, recordPath(record.recordId));
}

async function stageMalformed(staging) {
  const source = resolve(staging, `${MALFORMED_ID}.json`);
  await writeFile(source, "{not-json\n", "utf8");
  installProtectedFile(source, recordPath(MALFORMED_ID));
}

function releaseMaterial(projectRoot, overrides = {}) {
  return {
    releaseAuthorizationSchemaVersion: 1,
    packageName: "livariant",
    version: "9.9.9-c04-acceptance",
    channel: "preview",
    sourceId: "c04-acceptance-source",
    artifactId: "runtime-node-cli",
    artifactSha256: createHash("sha256").update("c04-exact-artifact").digest("hex"),
    physicalProjectRoot: projectRoot,
    ...overrides,
  };
}

function releaseIdentity(material) {
  return {
    version: material.version,
    channel: material.channel,
    sourceId: material.sourceId,
    artifactId: material.artifactId,
    artifactSha256: material.artifactSha256,
  };
}

function activeRecord(materialSha256, recordId = EXACT_ID, issuedAt = new Date()) {
  return buildGuardianAuthorityRecord({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256,
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + 10 * 60 * 1000).toISOString(),
    recordId,
  });
}

async function writeLegacyEvidence(digest) {
  const directory = resolve(userInfo().homedir, ".livariant", "trust", "release-authorizations");
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `${digest}.json`);
  await writeFile(path, `${JSON.stringify({
    schema: 1,
    packageName: "livariant",
    kind: "artifact-digest-authorization",
    artifactSha256: digest,
  }, null, 2)}\n`, "utf8");
  return path;
}

const project = await mkdtemp(resolve(tmpdir(), "livariant-c04-project-"));
const otherProject = await mkdtemp(resolve(tmpdir(), "livariant-c04-other-project-"));
const staging = await mkdtemp(resolve(tmpdir(), "livariant-c04-records-"));
let legacyPath;
try {
  const physicalProject = await realpath(project);
  const physicalOtherProject = await realpath(otherProject);
  const exactMaterial = releaseMaterial(physicalProject);
  const exact = buildReleaseAuthorizationGuardianRequest(exactMaterial);
  legacyPath = await writeLegacyEvidence(exactMaterial.artifactSha256);

  const exactRecord = activeRecord(exact.materialSha256);
  await stageRecord(staging, exactRecord);
  const matched = await findMatchingActiveGuardianAuthority({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256: exact.materialSha256,
    projectPath: project,
  });
  assert.equal(matched?.recordId, EXACT_ID);

  // Interrupted issue-before-consume retry reuses only the already protected,
  // active, exact one-shot. It must not attempt duplicate issuance or invent new Authority.
  const retry = await ensureReleaseAuthorizationGuardianAuthority(releaseIdentity(exactMaterial), project);
  assert.equal(retry.reused, true);
  assert.equal(retry.record.recordId, EXACT_ID);
  assert.equal(retry.record.materialSha256, exact.materialSha256);

  const substitutions = [
    { version: "9.9.10-c04-acceptance" },
    { channel: "stable" },
    { sourceId: "other-source" },
    { artifactId: "other-artifact" },
    { artifactSha256: createHash("sha256").update("other-bytes").digest("hex") },
    { physicalProjectRoot: physicalOtherProject },
  ];
  for (const substitution of substitutions) {
    const variant = buildReleaseAuthorizationGuardianRequest(releaseMaterial(physicalProject, substitution));
    assert.notEqual(variant.materialSha256, exact.materialSha256);
    assert.equal(await findMatchingActiveGuardianAuthority({
      consumer: "release-authorization",
      mode: "one-shot",
      materialSha256: variant.materialSha256,
      projectPath: project,
    }), null);
  }

  const consumedAt = new Date(Date.parse(exactRecord.issuedAt) + 1000).toISOString();
  const consumedRecord = consumeGuardianAuthorityRecord(exactRecord, consumedAt);
  await stageRecord(staging, consumedRecord, ".consumed");
  assert.equal(await findMatchingActiveGuardianAuthority({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256: exact.materialSha256,
    projectPath: project,
  }), null);
  const consumed = await findMatchingConsumedGuardianAuthority({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256: exact.materialSha256,
    projectPath: project,
  });
  assert.equal(consumed?.recordId, EXACT_ID);
  assert.equal(consumed?.state, "consumed");

  assert.equal(await findMatchingActiveGuardianAuthority({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256: exact.materialSha256,
    projectPath: project,
  }), null);

  removeProtectedFile(recordPath(EXACT_ID));
  const expiredIssued = new Date(Date.now() - 20 * 60 * 1000);
  const expired = buildGuardianAuthorityRecord({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256: exact.materialSha256,
    issuedAt: expiredIssued.toISOString(),
    expiresAt: new Date(expiredIssued.getTime() + 5 * 60 * 1000).toISOString(),
    recordId: EXPIRED_ID,
  });
  await stageRecord(staging, expired);
  assert.equal(await findMatchingActiveGuardianAuthority({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256: exact.materialSha256,
    projectPath: project,
  }), null);
  removeProtectedFile(recordPath(EXPIRED_ID));

  await stageRecord(staging, activeRecord(exact.materialSha256, EXACT_ID));
  await stageRecord(staging, activeRecord(exact.materialSha256, DUPLICATE_ID));
  await assert.rejects(
    () => findMatchingActiveGuardianAuthority({
      consumer: "release-authorization",
      mode: "one-shot",
      materialSha256: exact.materialSha256,
      projectPath: project,
    }),
    /Multiple active Guardian Authority records|ambiguous Authority/i,
  );
  removeProtectedFile(recordPath(EXACT_ID));
  removeProtectedFile(recordPath(DUPLICATE_ID));

  await stageMalformed(staging);
  await assert.rejects(
    () => findMatchingActiveGuardianAuthority({
      consumer: "release-authorization",
      mode: "one-shot",
      materialSha256: exact.materialSha256,
      projectPath: project,
    }),
    /malformed JSON/i,
  );
  removeProtectedFile(recordPath(MALFORMED_ID));

  const wrongConsumer = buildGuardianAuthorityRecord({
    consumer: "runtime-trust",
    mode: "persistent",
    materialSha256: exact.materialSha256,
    recordId: WRONG_CONSUMER_ID,
  });
  await stageRecord(staging, wrongConsumer);
  await assert.rejects(
    () => findMatchingActiveGuardianAuthority({
      consumer: "release-authorization",
      mode: "one-shot",
      materialSha256: exact.materialSha256,
      projectPath: project,
    }),
    /wrong consumer namespace/i,
  );
  removeProtectedFile(recordPath(WRONG_CONSUMER_ID));

  assert.equal(await findMatchingActiveGuardianAuthority({
    consumer: "release-authorization",
    mode: "one-shot",
    materialSha256: exact.materialSha256,
    projectPath: project,
  }), null);
  assert.equal((await readFile(legacyPath, "utf8")).includes(exactMaterial.artifactSha256), true);

  console.log("Protected C-04 acceptance passed: exact one-shot Authority was project/candidate bound; interrupted exact retries reused only protected active Authority; protected consumed state was non-replayable; expiry, substitution, duplicates, malformed state, cross-consumer confusion, and forged same-user legacy evidence all failed closed.");
} finally {
  for (const id of [EXACT_ID, DUPLICATE_ID, EXPIRED_ID, MALFORMED_ID, WRONG_CONSUMER_ID]) {
    removeProtectedFile(recordPath(id));
  }
  if (legacyPath) await rm(legacyPath, { force: true });
  await rm(project, { recursive: true, force: true });
  await rm(otherProject, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
}
