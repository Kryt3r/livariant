import {
  PROJECT_CONTEXT_MANAGED_INPUTS,
  type ProjectContextManagedInputName,
} from "../runtime/project-context-material.js";
import type { ReadyKnowledgeProjection } from "./knowledge-projection.js";
import {
  assertKnowledgeSchemaTransitionPlanCurrent,
  type KnowledgeSchemaTransitionPlan,
} from "./knowledge-schema-transition-plan.js";
import { auditProposedKnowledgeSchemaTarget } from "./knowledge-schema-target-audit.js";

/**
 * A PURE, NON-AUTHORITATIVE fault-state classifier for a future schema-3
 * migration protocol. It never reads/writes the filesystem, proves a Guardian
 * record, grants recovery rights, or completes a schema transition.
 *
 * All supplied "checkpoint" values are untrusted reports, not protected
 * evidence. A positive classification NEVER permits cleanup or restoration.
 */
export const KNOWLEDGE_RECOVERY_ASSESSMENT_VERSION = 1 as const;

export type ReportedMigrationCheckpoint =
  | "before-authority-consumption"
  | "authority-consumed"
  | "canonical-promotion-started"
  | "post-state-checkpoint-reported"
  | "unknown-or-conflicted";

export type ObservedMigrationMaterialState =
  | "source-v2-exact-untrusted"
  | "target-v3-exact-untrusted"
  | "interrupted-or-ambiguous";

export interface KnowledgeMigrationRecoveryAssessment {
  assessmentVersion: typeof KNOWLEDGE_RECOVERY_ASSESSMENT_VERSION;
  state: "source-intact-unverified" | "protected-recovery-required";
  observedMaterial: ObservedMigrationMaterialState;
  reason: string;
  stableProjectIdentity: string | null;
  comparisonTargetDigest: string | null;
  boundaries: {
    guardianAuthorityVerified: false;
    authorityUnconsumedProven: false;
    v3IntegrityEstablished: false;
    transactionRecoveryVerified: false;
    mayResumePromotion: false;
    mayCleanupStaging: false;
    mayRollback: false;
    mayAcceptSchema3: false;
    writesPerformed: false;
    changesMade: 0;
  };
}

const BLOCKED_BOUNDARIES = {
  guardianAuthorityVerified: false,
  authorityUnconsumedProven: false,
  v3IntegrityEstablished: false,
  transactionRecoveryVerified: false,
  mayResumePromotion: false,
  mayCleanupStaging: false,
  mayRollback: false,
  mayAcceptSchema3: false,
  writesPerformed: false,
  changesMade: 0,
} as const;

const CHECKPOINTS = new Set<ReportedMigrationCheckpoint>([
  "before-authority-consumption",
  "authority-consumed",
  "canonical-promotion-started",
  "post-state-checkpoint-reported",
  "unknown-or-conflicted",
]);

function assessment(
  state: KnowledgeMigrationRecoveryAssessment["state"],
  observedMaterial: ObservedMigrationMaterialState,
  reason: string,
  plan?: KnowledgeSchemaTransitionPlan,
): KnowledgeMigrationRecoveryAssessment {
  return {
    assessmentVersion: KNOWLEDGE_RECOVERY_ASSESSMENT_VERSION,
    state, observedMaterial, reason,
    stableProjectIdentity: plan?.stableProjectIdentity ?? null,
    comparisonTargetDigest: plan?.proposedTarget.targetDigest ?? null,
    boundaries: BLOCKED_BOUNDARIES,
  };
}

function exactUnmodifiedSource(
  expected: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
  observed: ReadonlyMap<string, Buffer>,
): boolean {
  if (observed.size !== PROJECT_CONTEXT_MANAGED_INPUTS.length) return false;
  const allowed = new Set<string>(PROJECT_CONTEXT_MANAGED_INPUTS);
  for (const [name, actual] of observed) {
    if (!allowed.has(name) || !Buffer.isBuffer(actual)) return false;
    const original = expected.get(name as ProjectContextManagedInputName);
    if (!original || !original.equals(actual)) return false;
  }
  return true;
}

/**
 * Snapshot-only classification: actual physical file safety, process races,
 * Guardian consumption, staging ownership, and protected receipts are NOT
 * evaluated here. Any incomplete/ambiguous material or reported post-consume
 * state MUST remain recovery-required, even if the canonical source appears
 * byte-identical. No automatic repair is ever returned.
 */
export function assessKnowledgeMigrationRecoverySnapshot(args: {
  plan: KnowledgeSchemaTransitionPlan;
  sourceProjection: ReadyKnowledgeProjection;
  originalInputs: ReadonlyMap<ProjectContextManagedInputName, Buffer>;
  observedCanonical: ReadonlyMap<string, Buffer>;
  reportedCheckpoint: ReportedMigrationCheckpoint;
  /** Presence is enough to block; staging bytes are never trusted or adopted. */
  observedStaging?: ReadonlyMap<string, Buffer> | null;
}): KnowledgeMigrationRecoveryAssessment {
  const { plan, sourceProjection, originalInputs, observedCanonical, reportedCheckpoint, observedStaging } = args;
  try {
    assertKnowledgeSchemaTransitionPlanCurrent(plan, sourceProjection, originalInputs);
  } catch {
    return assessment("protected-recovery-required", "interrupted-or-ambiguous",
      "Original accepted source, project identity, or transition plan is stale or malformed.");
  }

  if (!CHECKPOINTS.has(reportedCheckpoint)) {
    return assessment("protected-recovery-required", "interrupted-or-ambiguous",
      "Migration checkpoint report is unsupported or ambiguous.", plan);
  }

  const sourceExact = exactUnmodifiedSource(originalInputs, observedCanonical);
  const targetAudit = sourceExact
    ? null
    : auditProposedKnowledgeSchemaTarget(plan, sourceProjection, originalInputs, observedCanonical);
  const material: ObservedMigrationMaterialState = sourceExact
    ? "source-v2-exact-untrusted"
    : targetAudit?.state === "material-exact-untrusted"
      ? "target-v3-exact-untrusted" : "interrupted-or-ambiguous";

  // The mere presence of staging/backup evidence is unresolved; the caller's
  // checkpoint cannot prove who created it or whether Authority was consumed.
  if (observedStaging != null) {
    return assessment("protected-recovery-required", material,
      "Staging or backup material is present; protected ownership and recovery evidence must be verified.", plan);
  }

  if (reportedCheckpoint !== "before-authority-consumption") {
    return assessment("protected-recovery-required", material,
      "Guardian Authority may have been consumed or the recovery phase is uncertain.", plan);
  }

  if (!sourceExact) {
    return assessment("protected-recovery-required", material,
      material === "target-v3-exact-untrusted"
        ? "The exact proposed target bytes do not prove completed protected migration or unconsumed Authority."
        : "Canonical state is partial, mixed-schema, changed or otherwise ambiguous.", plan);
  }

  // Even when the five canonical v2 files are intact and caller reports a
  // pre-consumption phase, independent proof is still required before *any*
  // future staging cleanup or transaction step. No operation is authorized.
  return assessment("source-intact-unverified", material,
    "Original source bytes match, but the reported checkpoint is untrusted; independent Guardian verification is required.", plan);
}
