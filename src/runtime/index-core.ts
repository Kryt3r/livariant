import { discoverProject } from "../project/discovery.js";
import { recordAcceptedProjectBrainState } from "../project-brain/integrity.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { FRAMEWORK_VERSION, UPDATE_CHANNEL, type LifecycleState } from "../lifecycle/state.js";
import {
  applyMigrationUpdate as applyMigrationUpdateCore,
  planMigrationUpdate,
  readMigrationJournal,
  type ApplyMigrationOptions,
  type MigrationContract,
  type MigrationExecutionState,
  type MigrationJournal,
  type MigrationPlan,
  type MigrationStepState,
} from "../lifecycle/migration.js";
import {
  applyRecovery as applyRecoveryCore,
  findStrandedLifecycleArtifacts,
  inspectRecovery,
  planRecovery,
  type ApplyRecoveryOptions,
  type RecoveryInspection,
  type RecoveryPlan,
} from "../lifecycle/recovery.js";
import { compareSemver } from "../lifecycle/update.js";
import { readActiveRuntimePointer } from "../distribution/runtime-installation.js";
export { initializeProject, inspectInitialization } from "./initialization.js";
export type { InitializationPlan, InitializeResult, InitializeOptions } from "./initialization.js";
export { buildResumeContext } from "./resume.js";
export type { ResumeContext } from "./resume.js";
export { buildProjectContextSnapshot } from "./context-snapshot.js";
export type {
  BlockedProjectContextSnapshot,
  ClearProjectContextSnapshot,
  ProjectContextBaseline,
  ProjectContextItem,
  ProjectContextProjectionMetadata,
  ProjectContextSnapshot,
  ProjectContextSnapshotBuildOptions,
  ProjectContextSnapshotContext,
} from "./context-snapshot.js";
export {
  buildSemanticProposal,
  parseSemanticProposalCandidate,
  readSemanticProposalCandidateFile,
  SEMANTIC_PROPOSAL_CANDIDATE_FILE_MAX_BYTES,
  SEMANTIC_PROPOSAL_RATIONALE_MAX_BYTES,
  SEMANTIC_PROPOSAL_SCHEMA_VERSION,
  SEMANTIC_PROPOSAL_STATEMENT_MAX_BYTES,
} from "./semantic-proposal.js";
export type {
  AddDecisionProposalCandidate,
  BlockedSemanticProposalResult,
  ReadySemanticProposalResult,
  SemanticProposal,
  SemanticProposalActionability,
  SemanticProposalBuildOptions,
  SemanticProposalCandidate,
  SemanticProposalEvidenceDecision,
  SemanticProposalFinding,
  SemanticProposalOriginClaim,
  SemanticProposalResult,
  SupersedeDecisionProposalCandidate,
} from "./semantic-proposal.js";
export {
  ACTIONABLE_PROPOSAL_FILE_MAX_BYTES,
  ACTIONABLE_PROPOSAL_SCHEMA_VERSION,
  buildActionableProposal,
  parseActionableProposal,
  readActionableProposalFile,
} from "./actionable-proposal.js";
export type {
  ActionableProposal,
  ActionableProposalActionability,
  ActionableProposalBuildOptions,
  ActionableProposalResult,
  ActionableProposalScope,
  BlockedActionableProposalResult,
  ReadyActionableProposalResult,
} from "./actionable-proposal.js";
export {
  AUTHORIZATION_SCHEMA_VERSION,
  inspectAuthorizationAudit,
} from "./authorization.js";
export type {
  AuthorizationState,
  ProjectAuthorizationRecord,
} from "./authorization.js";
export {
  applyActionableProposal,
  verifySemanticApplyPostcondition,
} from "./semantic-apply.js";
export type {
  SemanticApplyOptions,
  SemanticApplyResult,
} from "./semantic-apply.js";
export { listAcceptedDecisions, recordAcceptedDecision, supersedeAcceptedDecision } from "./canonical-change.js";
export type { CanonicalDecisionChangeOptions, SupersedeDecisionInput, SupersedeDecisionResult } from "./canonical-change.js";
export { addConfirmedGoal, addConfirmedKnowledge } from "./canonical-knowledge-change.js";
export type { CanonicalKnowledgeChangeOptions, CanonicalKnowledgeChangeResult } from "./canonical-knowledge-change.js";
export { runDoctor } from "./doctor.js";
export type { DoctorFinding, DoctorReport, DoctorState } from "./doctor.js";
export { applyNormalUpdate, checkForUpdate, compareSemver, planNormalUpdate } from "../lifecycle/update.js";
export type { ApplyUpdateOptions, ReleaseDescriptor, UpdateCheck, UpdatePlan } from "../lifecycle/update.js";
export { planMigrationUpdate, readMigrationJournal };
export type { ApplyMigrationOptions, MigrationContract, MigrationExecutionState, MigrationJournal, MigrationPlan, MigrationStepState };
export { findStrandedLifecycleArtifacts, inspectRecovery, planRecovery };
export type { ApplyRecoveryOptions, RecoveryInspection, RecoveryPlan };

