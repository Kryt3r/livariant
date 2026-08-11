import { access, cp, lstat, mkdir, readFile, readdir, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { ProjectBrainStore } from "../project-brain/store.js";
import { assertPathWithinRoot, assertRegularFile } from "../project-brain/path-safety.js";
import { validateCheckpointDigests } from "./checkpoint-integrity.js";
import { readMigrationJournal, writeMigrationJournal, type MigrationJournal } from "./migration.js";

export interface RecoveryInspection {
  state: "none" | "interrupted-migration" | "recovery-required";
  operationId?: string;
  migrationId?: string;
  sourceVersion?: string;
  targetVersion?: string;
  sourceSchema?: number;
  targetSchema?: number;
  currentSchema?: number;
  checkpointPath?: string;
  checkpointValid: boolean;
  recommendedStrategy?: "rollback";
  reason?: string;
}

export interface RecoveryPlan {
  recoveryOperationId: string;
  interruptedOperationId: string;
  strategy: "rollback";
  checkpointPath: string;
  expectedSourceVersion: string;
  expectedSourceSchema: number;
  authorizationRequired: true;
}

export interface ApplyRecoveryOptions {
  authorized: boolean;
  failBeforePromote?: boolean;
}

const REQUIRED = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"] as const;
const OPERATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STRANDED_PREFIXES = [
  ".project-brain.recovery-displaced-",
  ".project-brain.rollback-displaced-",
  ".project-brain.recovery-candidate-",
  ".project-brain.rollback-candidate-",
  ".project-brain.checkpoint-",
] as const;

function canonicalCheckpointPath(projectPath: string, operationId: string): string {
  if (!OPERATION_ID.test(operationId)) throw new Error("migration operation identity is invalid");
  const path = resolve(projectPath, `.project-brain.checkpoint-${operationId}`);
  assertPathWithinRoot(projectPath, path, "Recovery checkpoint path");
  const brainPath = resolve(projectPath, ".project-brain");
  if (path === brainPath) throw new Error("recovery checkpoint must not alias the active Project Brain");
  return path;
}

export async function findStrandedLifecycleArtifacts(projectPath: string): Promise<string[]> {
  const entries = await readdir(projectPath, { withFileTypes: true });
  return entries
    .filter((entry) => STRANDED_PREFIXES.some((prefix) => entry.name.startsWith(prefix)))
    .map((entry) => entry.name)
    .sort();
}

async function validateCheckpoint(projectPath: string, journal: MigrationJournal): Promise<{ valid: boolean; reason?: string; path?: string }> {
  try {
    const expectedPath = canonicalCheckpointPath(projectPath, journal.operationId);
    if (resolve(journal.checkpointPath) !== expectedPath) {
      return { valid: false, reason: "checkpoint path does not match the interrupted operation" };
    }
    const checkpointStats = await lstat(expectedPath);
    if (!checkpointStats.isDirectory() || checkpointStats.isSymbolicLink()) {
      return { valid: false, reason: "checkpoint root must be a real directory and must not be a symbolic link" };
    }
    await access(expectedPath);
    for (const file of REQUIRED) {
      const candidate = resolve(expectedPath, file);
      assertPathWithinRoot(expectedPath, candidate, `Recovery checkpoint file '${file}'`);
      await assertRegularFile(candidate, `Recovery checkpoint file '${file}'`);
    }
    const metadata = JSON.parse(await readFile(resolve(expectedPath, "metadata.json"), "utf8")) as {
      framework?: { version?: unknown };
      projectBrain?: { schemaVersion?: unknown };
    };
    if (metadata.framework?.version !== journal.sourceVersion) return { valid: false, reason: "checkpoint source version does not match journal" };
    if (metadata.projectBrain?.schemaVersion !== journal.sourceSchema) return { valid: false, reason: "checkpoint source schema does not match journal" };
    await validateCheckpointDigests(expectedPath, journal.checkpointDigests);
    return { valid: true, path: expectedPath };
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : "checkpoint is missing or invalid" };
  }
}

export async function inspectRecovery(projectPath: string): Promise<RecoveryInspection> {
  let journal: MigrationJournal | null;
  try {
    journal = await readMigrationJournal(projectPath);
  } catch (error) {
    return {
      state: "recovery-required",
      checkpointValid: false,
      reason: `migration lifecycle evidence is invalid: ${error instanceof Error ? error.message : "unknown journal failure"}`,
    };
  }

  if (!journal) {
    const brainInspection = await new ProjectBrainStore(projectPath).inspect();
    if (brainInspection.health === "not-found") {
      const stranded = await findStrandedLifecycleArtifacts(projectPath);
      if (stranded.length > 0) {
        return {
          state: "recovery-required",
          checkpointValid: false,
          reason: `stranded lifecycle artifacts exist while the canonical Project Brain is missing: ${stranded.join(", ")}`,
        };
      }
    }
    return { state: "none", checkpointValid: false };
  }

  if (journal.state === "complete" || journal.state === "failed") {
    return { state: "none", checkpointValid: false };
  }

  const checkpoint = await validateCheckpoint(projectPath, journal);
  let currentSchema: number | undefined;
  try {
    currentSchema = (await new ProjectBrainStore(projectPath).readMetadata()).projectBrain.schemaVersion;
  } catch {
    currentSchema = undefined;
  }

  return {
    state: checkpoint.valid ? "interrupted-migration" : "recovery-required",
    operationId: journal.operationId,
    migrationId: journal.migrationId,
    sourceVersion: journal.sourceVersion,
    targetVersion: journal.targetVersion,
    sourceSchema: journal.sourceSchema,
    targetSchema: journal.targetSchema,
    currentSchema,
    checkpointPath: checkpoint.path,
    checkpointValid: checkpoint.valid,
    recommendedStrategy: checkpoint.valid ? "rollback" : undefined,
    reason: checkpoint.reason,
  };
}

