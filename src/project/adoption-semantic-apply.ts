import type { AdoptionContentReview } from "./adoption-review.js";
import type { AdoptionReviewDecisionRecord } from "./adoption-review-decisions.js";
import {
  prepareAdoptionAuthorizationHandoff,
  type AdoptionAuthorizationHandoffRequest,
  type ReadyAdoptionAuthorizationHandoff,
} from "./adoption-authorization-handoff.js";
import type { AdoptionAuthorizationConsumptionResult } from "./adoption-authorization-consumption.js";
import {
  applyActionableProposal,
  type SemanticApplyOptions,
  type SemanticApplyResult,
} from "../runtime/semantic-apply.js";

export interface AdoptionSemanticApplyResult {
  state: "completed";
  adoptionProposalId: string;
  sourceEvidence: ReadyAdoptionAuthorizationHandoff["sourceEvidence"];
  bindings: ReadyAdoptionAuthorizationHandoff["bindings"];
  semanticApply: SemanticApplyResult;
  boundaries: {
    evidenceBecameProjectTruthOnlyThroughAuthorizedProjection: true;
    projectOwnedRepositoryFilesChanged: false;
    canonicalSemanticApplyUsed: true;
    mutationAuthorizationConsumedByCanonicalApply: true;
    semanticChangesMade: 1;
  };
}

function sameSource(
  left: ReadyAdoptionAuthorizationHandoff["sourceEvidence"],
  right: ReadyAdoptionAuthorizationHandoff["sourceEvidence"],
): boolean {
  return left.evidenceId === right.evidenceId
    && left.materialDigest === right.materialDigest
    && left.path === right.path
    && left.kind === right.kind
    && left.scope === right.scope;
}

function sameProjection(
  left: ReadyAdoptionAuthorizationHandoff["projection"],
  right: ReadyAdoptionAuthorizationHandoff["projection"],
): boolean {
  return left.domain === right.domain
    && left.proposedStatement === right.proposedStatement
    && left.rationale === right.rationale;
}

function sameBindings(
  left: ReadyAdoptionAuthorizationHandoff["bindings"],
  right: ReadyAdoptionAuthorizationHandoff["bindings"],
): boolean {
  return left.actionableProposalId === right.actionableProposalId
    && left.actionableProposalDigest === right.actionableProposalDigest
    && left.stableProjectIdentity === right.stableProjectIdentity
    && left.baselineDigest === right.baselineDigest;
}

function sameScope(
  left: ReadyAdoptionAuthorizationHandoff["actionableProposal"]["mutationScope"],
  right: ReadyAdoptionAuthorizationHandoff["actionableProposal"]["mutationScope"],
): boolean {
  return left.domain === right.domain
    && left.changeKind === right.changeKind
    && left.proposedStatement === right.proposedStatement
    && left.targetDecisionId === right.targetDecisionId;
}

function assertCurrentHandoff(
  input: ReadyAdoptionAuthorizationHandoff,
  fresh: ReadyAdoptionAuthorizationHandoff,
  request: AdoptionAuthorizationHandoffRequest,
): void {
  if (input.schemaVersion !== 1 || input.state !== "ready-for-explicit-authorization") {
    throw new Error("Adoption Semantic Apply requires a supported ready authorization handoff.");
  }
  if (input.adoptionProposalId !== fresh.adoptionProposalId || input.adoptionProposalId !== request.adoptionProposalId) {
    throw new Error("Adoption Semantic Apply refused a stale or replaced adoption proposal.");
  }
  if (!sameSource(input.sourceEvidence, fresh.sourceEvidence)) {
    throw new Error("Adoption Semantic Apply refused stale, replaced, or materially changed source evidence.");
  }
  if (!sameProjection(input.projection, fresh.projection)) {
    throw new Error("Adoption Semantic Apply refused a changed semantic projection.");
  }
  if (!sameBindings(input.bindings, fresh.bindings)) {
    throw new Error("Adoption Semantic Apply refused stale Actionable Proposal, project identity, or baseline bindings.");
  }
  if (
    input.actionableProposal.actionableProposalId !== fresh.actionableProposal.actionableProposalId
    || input.actionableProposal.materialDigest.digest !== fresh.actionableProposal.materialDigest.digest
    || input.actionableProposal.stableProjectIdentity !== fresh.actionableProposal.stableProjectIdentity
    || input.actionableProposal.baseline.digest !== fresh.actionableProposal.baseline.digest
    || !sameScope(input.actionableProposal.mutationScope, fresh.actionableProposal.mutationScope)
  ) {
    throw new Error("Adoption Semantic Apply refused a stale or substituted Actionable Proposal.");
  }
  if (
    input.boundaries.evidenceIsProjectTruth !== false
    || input.boundaries.adoptionProposalIsAuthorization !== false
    || input.boundaries.projectionIsProjectTruth !== false
    || input.boundaries.mutationAuthorization !== false
    || input.boundaries.authorizationRequired !== true
    || input.boundaries.changesMade !== 0
  ) {
    throw new Error("Adoption Semantic Apply refused invalid handoff boundary claims.");
  }
}

