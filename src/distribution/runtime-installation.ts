import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { assertPathWithinRoot, assertRegularFile } from "../project-brain/path-safety.js";
import { assertReleaseAuthorized } from "./release-authorization.js";
import {
  verifyReleaseArtifact,
  type LocalReleaseArtifact,
  type ReleaseIdentity,
} from "./release-integrity.js";
import { assertRuntimeTrusted, establishRuntimeTrust, type RuntimeTrustIdentity } from "./runtime-trust.js";

const RUNTIME_PACKAGE_NAME = "livariant";
const MANAGED_RUNTIME_DIR = ".framework-runtime";
const RELEASE_EVIDENCE_FILE = ".release-evidence.json";

/**
 * Filesystem-level evidence that an exact Runtime package is present at the
 * stated managed location. This structure is deliberately NOT execution
 * Authority. Candidate Runtime code must not execute merely because this
 * object exists.
 */
export interface InstalledRuntimeAttestation {
  version: string;
  packageName: typeof RUNTIME_PACKAGE_NAME;
  installRoot: string;
  cliPath: string;
}

export interface ActiveRuntimePointer {
  version: string;
  installRoot: string;
  cliPath: string;
}

interface InstalledReleaseEvidence extends RuntimeTrustIdentity {}

function managedRoot(projectPath: string): string { return resolve(projectPath, MANAGED_RUNTIME_DIR); }
function activePointerPath(projectPath: string): string { return resolve(managedRoot(projectPath), "active.json"); }
function isMissing(error: unknown): boolean { return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT"; }

async function ensureSafeDirectory(path: string, root: string, label: string): Promise<void> {
  assertPathWithinRoot(root, path, label);
  try {
    const stats = await lstat(path);
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} must be a real directory.`);
  } catch (error) {
    if (isMissing(error)) {
      await mkdir(path, { recursive: false });
      const stats = await lstat(path);
      if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} creation did not produce a safe directory.`);
      return;
    }
    throw error;
  }
}

function npmInstall(prefix: string, artifactPath: string): void {
  const npmArgs = ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", prefix, artifactPath];
  const result = process.platform === "win32"
    ? spawnSync(
        process.execPath,
        [resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...npmArgs],
        { encoding: "utf8", shell: false },
      )
    : spawnSync("npm", npmArgs, { encoding: "utf8", shell: false });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`Runtime package installation failed: ${detail}`);
  }
}

