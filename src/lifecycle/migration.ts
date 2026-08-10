import { cp, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { ProjectBrainStore } from "../project-brain/store.js";
import { assertPathWithinRoot, assertRegularFile } from "../project-brain/path-safety.js";
import { type LocalReleaseArtifact, type ReleaseIdentity } from "../distribution/release-integrity.js";
import {
  activateInstalledRuntime,
  installVerifiedRuntime,
  readActiveRuntimePointer,
  restoreActiveRuntimePointer,
} from "../distribution/runtime-installation.js";
import {
  computeCheckpointDigests,
  isCheckpointDigests,
  validateCheckpointDigests,
  type CheckpointDigests,
} from "./checkpoint-integrity.js";
import { compareSemver, releaseIdentity, type ReleaseDescriptor } from "./update.js";

export type MigrationExecutionState = "planned" | "checkpointed" | "applying" | "validating" | "complete" | "failed" | "recovery-required";
export type MigrationStepState = "not-started" | "in-progress" | "completed";

export interface MigrationContract {
  id: string;
  sourceSchema: number;
  targetSchema: number;
  replaySafe: boolean;
}

export interface MigrationPlan {
  operationId: string;
  sourceVersion: string;
  targetVersion: string;
  channel: "stable" | "preview" | "development";
  sourceId: string;
  artifactId: string;
  artifactSha256: string;
  sourceSchema: number;
  targetSchema: number;
  compatibility: "compatible_with_migration";
  migrationRequired: true;
  projectImpact: "project-brain";
  checkpointRequired: true;
  authorizationRequired: true;
  migration: MigrationContract;
}

export interface MigrationJournal {
  operationId: string;
  state: MigrationExecutionState;
  sourceVersion: string;
  targetVersion: string;
  sourceSchema: number;
  targetSchema: number;
  migrationId: string;
  stepState: MigrationStepState;
  checkpointPath: string;
  checkpointDigests: CheckpointDigests;
  recovery?: {
    state: "rolled-back" | "recovery-required";
    recoveredAt?: string;
    reason?: string;
  };
}

export interface ApplyMigrationOptions {
  authorized: boolean;
  artifact: LocalReleaseArtifact;
  trustedSourceIds: ReadonlySet<string>;
  failAfterMutation?: boolean;
  interruptAfterMutation?: boolean;
  beforeAutomaticRollback?: () => void | Promise<void>;
  validate?: () => void | Promise<void>;
}

const MIGRATION_1_TO_2: MigrationContract = {
  id: "pb-schema-1-to-2",
  sourceSchema: 1,
  targetSchema: 2,
  replaySafe: false,
};

const EXECUTION_STATES = new Set<MigrationExecutionState>([
  "planned",
  "checkpointed",
  "applying",
  "validating",
  "complete",
  "failed",
  "recovery-required",
]);
const STEP_STATES = new Set<MigrationStepState>(["not-started", "in-progress", "completed"]);
const REQUIRED_BRAIN_FILES = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"] as const;

function lifecycleDir(projectPath: string): string {
  return resolve(projectPath, ".project-brain", ".lifecycle");
}

function journalPath(projectPath: string): string {
  return resolve(lifecycleDir(projectPath), "migration-journal.json");
}

function isErrno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

function parseMigrationJournal(value: unknown): MigrationJournal {
  if (!value || typeof value !== "object") throw new Error("journal root is not an object");
  const journal = value as Partial<MigrationJournal>;
  if (typeof journal.operationId !== "string" || journal.operationId.length === 0) throw new Error("operationId is missing");
  if (typeof journal.state !== "string" || !EXECUTION_STATES.has(journal.state as MigrationExecutionState)) throw new Error("state is invalid");
  if (typeof journal.sourceVersion !== "string" || typeof journal.targetVersion !== "string") throw new Error("release identity is invalid");
  if (!Number.isInteger(journal.sourceSchema) || !Number.isInteger(journal.targetSchema)) throw new Error("schema identity is invalid");
  if (typeof journal.migrationId !== "string" || journal.migrationId.length === 0) throw new Error("migrationId is missing");
  if (typeof journal.stepState !== "string" || !STEP_STATES.has(journal.stepState as MigrationStepState)) throw new Error("stepState is invalid");
  if (typeof journal.checkpointPath !== "string" || journal.checkpointPath.length === 0) throw new Error("checkpointPath is missing");
  if (!isCheckpointDigests(journal.checkpointDigests)) throw new Error("checkpointDigests are invalid");
  if (journal.recovery !== undefined) {
    if (!journal.recovery || typeof journal.recovery !== "object") throw new Error("recovery evidence is invalid");
    if (journal.recovery.state !== "rolled-back" && journal.recovery.state !== "recovery-required") throw new Error("recovery state is invalid");
  }
  return journal as MigrationJournal;
}

async function ensureLifecycleDirectory(projectPath: string): Promise<string> {
  const brainPath = resolve(projectPath, ".project-brain");
  const path = lifecycleDir(projectPath);
  assertPathWithinRoot(brainPath, path, "Lifecycle directory");
  try {
    const stats = await lstat(path);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error("Lifecycle directory must be a real directory and must not be a symbolic link.");
    }
  } catch (error) {
    if (isErrno(error, "ENOENT")) {
      await mkdir(path, { recursive: false });
      const stats = await lstat(path);
      if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error("Lifecycle directory creation did not produce a safe directory.");
    } else {
      throw error;
    }
  }
  return path;
}

