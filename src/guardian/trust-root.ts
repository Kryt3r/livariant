import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, lstat, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const GUARDIAN_ROOT_SCHEMA_VERSION = 1 as const;
export const GUARDIAN_VERSION = 1 as const;
export const GUARDIAN_ROOT_KIND = "livariant-guardian-root" as const;
export const GUARDIAN_HELPER_FILE = "guardian-helper.js" as const;
export const GUARDIAN_DESCRIPTOR_FILE = "guardian-root.json" as const;
export const GUARDIAN_RECORDS_DIRECTORY = "records" as const;
const MAX_HELPER_BYTES = 256 * 1024;

export type GuardianPlatform = "win32" | "linux";
export type GuardianInspectionState = "ready" | "unavailable" | "unsafe" | "unsupported-platform";

export interface GuardianRootDescriptor {
  schemaVersion: typeof GUARDIAN_ROOT_SCHEMA_VERSION;
  kind: typeof GUARDIAN_ROOT_KIND;
  guardianVersion: typeof GUARDIAN_VERSION;
  platform: GuardianPlatform;
  helperSha256: string;
  rootBindingSha256: string;
}

export interface GuardianRootInspection {
  schemaVersion: 1;
  state: GuardianInspectionState;
  platform: NodeJS.Platform;
  root: string | null;
  guardianReady: boolean;
  reason: string;
  changesMade: 0;
  limitations: string[];
}

function errno(error: unknown, ...codes: string[]): boolean {
  return error instanceof Error && "code" in error && codes.includes(String((error as NodeJS.ErrnoException).code));
}

function pathIsWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!isAbsolute(rel) && !rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith(sep));
}

function isGuardianPlatform(platform: NodeJS.Platform): platform is GuardianPlatform {
  return platform === "win32" || platform === "linux";
}

export function productionGuardianRoot(platform: NodeJS.Platform = process.platform): string | null {
  if (platform === "win32") return "C:\\ProgramData\\Livariant\\Guardian\\v1";
  if (platform === "linux") return "/var/lib/livariant-guardian/v1";
  return null;
}

export function guardianLayoutPaths(root: string): { descriptor: string; helper: string; records: string } {
  const normalized = resolve(root);
  return {
    descriptor: resolve(normalized, GUARDIAN_DESCRIPTOR_FILE),
    helper: resolve(normalized, GUARDIAN_HELPER_FILE),
    records: resolve(normalized, GUARDIAN_RECORDS_DIRECTORY),
  };
}

export function guardianRootBinding(root: string, platform: GuardianPlatform): string {
  const material = platform === "win32" ? resolve(root).toLowerCase() : resolve(root);
  return createHash("sha256").update(`livariant:guardian-root:v1\0${platform}\0${material}`, "utf8").digest("hex");
}

export function buildGuardianRootDescriptor(helperBytes: Uint8Array, physicalRoot: string, platform: GuardianPlatform): GuardianRootDescriptor {
  return {
    schemaVersion: GUARDIAN_ROOT_SCHEMA_VERSION,
    kind: GUARDIAN_ROOT_KIND,
    guardianVersion: GUARDIAN_VERSION,
    platform,
    helperSha256: createHash("sha256").update(helperBytes).digest("hex"),
    rootBindingSha256: guardianRootBinding(physicalRoot, platform),
  };
}