function attestCli(cliPath: string, expectedVersion: string, projectPath: string): void {
  const result = spawnSync(process.execPath, [cliPath, "version", "--json"], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
  if (result.status !== 0) throw new Error(`Installed Runtime attestation command failed: ${result.stderr || result.stdout}`);
  let parsed: unknown;
  try { parsed = JSON.parse(result.stdout); } catch { throw new Error("Installed Runtime attestation did not return machine-readable version identity."); }
  const value = parsed as { frameworkVersion?: unknown };
  if (value.frameworkVersion !== expectedVersion) throw new Error(`Installed Runtime identity mismatch: expected ${expectedVersion}, observed ${String(value.frameworkVersion)}.`);
}

function packageRootForInstall(installRoot: string): string { return resolve(installRoot, "node_modules", RUNTIME_PACKAGE_NAME); }
function cliPathForInstall(installRoot: string): string { return resolve(packageRootForInstall(installRoot), "dist", "src", "cli", "index.js"); }

async function hashPackageTree(packageRoot: string): Promise<string> {
  const hash = createHash("sha256");
  async function walk(directory: string, prefix: string): Promise<void> {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolute = resolve(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      assertPathWithinRoot(packageRoot, absolute, `Installed Runtime tree entry '${relativePath}'`);
      if (entry.isSymbolicLink()) throw new Error(`Installed Runtime tree contains unsupported symbolic link: ${relativePath}.`);
      if (entry.isDirectory()) {
        hash.update(`D\0${relativePath}\0`);
        await walk(absolute, relativePath);
      } else if (entry.isFile()) {
        await assertRegularFile(absolute, `Installed Runtime tree file '${relativePath}'`);
        hash.update(`F\0${relativePath}\0`);
        hash.update(await readFile(absolute));
        hash.update("\0");
      } else {
        throw new Error(`Installed Runtime tree contains unsupported filesystem entry: ${relativePath}.`);
      }
    }
  }
  await walk(packageRoot, "");
  return hash.digest("hex");
}

async function evidenceFromIdentity(installRoot: string, identity: ReleaseIdentity): Promise<InstalledReleaseEvidence> {
  return {
    version: identity.version,
    channel: identity.channel,
    sourceId: identity.sourceId,
    artifactId: identity.artifactId,
    artifactSha256: identity.artifactSha256.toLowerCase(),
    packageTreeSha256: await hashPackageTree(packageRootForInstall(installRoot)),
  };
}

async function writeReleaseEvidence(installRoot: string, identity: ReleaseIdentity): Promise<void> {
  const path = resolve(installRoot, RELEASE_EVIDENCE_FILE);
  assertPathWithinRoot(installRoot, path, "Installed Runtime release evidence");
  await writeFile(path, `${JSON.stringify(await evidenceFromIdentity(installRoot, identity), null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await assertRegularFile(path, "Installed Runtime release evidence");
}

async function readStoredReleaseEvidence(installRoot: string): Promise<InstalledReleaseEvidence> {
  const path = resolve(installRoot, RELEASE_EVIDENCE_FILE);
  assertPathWithinRoot(installRoot, path, "Installed Runtime release evidence");
  await assertRegularFile(path, "Installed Runtime release evidence");
  let evidence: Partial<InstalledReleaseEvidence>;
  try { evidence = JSON.parse(await readFile(path, "utf8")) as Partial<InstalledReleaseEvidence>; }
  catch { throw new Error("Installed Runtime has invalid release evidence."); }
  if (
    typeof evidence.version !== "string" ||
    !["stable", "preview", "development"].includes(String(evidence.channel)) ||
    typeof evidence.sourceId !== "string" ||
    typeof evidence.artifactId !== "string" ||
    !/^[a-f0-9]{64}$/i.test(evidence.artifactSha256 ?? "") ||
    !/^[a-f0-9]{64}$/i.test(evidence.packageTreeSha256 ?? "")
  ) throw new Error("Installed Runtime has an invalid shape.");

  const validated = evidence as InstalledReleaseEvidence;
  const observedTree = await hashPackageTree(packageRootForInstall(installRoot));
  if (observedTree !== validated.packageTreeSha256.toLowerCase()) throw new Error(`Installed Runtime package tree integrity mismatch for ${validated.version}.`);
  return { ...validated, artifactSha256: validated.artifactSha256.toLowerCase(), packageTreeSha256: validated.packageTreeSha256.toLowerCase() };
}

async function assertReleaseEvidence(installRoot: string, identity: ReleaseIdentity): Promise<InstalledReleaseEvidence> {
  const evidence = await readStoredReleaseEvidence(installRoot);
  if (
    evidence.version !== identity.version ||
    evidence.channel !== identity.channel ||
    evidence.sourceId !== identity.sourceId ||
    evidence.artifactId !== identity.artifactId ||
    evidence.artifactSha256.toLowerCase() !== identity.artifactSha256.toLowerCase()
  ) throw new Error(`Installed Runtime ${identity.version} does not match the requested verified release identity.`);
  return evidence;
}

/** Validate package identity and paths without executing candidate Runtime code. */
async function inspectInstalledRoot(installRoot: string, expectedVersion: string): Promise<InstalledRuntimeAttestation> {
  const packageRoot = packageRootForInstall(installRoot);
  const packagePath = resolve(packageRoot, "package.json");
  const cliPath = cliPathForInstall(installRoot);
  assertPathWithinRoot(installRoot, packageRoot, "Installed Runtime package root");
  assertPathWithinRoot(packageRoot, packagePath, "Installed Runtime package manifest");
  assertPathWithinRoot(packageRoot, cliPath, "Installed Runtime CLI path");
  await assertRegularFile(packagePath, "Installed Runtime package manifest");
  await assertRegularFile(cliPath, "Installed Runtime CLI");
  const manifest = JSON.parse(await readFile(packagePath, "utf8")) as { name?: unknown; version?: unknown };
  if (manifest.name !== RUNTIME_PACKAGE_NAME) throw new Error(`Installed Runtime package identity mismatch: ${String(manifest.name)}.`);
  if (manifest.version !== expectedVersion) throw new Error(`Installed Runtime package version mismatch: expected ${expectedVersion}, observed ${String(manifest.version)}.`);
  return { version: expectedVersion, packageName: RUNTIME_PACKAGE_NAME, installRoot, cliPath };
}

/**
 * Low-level preparation only. It verifies exact release/package evidence and may
 * materialize an inactive Runtime tree, but it never executes candidate Runtime
 * code and never establishes execution Authority.
 */
export async function installVerifiedRuntime(
  projectPath: string,
  identity: ReleaseIdentity,
  artifact: LocalReleaseArtifact,
  trustedSourceIds: ReadonlySet<string>,
): Promise<InstalledRuntimeAttestation> {
  await verifyReleaseArtifact(identity, artifact, trustedSourceIds);
  await assertRegularFile(artifact.path, "Runtime release artifact");
  const root = managedRoot(projectPath);
  assertPathWithinRoot(projectPath, root, "Managed Runtime root");
  await ensureSafeDirectory(root, projectPath, "Managed Runtime root");
  const releasesRoot = resolve(root, "releases");
  await ensureSafeDirectory(releasesRoot, root, "Managed Runtime releases root");
  const finalRoot = resolve(releasesRoot, identity.version);
  const stagingRoot = resolve(root, `.staging-${randomUUID()}`);
  assertPathWithinRoot(releasesRoot, finalRoot, "Installed Runtime release path");
  assertPathWithinRoot(root, stagingRoot, "Runtime installation staging path");

  try {
    const existing = await lstat(finalRoot).catch((error: unknown) => isMissing(error) ? null : Promise.reject(error));
    if (existing) {
      if (!existing.isDirectory() || existing.isSymbolicLink()) throw new Error(`Existing Runtime release ${identity.version} is unsafe.`);
      await assertReleaseEvidence(finalRoot, identity);
      return await inspectInstalledRoot(finalRoot, identity.version);
    }

    await assertReleaseAuthorized(projectPath, identity);
    await mkdir(stagingRoot, { recursive: false });
    npmInstall(stagingRoot, artifact.path);
    await writeReleaseEvidence(stagingRoot, identity);
    await assertReleaseEvidence(stagingRoot, identity);
    await inspectInstalledRoot(stagingRoot, identity.version);
    await rename(stagingRoot, finalRoot);
    await assertReleaseEvidence(finalRoot, identity);
    return await inspectInstalledRoot(finalRoot, identity.version);
  } catch (error) {
    await rm(stagingRoot, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Protected product path. Only after exact final-location Guardian trust has
 * been established and re-read may candidate Runtime code execute for
 * attestation.
 */
export async function installTrustedRuntime(
  projectPath: string,
  identity: ReleaseIdentity,
  artifact: LocalReleaseArtifact,
  trustedSourceIds: ReadonlySet<string>,
): Promise<InstalledRuntimeAttestation> {
  const finalRoot = resolve(managedRoot(projectPath), "releases", identity.version);
  const existedBefore = await lstat(finalRoot).then(() => true).catch((error: unknown) => isMissing(error) ? false : Promise.reject(error));
  try {
    const prepared = await installVerifiedRuntime(projectPath, identity, artifact, trustedSourceIds);
    const evidence = await assertReleaseEvidence(prepared.installRoot, identity);
    await establishRuntimeTrust(projectPath, prepared.installRoot, evidence);
    await assertRuntimeTrusted(projectPath, prepared.installRoot, evidence);
    const attested = await inspectInstalledRoot(prepared.installRoot, identity.version);
    attestCli(attested.cliPath, identity.version, projectPath);
    return attested;
  } catch (error) {
    if (!existedBefore) await rm(finalRoot, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Inert pointer evidence reader. It validates paths, release evidence and the
 * package tree but does not consult execution Authority and does not execute
 * Runtime code. Lifecycle rollback/status mechanics may use this reader.
 */
export async function readActiveRuntimePointer(projectPath: string): Promise<ActiveRuntimePointer | null> {
  const root = managedRoot(projectPath);
  const path = activePointerPath(projectPath);
  try {
    const rootStats = await lstat(root);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) throw new Error("Managed Runtime root is unsafe.");
    await assertRegularFile(path, "Active Runtime pointer");
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
  const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<ActiveRuntimePointer>;
  if (typeof parsed.version !== "string" || typeof parsed.installRoot !== "string" || typeof parsed.cliPath !== "string") throw new Error("Active Runtime pointer has an invalid shape.");
  const absoluteInstallRoot = resolve(root, parsed.installRoot);
  const absoluteCli = resolve(root, parsed.cliPath);
  assertPathWithinRoot(resolve(root, "releases"), absoluteInstallRoot, "Active Runtime install root");
  assertPathWithinRoot(absoluteInstallRoot, absoluteCli, "Active Runtime CLI");
  const evidence = await readStoredReleaseEvidence(absoluteInstallRoot);
  if (evidence.version !== parsed.version) throw new Error("Active Runtime pointer version does not match installed release evidence.");
  const inspected = await inspectInstalledRoot(absoluteInstallRoot, parsed.version);
  if (resolve(inspected.cliPath) !== absoluteCli) throw new Error("Active Runtime pointer does not identify the inspected CLI.");
  return { version: parsed.version, installRoot: absoluteInstallRoot, cliPath: absoluteCli };
}

/** Protected active Runtime reader for actual execution/delegation. */
export async function readTrustedActiveRuntimePointer(projectPath: string): Promise<ActiveRuntimePointer | null> {
  const pointer = await readActiveRuntimePointer(projectPath);
  if (!pointer) return null;
  const evidence = await readStoredReleaseEvidence(pointer.installRoot);
  await assertRuntimeTrusted(projectPath, pointer.installRoot, evidence);
  const inspected = await inspectInstalledRoot(pointer.installRoot, pointer.version);
  attestCli(inspected.cliPath, pointer.version, projectPath);
  if (resolve(inspected.cliPath) !== resolve(pointer.cliPath)) throw new Error("Trusted Runtime pointer does not identify the attested CLI.");
  return pointer;
}

async function writeActiveRuntimePointerEvidence(projectPath: string, pointer: ActiveRuntimePointer): Promise<void> {
  const root = managedRoot(projectPath);
  await ensureSafeDirectory(root, projectPath, "Managed Runtime root");
  assertPathWithinRoot(resolve(root, "releases"), pointer.installRoot, "Runtime activation install root");
  assertPathWithinRoot(pointer.installRoot, pointer.cliPath, "Runtime activation CLI path");
  const evidence = await readStoredReleaseEvidence(pointer.installRoot);
  if (evidence.version !== pointer.version) throw new Error("Runtime activation pointer version does not match installed release evidence.");
  const inspected = await inspectInstalledRoot(pointer.installRoot, pointer.version);
  if (resolve(inspected.cliPath) !== resolve(pointer.cliPath)) throw new Error("Runtime activation pointer does not match the inspected CLI.");
  const pointerPath = activePointerPath(projectPath);
  const tempPath = resolve(root, `.active.tmp-${randomUUID()}.json`);
  assertPathWithinRoot(root, pointerPath, "Active Runtime pointer path");
  assertPathWithinRoot(root, tempPath, "Active Runtime pointer candidate");
  const payload = { version: pointer.version, installRoot: relative(root, pointer.installRoot), cliPath: relative(root, pointer.cliPath) };
  await writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try { await assertRegularFile(tempPath, "Active Runtime pointer candidate"); await rename(tempPath, pointerPath); }
  catch (error) { await rm(tempPath, { force: true }); throw error; }
}

/** Low-level lifecycle pointer transition. Pointer evidence is not Authority. */
export async function activateInstalledRuntime(projectPath: string, attestation: InstalledRuntimeAttestation): Promise<void> {
  await writeActiveRuntimePointerEvidence(projectPath, attestation);
}

/** Protected product activation. */
export async function activateTrustedRuntime(projectPath: string, attestation: InstalledRuntimeAttestation): Promise<void> {
  const evidence = await readStoredReleaseEvidence(attestation.installRoot);
  await assertRuntimeTrusted(projectPath, attestation.installRoot, evidence);
  const inspected = await inspectInstalledRoot(attestation.installRoot, attestation.version);
  attestCli(inspected.cliPath, attestation.version, projectPath);
  if (resolve(inspected.cliPath) !== resolve(attestation.cliPath)) throw new Error("Protected Runtime activation does not match the attested CLI.");
  await writeActiveRuntimePointerEvidence(projectPath, attestation);
}

export async function restoreActiveRuntimePointer(projectPath: string, previous: ActiveRuntimePointer | null): Promise<void> {
  if (previous) { await writeActiveRuntimePointerEvidence(projectPath, previous); return; }
  const root = managedRoot(projectPath);
  const pointerPath = activePointerPath(projectPath);
  assertPathWithinRoot(root, pointerPath, "Active Runtime pointer path");
  await rm(pointerPath, { force: true });
}