async function refreshIntegrityAfterLifecycleIfApplicable(projectPath: string): Promise<void> {
  const store = new ProjectBrainStore(projectPath);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") return;
  const metadata = await store.readMetadata();
  if (metadata.projectBrain.schemaVersion === 2) {
    await recordAcceptedProjectBrainState(projectPath, "lifecycle");
  }
}

export async function applyMigrationUpdate(
  projectPath: string,
  plan: MigrationPlan,
  options: ApplyMigrationOptions,
): Promise<void> {
  await applyMigrationUpdateCore(projectPath, plan, options);
  await refreshIntegrityAfterLifecycleIfApplicable(projectPath);
}

export async function applyRecovery(
  projectPath: string,
  plan: RecoveryPlan,
  options: ApplyRecoveryOptions,
): Promise<void> {
  await applyRecoveryCore(projectPath, plan, options);
  await refreshIntegrityAfterLifecycleIfApplicable(projectPath);
}

export interface VersionInfo {
  frameworkVersion: string;
  runtime: "node";
  channel: string;
}

export interface StatusInfo {
  projectRoot: string;
  frameworkVersion: string;
  executingRuntimeVersion: string;
  activatedRuntimeVersion?: string;
  preparedRuntimeVersion?: string;
  channel: string;
  projectBrain: "not-found" | "present" | "needs-diagnosis";
  lifecycle: LifecycleState;
  lifecycleReason?: string;
  changesMade: 0;
}

export function getVersionInfo(): VersionInfo {
  return { frameworkVersion: FRAMEWORK_VERSION, runtime: "node", channel: UPDATE_CHANNEL };
}

export async function getStatus(projectPath: string = process.cwd()): Promise<StatusInfo> {
  const project = discoverProject(projectPath);
  const store = new ProjectBrainStore(project.root);
  const brain = await store.inspect();
  const stranded = brain.health === "not-found" ? await findStrandedLifecycleArtifacts(project.root) : [];

  let journal: Awaited<ReturnType<typeof readMigrationJournal>> = null;
  let journalError: string | undefined;
  if (brain.health === "valid") {
    try { journal = await readMigrationJournal(project.root); }
    catch (error) { journalError = error instanceof Error ? error.message : "migration lifecycle evidence is invalid"; }
  }
  const interrupted = journal !== null && !["complete", "failed"].includes(journal.state);

  let frameworkVersion: string = FRAMEWORK_VERSION;
  let channel: string = UPDATE_CHANNEL;
  if (brain.health === "valid") {
    const metadata = await store.readMetadata();
    frameworkVersion = metadata.framework.version;
    channel = metadata.framework.channel;
  }

  let runtimePointerVersion: string | undefined;
  let runtimeEvidenceError: string | undefined;
  try { runtimePointerVersion = (await readActiveRuntimePointer(project.root))?.version; }
  catch (error) { runtimeEvidenceError = error instanceof Error ? error.message : "active Runtime evidence is invalid"; }

  const activatedRuntimeVersion =
    brain.health === "valid" && runtimePointerVersion === frameworkVersion ? runtimePointerVersion : undefined;
  const preparedRuntimeVersion =
    runtimePointerVersion && runtimePointerVersion !== frameworkVersion ? runtimePointerVersion : undefined;

  const lifecycle: LifecycleState =
    brain.health === "not-found" && stranded.length === 0
      ? "uninitialized"
      : brain.health !== "valid" || interrupted || journalError !== undefined || runtimeEvidenceError !== undefined || stranded.length > 0
        ? "recovery-required"
        : "initialized";

  const lifecycleReason = runtimeEvidenceError
    ? `invalid active Runtime evidence: ${runtimeEvidenceError}`
    : journalError
      ? `invalid migration lifecycle evidence: ${journalError}`
      : stranded.length > 0
        ? `stranded lifecycle artifacts detected while Project Brain is missing: ${stranded.join(", ")}`
        : interrupted
          ? "interrupted migration"
          : brain.health !== "valid" && brain.health !== "not-found"
            ? brain.reason
            : activatedRuntimeVersion && activatedRuntimeVersion !== FRAMEWORK_VERSION
              ? `Runtime ${activatedRuntimeVersion} is selected by project state; protected Guardian Runtime trust is still required before delegation.`
              : undefined;

  return {
    projectRoot: project.root,
    frameworkVersion,
    executingRuntimeVersion: FRAMEWORK_VERSION,
    activatedRuntimeVersion,
    preparedRuntimeVersion,
    channel,
    projectBrain: stranded.length > 0 ? "needs-diagnosis" : brain.health === "not-found" ? "not-found" : brain.health === "valid" ? "present" : "needs-diagnosis",
    lifecycle,
    lifecycleReason,
    changesMade: 0,
  };
}
