import { createHash } from "node:crypto";
import type {
  AdoptionContentReview,
  AdoptionReviewedSurface,
} from "./adoption-review.js";

export type AdoptionReviewDecisionKind = "accept-as-candidate" | "reject" | "defer";

export interface AdoptionReviewDecisionInput {
  evidenceId: string;
  materialDigest: string;
  decision: AdoptionReviewDecisionKind;
}

export interface AdoptionReviewDecisionRecord {
  evidenceId: string;
  materialDigest: string;
  decision: AdoptionReviewDecisionKind;
  path: string;
  kind: AdoptionReviewedSurface["kind"];
  scope: string;
  trust: "evidence-only";
}

export interface AdoptionProposalCandidateEvidence {
  evidenceId: string;
  materialDigest: string;
  path: string;
  kind: AdoptionReviewedSurface["kind"];
  scope: string;
  content: string;
  trust: "candidate-evidence";
}

export interface AdoptionReviewProposalBlocker {
  code: string;
  message: string;
  provenance: string[];
}

export interface AdoptionReviewProposal {
  schemaVersion: 1;
  proposalId: string;
  status: "ready-for-authorization-review" | "blocked";
  candidates: AdoptionProposalCandidateEvidence[];
  rejectedEvidence: string[];
  deferredEvidence: string[];
  blockers: AdoptionReviewProposalBlocker[];
  boundaries: {
    evidenceIsProjectTruth: false;
    decisionsAreProjectTruth: false;
    proposalIsAuthorization: false;
    grantsAuthority: false;
    changesMade: 0;
  };
}

function stableDigest(parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u0000"), "utf8").digest("hex");
}

export function adoptionReviewedEvidenceMaterialDigest(surface: AdoptionReviewedSurface): string {
  return stableDigest([
    surface.kind,
    surface.path,
    surface.scope,
    surface.trust,
    surface.status,
    surface.truncated ? "truncated" : "complete",
    String(surface.bytesRead),
    surface.content,
  ]);
}

export function adoptionReviewedEvidenceId(surface: AdoptionReviewedSurface): string {
  return `adoption-evidence:${adoptionReviewedEvidenceMaterialDigest(surface)}`;
}

function currentEvidenceById(review: AdoptionContentReview): Map<string, AdoptionReviewedSurface> {
  const result = new Map<string, AdoptionReviewedSurface>();
  for (const surface of review.reviewed) {
    const evidenceId = adoptionReviewedEvidenceId(surface);
    if (result.has(evidenceId)) {
      throw new Error("Adoption review contains duplicate material-identical evidence and cannot be decided ambiguously.");
    }
    result.set(evidenceId, surface);
  }
  return result;
}

export function bindAdoptionReviewDecisions(
  review: AdoptionContentReview,
  inputs: readonly AdoptionReviewDecisionInput[],
): AdoptionReviewDecisionRecord[] {
  const current = currentEvidenceById(review);
  const seen = new Set<string>();
  const records: AdoptionReviewDecisionRecord[] = [];

  for (const input of inputs) {
    if (seen.has(input.evidenceId)) {
      throw new Error("Each reviewed evidence item may have at most one explicit current decision.");
    }
    seen.add(input.evidenceId);

    const surface = current.get(input.evidenceId);
    if (!surface) {
      throw new Error("Review decision references evidence that is not present in the current content review.");
    }

    const currentDigest = adoptionReviewedEvidenceMaterialDigest(surface);
    if (input.materialDigest !== currentDigest) {
      throw new Error("Review decision material is stale or does not match the current reviewed evidence.");
    }
    if (input.decision === "accept-as-candidate" && surface.truncated) {
      throw new Error("Truncated evidence cannot be accepted as candidate evidence because omitted material remains unknown.");
    }

    records.push({
      evidenceId: input.evidenceId,
      materialDigest: currentDigest,
      decision: input.decision,
      path: surface.path,
      kind: surface.kind,
      scope: surface.scope,
      trust: "evidence-only",
    });
  }

  records.sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
  return records;
}

