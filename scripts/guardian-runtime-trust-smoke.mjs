import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { buildGuardianAuthorityRecord } from "../dist/src/guardian/authority-record.js";
import { buildRuntimeTrustGuardianRequest } from "../dist/src/guardian/runtime-trust-authority.js";
import {
  activateInstalledRuntime,
  installTrustedRuntime,
  installVerifiedRuntime,
  readTrustedActiveRuntimePointer,
} from "../dist/src/distribution/runtime-installation.js";
import { initializeProject } from "../dist/src/runtime/index-core.js";

const VERSION = "9.9.7-c03-acceptance";
const CHANNEL = "preview";
const SOURCE_ID = "c03-protected-acceptance-source";
const ARTIFACT_ID = "runtime-node-cli";
const EXACT_RECORD_ID = "77777777-7777-4777-8777-777777777777";
const DUPLICATE_RECORD_ID = "88888888-8888-4888-8888-888888888888";
const MALFORMED_RECORD_ID = "99999999-9999-4999-8999-999999999999";
const WRONG_CONSUMER_RECORD_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function fail(command, result) {
  const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
  throw new Error(`${command} failed: ${String(detail).trim()}`);
}

function protectedConsumerDirectory() {
  if (process.platform === "linux") return "/var/lib/livariant-guardian/v1/records/runtime-trust";
  if (process.platform === "win32") return "C:\\ProgramData\\Livariant\\Guardian\\v1\\records\\runtime-trust";
  throw new Error("Protected Runtime Trust smoke supports Linux and Windows only.");
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
    if (result.error || result.status !== 0) fail("sudo install protected Runtime Trust Authority", result);
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
    if (result.error || result.status !== 0) fail("install protected Runtime Trust Authority on Windows", result);
    return;
  }
  throw new Error("unsupported platform");
}

function removeProtectedRecord(destination) {
  if (process.platform === "linux") {
    const result = spawnSync("/usr/bin/sudo", ["rm", "-f", destination], { encoding: "utf8", shell: false });
    if (result.error || result.status !== 0) fail("sudo remove protected Runtime Trust Authority", result);
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
    if (result.error || result.status !== 0) fail("remove protected Runtime Trust Authority on Windows", result);
    return;
  }
  throw new Error("unsupported platform");
}

function npmPack(packageRoot, packRoot) {
  const args = ["pack", "--json", "--pack-destination", packRoot];
  const result = process.platform === "win32"
    ? spawnSync(
        process.execPath,
        [resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args],
        { cwd: packageRoot, encoding: "utf8", shell: false },
      )
    : spawnSync("npm", args, { cwd: packageRoot, encoding: "utf8", shell: false });
  if (result.error || result.status !== 0) fail("npm pack C-03 Runtime fixture", result);
  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed) || typeof parsed[0]?.filename !== "string") throw new Error("npm pack did not return a Runtime artifact filename.");
  return resolve(packRoot, parsed[0].filename);
}

async function createRuntimeArtifact(root, markerPath) {
  const packageRoot = resolve(root, "package");
  const packRoot = resolve(root, "pack");
  const cliPath = resolve(packageRoot, "dist", "src", "cli", "index.js");
  await mkdir(resolve(cliPath, ".."), { recursive: true });
  await mkdir(packRoot, { recursive: true });
  await writeFile(resolve(packageRoot, "package.json"), `${JSON.stringify({
    name: "livariant",
    version: VERSION,
    type: "module",
    bin: { livariant: "./dist/src/cli/index.js" },
    files: ["dist/src"],
  }, null, 2)}\n`, "utf8");
  await writeFile(cliPath, [
    'import { writeFileSync } from "node:fs";',
    `writeFileSync(${JSON.stringify(markerPath)}, "executed\\n", { flag: "a" });`,
    `console.log(JSON.stringify({ frameworkVersion: ${JSON.stringify(VERSION)}, runtime: "node", channel: ${JSON.stringify(CHANNEL)} }));`,
    "",
  ].join("\n"), "utf8");
  const artifactPath = npmPack(packageRoot, packRoot);
  const sha256 = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
  return { artifactPath, sha256 };
}

async function provisionLegacyReleaseAuthorization(artifactSha256) {
  const root = resolve(userInfo().homedir, ".livariant", "trust", "release-authorizations");
  await mkdir(root, { recursive: true });
  const path = resolve(root, `${artifactSha256}.json`);
  await writeFile(path, `${JSON.stringify({
    schema: 1,
    packageName: "livariant",
    kind: "artifact-digest-authorization",
    artifactSha256,
  }, null, 2)}\n`, "utf8");
  return path;
}

