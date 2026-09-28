import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import type { GuardianAuthorityRecord } from "../guardian/authority-record.js";
import { findMatchingConsumedGuardianAuthority } from "../guardian/authority-client.js";
import { buildSemanticGuardianAuthorityRequestFromBinding } from "../guardian/semantic-authority.js";
import { inspectAuthorizationAudit } from "../runtime/authorization.js";
import {
  buildProjectContextBaseline,
  readProjectContextManagedInputs,
} from "../runtime/project-context-material.js";
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

export interface ProtectedIntegrityEstablishOptions extends ProjectBrainIntegrityStorageOptions {
  nativeConfirmationLanguage?: "de" | "en";
}

export type ProtectedProjectBrainIntegrityState =
  | { state: "match"; local: LocalMatch; guardian: GuardianAuthorityRecord }
  | { state: "missing"; local: Extract<ProjectBrainIntegrityState, { state: "missing" }> }
  | { state: "mismatch"; local: Extract<ProjectBrainIntegrityState, { state: "mismatch" }> }
  | { state: "unprotected"; local: LocalMatch; reason: string }
  | { state: "invalid"; local: ProjectBrainIntegrityState; reason: string };

async function semanticGuardianProof(
  local: LocalMatch,
  projectRoot: string,
): Promise<GuardianAuthorityRecord | null> {
  const audit = await inspectAuthorizationAudit(projectRoot);
  const candidates = audit.history.filter((record) =>
    record.state === "completed"
    && record.stableProjectIdentity === local.receipt.stableProjectIdentity
  );
  if (candidates.length === 0) return null;

  const physicalProjectRoot = await realpath(projectRoot);
  const inputs = await readProjectContextManagedInputs(resolve(projectRoot, ".project-brain"));
  for (const record of candidates) {
    const expectedPostBaseline = buildProjectContextBaseline(inputs, record.baseline.schemaVersion);
    const material = buildSemanticGuardianAuthorityRequestFromBinding({
      authorizationId: record.authorizationId,
      physicalProjectRoot,
      stableProjectIdentity: record.stableProjectIdentity,
      actionableProposalId: record.actionableProposalId,
      proposalDigest: record.proposalDigest,
      baseline: record.baseline,
      expectedPostBaseline,
      mutationScope: record.mutationScope,
    });
    const proof = await findMatchingConsumedGuardianAuthority({
      consumer: "semantic-mutation",
      mode: "one-shot",
      materialSha256: material.materialSha256,
      projectPath: projectRoot,
    });
    if (proof) return proof;
  }
  return null;
}

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
    if (protectedState.record) return { state: "match", local, guardian: protectedState.record };

    const semanticProof = await semanticGuardianProof(local, projectRoot);
    if (semanticProof) return { state: "match", local, guardian: semanticProof };

    return {
      state: "unprotected",
      local,
      reason: "Exact local Project Brain integrity evidence exists, but neither matching protected baseline Authority nor a completed protected Semantic Authority proves this accepted state.",
    };
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
  options: ProtectedIntegrityEstablishOptions = {},
): Promise<{ local: LocalMatch; guardian: GuardianAuthorityRecord }> {
  await recordAcceptedProjectBrainState(projectRoot, source, options);
  const local = await inspectProjectBrainIntegrity(projectRoot, options);
  if (local.state !== "match") {
    throw new Error(`Machine-local Project Brain integrity evidence did not remain coherent before Guardian protection: ${local.state}.`);
  }

  const identity = integrityIdentity(local);
  const existing = await findProjectBrainIntegrityGuardianAuthority(identity, projectRoot);
  const guardian = existing.record ?? (await issueProjectBrainIntegrityGuardianAuthority(identity, projectRoot, {
    nativeConfirmationLanguage: options.nativeConfirmationLanguage,
  })).record;

  const revalidated = await inspectProtectedProjectBrainIntegrity(projectRoot, options);
  if (revalidated.state !== "match" || revalidated.guardian.recordId !== guardian.recordId) {
    throw new Error(`Project Brain changed or protected accepted-state verification failed during Guardian establishment: ${revalidated.state}.`);
  }
  return { local: revalidated.local, guardian: revalidated.guardian };
}
