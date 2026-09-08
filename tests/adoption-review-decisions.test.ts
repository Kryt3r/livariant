import assert from "node:assert/strict";
import test from "node:test";
import {
  adoptionReviewedEvidenceId,
  adoptionReviewedEvidenceMaterialDigest,
  bindAdoptionReviewDecisions,
  buildAdoptionReviewProposal,
} from "../src/project/adoption-review-decisions.js";
import type { AdoptionContentReview, AdoptionReviewedSurface } from "../src/project/adoption-review.js";

function surface(overrides: Partial<AdoptionReviewedSurface> & Pick<AdoptionReviewedSurface, "path" | "content">): AdoptionReviewedSurface {
  return {
    kind: "documentation",
    scope: ".",
    trust: "evidence-only",
    bytesRead: Buffer.byteLength(overrides.content, "utf8"),
    truncated: false,
    status: "observed-text",
    ...overrides,
  };
}

function review(reviewed: AdoptionReviewedSurface[], attention: AdoptionContentReview["attention"] = []): AdoptionContentReview {
  return {
    reviewed,
    attention,
    boundaries: {
      evidenceIsProjectTruth: false,
      contentReviewIsAcceptance: false,
      grantsAuthority: false,
      automaticConflictResolution: false,
      changesMade: 0,
    },
  };
}

function decisionFor(item: AdoptionReviewedSurface, decision: "accept-as-candidate" | "reject" | "defer") {
  return {
    evidenceId: adoptionReviewedEvidenceId(item),
    materialDigest: adoptionReviewedEvidenceMaterialDigest(item),
    decision,
  } as const;
}

test("explicit material-bound decisions build only candidate evidence and never Project Truth or Authority", () => {
  const architecture = surface({ path: "ARCHITECTURE.md", kind: "architecture", content: "Use ports and adapters.\n" });
  const readme = surface({ path: "README.md", content: "Existing project.\n" });
  const current = review([architecture, readme]);

  const decisions = bindAdoptionReviewDecisions(current, [
    decisionFor(architecture, "accept-as-candidate"),
    decisionFor(readme, "reject"),
  ]);
  const proposal = buildAdoptionReviewProposal(current, decisions);

  assert.equal(proposal.status, "ready-for-authorization-review");
  assert.equal(proposal.candidates.length, 1);
  assert.equal(proposal.candidates[0].path, "ARCHITECTURE.md");
  assert.equal(proposal.candidates[0].trust, "candidate-evidence");
  assert.deepEqual(proposal.rejectedEvidence, [adoptionReviewedEvidenceId(readme)]);
  assert.deepEqual(proposal.deferredEvidence, []);
  assert.equal(proposal.boundaries.evidenceIsProjectTruth, false);
  assert.equal(proposal.boundaries.decisionsAreProjectTruth, false);
  assert.equal(proposal.boundaries.proposalIsAuthorization, false);
  assert.equal(proposal.boundaries.grantsAuthority, false);
  assert.equal(proposal.boundaries.changesMade, 0);
});

test("changed reviewed material invalidates a prior decision instead of reusing stale acceptance", () => {
  const before = surface({ path: "ARCHITECTURE.md", kind: "architecture", content: "Architecture v1\n" });
  const priorDecision = decisionFor(before, "accept-as-candidate");
  const after = surface({ path: "ARCHITECTURE.md", kind: "architecture", content: "Architecture v2\n" });

  assert.throws(
    () => bindAdoptionReviewDecisions(review([after]), [priorDecision]),
    /not present in the current content review|stale/i,
  );
});

test("reviewed evidence is never implicitly accepted and deferred evidence blocks proposal readiness", () => {
  const accepted = surface({ path: "ARCHITECTURE.md", kind: "architecture", content: "Architecture\n" });
  const undecided = surface({ path: "README.md", content: "Readme\n" });
  const deferred = surface({ path: "docs/decision.md", kind: "decision-record", content: "Decision pending\n" });
  const current = review([accepted, undecided, deferred]);
  const decisions = bindAdoptionReviewDecisions(current, [
    decisionFor(accepted, "accept-as-candidate"),
    decisionFor(deferred, "defer"),
  ]);
  const proposal = buildAdoptionReviewProposal(current, decisions);

  assert.equal(proposal.status, "blocked");
  assert.equal(proposal.candidates.length, 1);
  assert.ok(proposal.blockers.some((item) => item.code === "adoption-proposal-undecided-evidence" && item.provenance.includes("README.md")));
  assert.ok(proposal.blockers.some((item) => item.code === "adoption-proposal-deferred-evidence" && item.provenance.includes("docs/decision.md")));
});

test("accepted overlapping scoped guidance remains blocked without automatic precedence", () => {
  const rootGuidance = surface({ path: "AGENTS.md", kind: "agent-guidance", scope: ".", content: "Root rule\n" });
  const nestedGuidance = surface({ path: "packages/api/AGENTS.md", kind: "agent-guidance", scope: "packages/api", content: "Nested rule\n" });
  const current = review(
    [rootGuidance, nestedGuidance],
    [{
      code: "adoption-review-overlapping-guidance",
      severity: "review",
      message: "overlap",
      provenance: ["AGENTS.md", "packages/api/AGENTS.md"],
    }],
  );
  const decisions = bindAdoptionReviewDecisions(current, [
    decisionFor(rootGuidance, "accept-as-candidate"),
    decisionFor(nestedGuidance, "accept-as-candidate"),
  ]);
  const proposal = buildAdoptionReviewProposal(current, decisions);

  assert.equal(proposal.status, "blocked");
  assert.equal(proposal.candidates.length, 2);
  assert.ok(proposal.blockers.some((item) => item.code === "adoption-proposal-unresolved-guidance-overlap"));
  assert.equal(proposal.boundaries.grantsAuthority, false);
});

test("truncated evidence cannot be accepted as candidate evidence", () => {
  const truncated = surface({
    path: "ARCHITECTURE.md",
    kind: "architecture",
    content: "partial",
    truncated: true,
  });

  assert.throws(
    () => bindAdoptionReviewDecisions(review([truncated]), [decisionFor(truncated, "accept-as-candidate")]),
    /truncated evidence cannot be accepted/i,
  );
});

test("proposal id is deterministic regardless of decision input ordering", () => {
  const a = surface({ path: "ARCHITECTURE.md", kind: "architecture", content: "A\n" });
  const b = surface({ path: "README.md", content: "B\n" });
  const current = review([b, a]);

  const first = buildAdoptionReviewProposal(current, bindAdoptionReviewDecisions(current, [decisionFor(a, "accept-as-candidate"), decisionFor(b, "reject")]));
  const second = buildAdoptionReviewProposal(current, bindAdoptionReviewDecisions(current, [decisionFor(b, "reject"), decisionFor(a, "accept-as-candidate")]));

  assert.equal(first.proposalId, second.proposalId);
  assert.deepEqual(first, second);
});