export async function writeMigrationJournal(projectPath: string, journal: MigrationJournal): Promise<void> {
  parseMigrationJournal(journal);
  const dir = await ensureLifecycleDirectory(projectPath);
  const path = journalPath(projectPath);
  const tempPath = resolve(dir, `.migration-journal.tmp-${randomUUID()}.json`);
  assertPathWithinRoot(dir, path, "Migration journal path");
  assertPathWithinRoot(dir, tempPath, "Migration journal temporary path");
  await writeFile(tempPath, `${JSON.stringify(journal, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    const persisted = parseMigrationJournal(JSON.parse(await readFile(tempPath, "utf8")) as unknown);
    if (persisted.operationId !== journal.operationId || persisted.state !== journal.state || persisted.stepState !== journal.stepState) {
      throw new Error("Migration journal candidate failed persistence verification.");
    }
    await rename(tempPath, path);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

export async function readMigrationJournal(projectPath: string): Promise<MigrationJournal | null> {
  const dir = lifecycleDir(projectPath);
  try {
    const dirStats = await lstat(dir);
    if (!dirStats.isDirectory() || dirStats.isSymbolicLink()) {
      throw new Error("Migration lifecycle directory is unsafe.");
    }
  } catch (error) {
    if (isErrno(error, "ENOENT")) return null;
    throw error;
  }

  const path = journalPath(projectPath);
  try {
    await assertRegularFile(path, "Migration journal");
  } catch (error) {
    if (isErrno(error, "ENOENT")) return null;
    throw error;
  }

  try {
    return parseMigrationJournal(JSON.parse(await readFile(path, "utf8")) as unknown);
  } catch (error) {
    throw new Error(`Migration journal is invalid: ${error instanceof Error ? error.message : "unknown parse failure"}`);
  }
}

export async function planMigrationUpdate(projectPath: string, release: ReleaseDescriptor): Promise<MigrationPlan> {
  const existingJournal = await readMigrationJournal(projectPath);
  if (existingJournal && existingJournal.state !== "complete" && existingJournal.state !== "failed") {
    throw new Error("Migration planning is blocked because recovery is required.");
  }

  const identity = releaseIdentity(release);
  const store = new ProjectBrainStore(projectPath);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") throw new Error("Migration planning requires a valid Project Brain.");
  const metadata = await store.readMetadata();
  if (!release.compatibility.from.includes(metadata.framework.version)) throw new Error("Release is not compatible with the active version.");
  if (release.channel !== metadata.framework.channel) throw new Error("Release channel does not match the active update channel.");
  if (compareSemver(release.version, metadata.framework.version) <= 0) throw new Error("Migration target must be a newer release for the supported update path.");
  if (metadata.projectBrain.schemaVersion !== 1 || release.projectBrainSchema !== 2) {
    throw new Error("No unambiguous supported migration path exists.");
  }
  return {
    operationId: randomUUID(),
    sourceVersion: metadata.framework.version,
    targetVersion: release.version,
    channel: release.channel,
    sourceId: identity.sourceId,
    artifactId: identity.artifactId,
    artifactSha256: identity.artifactSha256,
    sourceSchema: 1,
    targetSchema: 2,
    compatibility: "compatible_with_migration",
    migrationRequired: true,
    projectImpact: "project-brain",
    checkpointRequired: true,
    authorizationRequired: true,
    migration: MIGRATION_1_TO_2,
  };
}

async function validateCheckpointCandidate(
  candidatePath: string,
  sourceVersion: string,
  sourceSchema: number,
  expectedDigests?: CheckpointDigests,
): Promise<void> {
  const entries = new Set(await readdir(candidatePath));
  for (const file of REQUIRED_BRAIN_FILES) {
    if (!entries.has(file)) throw new Error(`Checkpoint candidate is missing ${file}.`);
    await assertRegularFile(resolve(candidatePath, file), `Checkpoint candidate file '${file}'`);
  }
  const metadata = JSON.parse(await readFile(resolve(candidatePath, "metadata.json"), "utf8")) as {
    framework?: { version?: unknown };
    projectBrain?: { schemaVersion?: unknown };
  };
  if (metadata.framework?.version !== sourceVersion || metadata.projectBrain?.schemaVersion !== sourceSchema) {
    throw new Error("Checkpoint candidate does not match the expected source state.");
  }
  if (expectedDigests) await validateCheckpointDigests(candidatePath, expectedDigests);
}

async function restoreCheckpointSafely(
  projectPath: string,
  checkpointPath: string,
  operationId: string,
  sourceVersion: string,
  sourceSchema: number,
  checkpointDigests: CheckpointDigests,
): Promise<void> {
  assertPathWithinRoot(projectPath, checkpointPath, "Migration checkpoint path");
  const expectedCheckpoint = resolve(projectPath, `.project-brain.checkpoint-${operationId}`);
  if (resolve(checkpointPath) !== expectedCheckpoint) throw new Error("Migration checkpoint path does not match the operation identity.");

  const brainPath = resolve(projectPath, ".project-brain");
  const candidatePath = resolve(projectPath, `.project-brain.rollback-candidate-${operationId}`);
  const displacedPath = resolve(projectPath, `.project-brain.rollback-displaced-${operationId}`);
  assertPathWithinRoot(projectPath, candidatePath, "Rollback candidate path");
  assertPathWithinRoot(projectPath, displacedPath, "Rollback displaced path");

  await rm(candidatePath, { recursive: true, force: true });
  await rm(displacedPath, { recursive: true, force: true });
  try {
    await cp(checkpointPath, candidatePath, { recursive: true });
    await validateCheckpointCandidate(candidatePath, sourceVersion, sourceSchema, checkpointDigests);

    await rename(brainPath, displacedPath);
    try {
      await rename(candidatePath, brainPath);
      const restored = new ProjectBrainStore(projectPath);
      const inspection = await restored.inspect();
      if (inspection.health !== "valid") throw new Error("Restored Project Brain failed structural validation.");
      const metadata = await restored.readMetadata();
      if (metadata.framework.version !== sourceVersion || metadata.projectBrain.schemaVersion !== sourceSchema) {
        throw new Error("Restored Project Brain failed source-state validation.");
      }
      await rm(displacedPath, { recursive: true, force: true });
    } catch (error) {
      await rm(brainPath, { recursive: true, force: true });
      await rename(displacedPath, brainPath);
      throw error;
    }
  } finally {
    await rm(candidatePath, { recursive: true, force: true });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function plannedReleaseIdentity(plan: MigrationPlan): ReleaseIdentity {
  return {
    version: plan.targetVersion,
    channel: plan.channel,
    sourceId: plan.sourceId,
    artifactId: plan.artifactId,
    artifactSha256: plan.artifactSha256,
  };
}

export async function applyMigrationUpdate(projectPath: string, plan: MigrationPlan, options: ApplyMigrationOptions): Promise<void> {
  if (!options.authorized) throw new Error("Migration application requires explicit authorization.");
  const existingJournal = await readMigrationJournal(projectPath);
  if (existingJournal && existingJournal.state !== "complete" && existingJournal.state !== "failed") {
    throw new Error("Interrupted or ambiguous migration requires recovery before a new migration can start.");
  }

  const store = new ProjectBrainStore(projectPath);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") throw new Error("Migration application requires a valid and filesystem-safe Project Brain.");
  const metadata = await store.readMetadata();
  if (metadata.framework.version !== plan.sourceVersion || metadata.projectBrain.schemaVersion !== plan.sourceSchema) {
    throw new Error("Migration plan is stale for the current active state.");
  }
  if (compareSemver(plan.targetVersion, plan.sourceVersion) <= 0) throw new Error("Migration plan is not an upgrade target.");

  const identity = plannedReleaseIdentity(plan);
  const installed = await installVerifiedRuntime(projectPath, identity, options.artifact, options.trustedSourceIds);
  const previousRuntime = await readActiveRuntimePointer(projectPath);
  let pointerChanged = false;

  const checkpointPath = resolve(projectPath, `.project-brain.checkpoint-${plan.operationId}`);
  assertPathWithinRoot(projectPath, checkpointPath, "Migration checkpoint path");
  await cp(resolve(projectPath, ".project-brain"), checkpointPath, { recursive: true });
  await validateCheckpointCandidate(checkpointPath, plan.sourceVersion, plan.sourceSchema);
  const checkpointDigests = await computeCheckpointDigests(checkpointPath);

  let journal: MigrationJournal = {
    operationId: plan.operationId,
    state: "checkpointed",
    sourceVersion: plan.sourceVersion,
    targetVersion: plan.targetVersion,
    sourceSchema: plan.sourceSchema,
    targetSchema: plan.targetSchema,
    migrationId: plan.migration.id,
    stepState: "not-started",
    checkpointPath,
    checkpointDigests,
  };
  await writeMigrationJournal(projectPath, journal);

  try {
    journal = { ...journal, state: "applying", stepState: "in-progress" };
    await writeMigrationJournal(projectPath, journal);

    const metadataPath = resolve(projectPath, ".project-brain", "metadata.json");
    await assertRegularFile(metadataPath, "Project Brain metadata");
    const current = JSON.parse(await readFile(metadataPath, "utf8")) as Record<string, unknown> & {
      framework: { version: string; channel: string };
      projectBrain: { schemaVersion: number };
    };
    const existingLifecycle = asRecord(current.lifecycle);
    const existingHistory = Array.isArray(existingLifecycle.migrationHistory)
      ? existingLifecycle.migrationHistory.filter((item): item is string => typeof item === "string")
      : [];
    const migrated = {
      ...current,
      projectBrain: { ...current.projectBrain, schemaVersion: 2 },
      lifecycle: {
        ...existingLifecycle,
        migrationHistory: [...existingHistory.filter((item) => item !== plan.migration.id), plan.migration.id],
      },
    };
    const tempMetadata = `${metadataPath}.migration-${plan.operationId}`;
    assertPathWithinRoot(resolve(projectPath, ".project-brain"), tempMetadata, "Migration metadata candidate path");
    await writeFile(tempMetadata, `${JSON.stringify(migrated, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    try {
      await rename(tempMetadata, metadataPath);
    } catch (error) {
      await rm(tempMetadata, { force: true });
      throw error;
    }

    if (options.interruptAfterMutation) return;
    if (options.failAfterMutation) throw new Error("simulated migration failure");

    journal = { ...journal, stepState: "completed", state: "validating" };
    await writeMigrationJournal(projectPath, journal);
    await options.validate?.();

    const postInspection = await store.inspect();
    if (postInspection.health !== "valid") throw new Error("Migration postcondition failed: Project Brain is not structurally valid.");
    const after = await store.readMetadata();
    if (after.projectBrain.schemaVersion !== 2) throw new Error("Migration postcondition failed: schema 2 not active.");

    await activateInstalledRuntime(projectPath, installed);
    pointerChanged = true;
    await store.updateFrameworkLifecycle(plan.targetVersion, plan.channel);
    const activated = await store.readMetadata();
    if (activated.framework.version !== plan.targetVersion || activated.projectBrain.schemaVersion !== plan.targetSchema) {
      throw new Error("Migration activation postcondition failed.");
    }

    journal = { ...journal, state: "complete" };
    await writeMigrationJournal(projectPath, journal);
    await rm(checkpointPath, { recursive: true, force: true });
  } catch (error) {
    try {
      await options.beforeAutomaticRollback?.();
      if (pointerChanged) {
        await restoreActiveRuntimePointer(projectPath, previousRuntime);
        pointerChanged = false;
      }
      await restoreCheckpointSafely(
        projectPath,
        checkpointPath,
        plan.operationId,
        plan.sourceVersion,
        plan.sourceSchema,
        journal.checkpointDigests,
      );
      journal = { ...journal, state: "failed" };
      await writeMigrationJournal(projectPath, journal);
      await rm(checkpointPath, { recursive: true, force: true });
    } catch (recoveryError) {
      journal = {
        ...journal,
        state: "recovery-required",
        recovery: {
          state: "recovery-required",
          reason: recoveryError instanceof Error ? recoveryError.message : "automatic rollback failed",
        },
      };
      try {
        await writeMigrationJournal(projectPath, journal);
      } catch {
        // If durable recovery evidence itself cannot be written, preserve the original error path and fail closed.
      }
    }
    throw error;
  }
}
