import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { isStableProjectIdentity } from "./identity.js";
import { ProjectBrainStore } from "./store.js";
import { frameHashField, readProjectContextManagedInputs } from "../runtime/project-context-material.js";

export const PROJECT_BRAIN_INTEGRITY_SCHEMA_VERSION = 1;
export const PROJECT_BRAIN_INTEGRITY_KIND = "livariant-project-brain-integrity" as const;
export const PROJECT_BRAIN_INTEGRITY_DOMAIN = "livariant:project-brain-integrity-material:v1" as const;

export type ProjectBrainIntegritySource = "initialization" | "semantic-apply" | "lifecycle" | "manual-bootstrap";

export interface ProjectBrainIntegrityBaseline {
  algorithm: "sha256";
  domain: typeof PROJECT_BRAIN_INTEGRITY_DOMAIN;
  digest: string;
  schemaVersion: 2;
}

interface PersistedProjectBrainIntegrity {
  schemaVersion: 1;
  kind: typeof PROJECT_BRAIN_INTEGRITY_KIND;
  projectLocatorDigest: string;
  stableProjectIdentity: string;
  baseline: ProjectBrainIntegrityBaseline;
  source: ProjectBrainIntegritySource;
  acceptedAt: string;
}

export type ProjectBrainIntegrityState =
  | { state: "match"; current: ProjectBrainIntegrityBaseline; receipt: PersistedProjectBrainIntegrity }
  | { state: "missing"; current: ProjectBrainIntegrityBaseline; stableProjectIdentity: string }
  | { state: "mismatch"; current: ProjectBrainIntegrityBaseline; receipt: PersistedProjectBrainIntegrity; reason: string }
  | { state: "invalid"; current: ProjectBrainIntegrityBaseline | null; reason: string };

export interface ProjectBrainIntegrityStorageOptions {
  homeDir?: string;
  beforeCommit?: () => void | Promise<void>;
}

function errno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

function pathIsWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}

