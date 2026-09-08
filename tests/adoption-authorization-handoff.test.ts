import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/index-core.js";
import type { AdoptionContentReview } from "../src/project/adoption-review.js";
import {
  adoptionReviewedEvidenceId,
  adoptionReviewedEvidenceMaterialDigest,
  bindAdoptionReviewDecisions,
  buildAdoptionReviewProposal,
} from "../src/project/adoption-review-decisions.js";
import { prepareAdoptionAuthorizationHandoff } from "../src/project/adoption-authorization-handoff.js";

function review(content = "Architecture evidence"): AdoptionContentReview {
  return {
    reviewed: [{
      kind: "architecture",
      path: "ARCHITECTURE.md",
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

function accepted(current: AdoptionContentReview) {
  const surface = current.reviewed[0]!;
  return bindAdoptionReviewDecisions(current, [{
    evidenceId: adoptionReviewedEvidenceId(surface),
    materialDigest: adoptionReviewedEvidenceMaterialDigest(surface),
    decision: "accept-as-candidate",
  }]);
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-adoption-auth-handoff-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("authorization handoff binds exact current adoption proposal and remains non-authoritative", async () => {
  await withProject(async (path) => {
    const current = review();
    const decisions = accepted(current);
    const proposal = buildAdoptionReviewProposal(current, decisions);
    const candidate = proposal.candidates[0]!;

    const result = await prepareAdoptionAuthorizationHandoff(current, decisions, {
      adoptionProposalId: proposal.proposalId,
      evidenceId: candidate.evidenceId,
      materialDigest: candidate.materialDigest,
      projection: {
        domain: "project-knowledge",
        proposedStatement: "The project uses a modular architecture.",
        rationale: "Explicitly adopt one reviewed architectural fact as project knowledge.",
      },
    }, path);

    assert.equal(result.state, "ready-for-explicit-authorization");
    if (result.state !== "ready-for-explicit-authorization") return;
    assert.equal(result.adoptionProposalId, proposal.proposalId);
    assert.equal(result.sourceEvidence.evidenceId, candidate.evidenceId);
    assert.equal(result.boundaries.evidenceIsProjectTruth, false);
    assert.equal(result.boundaries.adoptionProposalIsAuthorization, false);
    assert.equal(result.boundaries.projectionIsProjectTruth, false);
    assert.equal(result.boundaries.mutationAuthorization, false);
    assert.equal(result.boundaries.authorizationRequired, true);
    assert.equal(result.boundaries.changesMade, 0);
    assert.equal(result.actionableProposal.actionability.mutationAuthorization, false);
    assert.equal(result.actionableProposal.actionability.authorizationRequired, true);
  });
});

test("authorization handoff rejects stale proposal identity after evidence replacement", async () => {
  const original = review("Architecture A");
  const originalDecisions = accepted(original);
  const originalProposal = buildAdoptionReviewProposal(original, originalDecisions);
  const changed = review("Architecture B");
  const changedDecisions = accepted(changed);
  const changedProposal = buildAdoptionReviewProposal(changed, changedDecisions);
  const candidate = changedProposal.candidates[0]!;

  await assert.rejects(
    prepareAdoptionAuthorizationHandoff(changed, changedDecisions, {
      adoptionProposalId: originalProposal.proposalId,
      evidenceId: candidate.evidenceId,
      materialDigest: candidate.materialDigest,
      projection: {
        domain: "project-knowledge",
        proposedStatement: "Architecture B is current.",
        rationale: "Explicit projection.",
      },
    }, "/unused-before-stale-check"),
    /stale or replaced adoption proposal identity/,
  );
});

test("authorization handoff refuses blocked or incomplete adoption proposals without mutation", async () => {
  const current = review();
  const proposal = buildAdoptionReviewProposal(current, []);
  assert.equal(proposal.status, "blocked");

  const result = await prepareAdoptionAuthorizationHandoff(current, [], {
    adoptionProposalId: proposal.proposalId,
    evidenceId: "adoption-evidence:missing",
    materialDigest: "0".repeat(64),
    projection: {
      domain: "project-goal",
      proposedStatement: "Ship safely.",
      rationale: "No implicit acceptance.",
    },
  }, "/unused-for-blocked-proposal");

  assert.equal(result.state, "blocked");
  assert.equal(result.boundaries.mutationAuthorization, false);
  assert.equal(result.boundaries.changesMade, 0);
});

test("authorization handoff requires exact current candidate material", async () => {
  const current = review();
  const decisions = accepted(current);
  const proposal = buildAdoptionReviewProposal(current, decisions);
  const candidate = proposal.candidates[0]!;

  await assert.rejects(
    prepareAdoptionAuthorizationHandoff(current, decisions, {
      adoptionProposalId: proposal.proposalId,
      evidenceId: candidate.evidenceId,
      materialDigest: "f".repeat(64),
      projection: {
        domain: "project-knowledge",
        proposedStatement: "Explicit semantic projection.",
        rationale: "Material must still match.",
      },
    }, "/unused-before-material-check"),
    /exactly one current candidate evidence item matching the requested material/,
  );
});
