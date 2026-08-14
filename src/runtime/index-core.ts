import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore } from "../project-brain/store.js";
import { FRAMEWORK_VERSION, UPDATE_CHANNEL, type LifecycleState } from "../lifecycle/state.js";
import { readMigrationJournal } from "../lifecycle/migration.js";
import { findStrandedLifecycleArtifacts } from "../lifecycle/recovery.js";
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
export { applyMigrationUpdate, planMigrationUpdate, readMigrationJournal } from "../lifecycle/migration.js";
export type { ApplyMigrationOptions, MigrationContract, MigrationExecutionState, MigrationJournal, MigrationPlan, MigrationStepState } from "../lifecycle/migration.js";
export { applyRecovery, findStrandedLifecycleArtifacts, inspectRecovery, planRecovery } from "../lifecycle/recovery.js";
export type { ApplyRecoveryOptions, RecoveryInspection, RecoveryPlan } from "../lifecycle/recovery.js";

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
              ? `Runtime ${activatedRuntimeVersion} is activated; a new CLI invocation will execute it.`
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
