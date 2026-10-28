import { buildActionableProposal, parseActionableProposal, type ActionableProposal } from "../runtime/actionable-proposal.js";
import { parseSemanticProposalCandidate, type SemanticProposalCandidate } from "../runtime/semantic-proposal.js";
import { runProtectedDoctor } from "../runtime/protected-doctor.js";
import {
  buildProjectKnowledgeProjection, type KnowledgeProjection,
  type ProjectKnowledgeRecord, type ReadyKnowledgeProjection,
} from "./knowledge-projection.js";

export const KNOWLEDGE_CHANGE_REVIEW_SCHEMA_VERSION = 1 as const;

export interface KnowledgeChangeReview {
  schemaVersion: 1;
  state: "review-ready";
  projectId: string;
  baselineDigest: string;
  change: {
    kind: "add" | "supersede";
    recordType: "decision" | "goal" | "fact";
    proposedStatement: string;
    target: ProjectKnowledgeRecord | null;
    classification: "unclassified";
    scope: "unspecified";
  };
  proposal: ActionableProposal;
  boundaries: {
    derived: true;
    requiresUserApproval: true;
    proposalIsTruth: false;
    grantsAuthority: false;
    performsMutation: false;
    authorizationStateChanged: false;
  };
}

export interface BlockedKnowledgeChangeReview {
  schemaVersion: 1;
  state: "blocked";
  reason: string;
  grantsAuthority: false;
  performsMutation: false;
}

export type KnowledgeChangeReviewResult = KnowledgeChangeReview | BlockedKnowledgeChangeReview;

function blocked(reason: string): BlockedKnowledgeChangeReview {
  return { schemaVersion: 1, state: "blocked", reason, grantsAuthority: false, performsMutation: false };
}

/**
 * Pure review mapping: this cannot create Project Truth or authenticate the input.
 * The caller MUST provide a protected, baseline-current Project Brain projection.
 * The exported protected builder below is the supported runtime entry point.
 */
export function mapKnowledgeChangeReview(
  projection: ReadyKnowledgeProjection,
  untrustedProposal: unknown,
): KnowledgeChangeReview {
  const proposal = parseActionableProposal(untrustedProposal);
  if (proposal.stableProjectIdentity !== projection.stableProjectIdentity
    || proposal.baseline.algorithm !== projection.baseline.algorithm
    || proposal.baseline.domain !== projection.baseline.domain
    || proposal.baseline.schemaVersion !== projection.baseline.schemaVersion
    || proposal.baseline.digest !== projection.baseline.digest) {
    throw new Error("Knowledge review cannot bind a proposal to a stale or different Project Brain.");
  }

  const scope = proposal.mutationScope;
  const recordType = scope.domain === "project-decision" ? "decision"
    : scope.domain === "project-goal" ? "goal"
    : "fact";
  const candidates = projection.records.filter(item => item.recordType === recordType);
  let target: ProjectKnowledgeRecord | null = null;

  if (scope.changeKind === "supersede") {
    if (recordType !== "decision" || !scope.targetDecisionId) {
      throw new Error("Knowledge supersession requires an exact structured decision target.");
    }
    const matches = candidates.filter(item => item.source.structuredIdentity
      && item.source.sourceRecordId === scope.targetDecisionId && item.lifecycle === "active");
    if (matches.length !== 1) {
      throw new Error("Knowledge change target was not uniquely present as an active accepted decision.");
    }
    target = matches[0];
  } else if (candidates.some(item => item.lifecycle === "active" && item.statement === scope.proposedStatement)) {
    throw new Error("An identical active canonical record already exists; no duplicate Project Truth is proposed.");
  }

  // No implicit domain/scope assignment is allowed from untyped project prose.
  // These cannot be inferred until a future protected typed-knowledge migration exists.
  return {
    schemaVersion: 1,
    state: "review-ready",
    projectId: projection.stableProjectIdentity,
    baselineDigest: projection.baseline.digest,
    change: {
      kind: scope.changeKind,
      recordType,
      proposedStatement: scope.proposedStatement,
      target,
      classification: "unclassified",
      scope: "unspecified",
    },
    proposal,
    boundaries: {
      derived: true,
      requiresUserApproval: true,
      proposalIsTruth: false,
      grantsAuthority: false,
      performsMutation: false,
      authorizationStateChanged: false,
    },
  };
}

/**
 * Builds a read-only, exact-actionable-proposal review, with protected Guardian
 * checks before AND after projection and proposal generation. No new write path.
 * Only the existing explicit user confirmation + Guardian + Semantic Apply flow
 * may subsequently activate the proposed Project Truth revision.
 */
export async function prepareProtectedKnowledgeChangeReview(
  projectPath: string,
  input: unknown,
): Promise<KnowledgeChangeReviewResult> {
  const before = await runProtectedDoctor(projectPath);
  if (before.state !== "healthy") return blocked("Protected Project Brain is unavailable.");

  let candidate: SemanticProposalCandidate;
  try {
    candidate = parseSemanticProposalCandidate(input);
  } catch {
    return blocked("Knowledge change candidate is malformed or unsupported.");
  }

  const source: KnowledgeProjection = await buildProjectKnowledgeProjection(projectPath);
  if (source.state !== "ready") return blocked("Knowledge projection is blocked: " + source.reason);

  const built = await buildActionableProposal(candidate, projectPath);
  if (built.state !== "actionable-proposal") return blocked("Knowledge change proposal cannot be prepared from this canonical baseline.");

  let review: KnowledgeChangeReview;
  try {
    review = mapKnowledgeChangeReview(source, built.proposal);
  } catch (error) {
    return blocked(error instanceof Error ? error.message : "Knowledge change review is invalid.");
  }

  const after = await runProtectedDoctor(projectPath);
  if (after.state !== "healthy") return blocked("Protected Project Brain changed or is unavailable.");

  const finalProjection = await buildProjectKnowledgeProjection(projectPath);
  if (finalProjection.state !== "ready"
    || finalProjection.stableProjectIdentity !== source.stableProjectIdentity
    || finalProjection.baseline.digest !== source.baseline.digest) {
    return blocked("Knowledge review became stale while it was being prepared.");
  }
  return review;
}