function unresolvedOverlapBlockers(
  review: AdoptionContentReview,
  acceptedPaths: ReadonlySet<string>,
): AdoptionReviewProposalBlocker[] {
  return review.attention
    .filter((item) => item.code === "adoption-review-overlapping-guidance")
    .filter((item) => item.provenance.length > 1 && item.provenance.every((path) => acceptedPaths.has(path)))
    .map((item) => ({
      code: "adoption-proposal-unresolved-guidance-overlap",
      message: "Accepted candidate evidence contains overlapping guidance whose precedence or semantic conflict remains unresolved.",
      provenance: [...item.provenance].sort(),
    }));
}

export function buildAdoptionReviewProposal(
  review: AdoptionContentReview,
  decisions: readonly AdoptionReviewDecisionRecord[],
): AdoptionReviewProposal {
  const current = currentEvidenceById(review);
  const decisionById = new Map<string, AdoptionReviewDecisionRecord>();

  for (const decision of decisions) {
    const surface = current.get(decision.evidenceId);
    if (!surface) {
      throw new Error("Proposal construction refused a decision for evidence that is no longer in the current review.");
    }
    const digest = adoptionReviewedEvidenceMaterialDigest(surface);
    if (decision.materialDigest !== digest) {
      throw new Error("Proposal construction refused stale decision material.");
    }
    if (decisionById.has(decision.evidenceId)) {
      throw new Error("Proposal construction requires exactly one decision per decided evidence item.");
    }
    decisionById.set(decision.evidenceId, decision);
  }

  const candidates: AdoptionProposalCandidateEvidence[] = [];
  const rejectedEvidence: string[] = [];
  const deferredEvidence: string[] = [];
  const blockers: AdoptionReviewProposalBlocker[] = [];

  for (const [evidenceId, surface] of [...current.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const decision = decisionById.get(evidenceId);
    if (!decision) {
      blockers.push({
        code: "adoption-proposal-undecided-evidence",
        message: "Reviewed evidence has no explicit current decision and was not implicitly accepted.",
        provenance: [surface.path],
      });
      continue;
    }

    if (decision.decision === "accept-as-candidate") {
      if (surface.truncated) {
        blockers.push({
          code: "adoption-proposal-truncated-candidate",
          message: "Truncated reviewed evidence cannot be proposed as accepted candidate evidence.",
          provenance: [surface.path],
        });
        continue;
      }
      candidates.push({
        evidenceId,
        materialDigest: adoptionReviewedEvidenceMaterialDigest(surface),
        path: surface.path,
        kind: surface.kind,
        scope: surface.scope,
        content: surface.content,
        trust: "candidate-evidence",
      });
    } else if (decision.decision === "reject") {
      rejectedEvidence.push(evidenceId);
    } else {
      deferredEvidence.push(evidenceId);
      blockers.push({
        code: "adoption-proposal-deferred-evidence",
        message: "At least one reviewed evidence item is explicitly deferred and remains unresolved.",
        provenance: [surface.path],
      });
    }
  }

  const acceptedPaths = new Set(candidates.map((item) => item.path));
  blockers.push(...unresolvedOverlapBlockers(review, acceptedPaths));

  candidates.sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
  rejectedEvidence.sort();
  deferredEvidence.sort();
  blockers.sort((a, b) => `${a.code}:${a.provenance.join(",")}`.localeCompare(`${b.code}:${b.provenance.join(",")}`));

  const proposalMaterial = JSON.stringify({
    schemaVersion: 1,
    candidates: candidates.map(({ evidenceId, materialDigest, path, kind, scope }) => ({ evidenceId, materialDigest, path, kind, scope })),
    rejectedEvidence,
    deferredEvidence,
    blockers,
  });
  const proposalId = `adoption-proposal:${createHash("sha256").update(proposalMaterial, "utf8").digest("hex")}`;

  return {
    schemaVersion: 1,
    proposalId,
    status: blockers.length === 0 ? "ready-for-authorization-review" : "blocked",
    candidates,
    rejectedEvidence,
    deferredEvidence,
    blockers,
    boundaries: {
      evidenceIsProjectTruth: false,
      decisionsAreProjectTruth: false,
      proposalIsAuthorization: false,
      grantsAuthority: false,
      changesMade: 0,
    },
  };
}
