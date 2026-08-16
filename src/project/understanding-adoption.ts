import { buildActionableProposal, type ActionableProposalResult } from "../runtime/actionable-proposal.js";
import { parseSemanticProposalCandidate } from "../runtime/semantic-proposal.js";
import {
  understandingCandidateEvidenceId,
  type UnderstandingReviewCandidateEvidence,
  type UnderstandingReviewReport,
} from "./understanding-review.js";

export const UNDERSTANDING_ADOPTION_SCHEMA_VERSION = 1 as const;

const SUPPORTED_RESPONSE_TARGETS = new Map<string, "project-goal" | "project-knowledge">([
  ["unknown:project-goals", "project-goal"],
  ["unknown:project-purpose", "project-knowledge"],
]);

export function supportedUnderstandingAdoptionDomain(target: string): "project-goal" | "project-knowledge" | null {
  return SUPPORTED_RESPONSE_TARGETS.get(target) ?? null;
}

function candidateMaterialIsConsistent(item: UnderstandingReviewCandidateEvidence): boolean {
  return item.candidateId === understandingCandidateEvidenceId(item.kind, item.target, item.statement);
}

export function selectUnderstandingCandidateForAdoption(
  review: UnderstandingReviewReport,
  candidateId: string,
): UnderstandingReviewCandidateEvidence {
  const matches = review.candidateEvidence.filter((item) => item.candidateId === candidateId && candidateMaterialIsConsistent(item));
  if (matches.length !== 1) {
    throw new Error("Controlled adoption requires exactly one current material-consistent candidate matching the selected id.");
  }

  const selected = matches[0];
  if (selected.kind !== "response" || !supportedUnderstandingAdoptionDomain(selected.target)) {
    throw new Error("Selected candidate material is not supported for controlled adoption v1.");
  }
  return selected;
}

export async function buildUnderstandingAdoptionProposal(
  review: UnderstandingReviewReport,
  candidateId: string,
  projectPath: string = process.cwd(),
): Promise<ActionableProposalResult> {
  const evidence = selectUnderstandingCandidateForAdoption(review, candidateId);
  const domain = supportedUnderstandingAdoptionDomain(evidence.target);
  if (!domain) throw new Error("Selected candidate material is not supported for controlled adoption v1.");

  const candidate = parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain,
    changeKind: "add",
    proposedStatement: evidence.statement,
    rationale: `Explicitly selected guided-understanding candidate evidence ${evidence.candidateId} (${evidence.kind}:${evidence.target}) for controlled starting adoption. Selection is intent only; authorization remains separate.`,
    origin: "explicit-user",
  });

  return buildActionableProposal(candidate, projectPath);
}
