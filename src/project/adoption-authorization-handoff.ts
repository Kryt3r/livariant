import type { ActionableProposal } from "../runtime/actionable-proposal.js";
import { buildActionableProposal } from "../runtime/actionable-proposal.js";
import { parseSemanticProposalCandidate } from "../runtime/semantic-proposal.js";
import type { AdoptionContentReview } from "./adoption-review.js";
import {
  buildAdoptionReviewProposal,
  type AdoptionReviewDecisionRecord,
} from "./adoption-review-decisions.js";

export type AdoptionAuthorizationProjectionDomain = "project-goal" | "project-knowledge";

export interface AdoptionAuthorizationHandoffRequest {
  adoptionProposalId: string;
  evidenceId: string;
  materialDigest: string;
  projection: {
    domain: AdoptionAuthorizationProjectionDomain;
    proposedStatement: string;
    rationale: string;
  };
}

export interface ReadyAdoptionAuthorizationHandoff {
  schemaVersion: 1;
  state: "ready-for-explicit-authorization";
  adoptionProposalId: string;
  sourceEvidence: {
    evidenceId: string;
    materialDigest: string;
    path: string;
    kind: string;
    scope: string;
  };
  projection: AdoptionAuthorizationHandoffRequest["projection"];
  actionableProposal: ActionableProposal;
  bindings: {
    actionableProposalId: string;
    actionableProposalDigest: string;
    stableProjectIdentity: string;
    baselineDigest: string;
  };
  boundaries: {
    evidenceIsProjectTruth: false;
    adoptionProposalIsAuthorization: false;
    projectionIsProjectTruth: false;
    mutationAuthorization: false;
    authorizationRequired: true;
    changesMade: 0;
  };
}

export interface BlockedAdoptionAuthorizationHandoff {
  schemaVersion: 1;
  state: "blocked";
  adoptionProposalId: string;
  findings: Array<{ code: string; message: string }>;
  boundaries: {
    evidenceIsProjectTruth: false;
    adoptionProposalIsAuthorization: false;
    projectionIsProjectTruth: false;
    mutationAuthorization: false;
    authorizationRequired: true;
    changesMade: 0;
  };
}

export type AdoptionAuthorizationHandoffResult =
  | ReadyAdoptionAuthorizationHandoff
  | BlockedAdoptionAuthorizationHandoff;

const boundaries = {
  evidenceIsProjectTruth: false,
  adoptionProposalIsAuthorization: false,
  projectionIsProjectTruth: false,
  mutationAuthorization: false,
  authorizationRequired: true,
  changesMade: 0,
} as const;

export async function prepareAdoptionAuthorizationHandoff(
  review: AdoptionContentReview,
  decisions: readonly AdoptionReviewDecisionRecord[],
  request: AdoptionAuthorizationHandoffRequest,
  projectPath: string = process.cwd(),
): Promise<AdoptionAuthorizationHandoffResult> {
  const currentProposal = buildAdoptionReviewProposal(review, decisions);

  if (currentProposal.proposalId !== request.adoptionProposalId) {
    throw new Error("Authorization handoff refused a stale or replaced adoption proposal identity.");
  }
  if (currentProposal.status !== "ready-for-authorization-review") {
    return {
      schemaVersion: 1,
      state: "blocked",
      adoptionProposalId: currentProposal.proposalId,
      findings: currentProposal.blockers.map((item) => ({ code: item.code, message: item.message })),
      boundaries,
    };
  }

  const matches = currentProposal.candidates.filter(
    (item) => item.evidenceId === request.evidenceId && item.materialDigest === request.materialDigest,
  );
  if (matches.length !== 1) {
    throw new Error("Authorization handoff requires exactly one current candidate evidence item matching the requested material.");
  }
  const source = matches[0]!;

  const semanticCandidate = parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: request.projection.domain,
    changeKind: "add",
    proposedStatement: request.projection.proposedStatement,
    rationale: `${request.projection.rationale} Source adoption evidence: ${source.evidenceId} from ${source.path} (${source.kind}, scope ${source.scope}). Evidence remains non-authoritative; this projection is explicit user intent only.`,
    origin: "explicit-user",
  });

  const actionable = await buildActionableProposal(semanticCandidate, projectPath);
  if (actionable.state !== "actionable-proposal") {
    return {
      schemaVersion: 1,
      state: "blocked",
      adoptionProposalId: currentProposal.proposalId,
      findings: actionable.findings.map((item) => ({ code: item.code, message: item.message })),
      boundaries,
    };
  }

  return {
    schemaVersion: 1,
    state: "ready-for-explicit-authorization",
    adoptionProposalId: currentProposal.proposalId,
    sourceEvidence: {
      evidenceId: source.evidenceId,
      materialDigest: source.materialDigest,
      path: source.path,
      kind: source.kind,
      scope: source.scope,
    },
    projection: { ...request.projection },
    actionableProposal: actionable.proposal,
    bindings: {
      actionableProposalId: actionable.proposal.actionableProposalId,
      actionableProposalDigest: actionable.proposal.materialDigest.digest,
      stableProjectIdentity: actionable.proposal.stableProjectIdentity,
      baselineDigest: actionable.proposal.baseline.digest,
    },
    boundaries,
  };
}
