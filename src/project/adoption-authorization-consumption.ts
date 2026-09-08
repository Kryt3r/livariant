import type { AdoptionContentReview } from "./adoption-review.js";
import type { AdoptionReviewDecisionRecord } from "./adoption-review-decisions.js";
import {
  prepareAdoptionAuthorizationHandoff,
  type AdoptionAuthorizationHandoffRequest,
  type ReadyAdoptionAuthorizationHandoff,
} from "./adoption-authorization-handoff.js";
import {
  authorizeActionableProposal,
  type AuthorizationOptions,
  type AuthorizationResult,
} from "../runtime/authorization.js";

export interface AdoptionAuthorizationConsumptionResult {
  state: "authorized-for-separate-apply";
  adoptionProposalId: string;
  sourceEvidence: ReadyAdoptionAuthorizationHandoff["sourceEvidence"];
  bindings: ReadyAdoptionAuthorizationHandoff["bindings"];
  authorization: AuthorizationResult;
  boundaries: {
    evidenceIsProjectTruth: false;
    adoptionHandoffIsAuthority: false;
    authorizationIsSemanticMutation: false;
    semanticApplyRequired: true;
    semanticChangesMade: 0;
  };
}

function assertSameSource(
  input: ReadyAdoptionAuthorizationHandoff["sourceEvidence"],
  fresh: ReadyAdoptionAuthorizationHandoff["sourceEvidence"],
): void {
  if (
    input.evidenceId !== fresh.evidenceId
    || input.materialDigest !== fresh.materialDigest
    || input.path !== fresh.path
    || input.kind !== fresh.kind
    || input.scope !== fresh.scope
  ) {
    throw new Error("Adoption authorization handoff source evidence is stale, replaced, or materially inconsistent.");
  }
}

function assertSameProjection(
  input: ReadyAdoptionAuthorizationHandoff["projection"],
  fresh: ReadyAdoptionAuthorizationHandoff["projection"],
): void {
  if (
    input.domain !== fresh.domain
    || input.proposedStatement !== fresh.proposedStatement
    || input.rationale !== fresh.rationale
  ) {
    throw new Error("Adoption authorization handoff projection changed and must be reviewed again.");
  }
}

function assertSameBindings(
  input: ReadyAdoptionAuthorizationHandoff["bindings"],
  fresh: ReadyAdoptionAuthorizationHandoff["bindings"],
): void {
  if (
    input.actionableProposalId !== fresh.actionableProposalId
    || input.actionableProposalDigest !== fresh.actionableProposalDigest
    || input.stableProjectIdentity !== fresh.stableProjectIdentity
    || input.baselineDigest !== fresh.baselineDigest
  ) {
    throw new Error("Adoption authorization handoff no longer matches the current Actionable Proposal, project identity, or baseline.");
  }
}

function assertSameActionableProposal(
  input: ReadyAdoptionAuthorizationHandoff,
  fresh: ReadyAdoptionAuthorizationHandoff,
): void {
  if (
    input.actionableProposal.actionableProposalId !== fresh.actionableProposal.actionableProposalId
    || input.actionableProposal.materialDigest.digest !== fresh.actionableProposal.materialDigest.digest
    || input.actionableProposal.stableProjectIdentity !== fresh.actionableProposal.stableProjectIdentity
    || input.actionableProposal.baseline.digest !== fresh.actionableProposal.baseline.digest
  ) {
    throw new Error("Adoption authorization handoff carries a stale or substituted Actionable Proposal.");
  }
}

export async function authorizeAdoptionAuthorizationHandoff(
  review: AdoptionContentReview,
  decisions: readonly AdoptionReviewDecisionRecord[],
  request: AdoptionAuthorizationHandoffRequest,
  handoff: ReadyAdoptionAuthorizationHandoff,
  projectPath: string = process.cwd(),
  options: AuthorizationOptions = {},
): Promise<AdoptionAuthorizationConsumptionResult> {
  const fresh = await prepareAdoptionAuthorizationHandoff(review, decisions, request, projectPath);
  if (fresh.state !== "ready-for-explicit-authorization") {
    throw new Error("Adoption authorization requires a current handoff that is still ready for explicit authorization.");
  }

  if (handoff.schemaVersion !== 1 || handoff.state !== "ready-for-explicit-authorization") {
    throw new Error("Adoption authorization input is not a supported ready handoff.");
  }
  if (handoff.adoptionProposalId !== fresh.adoptionProposalId || handoff.adoptionProposalId !== request.adoptionProposalId) {
    throw new Error("Adoption authorization handoff refers to a stale or replaced adoption proposal.");
  }

  assertSameSource(handoff.sourceEvidence, fresh.sourceEvidence);
  assertSameProjection(handoff.projection, fresh.projection);
  assertSameBindings(handoff.bindings, fresh.bindings);
  assertSameActionableProposal(handoff, fresh);

  if (
    handoff.boundaries.evidenceIsProjectTruth !== false
    || handoff.boundaries.adoptionProposalIsAuthorization !== false
    || handoff.boundaries.projectionIsProjectTruth !== false
    || handoff.boundaries.mutationAuthorization !== false
    || handoff.boundaries.authorizationRequired !== true
    || handoff.boundaries.changesMade !== 0
  ) {
    throw new Error("Adoption authorization handoff boundary claims are invalid.");
  }

  const authorization = await authorizeActionableProposal(fresh.actionableProposal, projectPath, options);

  return {
    state: "authorized-for-separate-apply",
    adoptionProposalId: fresh.adoptionProposalId,
    sourceEvidence: { ...fresh.sourceEvidence },
    bindings: { ...fresh.bindings },
    authorization,
    boundaries: {
      evidenceIsProjectTruth: false,
      adoptionHandoffIsAuthority: false,
      authorizationIsSemanticMutation: false,
      semanticApplyRequired: true,
      semanticChangesMade: 0,
    },
  };
}