function strictDescriptor(value: unknown, expectedPlatform: GuardianPlatform): GuardianRootDescriptor {
  if (typeof value !== "object" || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("Guardian root descriptor is invalid.");
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set(["schemaVersion", "kind", "guardianVersion", "platform", "helperSha256", "rootBindingSha256"]);
  for (const key of Object.keys(record)) if (!allowed.has(key)) throw new Error("Guardian root descriptor contains an unsupported field.");
  for (const key of allowed) if (!(key in record)) throw new Error(`Guardian root descriptor is missing required field: ${key}.`);
  if (record.schemaVersion !== GUARDIAN_ROOT_SCHEMA_VERSION || record.kind !== GUARDIAN_ROOT_KIND || record.guardianVersion !== GUARDIAN_VERSION) {
    throw new Error("Guardian root descriptor schema is unsupported.");
  }
  if (record.platform !== expectedPlatform) throw new Error("Guardian root descriptor platform does not match the current operating system.");
  if (typeof record.helperSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(record.helperSha256)) {
    throw new Error("Guardian root descriptor helper digest is invalid.");
  }
  if (typeof record.rootBindingSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(record.rootBindingSha256)) {
    throw new Error("Guardian root descriptor root binding is invalid.");
  }
  return {
    schemaVersion: GUARDIAN_ROOT_SCHEMA_VERSION,
    kind: GUARDIAN_ROOT_KIND,
    guardianVersion: GUARDIAN_VERSION,
    platform: expectedPlatform,
    helperSha256: record.helperSha256,
    rootBindingSha256: record.rootBindingSha256,
  };
}

async function assertRealDirectory(path: string, label: string): Promise<void> {
  const stats = await lstat(path);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} must be a real directory and must not be a symbolic link or junction.`);
}

async function assertRealFile(path: string, label: string): Promise<void> {
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`${label} must be a regular file and must not be a symbolic link.`);
}

async function assertFileNotWritableByRequester(path: string, label: string): Promise<void> {
  try {
    await access(path, constants.W_OK);
  } catch (error) {
    if (errno(error, "EACCES", "EPERM", "EROFS")) return;
    throw new Error(`${label} write protection could not be verified.`);
  }
  throw new Error(`${label} is writable by the ordinary Livariant requester principal.`);
}

async function assertDirectoryNotWritableByRequester(path: string, label: string): Promise<void> {
  const probe = resolve(path, `.livariant-write-probe-${randomUUID()}`);
  try {
    await writeFile(probe, "probe", { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (errno(error, "EACCES", "EPERM", "EROFS")) return;
    throw new Error(`${label} write protection could not be verified.`);
  }
  try { await rm(probe, { force: true }); } catch { /* root is already unsafe; leave diagnosis fail-closed */ }
  throw new Error(`${label} is writable by the ordinary Livariant requester principal.`);
}

function baseLimitations(): string[] {
  return [
    "Guardian foundation readiness does not by itself grant mutation, Runtime, integrity, or release Authority.",
    "WP-026 does not claim resistance to root/Administrator/SYSTEM compromise.",
    "Existing ~/.livariant/trust records are not upgraded to Guardian Authority by this inspection.",
  ];
}

function report(state: GuardianInspectionState, platform: NodeJS.Platform, root: string | null, reason: string): GuardianRootInspection {
  return {
    schemaVersion: 1,
    state,
    platform,
    root,
    guardianReady: state === "ready",
    reason,
    changesMade: 0,
    limitations: baseLimitations(),
  };
}

/**
 * Diagnostic core for a concrete root. Authority consumers must use
 * assertProductionGuardianRootReady(), which fixes the production location.
 * This function exists so path/layout behavior can be attacked directly in tests.
 */
export async function inspectGuardianRootAt(root: string, projectPath: string, platform: NodeJS.Platform = process.platform): Promise<GuardianRootInspection> {
  if (!isGuardianPlatform(platform)) return report("unsupported-platform", platform, null, "Guardian v1 supports Windows and Linux only.");
  if (!isAbsolute(root)) return report("unsafe", platform, root, "Guardian root must be an absolute fixed system path.");

  try {
    await assertRealDirectory(root, "Guardian root");
  } catch (error) {
    if (errno(error, "ENOENT")) return report("unavailable", platform, root, "Guardian root is not provisioned on this machine.");
    return report("unsafe", platform, root, error instanceof Error ? error.message : "Guardian root is unsafe.");
  }

  try {
    const [physicalRoot, physicalProject, physicalHome] = await Promise.all([
      realpath(root),
      realpath(projectPath),
      realpath(homedir()),
    ]);
    if (pathIsWithin(physicalProject, physicalRoot) || pathIsWithin(physicalRoot, physicalProject)) {
      throw new Error("Guardian root must not overlap the current project directory.");
    }
    if (pathIsWithin(physicalHome, physicalRoot) || pathIsWithin(physicalRoot, physicalHome)) {
      throw new Error("Guardian root must not overlap the ordinary operating-system user home directory.");
    }

    const { descriptor: descriptorPath, helper: helperPath, records: recordsPath } = guardianLayoutPaths(physicalRoot);
    if (!pathIsWithin(physicalRoot, descriptorPath) || !pathIsWithin(physicalRoot, helperPath) || !pathIsWithin(physicalRoot, recordsPath)) {
      throw new Error("Guardian layout resolves outside its protected root.");
    }

    await assertRealFile(descriptorPath, "Guardian descriptor");
    await assertRealFile(helperPath, "Guardian helper");
    await assertRealDirectory(recordsPath, "Guardian records root");

    const helperStats = await lstat(helperPath);
    if (helperStats.size > MAX_HELPER_BYTES) throw new Error("Guardian helper exceeds the bounded inspection size.");
    const helperBytes = await readFile(helperPath);
    const descriptor = strictDescriptor(JSON.parse(await readFile(descriptorPath, "utf8")) as unknown, platform);
    const helperSha256 = createHash("sha256").update(helperBytes).digest("hex");
    if (helperSha256 !== descriptor.helperSha256) throw new Error("Guardian helper bytes do not match the protected descriptor digest.");
    if (guardianRootBinding(physicalRoot, platform) !== descriptor.rootBindingSha256) {
      throw new Error("Guardian root does not match its protected physical-location binding.");
    }

    await assertDirectoryNotWritableByRequester(physicalRoot, "Guardian root");
    await assertDirectoryNotWritableByRequester(recordsPath, "Guardian records root");
    await assertFileNotWritableByRequester(descriptorPath, "Guardian descriptor");
    await assertFileNotWritableByRequester(helperPath, "Guardian helper");

    return report("ready", platform, physicalRoot, "Guardian root is present, internally consistent, physically bound, and not writable by the ordinary requester principal.");
  } catch (error) {
    return report("unsafe", platform, root, error instanceof Error ? error.message : "Guardian root verification failed.");
  }
}

export async function inspectProductionGuardianRoot(projectPath: string = process.cwd()): Promise<GuardianRootInspection> {
  const root = productionGuardianRoot(process.platform);
  if (!root) return report("unsupported-platform", process.platform, null, "Guardian v1 supports Windows and Linux only.");
  return inspectGuardianRootAt(root, projectPath, process.platform);
}

export async function assertProductionGuardianRootReady(projectPath: string = process.cwd()): Promise<GuardianRootInspection & { state: "ready"; guardianReady: true }> {
  const inspection = await inspectProductionGuardianRoot(projectPath);
  if (inspection.state !== "ready" || !inspection.guardianReady) {
    throw new Error(`Protected Livariant Guardian is not ready: ${inspection.reason}`);
  }
  return inspection as GuardianRootInspection & { state: "ready"; guardianReady: true };
}
