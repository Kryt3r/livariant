import test from "node:test";
import assert from "node:assert/strict";
import {
  adoptionReviewedEvidenceId,
  adoptionReviewedEvidenceMaterialDigest,
  bindAdoptionReviewDecisions,
} from "../src/project/adoption-review-decisions.js";
import { buildAdoptionDesktopPresentation } from "../src/project/adoption-desktop-presentation.js";
import type { AdoptionContentReview } from "../src/project/adoption-review.js";

function review(content = "# Project\nCurrent guidance\n"): AdoptionContentReview {
  return {
    reviewed: [{
      kind: "documentation",
      path: "README.md",
      scope: ".",
      trust: "evidence-only",
      content,
      bytesRead: Buffer.byteLength(content),
      truncated: false,
      status: "observed-text",
    }],
    attention: [],
    boundaries: {
      evidenceIsProjectTruth: false,
      contentReviewIsAcceptance: false,
      grantsAuthority: false,
      automaticConflictResolution: false,
      changesMade: 0,
    },
  };
}

test("Desktop presentation keeps undecided evidence visible and blocked", () => {
  const current = review();
  const result = buildAdoptionDesktopPresentation(current, []);

  assert.equal(result.state, "blocked");
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0]?.decision, "undecided");
  assert.equal(result.evidence[0]?.requiresReview, true);
  assert.equal(result.requiresReviewAgain, true);
  assert.equal(result.boundaries.evidenceIsProjectTruth, false);
  assert.equal(result.boundaries.uiDecisionGrantsAuthority, false);
  assert.equal(result.boundaries.projectOwnedFilesAreReadOnly, true);
  assert.equal(result.boundaries.changesMade, 0);
});

test("Desktop presentation exposes explicit decision and ready proposal without granting authority", () => {
  const current = review();
  const surface = current.reviewed[0]!;
  const decisions = bindAdoptionReviewDecisions(current, [{
    evidenceId: adoptionReviewedEvidenceId(surface),
    materialDigest: adoptionReviewedEvidenceMaterialDigest(surface),
    decision: "accept-as-candidate",
  }]);

  const result = buildAdoptionDesktopPresentation(current, decisions);

  assert.equal(result.state, "ready-for-authorization-review");
  assert.equal(result.evidence[0]?.decision, "accept-as-candidate");
  assert.equal(result.authorizationState, "not-authorized");
  assert.equal(result.applyState, "not-applied");
  assert.match(result.proposalId ?? "", /^adoption-proposal:/);
  assert.equal(result.boundaries.proposalIsAuthorization, false);
});

test("changed evidence makes prior decision visibly require review again", () => {
  const original = review("original");
  const originalSurface = original.reviewed[0]!;
  const decisions = bindAdoptionReviewDecisions(original, [{
    evidenceId: adoptionReviewedEvidenceId(originalSurface),
    materialDigest: adoptionReviewedEvidenceMaterialDigest(originalSurface),
    decision: "accept-as-candidate",
  }]);

  const changed = review("changed");
  const result = buildAdoptionDesktopPresentation(changed, decisions);

  assert.equal(result.state, "blocked");
  assert.equal(result.requiresReviewAgain, true);
  assert.equal(result.evidence[0]?.decision, "undecided");
  assert.ok(result.blockers.some((item) => item.code === "desktop-adoption-replaced-evidence"));
});

test("review attention stays visible and does not become hidden conflict resolution", () => {
  const current = review();
  current.attention.push({
    code: "adoption-review-overlapping-guidance",
    severity: "review",
    message: "Conflicting guidance requires review.",
    provenance: ["README.md"],
  });
  const surface = current.reviewed[0]!;
  const decisions = bindAdoptionReviewDecisions(current, [{
    evidenceId: adoptionReviewedEvidenceId(surface),
    materialDigest: adoptionReviewedEvidenceMaterialDigest(surface),
    decision: "accept-as-candidate",
  }]);

  const result = buildAdoptionDesktopPresentation(current, decisions);

  assert.deepEqual(result.evidence[0]?.attentionCodes, ["adoption-review-overlapping-guidance"]);
  assert.equal(result.evidence[0]?.requiresReview, true);
  assert.equal(result.boundaries.hiddenConflictResolution, false);
});