function assertAuthorizationConsumption(
  consumption: AdoptionAuthorizationConsumptionResult,
  fresh: ReadyAdoptionAuthorizationHandoff,
): string {
  if (consumption.state !== "authorized-for-separate-apply") {
    throw new Error("Adoption Semantic Apply requires the canonical adoption authorization consumption result.");
  }
  if (consumption.adoptionProposalId !== fresh.adoptionProposalId
    || !sameSource(consumption.sourceEvidence, fresh.sourceEvidence)
    || !sameBindings(consumption.bindings, fresh.bindings)) {
    throw new Error("Adoption Semantic Apply authorization result is stale or bound to different adoption material.");
  }
  if (
    consumption.boundaries.evidenceIsProjectTruth !== false
    || consumption.boundaries.adoptionHandoffIsAuthority !== false
    || consumption.boundaries.authorizationIsSemanticMutation !== false
    || consumption.boundaries.semanticApplyRequired !== true
    || consumption.boundaries.semanticChangesMade !== 0
  ) {
    throw new Error("Adoption Semantic Apply authorization boundary claims are invalid.");
  }

  const authorization = consumption.authorization;
  const record = authorization.authorization;
  const proposal = fresh.actionableProposal;
  if (
    authorization.state !== "authorized"
    || authorization.machineEvidenceVerified !== true
    || authorization.mutationAuthorization !== false
    || authorization.applySupported !== false
    || authorization.semanticChangesMade !== 0
    || record.state !== "authorized"
    || record.stableProjectIdentity !== proposal.stableProjectIdentity
    || record.actionableProposalId !== proposal.actionableProposalId
    || record.actionableProposalVersion !== 1
    || record.proposalDigest !== proposal.materialDigest.digest
    || record.baseline.digest !== proposal.baseline.digest
    || !sameScope(record.mutationScope, proposal.mutationScope)
  ) {
    throw new Error("Adoption Semantic Apply refused stale, forged, or mismatched authorization evidence.");
  }
  return record.authorizationId;
}

export async function applyAuthorizedAdoptionHandoff(
  review: AdoptionContentReview,
  decisions: readonly AdoptionReviewDecisionRecord[],
  request: AdoptionAuthorizationHandoffRequest,
  handoff: ReadyAdoptionAuthorizationHandoff,
  authorizationConsumption: AdoptionAuthorizationConsumptionResult,
  projectPath: string = process.cwd(),
  options: SemanticApplyOptions = {},
): Promise<AdoptionSemanticApplyResult> {
  const rebuilt = await prepareAdoptionAuthorizationHandoff(review, decisions, request, projectPath);
  if (rebuilt.state !== "ready-for-explicit-authorization") {
    throw new Error("Adoption Semantic Apply requires a current handoff that remains ready for authorization/apply validation.");
  }

  assertCurrentHandoff(handoff, rebuilt, request);
  const authorizationId = assertAuthorizationConsumption(authorizationConsumption, rebuilt);

  const semanticApply = await applyActionableProposal(
    authorizationId,
    rebuilt.actionableProposal,
    projectPath,
    options,
  );

  return {
    state: "completed",
    adoptionProposalId: rebuilt.adoptionProposalId,
    sourceEvidence: { ...rebuilt.sourceEvidence },
    bindings: { ...rebuilt.bindings },
    semanticApply,
    boundaries: {
      evidenceBecameProjectTruthOnlyThroughAuthorizedProjection: true,
      projectOwnedRepositoryFilesChanged: false,
      canonicalSemanticApplyUsed: true,
      mutationAuthorizationConsumedByCanonicalApply: true,
      semanticChangesMade: 1,
    },
  };
}
