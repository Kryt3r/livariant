import type { AdoptionContentReview, AdoptionReviewedSurface } from "./adoption-review.js";
import {
  adoptionReviewedEvidenceId,
  adoptionReviewedEvidenceMaterialDigest,
  buildAdoptionReviewProposal,
  type AdoptionReviewDecisionKind,
  type AdoptionReviewDecisionRecord,
  type AdoptionReviewProposalBlocker,
} from "./adoption-review-decisions.js";
import type { AdoptionAuthorizationConsumptionResult } from "./adoption-authorization-consumption.js";
import type { AdoptionSemanticApplyResult } from "./adoption-semantic-apply.js";

export type AdoptionDesktopDecisionState = AdoptionReviewDecisionKind | "undecided" | "review-again";
export type AdoptionDesktopLifecycleState =
  | "blocked"
  | "ready-for-authorization-review"
  | "authorized-for-separate-apply"
  | "completed";

export interface AdoptionDesktopEvidenceItem {
  evidenceId: string;
  materialDigest: string;
  path: string;
  kind: AdoptionReviewedSurface["kind"];
  scope: string;
  trust: "evidence-only";
  truncated: boolean;
  decision: AdoptionDesktopDecisionState;
  attentionCodes: string[];
  requiresReview: boolean;
}

export interface AdoptionDesktopPresentation {
  schemaVersion: 1;
  state: AdoptionDesktopLifecycleState;
  proposalId: string | null;
  evidence: AdoptionDesktopEvidenceItem[];
  attention: AdoptionContentReview["attention"];
  blockers: AdoptionReviewProposalBlocker[];
  authorizationState: "not-authorized" | "authorized";
  applyState: "not-applied" | "completed";
  requiresReviewAgain: boolean;
  boundaries: {
    evidenceIsProjectTruth: false;
    uiDecisionIsProjectTruth: false;
    uiDecisionGrantsAuthority: false;
    proposalIsAuthorization: false;
    authorizationIsApplyCompletion: false;
    projectOwnedFilesAreReadOnly: true;
    hiddenConflictResolution: false;
    changesMade: 0;
  };
}

function blocker(code: string, message: string, provenance: string[] = []): AdoptionReviewProposalBlocker {
  return { code, message, provenance: [...provenance].sort() };
}

