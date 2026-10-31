import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  mapKnowledgeChangeReview, prepareProtectedKnowledgeChangeReview,
} from "../src/intelligence/knowledge-change-review.js";
import { buildProjectKnowledgeProjection } from "../src/intelligence/knowledge-projection.js";
import { initializeProject } from "../src/runtime/initialization.js";
import { buildActionableProposal } from "../src/runtime/actionable-proposal.js";
import { recordAcceptedDecision } from "../src/runtime/canonical-change.js";
import { parseSemanticProposalCandidate } from "../src/runtime/semantic-proposal.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

async function fixture(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-knowledge-review-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}
function candidate(proposedStatement: string, targetDecisionId?: string) {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-decision",
    changeKind: targetDecisionId ? "supersede" : "add",
    proposedStatement,
    rationale: "Review proposed long-lived decision",
    origin: "explicit-user",
    ...(targetDecisionId ? { targetDecisionId } : {}),
  });
}

test("structured change review binds exact proposal to active Project Brain decision without granting Authority", async () => {
  await fixture(async path => {
    let prior!: Awaited<ReturnType<typeof recordAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      prior = await recordAcceptedDecision("Settings cards use 12px padding", path, { authorized: true });
    });
    const projection = await buildProjectKnowledgeProjection(path);
    const proposal = await buildActionableProposal(candidate("Settings cards use 16px padding", prior.id), path);
    assert.equal(projection.state, "ready");
    assert.equal(proposal.state, "actionable-proposal");
    if (projection.state !== "ready" || proposal.state !== "actionable-proposal") return;

    const review = mapKnowledgeChangeReview(projection, proposal.proposal);
    assert.equal(review.projectId, projection.stableProjectIdentity);
    assert.equal(review.baselineDigest, projection.baseline.digest);
    assert.equal(review.change.kind, "supersede");
    assert.equal(review.change.recordType, "decision");
    assert.equal(review.change.target?.source.sourceRecordId, prior.id);
    assert.equal(review.change.target?.statement, prior.text);
    assert.equal(review.change.scope, "unspecified");
    assert.equal(review.change.classification, "unclassified");
    assert.equal(review.boundaries.requiresUserApproval, true);
    assert.equal(review.boundaries.proposalIsTruth, false);
    assert.equal(review.boundaries.grantsAuthority, false);
    assert.equal(review.boundaries.performsMutation, false);
    assert.equal(review.boundaries.authorizationStateChanged, false);
    assert.equal(review.proposal.materialDigest.digest, proposal.proposal.materialDigest.digest);
  });
});

test("review rejects stale baseline and other-project proposal even if both source states appear valid", async () => {
  await fixture(async a => {
    await fixture(async b => {
      const projectionA = await buildProjectKnowledgeProjection(a);
      const projectionB = await buildProjectKnowledgeProjection(b);
      const proposalB = await buildActionableProposal(candidate("Use shared window controls"), b);
      assert.equal(projectionA.state, "ready");
      assert.equal(projectionB.state, "ready");
      assert.equal(proposalB.state, "actionable-proposal");
      if (projectionA.state !== "ready" || projectionB.state !== "ready" || proposalB.state !== "actionable-proposal") return;
      assert.throws(() => mapKnowledgeChangeReview(projectionA, proposalB.proposal), /different Project Brain/i);

      const oldProposal = await buildActionableProposal(candidate("Use 12px padding"), a);
      assert.equal(oldProposal.state, "actionable-proposal");
      if (oldProposal.state !== "actionable-proposal") return;
      await mutateAcceptedFixture(a, async () => {
        await recordAcceptedDecision("Use green headers", a, { authorized: true });
      });
      const after = await buildProjectKnowledgeProjection(a);
      assert.equal(after.state, "ready");
      if (after.state !== "ready") return;
      assert.throws(() => mapKnowledgeChangeReview(after, oldProposal.proposal), /stale or different/i);
    });
  });
});

test("review refuses duplicate accepted truth and missing/stale supersession targets", async () => {
  await fixture(async path => {
    let prior!: Awaited<ReturnType<typeof recordAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      prior = await recordAcceptedDecision("Use 12px padding", path, { authorized: true });
    });
    const current = await buildProjectKnowledgeProjection(path);
    assert.equal(current.state, "ready");
    if (current.state !== "ready") return;

    const duplicate = await buildActionableProposal(candidate("Use 12px padding"), path);
    assert.equal(duplicate.state, "actionable-proposal");
    if (duplicate.state === "actionable-proposal") {
      assert.throws(() => mapKnowledgeChangeReview(current, duplicate.proposal), /identical active canonical/i);
    }

    const replacement = await buildActionableProposal(candidate("Use 16px padding", prior.id), path);
    assert.equal(replacement.state, "actionable-proposal");
    if (replacement.state !== "actionable-proposal") return;
    const modified = {
      ...current,
      records: current.records.map(item => item.source.sourceRecordId === prior.id
        ? { ...item, lifecycle: "superseded" as const } : item),
    };
    assert.throws(() => mapKnowledgeChangeReview(modified, replacement.proposal), /not uniquely present/i);
  });
});

test("untrusted local acceptance receipts are not enough to prepare protected Project Truth review", async () => {
  await fixture(async path => {
    const result = await prepareProtectedKnowledgeChangeReview(path, {
      schemaVersion: 1, domain: "project-decision", changeKind: "add",
      proposedStatement: "Use shared colors",
      rationale: "Untrusted candidate",
      origin: "livariant-inference",
    });
    // Fixture establishes local accepted state, not independent Guardian-origin protected integrity.
    assert.equal(result.state, "blocked");
    if (result.state !== "blocked") return;
    assert.equal(result.grantsAuthority, false);
    assert.equal(result.performsMutation, false);
  });
});
