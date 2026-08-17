import { buildActionableProposal, type ActionableProposal } from "./actionable-proposal.js";
import { inspectAuthorizationAudit } from "./authorization.js";
import {
  buildProjectContextSnapshot,
  type BlockedProjectContextSnapshot,
  type ClearProjectContextSnapshot,
} from "./context-snapshot.js";
import type { ProjectContextBaseline } from "./project-context-material.js";
import { applyActionableProposal, type SemanticApplyResult } from "./semantic-apply.js";
import {
  buildSemanticProposal,
  type SemanticProposal,
  type SemanticProposalCandidate,
  type SemanticProposalFinding,
} from "./semantic-proposal.js";

const NOOP_FINDING_CODES = new Set([
  "exact-active-duplicate",
  "exact-confirmed-goal-duplicate",
  "exact-confirmed-knowledge-duplicate",
]);

export interface SemanticMaintenanceOptions {
  afterReviewBeforePrepare?: () => void | Promise<void>;
  afterApplyBeforeRefresh?: () => void | Promise<void>;
  expectedBaseline?: ProjectContextBaseline;
  expectedStableProjectIdentity?: string;
}

export interface SemanticMaintenanceReviewRequiredResult {
  state: "review-required";
  semanticProposal: SemanticProposal;
  actionableProposal: null;
  findings: SemanticProposalFinding[];
  mutationAuthorization: false;
  authorizationRequired: false;
  semanticChangesMade: 0;
}

export interface SemanticMaintenanceAuthorizationRequiredResult {
  state: "authorization-required";
  semanticProposal: SemanticProposal;
  actionableProposal: ActionableProposal;
  mutationAuthorization: false;
  authorizationRequired: true;
  semanticChangesMade: 0;
}

export interface SemanticMaintenanceBlockedResult {
  state: "blocked";
  phase: "proposal" | "actionable-proposal" | "apply";
  message: string;
  recoveryRequired: boolean;
  mutationOutcome: "not-applied" | "unknown-recovery-required";
  semanticChangesMade: 0 | "unknown";
}

export interface SemanticMaintenanceCompletedResult {
  state: "completed";
  apply: SemanticApplyResult;
  context: ClearProjectContextSnapshot;
  semanticChangesMade: 1;
}

export interface SemanticMaintenanceCompletedContextBlockedResult {
  state: "completed-context-blocked";
  apply: SemanticApplyResult;
  context: BlockedProjectContextSnapshot | null;
  refreshError?: string;
  semanticChangesMade: 1;
}

export type SemanticMaintenanceResult =
  | SemanticMaintenanceReviewRequiredResult
  | SemanticMaintenanceAuthorizationRequiredResult
  | SemanticMaintenanceBlockedResult
  | SemanticMaintenanceCompletedResult
  | SemanticMaintenanceCompletedContextBlockedResult;

function isNoopProposal(proposal: SemanticProposal): boolean {
  return proposal.findings.some((finding) => NOOP_FINDING_CODES.has(finding.code));
}

function sameBaseline(left: ProjectContextBaseline, right: ProjectContextBaseline): boolean {
  return left.algorithm === right.algorithm
    && left.domain === right.domain
    && left.digest === right.digest
    && left.schemaVersion === right.schemaVersion;
}

async function classifyApplyFailure(
  authorizationId: string,
  projectPath: string,
  message: string,
): Promise<SemanticMaintenanceBlockedResult> {
  try {
    const audit = await inspectAuthorizationAudit(projectPath);
    const active = audit.active;
    const terminal = audit.history.find((record) => record.authorizationId === authorizationId);

    if (active && active.authorizationId !== authorizationId) {
      return {
        state: "blocked",
        phase: "apply",
        message,
        recoveryRequired: false,
        mutationOutcome: "not-applied",
        semanticChangesMade: 0,
      };
    }

    if (active?.authorizationId === authorizationId && active.state === "authorized") {
      return {
        state: "blocked",
        phase: "apply",
        message,
        recoveryRequired: false,
        mutationOutcome: "not-applied",
        semanticChangesMade: 0,
      };
    }

    if (!active && !terminal) {
      return {
        state: "blocked",
        phase: "apply",
        message,
        recoveryRequired: false,
        mutationOutcome: "not-applied",
        semanticChangesMade: 0,
      };
    }

    if (terminal?.state === "completed") {
      return {
        state: "blocked",
        phase: "apply",
        message,
        recoveryRequired: false,
        mutationOutcome: "not-applied",
        semanticChangesMade: 0,
      };
    }

    return {
      state: "blocked",
      phase: "apply",
      message,
      recoveryRequired: true,
      mutationOutcome: "unknown-recovery-required",
      semanticChangesMade: "unknown",
    };
  } catch (auditError) {
    const auditMessage = auditError instanceof Error ? auditError.message : "authorization audit could not be inspected";
    return {
      state: "blocked",
      phase: "apply",
      message: `${message}; authorization outcome is ambiguous because audit inspection failed: ${auditMessage}`,
      recoveryRequired: true,
      mutationOutcome: "unknown-recovery-required",
      semanticChangesMade: "unknown",
    };
  }
}

