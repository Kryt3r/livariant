import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject, recordAcceptedDecision } from "../src/runtime/index-core.js";
import type { AdoptionContentReview } from "../src/project/adoption-review.js";
import {
  adoptionReviewedEvidenceId,
  adoptionReviewedEvidenceMaterialDigest,
  bindAdoptionReviewDecisions,
  buildAdoptionReviewProposal,
} from "../src/project/adoption-review-decisions.js";
import {
  prepareAdoptionAuthorizationHandoff,
  type AdoptionAuthorizationHandoffRequest,
  type ReadyAdoptionAuthorizationHandoff,
} from "../src/project/adoption-authorization-handoff.js";
import type { AdoptionAuthorizationConsumptionResult } from "../src/project/adoption-authorization-consumption.js";
import { applyAuthorizedAdoptionHandoff } from "../src/project/adoption-semantic-apply.js";

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

function decisionsFor(current: AdoptionContentReview) {
  const surface = current.reviewed[0]!;
  return bindAdoptionReviewDecisions(current, [{
    evidenceId: adoptionReviewedEvidenceId(surface),
    materialDigest: adoptionReviewedEvidenceMaterialDigest(surface),
    decision: "accept-as-candidate",
  }]);
}

function requestFor(current: AdoptionContentReview): AdoptionAuthorizationHandoffRequest {
  const decisions = decisionsFor(current);
  const proposal = buildAdoptionReviewProposal(current, decisions);
  const candidate = proposal.candidates[0]!;
  return {
    adoptionProposalId: proposal.proposalId,
    evidenceId: candidate.evidenceId,
    materialDigest: candidate.materialDigest,
    projection: {
      domain: "project-knowledge",
      proposedStatement: "The project uses a modular architecture.",
      rationale: "Explicitly adopt one reviewed fact through the canonical apply path.",
    },
  };
}

async function readyHandoff(path: string, current: AdoptionContentReview, request: AdoptionAuthorizationHandoffRequest): Promise<ReadyAdoptionAuthorizationHandoff> {
  const result = await prepareAdoptionAuthorizationHandoff(current, decisionsFor(current), request, path);
  assert.equal(result.state, "ready-for-explicit-authorization");
  if (result.state !== "ready-for-explicit-authorization") throw new Error("expected ready handoff");
  return result;
}

function apparentAuthorization(handoff: ReadyAdoptionAuthorizationHandoff): AdoptionAuthorizationConsumptionResult {
  const proposal = handoff.actionableProposal;
  return {
    state: "authorized-for-separate-apply",
    adoptionProposalId: handoff.adoptionProposalId,
    sourceEvidence: { ...handoff.sourceEvidence },
    bindings: { ...handoff.bindings },
    authorization: {
      state: "authorized",
      authorization: {
        schemaVersion: 1,
        kind: "semantic-mutation-authorization-audit",
        state: "authorized",
        authorizationId: "00000000-0000-4000-8000-000000000001",
        stableProjectIdentity: proposal.stableProjectIdentity,
        actionableProposalId: proposal.actionableProposalId,
        actionableProposalVersion: 1,
        proposalDigest: proposal.materialDigest.digest,
        mutationScope: { ...proposal.mutationScope },
        baseline: { ...proposal.baseline },
        authorizedAt: "2026-09-08T00:00:00.000Z",
      },
      machineEvidenceVerified: true,
      mutationAuthorization: false,
      applySupported: false,
      semanticChangesMade: 0,
      authorizationStateChangesMade: 1,
    },
    boundaries: {
      evidenceIsProjectTruth: false,
      adoptionHandoffIsAuthority: false,
      authorizationIsSemanticMutation: false,
      semanticApplyRequired: true,
      semanticChangesMade: 0,
    },
  };
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-adoption-semantic-apply-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("adoption semantic apply reaches canonical apply but cannot bypass real authorization or Guardian Authority", async () => {
  await withProject(async (path) => {
    const current = review();
    const request = requestFor(current);
    const handoff = await readyHandoff(path, current, request);
    const consumption = apparentAuthorization(handoff);
    const knowledgePath = resolve(path, ".project-brain", "knowledge.md");
    const before = await readFile(knowledgePath, "utf8");

    await assert.rejects(
      applyAuthorizedAdoptionHandoff(current, decisionsFor(current), request, handoff, consumption, path),
      /Semantic apply|authorization|Guardian/i,
    );

    assert.equal(await readFile(knowledgePath, "utf8"), before);
  });
});

test("adoption semantic apply rejects changed evidence before canonical apply", async () => {
  await withProject(async (path) => {
    const original = review("Architecture A");
    const request = requestFor(original);
    const handoff = await readyHandoff(path, original, request);
    const consumption = apparentAuthorization(handoff);
    const changed = review("Architecture B");

    await assert.rejects(
      applyAuthorizedAdoptionHandoff(changed, decisionsFor(changed), request, handoff, consumption, path),
      /stale|replaced|current handoff/i,
    );
  });
});

test("adoption semantic apply rejects forged authorization binding before mutation", async () => {
  await withProject(async (path) => {
    const current = review();
    const request = requestFor(current);
    const handoff = await readyHandoff(path, current, request);
    const consumption = apparentAuthorization(handoff);
    consumption.authorization.authorization.proposalDigest = "f".repeat(64);
    const before = await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8");

    await assert.rejects(
      applyAuthorizedAdoptionHandoff(current, decisionsFor(current), request, handoff, consumption, path),
      /stale, forged, or mismatched authorization evidence/,
    );
    assert.equal(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), before);
  });
});

test("adoption semantic apply rejects a handoff after Project Brain baseline change", async () => {
  await withProject(async (path) => {
    const current = review();
    const request = requestFor(current);
    const handoff = await readyHandoff(path, current, request);
    const consumption = apparentAuthorization(handoff);

    await recordAcceptedDecision("A newer canonical decision", path, { authorized: true });

    await assert.rejects(
      applyAuthorizedAdoptionHandoff(current, decisionsFor(current), request, handoff, consumption, path),
      /current handoff|stale|baseline/i,
    );
  });
});

test("adoption semantic apply never mutates project-owned repository files while failing closed", async () => {
  await withProject(async (path) => {
    const projectFile = resolve(path, "ARCHITECTURE.md");
    await writeFile(projectFile, "project-owned bytes\n", "utf8");
    const current = review("project-owned bytes\n");
    const request = requestFor(current);
    const handoff = await readyHandoff(path, current, request);
    const consumption = apparentAuthorization(handoff);

    await assert.rejects(
      applyAuthorizedAdoptionHandoff(current, decisionsFor(current), request, handoff, consumption, path),
      /Semantic apply|authorization|Guardian/i,
    );
    assert.equal(await readFile(projectFile, "utf8"), "project-owned bytes\n");
  });
});
