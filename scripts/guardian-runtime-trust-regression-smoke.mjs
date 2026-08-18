import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { buildGuardianAuthorityRecord } from "../dist/src/guardian/authority-record.js";
import { buildRuntimeTrustGuardianRequest } from "../dist/src/guardian/runtime-trust-authority.js";
import {
  activateInstalledRuntime,
  installTrustedRuntime,
  installVerifiedRuntime,
  readTrustedActiveRuntimePointer,
} from "../dist/src/distribution/runtime-installation.js";
import { initializeProject } from "../dist/src/runtime/index-core.js";

const VERSION = "9.9.8-c03-regression";
const CHANNEL = "preview";
const SOURCE_ID = "c03-regression-source";
const ARTIFACT_ID = "runtime-node-cli";
const RECORD_ID = "77777777-7777-4777-8777-777777777777";

function fail(command, result) {
  const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
  throw new Error(`${command} failed: ${String(detail).trim()}`);
}

function protectedDirectory() {
  if (process.platform === "linux") return "/var/lib/livariant-guardian/v1/records/runtime-trust";
  if (process.platform === "win32") return "C:\\ProgramData\\Livariant\\Guardian\\v1\\records\\runtime-trust";
  throw new Error("C-03 regression supports Linux and Windows only.");
}

function protectedRecordPath() {
  return resolve(protectedDirectory(), `${RECORD_ID}.json`);
}

function installProtectedRecord(source) {
  const destination = protectedRecordPath();
  if (process.platform === "linux") {
    const result = spawnSync("/usr/bin/sudo", ["install", "-o", "root", "-g", "root", "-m", "0444", source, destination], {
      encoding: "utf8",
      shell: false,
    });
    if (result.error || result.status !== 0) fail("install protected Runtime Trust record", result);
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
  if (result.error || result.status !== 0) fail("install protected Runtime Trust record on Windows", result);
}

function removeProtectedRecord() {
  const destination = protectedRecordPath();
  if (process.platform === "linux") {
    const result = spawnSync("/usr/bin/sudo", ["rm", "-f", destination], { encoding: "utf8", shell: false });
    if (result.error || result.status !== 0) fail("remove protected Runtime Trust record", result);
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
  if (result.error || result.status !== 0) fail("remove protected Runtime Trust record on Windows", result);
}

function npmPack(packageRoot, packRoot) {
  const args = ["pack", "--json", "--pack-destination", packRoot];
  const result = process.platform === "win32"
    ? spawnSync(process.execPath, [resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args], { cwd: packageRoot, encoding: "utf8", shell: false })
    : spawnSync("npm", args, { cwd: packageRoot, encoding: "utf8", shell: false });
  if (result.error || result.status !== 0) fail("npm pack C-03 regression fixture", result);
  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed) || typeof parsed[0]?.filename !== "string") throw new Error("npm pack did not return an artifact filename.");
  return resolve(packRoot, parsed[0].filename);
}

async function createArtifact(root, markerPath) {
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
    `console.log(JSON.stringify({ frameworkVersion: ${JSON.stringify(VERSION)} }));`,
    "",
  ].join("\n"), "utf8");
  const artifactPath = npmPack(packageRoot, packRoot);
  const sha256 = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
  return { artifactPath, sha256 };
}

async function markerCount(path) {
  try {
    return (await readFile(path, "utf8")).split("\n").filter(Boolean).length;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return 0;
    throw error;
  }
}

async function stageRuntimeTrust(project, installed, staging) {
  const evidence = JSON.parse(await readFile(resolve(installed.installRoot, ".release-evidence.json"), "utf8"));
  const material = buildRuntimeTrustGuardianRequest({
    runtimeTrustSchemaVersion: 1,
    packageName: "livariant",
    version: evidence.version,
    channel: evidence.channel,
    sourceId: evidence.sourceId,
    artifactId: evidence.artifactId,
    artifactSha256: evidence.artifactSha256,
    packageTreeSha256: evidence.packageTreeSha256,
    physicalProjectRoot: await realpath(project),
    physicalInstallRoot: await realpath(installed.installRoot),
    physicalPackageRoot: await realpath(resolve(installed.installRoot, "node_modules", "livariant")),
    physicalCliPath: await realpath(installed.cliPath),
  });
  const record = buildGuardianAuthorityRecord({
    consumer: "runtime-trust",
    mode: "persistent",
    materialSha256: material.materialSha256,
    recordId: RECORD_ID,
  });
  const source = resolve(staging, `${RECORD_ID}.json`);
  await writeFile(source, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  installProtectedRecord(source);
}

const project = await mkdtemp(resolve(tmpdir(), "livariant-c03-regression-project-"));
const staging = await mkdtemp(resolve(tmpdir(), "livariant-c03-regression-record-"));
const fixtureRoot = await mkdtemp(resolve(tmpdir(), "livariant-c03-regression-artifact-"));
const markerPath = resolve(project, "RUNTIME-EXECUTED.txt");
try {
  await initializeProject(project, { authorized: true });
  const fixture = await createArtifact(fixtureRoot, markerPath);
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

  // This low-level mechanic is intentionally non-authoritative and is used here
  // only to isolate the already-accepted C-03 execution boundary from C-04.
  const prepared = await installVerifiedRuntime(project, identity, artifact, trustedSources);
  assert.equal(await markerCount(markerPath), 0);
  await activateInstalledRuntime(project, prepared);
  await assert.rejects(() => readTrustedActiveRuntimePointer(project), /Guardian|protected.*Runtime trust|not trusted/i);
  assert.equal(await markerCount(markerPath), 0);

  await stageRuntimeTrust(project, prepared, staging);
  const trusted = await installTrustedRuntime(project, identity, artifact, trustedSources);
  assert.equal(await markerCount(markerPath), 1);
  await activateInstalledRuntime(project, trusted);
  assert.equal((await readTrustedActiveRuntimePointer(project))?.version, VERSION);
  assert.equal(await markerCount(markerPath), 2);

  const originalCli = await readFile(trusted.cliPath);
  await writeFile(trusted.cliPath, Buffer.concat([originalCli, Buffer.from("\n// drift\n")]));
  const beforeDrift = await markerCount(markerPath);
  await assert.rejects(() => readTrustedActiveRuntimePointer(project), /package tree integrity mismatch/i);
  assert.equal(await markerCount(markerPath), beforeDrift);
  await writeFile(trusted.cliPath, originalCli);

  removeProtectedRecord();
  const beforeRemoval = await markerCount(markerPath);
  await assert.rejects(() => readTrustedActiveRuntimePointer(project), /Guardian|protected.*Runtime trust|not trusted/i);
  assert.equal(await markerCount(markerPath), beforeRemoval);

  console.log("C-03 regression passed: low-level preparation stayed non-executable; exact protected Runtime trust enabled execution; tree drift and Guardian removal failed closed.");
} finally {
  removeProtectedRecord();
  await rm(project, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
  await rm(fixtureRoot, { recursive: true, force: true });
}
