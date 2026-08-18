import type { GuardianAuthorityRecord } from "../guardian/authority-record.js";
import {
  findProjectBrainIntegrityGuardianAuthority,
  issueProjectBrainIntegrityGuardianAuthority,
} from "../guardian/project-brain-integrity-authority-transition.js";
import {
  PROJECT_BRAIN_INTEGRITY_SCHEMA_VERSION,
  inspectProjectBrainIntegrity,
  recordAcceptedProjectBrainState,
  type ProjectBrainIntegritySource,
  type ProjectBrainIntegrityState,
  type ProjectBrainIntegrityStorageOptions,
} from "./integrity.js";

type LocalMatch = Extract<ProjectBrainIntegrityState, { state: "match" }>;

export type ProtectedProjectBrainIntegrityState =
  | { state: "match"; local: LocalMatch; guardian: GuardianAuthorityRecord }
  | { state: "missing"; local: Extract<ProjectBrainIntegrityState, { state: "missing" }> }
  | { state: "mismatch"; local: Extract<ProjectBrainIntegrityState, { state: "mismatch" }> }
  | { state: "unprotected"; local: LocalMatch; reason: string }
  | { state: "invalid"; local: ProjectBrainIntegrityState; reason: string };

function integrityIdentity(local: LocalMatch) {
  return {
    stableProjectIdentity: local.receipt.stableProjectIdentity,
    integritySchemaVersion: PROJECT_BRAIN_INTEGRITY_SCHEMA_VERSION,
    baseline: local.current,
  } as const;
}

export async function inspectProtectedProjectBrainIntegrity(
  projectRoot: string = process.cwd(),
  options: ProjectBrainIntegrityStorageOptions = {},
): Promise<ProtectedProjectBrainIntegrityState> {
  const local = await inspectProjectBrainIntegrity(projectRoot, options);
  if (local.state === "missing") return { state: "missing", local };
  if (local.state === "mismatch") return { state: "mismatch", local };
  if (local.state === "invalid") return { state: "invalid", local, reason: local.reason };

  try {
    const protectedState = await findProjectBrainIntegrityGuardianAuthority(integrityIdentity(local), projectRoot);
    if (!protectedState.record) {
      return {
        state: "unprotected",
        local,
        reason: "Exact local Project Brain integrity evidence exists, but matching protected Guardian accepted-state Authority is missing.",
      };
    }
    return { state: "match", local, guardian: protectedState.record };
  } catch (error) {
    return {
      state: "invalid",
      local,
      reason: `Protected Guardian Project Brain integrity verification failed: ${error instanceof Error ? error.message : "unknown Guardian verification failure"}`,
    };
  }
}

export async function establishProtectedProjectBrainIntegrityState(
  projectRoot: string = process.cwd(),
  source: ProjectBrainIntegritySource,
  options: ProjectBrainIntegrityStorageOptions = {},
): Promise<{ local: LocalMatch; guardian: GuardianAuthorityRecord }> {
  await recordAcceptedProjectBrainState(projectRoot, source, options);
  const local = await inspectProjectBrainIntegrity(projectRoot, options);
  if (local.state !== "match") {
    throw new Error(`Machine-local Project Brain integrity evidence did not remain coherent before Guardian protection: ${local.state}.`);
  }

  const identity = integrityIdentity(local);
  const existing = await findProjectBrainIntegrityGuardianAuthority(identity, projectRoot);
  const guardian = existing.record ?? (await issueProjectBrainIntegrityGuardianAuthority(identity, projectRoot)).record;

  const revalidated = await inspectProtectedProjectBrainIntegrity(projectRoot, options);
  if (revalidated.state !== "match" || revalidated.guardian.recordId !== guardian.recordId) {
    throw new Error(`Project Brain changed or protected accepted-state verification failed during Guardian establishment: ${revalidated.state}.`);
  }
  return { local: revalidated.local, guardian: revalidated.guardian };
}
