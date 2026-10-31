import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import { parseSchemaMigrationFenceRecord } from "./schema-migration-fence-contract.js";
import { assertProductionGuardianRootReady, guardianLayoutPaths } from "./trust-root.js";
import { assertWindowsProtectedPath } from "./windows-protection.js";
import { inspectGuardianMigrationFenceStorage } from "./protected-helper.js";

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
async function assertProtected(path: string, directory: boolean, maxBytes = MAX_BYTES): Promise<void> {
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
  if (!directory && (stat.nlink !== 1 || stat.size === 0 || stat.size > maxBytes)) {
    throw new Error("Migration fence record has unsupported size.");
  }
}

/** Authenticate every durable artifact BEFORE interpreting the helper's journal.
 * Missing expected anchors/journals are checked by the single-file helper core.
 * This is a fail-closed observation, not a shared read lease or arming proof.
 */
async function inspectDurableFence(recordsRoot: string, projectId: string, physical: string): Promise<ProtectedMigrationFenceStatus> {
  const names = await readdir(recordsRoot);
  if (names.length > 4096) return blocked("Guardian record namespace is unbounded.");
  const marker = "schema-migration-state-v1.json";
  const namespace = "schema-migration-v1";
  const normalizeName = (name: string) => name.toLowerCase().replace(/[ .]+$/u, "");
  const artifacts = names.filter(name => {
    const canonical = normalizeName(name);
    return canonical === marker || canonical === namespace
      || canonical.startsWith(".schema-migration-v1.") || canonical === ".guardian-transition.lock";
  });
  if (artifacts.some(name => name !== normalizeName(name))) return blocked("Aliased durable migration artifact.");
  if (artifacts.includes(".guardian-transition.lock")) return blocked("Guardian transition is in progress or requires recovery.");
  for (const name of artifacts) {
    if (name === namespace) {
      const directory = resolve(recordsRoot, name);
      await assertProtected(directory, true);
      const journals = await readdir(directory);
      if (journals.length > MAX_ENTRIES) return blocked("Migration journal namespace is unbounded.");
      for (const journal of journals) {
        if (!/^[a-f0-9-]{36}\.jsonl$/u.test(journal)) return blocked("Unexpected migration journal or alias.");
        await assertProtected(resolve(directory, journal), false);
      }
    } else {
      if (name !== marker && !/^\.schema-migration-v1\.[a-f0-9-]{36}\.anchor\.json$/u.test(name)) {
        return blocked("Unexpected durable migration anchor.");
      }
      await assertProtected(resolve(recordsRoot, name), false, name === marker ? 512 * 1024 : MAX_BYTES);
    }
  }
  const state = await inspectGuardianMigrationFenceStorage(recordsRoot);
  if (state.activated && state.transactions.length === 0) return blocked("Activated migration store has no recoverable transaction.");
  const entries = state.transactions.map(record => {
    const parsed = parseSchemaMigrationFenceRecord(record);
    return { name: parsed.transactionId + ".json", bytes: Buffer.from(JSON.stringify(parsed), "utf8") };
  });
  const result = assessUntrustedMigrationFenceRecords(entries, projectId, physical);
  // Detect artifact insertion/removal during interpretation. This narrows the
  // observation window; productive arming remains disabled without native leases.
  const after = await readdir(recordsRoot);
  if (JSON.stringify(names.sort()) !== JSON.stringify(after.sort())) return blocked("Guardian migration state changed during inspection.");
  return result;
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
 * Guardian-root probe of permanent anchors plus journal, retaining the older
 * presence namespace for compatibility. No observation permits schema-3 arming.
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
    const recordsRoot = guardianLayoutPaths(ready.root).records;
    const durable = await inspectDurableFence(recordsRoot, projectId, physical);
    if (durable.state === "blocked") return durable;
    const directory = resolve(recordsRoot, "schema-migration");
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
