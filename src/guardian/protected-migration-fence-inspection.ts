import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import { parseSchemaMigrationFenceRecord } from "./schema-migration-fence-contract.js";
import { assertProductionGuardianRootReady, guardianLayoutPaths } from "./trust-root.js";
import { assertWindowsProtectedPath } from "./windows-protection.js";

export type ProtectedMigrationFenceStatus =
  | { state: "legacy-no-fence"; reason: string }
  | { state: "blocked"; reason: string };

const namePattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.json$/u;
const MAX_BYTES = 32768;
const MAX_ENTRIES = 512;

function normalized(path: string): string {
  const resolved = resolve(path);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
function blocked(reason: string): ProtectedMigrationFenceStatus {
  return { state: "blocked", reason };
}
function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error
    && (error as NodeJS.ErrnoException).code === "ENOENT";
}
async function assertProtected(path: string, directory: boolean): Promise<void> {
  const stat = await lstat(path);
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())
    || normalized(await realpath(path)) !== normalized(path)) {
    throw new Error("Migration fence path is not a real canonical protected entry.");
  }
  if (process.platform === "linux") {
    if (Number(stat.uid) !== 0 || (Number(stat.mode) & 0o022) !== 0) {
      throw new Error("Migration fence path is writable by an ordinary principal.");
    }
  } else if (process.platform === "win32") {
    assertWindowsProtectedPath(path, "Guardian schema migration fence");
  } else throw new Error("Migration fence operating system is unsupported.");
  if (!directory && (stat.size === 0 || stat.size > MAX_BYTES)) {
    throw new Error("Migration fence record has unsupported size.");
  }
}
/** Raw material comparison alone provides NO Guardian Authority or legacy-read permission. */
export function assessUntrustedMigrationFenceRecords(
  entries: readonly { name: string; bytes: Buffer }[],
  projectId: string,
  physicalRoot: string,
): ProtectedMigrationFenceStatus {
  if (!isStableProjectIdentity(projectId) || entries.length > MAX_ENTRIES) return blocked("Invalid project identity or unbounded fence records.");
  const root = normalized(physicalRoot);
  const brain = normalized(resolve(root, ".project-brain"));
  const names = new Set<string>();
  try {
    for (const item of entries) {
      if (!namePattern.test(item.name) || names.has(item.name)
        || !Buffer.isBuffer(item.bytes) || item.bytes.length === 0 || item.bytes.length > MAX_BYTES) {
        return blocked("Unexpected, duplicate or oversized migration-fence material.");
      }
      names.add(item.name);
      const record = parseSchemaMigrationFenceRecord(JSON.parse(item.bytes.toString("utf8")) as unknown);
      if (item.name !== record.transactionId + ".json") return blocked("Fence transaction filename does not match.");
      const id = record.stableProjectIdentity === projectId;
      const physical = normalized(record.declaredPhysicalProjectRoot) === root
        || normalized(record.declaredPhysicalProjectBrainRoot) === brain;
      if (id || physical) return blocked("A protected or conflicting schema migration fence exists; canonical access requires independent recovery.");
    }
  } catch {
    return blocked("Malformed or ambiguous protected migration fence record.");
  }
  return { state: "legacy-no-fence", reason: "No matching fence observed; normal protected schema-2 integrity remains mandatory." };
}
/**
 * Read-only Guardian-root probe. No writer/issuer exists. A missing migration
 * namespace is compatible only with legacy v2; it is NOT proof that a previously
 * armed transaction was durably cleared and MUST NOT permit schema-3 activation.
 */
export async function inspectProtectedMigrationFence(
  projectRoot: string,
  projectId: string,
): Promise<ProtectedMigrationFenceStatus> {
  try {
    if (!isStableProjectIdentity(projectId)) return blocked("Invalid stable project identity.");
    const physical = await realpath(projectRoot);
    const ready = await assertProductionGuardianRootReady(physical);
    if (!ready.root) return blocked("Guardian physical root is unavailable.");
    const directory = resolve(guardianLayoutPaths(ready.root).records, "schema-migration");
    try {
      await assertProtected(directory, true);
    } catch (error) {
      if (isMissing(error)) {
        return { state: "legacy-no-fence", reason: "Migration namespace not yet provisioned. Only old schema-2 integrity may be used." };
      }
      throw error;
    }
    const names = await readdir(directory);
    if (names.length > MAX_ENTRIES) return blocked("Protected migration namespace is unbounded.");
    const records: { name: string; bytes: Buffer }[] = [];
    for (const name of names) {
      if (!namePattern.test(name)) return blocked("Unexpected migration staging, lock or alias entry.");
      const path = resolve(directory, name);
      await assertProtected(path, false);
      const first = await readFile(path);
      await assertProtected(path, false);
      if (!first.equals(await readFile(path))) return blocked("Migration record changed during inspection.");
      records.push({ name, bytes: first });
    }
    return assessUntrustedMigrationFenceRecords(records, projectId, physical);
  } catch (error) {
    return blocked("Guardian migration fence inspection failed closed: "
      + (error instanceof Error ? error.message : "unknown failure"));
  }
}
