import { buildActionableProposal, type ActionableProposal } from "./actionable-proposal.js";
import { inspectAuthorizationAudit } from "./authorization.js";
import {
  buildProjectContextSnapshot,
  type BlockedProjectContextSnapshot,
  type ClearProjectContextSnapshot,
} from "./context-snapshot.js";
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
  context: BlockedProjectContextSnapshot;
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

async function classifyApplyFailure(
  authorizationId: string,
  projectPath: string,
  message: string,
): Promise<SemanticMaintenanceBlockedResult> {
  try {
    const audit = await inspectAuthorizationAudit(projectPath);
    const active = audit.active?.authorizationId === authorizationId ? audit.active : null;
    const terminal = audit.history.find((record) => record.authorizationId === authorizationId);
    const recoveryRequired = active?.state === "applying" || terminal?.state === "failed-recovery-required";
    if (recoveryRequired) {
      return {
        state: "blocked",
        phase: "apply",
        message,
        recoveryRequired: true,
        mutationOutcome: "unknown-recovery-required",
        semanticChangesMade: "unknown",
      };
    }
    return {
      state: "blocked",
      phase: "apply",
      message,
      recoveryRequired: false,
      mutationOutcome: "not-applied",
      semanticChangesMade: 0,
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
}