export async function maintainSemanticProjectState(
  candidate: SemanticProposalCandidate,
  authorizationId?: string,
  projectPath: string = process.cwd(),
  options: SemanticMaintenanceOptions = {},
): Promise<SemanticMaintenanceResult> {
  const reviewed = await buildSemanticProposal(candidate, projectPath);
  if (reviewed.state !== "proposal") {
    return {
      state: "blocked",
      phase: "proposal",
      message: reviewed.findings.map((finding) => finding.message).join("; ") || "Semantic proposal construction is blocked.",
      recoveryRequired: false,
      mutationOutcome: "not-applied",
      semanticChangesMade: 0,
    };
  }

  if ((options.expectedBaseline !== undefined && !sameBaseline(reviewed.proposal.baseline, options.expectedBaseline))
    || (options.expectedStableProjectIdentity !== undefined
      && reviewed.proposal.stableProjectIdentity !== options.expectedStableProjectIdentity)) {
    return {
      state: "blocked",
      phase: "proposal",
      message: "Semantic maintenance current project identity/baseline no longer matches the expected roundtrip context. Retry from fresh context evidence.",
      recoveryRequired: false,
      mutationOutcome: "not-applied",
      semanticChangesMade: 0,
    };
  }

  if (isNoopProposal(reviewed.proposal)) {
    return {
      state: "review-required",
      semanticProposal: reviewed.proposal,
      actionableProposal: null,
      findings: reviewed.proposal.findings,
      mutationAuthorization: false,
      authorizationRequired: false,
      semanticChangesMade: 0,
    };
  }

  await options.afterReviewBeforePrepare?.();
  const prepared = await buildActionableProposal(candidate, projectPath);
  if (prepared.state !== "actionable-proposal") {
    return {
      state: "blocked",
      phase: "actionable-proposal",
      message: prepared.findings.map((finding) => finding.message).join("; ") || "Actionable proposal construction is blocked.",
      recoveryRequired: false,
      mutationOutcome: "not-applied",
      semanticChangesMade: 0,
    };
  }

  if (!sameBaseline(reviewed.proposal.baseline, prepared.proposal.baseline)
    || reviewed.proposal.stableProjectIdentity !== prepared.proposal.stableProjectIdentity
    || reviewed.proposal.projectLocator !== prepared.proposal.projectLocator) {
    return {
      state: "blocked",
      phase: "actionable-proposal",
      message: "Project Brain changed between semantic review and actionable proposal reconstruction. Retry from a fresh coherent baseline.",
      recoveryRequired: false,
      mutationOutcome: "not-applied",
      semanticChangesMade: 0,
    };
  }

  if (authorizationId === undefined) {
    return {
      state: "authorization-required",
      semanticProposal: reviewed.proposal,
      actionableProposal: prepared.proposal,
      mutationAuthorization: false,
      authorizationRequired: true,
      semanticChangesMade: 0,
    };
  }

  let apply: SemanticApplyResult;
  try {
    apply = await applyActionableProposal(authorizationId, prepared.proposal, projectPath);
  } catch (error) {
    return classifyApplyFailure(
      authorizationId,
      projectPath,
      error instanceof Error ? error.message : "Semantic Apply failed.",
    );
  }

  try {
    await options.afterApplyBeforeRefresh?.();
    const context = await buildProjectContextSnapshot(projectPath);
    if (context.safetyState !== "clear") {
      return {
        state: "completed-context-blocked",
        apply,
        context,
        semanticChangesMade: 1,
      };
    }

    return {
      state: "completed",
      apply,
      context,
      semanticChangesMade: 1,
    };
  } catch (error) {
    return {
      state: "completed-context-blocked",
      apply,
      context: null,
      refreshError: error instanceof Error ? error.message : "Fresh Project Context reconstruction failed after completed semantic mutation.",
      semanticChangesMade: 1,
    };
  }
}