async function assertRealDirectory(path: string, label: string): Promise<boolean> {
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    if (errno(error, "ENOENT")) return false;
    throw error;
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} must be a real directory and must not be a symbolic link.`);
  return true;
}

async function ensureRealDirectory(path: string, label: string): Promise<void> {
  if (!await assertRealDirectory(path, label)) {
    try {
      await mkdir(path, { recursive: false });
    } catch (error) {
      if (!errno(error, "EEXIST")) throw error;
    }
  }
  if (!await assertRealDirectory(path, label)) throw new Error(`${label} could not be established.`);
}

function integrityBase(homeDir: string): string {
  return resolve(homeDir, ".livariant", "integrity", "project-brain");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function projectLocatorDigest(projectRoot: string): Promise<string> {
  return sha256(await realpath(projectRoot));
}

async function safeIntegrityBase(
  projectRoot: string,
  create: boolean,
  options: ProjectBrainIntegrityStorageOptions,
): Promise<string | null> {
  const home = resolve(options.homeDir ?? userInfo().homedir);
  const base = integrityBase(home);
  if (create) {
    const livariantRoot = resolve(home, ".livariant");
    const integrityRoot = resolve(livariantRoot, "integrity");
    await ensureRealDirectory(livariantRoot, "Machine-local Livariant root");
    await ensureRealDirectory(integrityRoot, "Machine-local integrity root");
    await ensureRealDirectory(base, "Machine-local Project Brain integrity root");
  } else if (!await assertRealDirectory(base, "Machine-local Project Brain integrity root")) {
    return null;
  }

  const [physicalHome, physicalBase, physicalProject] = await Promise.all([
    realpath(home),
    realpath(base),
    realpath(projectRoot),
  ]);
  if (!pathIsWithin(physicalHome, physicalBase)) throw new Error("Machine-local Project Brain integrity root resolves outside the operating-system user home.");
  if (pathIsWithin(physicalBase, physicalProject) || pathIsWithin(physicalProject, physicalBase)) {
    throw new Error("Machine-local Project Brain integrity state must not overlap the current project directory.");
  }
  return physicalBase;
}

function sameBaseline(left: ProjectBrainIntegrityBaseline, right: ProjectBrainIntegrityBaseline): boolean {
  return left.algorithm === right.algorithm
    && left.domain === right.domain
    && left.digest === right.digest
    && left.schemaVersion === right.schemaVersion;
}

function parseReceipt(value: unknown): PersistedProjectBrainIntegrity {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Project Brain integrity evidence is invalid.");
  const record = value as Record<string, unknown>;
  const allowed = new Set(["schemaVersion", "kind", "projectLocatorDigest", "stableProjectIdentity", "baseline", "source", "acceptedAt"]);
  for (const key of Object.keys(record)) if (!allowed.has(key)) throw new Error("Project Brain integrity evidence contains an unsupported field.");
  for (const key of allowed) if (!(key in record)) throw new Error(`Project Brain integrity evidence is missing required field: ${key}.`);
  if (record.schemaVersion !== 1 || record.kind !== PROJECT_BRAIN_INTEGRITY_KIND) throw new Error("Project Brain integrity evidence schema is invalid.");
  if (typeof record.projectLocatorDigest !== "string" || !/^[a-f0-9]{64}$/.test(record.projectLocatorDigest)) throw new Error("Project Brain integrity project-locator digest is invalid.");
  if (!isStableProjectIdentity(record.stableProjectIdentity)) throw new Error("Project Brain integrity stable project identity is invalid.");
  if (typeof record.source !== "string" || !new Set<ProjectBrainIntegritySource>(["initialization", "semantic-apply", "lifecycle", "manual-bootstrap"]).has(record.source as ProjectBrainIntegritySource)) throw new Error("Project Brain integrity source is invalid.");
  if (typeof record.acceptedAt !== "string" || Number.isNaN(Date.parse(record.acceptedAt))) throw new Error("Project Brain integrity timestamp is invalid.");

  const baseline = record.baseline as Partial<ProjectBrainIntegrityBaseline> | undefined;
  if (!baseline || baseline.algorithm !== "sha256" || baseline.domain !== PROJECT_BRAIN_INTEGRITY_DOMAIN || typeof baseline.digest !== "string" || !/^[a-f0-9]{64}$/.test(baseline.digest) || baseline.schemaVersion !== 2) {
    throw new Error("Project Brain integrity baseline is invalid.");
  }

  return {
    schemaVersion: 1,
    kind: PROJECT_BRAIN_INTEGRITY_KIND,
    projectLocatorDigest: record.projectLocatorDigest,
    stableProjectIdentity: record.stableProjectIdentity,
    baseline: baseline as ProjectBrainIntegrityBaseline,
    source: record.source as ProjectBrainIntegritySource,
    acceptedAt: record.acceptedAt,
  };
}

function buildIntegrityBaseline(
  stableProjectIdentity: string,
  inputs: ReadonlyMap<string, Buffer>,
): ProjectBrainIntegrityBaseline {
  const hash = createHash("sha256");
  frameHashField(hash, "domain", Buffer.from(PROJECT_BRAIN_INTEGRITY_DOMAIN, "utf8"));
  frameHashField(hash, "schema-version", Buffer.from("2", "utf8"));
  frameHashField(hash, "stable-project-identity", Buffer.from(stableProjectIdentity, "utf8"));
  for (const name of ["project.md", "goals.md", "decisions.md", "knowledge.md"] as const) {
    const bytes = inputs.get(name);
    if (!bytes) throw new Error(`Project Brain integrity material is missing ${name}.`);
    frameHashField(hash, `managed:${name}`, bytes);
  }
  return {
    algorithm: "sha256",
    domain: PROJECT_BRAIN_INTEGRITY_DOMAIN,
    digest: hash.digest("hex"),
    schemaVersion: 2,
  };
}

async function currentMaterial(projectRoot: string): Promise<{ stableProjectIdentity: string; baseline: ProjectBrainIntegrityBaseline }> {
  const store = new ProjectBrainStore(projectRoot);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") throw new Error("Project Brain integrity requires a valid Project Brain.");
  const metadata = await store.readMetadata();
  if (metadata.projectBrain.schemaVersion !== 2 || !isStableProjectIdentity(metadata.projectBrain.projectId)) {
    throw new Error("Project Brain integrity v1 requires schema 2 with a valid stable project identity.");
  }
  const inputs = await readProjectContextManagedInputs(inspection.path);
  return {
    stableProjectIdentity: metadata.projectBrain.projectId,
    baseline: buildIntegrityBaseline(metadata.projectBrain.projectId, inputs),
  };
}

async function receiptPath(projectRoot: string, base: string): Promise<string> {
  const path = resolve(base, `${await projectLocatorDigest(projectRoot)}.json`);
  if (!pathIsWithin(base, path)) throw new Error("Machine-local Project Brain integrity path is unsafe.");
  return path;
}

export async function inspectProjectBrainIntegrity(
  projectRoot: string = process.cwd(),
  options: ProjectBrainIntegrityStorageOptions = {},
): Promise<ProjectBrainIntegrityState> {
  let current: Awaited<ReturnType<typeof currentMaterial>>;
  try {
    current = await currentMaterial(projectRoot);
  } catch (error) {
    return { state: "invalid", current: null, reason: error instanceof Error ? error.message : "Project Brain integrity material is invalid." };
  }

  let base: string | null;
  try {
    base = await safeIntegrityBase(projectRoot, false, options);
  } catch (error) {
    return { state: "invalid", current: current.baseline, reason: error instanceof Error ? error.message : "Machine-local Project Brain integrity state is unsafe." };
  }
  if (!base) return { state: "missing", current: current.baseline, stableProjectIdentity: current.stableProjectIdentity };

  const path = await receiptPath(projectRoot, base);
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    if (errno(error, "ENOENT")) return { state: "missing", current: current.baseline, stableProjectIdentity: current.stableProjectIdentity };
    return { state: "invalid", current: current.baseline, reason: error instanceof Error ? error.message : "Project Brain integrity evidence is unreadable." };
  }
  if (!stats.isFile() || stats.isSymbolicLink()) return { state: "invalid", current: current.baseline, reason: "Project Brain integrity evidence must be a regular non-symbolic-link file." };

  let receipt: PersistedProjectBrainIntegrity;
  try {
    receipt = parseReceipt(JSON.parse(await readFile(path, "utf8")) as unknown);
  } catch (error) {
    return { state: "invalid", current: current.baseline, reason: error instanceof Error ? error.message : "Project Brain integrity evidence is malformed." };
  }

  const locator = await projectLocatorDigest(projectRoot);
  if (receipt.projectLocatorDigest !== locator) return { state: "mismatch", current: current.baseline, receipt, reason: "Project Brain integrity evidence does not match the current physical project location." };
  if (receipt.stableProjectIdentity !== current.stableProjectIdentity) return { state: "mismatch", current: current.baseline, receipt, reason: "Project Brain stable identity differs from the last accepted machine-local integrity state." };
  if (!sameBaseline(receipt.baseline, current.baseline)) return { state: "mismatch", current: current.baseline, receipt, reason: "Managed Project Brain semantic bytes differ from the last accepted canonical material state." };
  return { state: "match", current: current.baseline, receipt };
}

export async function recordAcceptedProjectBrainState(
  projectRoot: string = process.cwd(),
  source: ProjectBrainIntegritySource,
  options: ProjectBrainIntegrityStorageOptions = {},
): Promise<PersistedProjectBrainIntegrity> {
  const current = await currentMaterial(projectRoot);
  const base = await safeIntegrityBase(projectRoot, true, options);
  if (!base) throw new Error("Machine-local Project Brain integrity root could not be established.");
  const path = await receiptPath(projectRoot, base);
  const temp = resolve(base, `.integrity-${randomUUID()}.tmp`);
  if (!pathIsWithin(base, temp)) throw new Error("Machine-local Project Brain integrity temporary path is unsafe.");
  const receipt: PersistedProjectBrainIntegrity = {
    schemaVersion: 1,
    kind: PROJECT_BRAIN_INTEGRITY_KIND,
    projectLocatorDigest: await projectLocatorDigest(projectRoot),
    stableProjectIdentity: current.stableProjectIdentity,
    baseline: current.baseline,
    source,
    acceptedAt: new Date().toISOString(),
  };
  await writeFile(temp, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    await options.beforeCommit?.();
    const revalidated = await currentMaterial(projectRoot);
    if (revalidated.stableProjectIdentity !== current.stableProjectIdentity || !sameBaseline(revalidated.baseline, current.baseline)) {
      throw new Error("Project Brain changed while accepted integrity evidence was being committed; refusing a stale integrity checkpoint.");
    }
    await rename(temp, path);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
  return receipt;
}