async function stageRuntimeAuthority(project, installed, staging, recordId = EXACT_RECORD_ID) {
  const evidence = JSON.parse(await readFile(resolve(installed.installRoot, ".release-evidence.json"), "utf8"));
  const physicalProjectRoot = await realpath(project);
  const physicalInstallRoot = await realpath(installed.installRoot);
  const physicalPackageRoot = await realpath(resolve(installed.installRoot, "node_modules", "livariant"));
  const physicalCliPath = await realpath(installed.cliPath);
  const material = buildRuntimeTrustGuardianRequest({
    runtimeTrustSchemaVersion: 1,
    packageName: "livariant",
    version: evidence.version,
    channel: evidence.channel,
    sourceId: evidence.sourceId,
    artifactId: evidence.artifactId,
    artifactSha256: evidence.artifactSha256,
    packageTreeSha256: evidence.packageTreeSha256,
    physicalProjectRoot,
    physicalInstallRoot,
    physicalPackageRoot,
    physicalCliPath,
  });
  const record = buildGuardianAuthorityRecord({
    consumer: "runtime-trust",
    mode: "persistent",
    materialSha256: material.materialSha256,
    recordId,
  });
  const source = resolve(staging, `${recordId}.json`);
  await writeFile(source, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  installProtectedRecord(source, protectedRecordPath(recordId));
  return { evidence, material, record };
}

async function markerCount(markerPath) {
  try {
    return (await readFile(markerPath, "utf8")).split("\n").filter(Boolean).length;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return 0;
    throw error;
  }
}

const project = await mkdtemp(resolve(tmpdir(), "livariant-c03-runtime-project-"));
const copyParent = await mkdtemp(resolve(tmpdir(), "livariant-c03-runtime-copy-parent-"));
const staging = await mkdtemp(resolve(tmpdir(), "livariant-c03-runtime-records-"));
const fixtureRoot = await mkdtemp(resolve(tmpdir(), "livariant-c03-runtime-artifact-"));
const markerPath = resolve(project, "RUNTIME-EXECUTED.txt");
let releaseAuthorizationPath;
try {
  await initializeProject(project, { authorized: true });
  const fixture = await createRuntimeArtifact(fixtureRoot, markerPath);
  releaseAuthorizationPath = await provisionLegacyReleaseAuthorization(fixture.sha256);

  const identity = {
    version: VERSION,
    channel: CHANNEL,
    sourceId: SOURCE_ID,
    artifactId: ARTIFACT_ID,
    artifactSha256: fixture.sha256,
  };
  const artifact = {
    sourceId: SOURCE_ID,
    releaseVersion: VERSION,
    artifactId: ARTIFACT_ID,
    path: fixture.artifactPath,
  };
  const trustedSources = new Set([SOURCE_ID]);

  // Preparation may install and inspect exact bytes, but must not execute them.
  const prepared = await installVerifiedRuntime(project, identity, artifact, trustedSources);
  assert.equal(await markerCount(markerPath), 0);
  await activateInstalledRuntime(project, prepared);
  await assert.rejects(() => readTrustedActiveRuntimePointer(project), /Guardian|protected.*Runtime trust|not trusted/i);
  assert.equal(await markerCount(markerPath), 0);

  // CI externally provisions the exact protected persistent record because headless
  // CI cannot perform the real interactive privilege transition.
  const staged = await stageRuntimeAuthority(project, prepared, staging);
  assert.equal(staged.record.consumer, "runtime-trust");
  assert.equal(staged.record.mode, "persistent");

  // Reusing the prepared exact tree through the protected path must now attest it,
  // proving candidate Runtime code executes only after exact Guardian trust exists.
  const trusted = await installTrustedRuntime(project, identity, artifact, trustedSources);
  assert.equal(trusted.installRoot, prepared.installRoot);
  assert.equal(await markerCount(markerPath), 1);
  await activateInstalledRuntime(project, trusted);
  const trustedPointer = await readTrustedActiveRuntimePointer(project);
  assert.equal(trustedPointer?.version, VERSION);
  assert.equal(await markerCount(markerPath), 2);

  // Package-tree drift invalidates both release evidence and protected execution.
  const cliBytes = await readFile(trusted.cliPath);
  await writeFile(trusted.cliPath, Buffer.concat([cliBytes, Buffer.from("\n// drift\n")]));
  const beforeDriftAttempt = await markerCount(markerPath);
  await assert.rejects(() => readTrustedActiveRuntimePointer(project), /package tree integrity mismatch/i);
  assert.equal(await markerCount(markerPath), beforeDriftAttempt);
  await writeFile(trusted.cliPath, cliBytes);
  await readTrustedActiveRuntimePointer(project);
  assert.equal(await markerCount(markerPath), beforeDriftAttempt + 1);

  // Exact bytes copied to another physical project/location cannot reuse Authority.
  const copiedProject = resolve(copyParent, "copied-project");
  await cp(project, copiedProject, { recursive: true });
  const beforeCopyAttempt = await markerCount(markerPath);
  await assert.rejects(() => readTrustedActiveRuntimePointer(copiedProject), /Guardian|protected.*Runtime trust|not trusted/i);
  assert.equal(await markerCount(markerPath), beforeCopyAttempt);

  // Duplicate exact protected records are ambiguous and fail closed.
  await stageRuntimeAuthority(project, trusted, staging, DUPLICATE_RECORD_ID);
  const beforeDuplicateAttempt = await markerCount(markerPath);
  await assert.rejects(() => readTrustedActiveRuntimePointer(project), /multiple active Guardian Authority records|ambiguous Authority/i);
  assert.equal(await markerCount(markerPath), beforeDuplicateAttempt);
  removeProtectedRecord(protectedRecordPath(DUPLICATE_RECORD_ID));

  // Removing Guardian truth must never fall back to historical same-user trust.
  removeProtectedRecord(protectedRecordPath(EXACT_RECORD_ID));
  const legacyTrustRoot = resolve(userInfo().homedir, ".livariant", "trust", "runtimes");
  await mkdir(legacyTrustRoot, { recursive: true });
  const legacyKey = createHash("sha256").update([
    staged.evidence.version,
    staged.evidence.channel,
    staged.evidence.sourceId,
    staged.evidence.artifactId,
    staged.evidence.artifactSha256,
    staged.evidence.packageTreeSha256,
  ].join("\0")).digest("hex");
  await writeFile(resolve(legacyTrustRoot, `${legacyKey}.json`), `${JSON.stringify({
    schema: 1,
    packageName: "livariant",
    ...staged.evidence,
  }, null, 2)}\n`, "utf8");
  const beforeLegacyAttempt = await markerCount(markerPath);
  await assert.rejects(() => readTrustedActiveRuntimePointer(project), /Guardian|protected.*Runtime trust|not trusted/i);
  assert.equal(await markerCount(markerPath), beforeLegacyAttempt);

  // Malformed protected state fails closed rather than being ignored.
  const malformedSource = resolve(staging, `${MALFORMED_RECORD_ID}.json`);
  await writeFile(malformedSource, "{not-json\n", "utf8");
  installProtectedRecord(malformedSource, protectedRecordPath(MALFORMED_RECORD_ID));
  await assert.rejects(() => readTrustedActiveRuntimePointer(project), /malformed JSON/i);
  removeProtectedRecord(protectedRecordPath(MALFORMED_RECORD_ID));

  // A record stored under runtime-trust but declaring a different consumer is
  // cross-consumer confusion and must be rejected before it can become Authority.
  const wrongConsumer = buildGuardianAuthorityRecord({
    consumer: "project-brain-integrity",
    mode: "persistent",
    materialSha256: staged.material.materialSha256,
    recordId: WRONG_CONSUMER_RECORD_ID,
  });
  const wrongConsumerSource = resolve(staging, `${WRONG_CONSUMER_RECORD_ID}.json`);
  await writeFile(wrongConsumerSource, `${JSON.stringify(wrongConsumer, null, 2)}\n`, "utf8");
  installProtectedRecord(wrongConsumerSource, protectedRecordPath(WRONG_CONSUMER_RECORD_ID));
  await assert.rejects(() => readTrustedActiveRuntimePointer(project), /wrong consumer namespace/i);
  removeProtectedRecord(protectedRecordPath(WRONG_CONSUMER_RECORD_ID));

  console.log("Protected Runtime Trust acceptance passed: preparation stayed non-executable; exact protected Guardian trust enabled Runtime attestation/execution; package-tree drift, physical project/location substitution, duplicate Authority, Guardian removal with forged legacy trust, malformed protected state, and cross-consumer confusion all failed closed.");
} finally {
  for (const recordId of [EXACT_RECORD_ID, DUPLICATE_RECORD_ID, MALFORMED_RECORD_ID, WRONG_CONSUMER_RECORD_ID]) {
    removeProtectedRecord(protectedRecordPath(recordId));
  }
  if (releaseAuthorizationPath) await rm(releaseAuthorizationPath, { force: true });
  await rm(project, { recursive: true, force: true });
  await rm(copyParent, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
  await rm(fixtureRoot, { recursive: true, force: true });
}