export function buildAdoptionDesktopPresentation(
  review: AdoptionContentReview,
  decisions: readonly AdoptionReviewDecisionRecord[],
  authorization?: AdoptionAuthorizationConsumptionResult,
  apply?: AdoptionSemanticApplyResult,
): AdoptionDesktopPresentation {
  const decisionByEvidence = new Map<string, AdoptionReviewDecisionRecord>();
  const presentationBlockers: AdoptionReviewProposalBlocker[] = [];
  let requiresReviewAgain = false;

  for (const decision of decisions) {
    if (decisionByEvidence.has(decision.evidenceId)) {
      presentationBlockers.push(blocker(
        "desktop-adoption-duplicate-decision",
        "The Desktop presentation refused ambiguous duplicate decisions for one evidence item.",
        [decision.path],
      ));
      requiresReviewAgain = true;
      continue;
    }
    decisionByEvidence.set(decision.evidenceId, decision);
  }

  const evidence = review.reviewed.map((surface): AdoptionDesktopEvidenceItem => {
    const evidenceId = adoptionReviewedEvidenceId(surface);
    const materialDigest = adoptionReviewedEvidenceMaterialDigest(surface);
    const decision = decisionByEvidence.get(evidenceId);
    const materialCurrent = decision?.materialDigest === materialDigest;
    const attentionCodes = review.attention
      .filter((item) => item.provenance.includes(surface.path))
      .map((item) => item.code)
      .sort();

    let decisionState: AdoptionDesktopDecisionState = "undecided";
    if (decision) {
      if (materialCurrent) decisionState = decision.decision;
      else {
        decisionState = "review-again";
        requiresReviewAgain = true;
        presentationBlockers.push(blocker(
          "desktop-adoption-stale-decision",
          "A prior review decision no longer matches the current evidence material and must be reviewed again.",
          [surface.path],
        ));
      }
    }

    if (!decision) requiresReviewAgain = true;
    if (surface.truncated) requiresReviewAgain = true;

    return {
      evidenceId,
      materialDigest,
      path: surface.path,
      kind: surface.kind,
      scope: surface.scope,
      trust: "evidence-only",
      truncated: surface.truncated,
      decision: decisionState,
      attentionCodes,
      requiresReview: decisionState === "undecided" || decisionState === "review-again" || surface.truncated || attentionCodes.length > 0,
    };
  }).sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));

  for (const decision of decisions) {
    if (!evidence.some((item) => item.evidenceId === decision.evidenceId)) {
      requiresReviewAgain = true;
      presentationBlockers.push(blocker(
        "desktop-adoption-replaced-evidence",
        "A prior review decision refers to evidence that is no longer present in the current review and must not carry forward.",
        [decision.path],
      ));
    }
  }

  let proposalId: string | null = null;
  let proposalStatus: "blocked" | "ready-for-authorization-review" = "blocked";
  if (!requiresReviewAgain && presentationBlockers.length === 0) {
    try {
      const proposal = buildAdoptionReviewProposal(review, decisions);
      proposalId = proposal.proposalId;
      proposalStatus = proposal.status;
      presentationBlockers.push(...proposal.blockers);
    } catch (error) {
      requiresReviewAgain = true;
      presentationBlockers.push(blocker(
        "desktop-adoption-unrepresentable-proposal",
        error instanceof Error ? error.message : "The current adoption proposal could not be represented safely.",
      ));
    }
  } else {
    try {
      const proposal = buildAdoptionReviewProposal(review, decisions.filter((decision) => evidence.some((item) => item.evidenceId === decision.evidenceId && item.materialDigest === decision.materialDigest)));
      proposalId = proposal.proposalId;
      presentationBlockers.push(...proposal.blockers);
    } catch {
      // A blocked presentation does not invent a proposal when current material cannot produce one safely.
    }
  }

  let authorizationState: AdoptionDesktopPresentation["authorizationState"] = "not-authorized";
  let applyState: AdoptionDesktopPresentation["applyState"] = "not-applied";
  let state: AdoptionDesktopLifecycleState = proposalStatus;

  if (authorization) {
    if (!proposalId || authorization.adoptionProposalId !== proposalId) {
      state = "blocked";
      requiresReviewAgain = true;
      presentationBlockers.push(blocker(
        "desktop-adoption-stale-authorization",
        "Existing authorization is bound to a stale or replaced adoption proposal and cannot be presented as current authority.",
      ));
    } else {
      authorizationState = "authorized";
      state = "authorized-for-separate-apply";
    }
  }

  if (apply) {
    if (!proposalId || apply.adoptionProposalId !== proposalId || authorizationState !== "authorized") {
      state = "blocked";
      requiresReviewAgain = true;
      presentationBlockers.push(blocker(
        "desktop-adoption-stale-apply",
        "Semantic Apply evidence does not match the current authorized adoption proposal and cannot be presented as current completion.",
      ));
    } else {
      applyState = "completed";
      state = "completed";
    }
  }

  presentationBlockers.sort((a, b) => `${a.code}:${a.provenance.join(",")}`.localeCompare(`${b.code}:${b.provenance.join(",")}`));
  if (presentationBlockers.length > 0 && state !== "completed") state = "blocked";

  return {
    schemaVersion: 1,
    state,
    proposalId,
    evidence,
    attention: review.attention.map((item) => ({ ...item, provenance: [...item.provenance] })),
    blockers: presentationBlockers,
    authorizationState,
    applyState,
    requiresReviewAgain,
    boundaries: {
      evidenceIsProjectTruth: false,
      uiDecisionIsProjectTruth: false,
      uiDecisionGrantsAuthority: false,
      proposalIsAuthorization: false,
      authorizationIsApplyCompletion: false,
      projectOwnedFilesAreReadOnly: true,
      hiddenConflictResolution: false,
      changesMade: 0,
    },
  };
}