export async function planRecovery(projectPath: string): Promise<RecoveryPlan> {
  const inspection = await inspectRecovery(projectPath);
  if (inspection.state !== "interrupted-migration" || !inspection.checkpointValid || !inspection.operationId || !inspection.checkpointPath || inspection.sourceVersion === undefined || inspection.sourceSchema === undefined) {
    throw new Error(inspection.reason ?? "Automatic recovery is unavailable for the current state.");
  }
  return {
    recoveryOperationId: randomUUID(),
    interruptedOperationId: inspection.operationId,
    strategy: "rollback",
    checkpointPath: canonicalCheckpointPath(projectPath, inspection.operationId),
    expectedSourceVersion: inspection.sourceVersion,
    expectedSourceSchema: inspection.sourceSchema,
    authorizationRequired: true,
  };
}

export async function applyRecovery(projectPath: string, plan: RecoveryPlan, options: ApplyRecoveryOptions): Promise<void> {
  if (!options.authorized) throw new Error("Recovery application requires explicit authorization.");
  if (!OPERATION_ID.test(plan.interruptedOperationId) || !OPERATION_ID.test(plan.recoveryOperationId)) {
    throw new Error("Recovery plan contains an invalid operation identity.");
  }
  const journal = await readMigrationJournal(projectPath);
  if (!journal || journal.operationId !== plan.interruptedOperationId) throw new Error("Recovery plan is stale for the current migration state.");
  const checkpoint = await validateCheckpoint(projectPath, journal);
  if (!checkpoint.valid || !checkpoint.path) {
    await writeMigrationJournal(projectPath, { ...journal, state: "recovery-required", recovery: { state: "recovery-required", reason: checkpoint.reason } });
    throw new Error(checkpoint.reason ?? "Checkpoint validation failed.");
  }

  const checkpointPath = canonicalCheckpointPath(projectPath, journal.operationId);
  if (resolve(plan.checkpointPath) !== checkpointPath) throw new Error("Recovery plan checkpoint identity is stale or invalid.");
  const brainPath = resolve(projectPath, ".project-brain");
  if (checkpointPath === brainPath) throw new Error("Recovery checkpoint must not alias the active Project Brain.");
  const candidatePath = resolve(projectPath, `.project-brain.recovery-candidate-${plan.recoveryOperationId}`);
  const displacedPath = resolve(projectPath, `.project-brain.recovery-displaced-${plan.recoveryOperationId}`);
  assertPathWithinRoot(projectPath, candidatePath, "Recovery candidate path");
  assertPathWithinRoot(projectPath, displacedPath, "Recovery displaced path");

  try {
    await cp(checkpointPath, candidatePath, { recursive: true });
    await validateCheckpointDigests(candidatePath, journal.checkpointDigests);
    const candidateMetadata = JSON.parse(await readFile(resolve(candidatePath, "metadata.json"), "utf8")) as {
      framework: { version: string };
      projectBrain: { schemaVersion: number };
    };
    if (candidateMetadata.framework.version !== plan.expectedSourceVersion || candidateMetadata.projectBrain.schemaVersion !== plan.expectedSourceSchema) {
      throw new Error("Recovery candidate does not match expected source state.");
    }
    if (options.failBeforePromote) throw new Error("simulated recovery promotion failure");

    await rename(brainPath, displacedPath);
    try {
      await rename(candidatePath, brainPath);
      const restoredStore = new ProjectBrainStore(projectPath);
      const restoredInspection = await restoredStore.inspect();
      if (restoredInspection.health !== "valid") throw new Error("Recovered Project Brain failed structural validation.");
      const restored = await restoredStore.readMetadata();
      if (restored.framework.version !== plan.expectedSourceVersion || restored.projectBrain.schemaVersion !== plan.expectedSourceSchema) {
        throw new Error("Recovered Project Brain failed postcondition validation.");
      }
      await mkdir(resolve(brainPath, ".lifecycle"), { recursive: true });
      await writeMigrationJournal(projectPath, {
        ...journal,
        checkpointPath,
        state: "failed",
        recovery: { state: "rolled-back", recoveredAt: new Date().toISOString() },
      });
      const cleanupCheckpoint = canonicalCheckpointPath(projectPath, journal.operationId);
      if (cleanupCheckpoint === resolve(projectPath, ".project-brain")) throw new Error("Refusing to remove an unsafe recovery checkpoint path.");
      await rm(cleanupCheckpoint, { recursive: true, force: true });
      await rm(displacedPath, { recursive: true, force: true });
    } catch (error) {
      await rm(brainPath, { recursive: true, force: true });
      await rename(displacedPath, brainPath);
      await writeMigrationJournal(projectPath, {
        ...journal,
        checkpointPath,
        state: "recovery-required",
        recovery: { state: "recovery-required", reason: error instanceof Error ? error.message : "recovery failed" },
      });
      throw error;
    }
  } finally {
    await rm(candidatePath, { recursive: true, force: true });
  }
}
