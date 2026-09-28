import { createHash, randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, readFile, readdir, realpath, rename, rm } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { initializeProject } from "../runtime/initialization.js";
import { ProjectBrainStore } from "../project-brain/store.js";

const MAX_MIGRATION_ENTRIES = 512;
const MAX_MIGRATION_FILE_BYTES = 2 * 1024 * 1024;

export type DesktopProjectBrainStorageResult =
  | { state: "ready"; migrated: false; storageRoot: string }
  | { state: "created"; migrated: false; storageRoot: string }
  | { state: "migrated"; migrated: true; storageRoot: string };

function pathIsWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}

async function assertRealDirectory(path: string, label: string): Promise<string> {
  const physical = await realpath(path);
  const stats = await lstat(physical);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} must be a real non-symbolic-link directory.`);
  return physical;
}

async function safeTreeDigest(root: string): Promise<string> {
  const hash = createHash("sha256");
  let entriesSeen = 0;
  const walk = async (current: string, logical: string): Promise<void> => {
    const entries = (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      entriesSeen += 1;
      if (entriesSeen > MAX_MIGRATION_ENTRIES) throw new Error("Legacy Project Brain migration exceeds the supported entry count.");
      const source = resolve(current, entry.name);
      if (!pathIsWithin(root, source)) throw new Error("Legacy Project Brain migration path escaped its source root.");
      const relativeName = logical ? `${logical}/${entry.name}` : entry.name;
      const stats = await lstat(source);
      if (stats.isSymbolicLink()) throw new Error(`Legacy Project Brain contains unsupported symbolic link: ${relativeName}`);
      if (stats.isDirectory()) {
        hash.update(`D:${relativeName}\n`);
        await walk(source, relativeName);
      } else if (stats.isFile()) {
        if (stats.size > MAX_MIGRATION_FILE_BYTES) throw new Error(`Legacy Project Brain file is too large to migrate safely: ${relativeName}`);
        hash.update(`F:${relativeName}:${stats.size}\n`);
        hash.update(await readFile(source));
      } else {
        throw new Error(`Legacy Project Brain contains unsupported filesystem entry: ${relativeName}`);
      }
    }
  };
  await walk(root, "");
  return hash.digest("hex");
}

async function copyTreeSafe(sourceRoot: string, targetRoot: string): Promise<void> {
  await mkdir(targetRoot, { recursive: false });
  let entriesSeen = 0;
  const walk = async (source: string, target: string): Promise<void> => {
    const entries = (await readdir(source, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      entriesSeen += 1;
      if (entriesSeen > MAX_MIGRATION_ENTRIES) throw new Error("Legacy Project Brain migration exceeds the supported entry count.");
      const from = resolve(source, entry.name);
      const to = resolve(target, entry.name);
      if (!pathIsWithin(sourceRoot, from) || !pathIsWithin(targetRoot, to)) throw new Error("Legacy Project Brain migration path escaped its bounded roots.");
      const stats = await lstat(from);
      if (stats.isSymbolicLink()) throw new Error(`Legacy Project Brain contains unsupported symbolic link: ${entry.name}`);
      if (stats.isDirectory()) {
        await mkdir(to, { recursive: false });
        await walk(from, to);
      } else if (stats.isFile()) {
        if (stats.size > MAX_MIGRATION_FILE_BYTES) throw new Error(`Legacy Project Brain file is too large to migrate safely: ${entry.name}`);
        await copyFile(from, to, 1);
      } else {
        throw new Error(`Legacy Project Brain contains unsupported filesystem entry: ${entry.name}`);
      }
    }
  };
  await walk(sourceRoot, targetRoot);
}

export async function ensureDesktopProjectBrainStorage(
  checkoutRoot: string,
  storageRoot: string,
): Promise<DesktopProjectBrainStorageResult> {
  const physicalCheckout = await assertRealDirectory(checkoutRoot, "Desktop project checkout");
  const physicalStorage = await assertRealDirectory(storageRoot, "Desktop project state root");
  if (pathIsWithin(physicalCheckout, physicalStorage) || pathIsWithin(physicalStorage, physicalCheckout)) {
    throw new Error("Desktop Project Brain storage must not overlap the user project checkout.");
  }

  const targetStore = new ProjectBrainStore(physicalStorage);
  const sourceStore = new ProjectBrainStore(physicalCheckout);
  const [target, source] = await Promise.all([targetStore.inspect(), sourceStore.inspect()]);

  if (target.health === "valid") {
    if (source.health === "not-found") return { state: "ready", migrated: false, storageRoot: physicalStorage };
    if (source.health !== "valid") {
      throw new Error(`Repository-local legacy Project Brain is ${source.health}; migration requires diagnosis before Livariant can ignore or remove it.`);
    }
    const [sourceDigest, targetDigest] = await Promise.all([safeTreeDigest(source.path), safeTreeDigest(target.path)]);
    if (sourceDigest !== targetDigest) {
      throw new Error("Both machine-local and repository-local Project Brains exist with different material; refusing to choose or overwrite either state.");
    }
    await rm(source.path, { recursive: true, force: false });
    return { state: "migrated", migrated: true, storageRoot: physicalStorage };
  }

  if (target.health !== "not-found") {
    throw new Error(`Machine-local Project Brain is ${target.health}; recovery is required before project activation can continue.`);
  }

  if (source.health === "valid") {
    const sourceDigest = await safeTreeDigest(source.path);
    const tempParent = resolve(physicalStorage, `.project-brain-import-${randomUUID()}`);
    if (!pathIsWithin(physicalStorage, tempParent)) throw new Error("Legacy Project Brain migration staging path is unsafe.");
    await mkdir(tempParent, { recursive: false });
    try {
      const stagedBrain = resolve(tempParent, ".project-brain");
      await copyTreeSafe(source.path, stagedBrain);
      const stagedStore = new ProjectBrainStore(tempParent);
      const staged = await stagedStore.inspect();
      if (staged.health !== "valid") throw new Error(`Migrated Project Brain candidate is ${staged.health}.`);
      const stagedDigest = await safeTreeDigest(staged.path);
      if (stagedDigest !== sourceDigest) throw new Error("Migrated Project Brain candidate does not match the exact legacy source material.");
      if (await safeTreeDigest(source.path) !== sourceDigest) throw new Error("Legacy Project Brain changed during migration; refusing stale promotion.");
      await rename(stagedBrain, target.path);
      await rm(tempParent, { recursive: true, force: true });
      const promoted = await targetStore.inspect();
      if (promoted.health !== "valid" || await safeTreeDigest(promoted.path) !== sourceDigest) {
        throw new Error("Machine-local Project Brain promotion could not be verified.");
      }
      if (await safeTreeDigest(source.path) !== sourceDigest) {
        throw new Error("Legacy Project Brain changed after promotion; source cleanup requires manual review.");
      }
      await rm(source.path, { recursive: true, force: false });
      return { state: "migrated", migrated: true, storageRoot: physicalStorage };
    } catch (error) {
      await rm(tempParent, { recursive: true, force: true });
      throw error;
    }
  }

  if (source.health !== "not-found") {
    throw new Error(`Repository-local legacy Project Brain is ${source.health}; migration requires diagnosis before a new machine-local brain may be created.`);
  }

  await initializeProject(physicalCheckout, { authorized: true, storageRoot: physicalStorage });
  const created = await targetStore.inspect();
  if (created.health !== "valid") throw new Error(`Machine-local Project Brain initialization completed without a valid result: ${created.health}.`);
  return { state: "created", migrated: false, storageRoot: physicalStorage };
}
