import { buildActionableProposal, type ActionableProposalResult } from "../runtime/actionable-proposal.js";
import type { SemanticProposalCandidate } from "../runtime/semantic-proposal.js";
import type { UnderstandingReviewCandidateEvidence, UnderstandingReviewReport } from "./understanding-review.js";

export const UNDERSTANDING_ADOPTION_SCHEMA_VERSION = 1 as const;

const SUPPORTED_RESPONSE_TARGETS = new Map<string, "project-goal" | "project-knowledge">([
  ["unknown:project-goals", "project-goal"],
  ["unknown:project-purpose", "project-knowledge"],
]);

export function supportedUnderstandingAdoptionDomain(target: string): "project-goal" | "project-knowledge" | null {
  return SUPPORTED_RESPONSE_TARGETS.get(target) ?? null;
}

export function selectUnderstandingCandidateForAdoption(
  review: UnderstandingReviewReport,
  target: string,
): UnderstandingReviewCandidateEvidence {
  const domain = supportedUnderstandingAdoptionDomain(target);
  if (!domain) {
    throw new Error("Selected candidate target is not supported for controlled adoption v1.");
  }

  const matches = review.candidateEvidence.filter((item) => item.kind === "response" && item.target === target);
  if (matches.length !== 1) {
    throw new Error("Controlled adoption requires exactly one current review response for the selected target.");
  }
  return matches[0];
}

export async function buildUnderstandingAdoptionProposal(
  review: UnderstandingReviewReport,
  target: string,
  projectPath: string = process.cwd(),
): Promise<ActionableProposalResult> {
  const evidence = selectUnderstandingCandidateForAdoption(review, target);
  const domain = supportedUnderstandingAdoptionDomain(target);
  if (!domain) throw new Error("Selected candidate target is not supported for controlled adoption v1.");

  const candidate: SemanticProposalCandidate = {
    schemaVersion: 1,
    domain,
    changeKind: "add",
    proposedStatement: evidence.statement,
    rationale: `Explicitly selected guided-understanding candidate evidence (${evidence.kind}:${evidence.target}) for controlled starting adoption. Selection is intent only; authorization remains separate.`,
    originClaim: "explicit-user",
    originVerified: false,
  };

  return buildActionableProposal(candidate, projectPath);
}
