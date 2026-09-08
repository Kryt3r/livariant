import assert from "node:assert/strict";
import { lstat, mkdtemp, readFile, rm } from "node:fs/promises";
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
import { authorizeAdoptionAuthorizationHandoff } from "../src/project/adoption-authorization-consumption.js";

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

function requestFor(current: AdoptionContentReview, statement = "The project uses a modular architecture."): AdoptionAuthorizationHandoffRequest {
  const decisions = accepted(current);
  const proposal = buildAdoptionReviewProposal(current, decisions);
  const candidate = proposal.candidates[0]!;
  return {
    adoptionProposalId: proposal.proposalId,
    evidenceId: candidate.evidenceId,
    materialDigest: candidate.materialDigest,
    projection: {
      domain: "project-knowledge",
      proposedStatement: statement,
      rationale: "Explicitly project one reviewed fact into the existing authorization path.",
    },
  };
}

async function readyHandoff(path: string, current: AdoptionContentReview, request: AdoptionAuthorizationHandoffRequest): Promise<ReadyAdoptionAuthorizationHandoff> {
  const result = await prepareAdoptionAuthorizationHandoff(current, accepted(current), request, path);
  assert.equal(result.state, "ready-for-explicit-authorization");
  if (result.state !== "ready-for-explicit-authorization") throw new Error("expected ready adoption authorization handoff");
  return result;
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-adoption-auth-consume-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

async function assertMissing(path: string): Promise<void> {
  await assert.rejects(lstat(path), (error: unknown) => error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT");
}

test("adoption authorization consumption reaches the canonical interactive authorization boundary without semantic mutation", async () => {
  await withProject(async (path) => {
    const current = review();
    const request = requestFor(current);
    const handoff = await readyHandoff(path, current, request);
    const knowledgePath = resolve(path, ".project-brain", "knowledge.md");
    const before = await readFile(knowledgePath, "utf8");

    await assert.rejects(
      authorizeAdoptionAuthorizationHandoff(current, accepted(current), request, handoff, path),
      /interactive local terminal/,
    );

    assert.equal(await readFile(knowledgePath, "utf8"), before);
    await assertMissing(resolve(path, ".project-brain", ".authorizations"));
  });
});

test("adoption authorization consumption rejects replaced evidence and proposal before authorization", async () => {
  await withProject(async (path) => {
    const original = review("Architecture A");
    const originalRequest = requestFor(original, "Architecture A is current.");
    const handoff = await readyHandoff(path, original, originalRequest);

    const changed = review("Architecture B");
    const changedRequest = requestFor(changed, "Architecture B is current.");

    await assert.rejects(
      authorizeAdoptionAuthorizationHandoff(changed, accepted(changed), changedRequest, handoff, path),
      /stale or replaced adoption proposal/,
    );
    await assertMissing(resolve(path, ".project-brain", ".authorizations"));
  });
});

test("adoption authorization consumption rejects projection substitution under an otherwise current review", async () => {
  await withProject(async (path) => {
    const current = review();
    const originalRequest = requestFor(current, "Original explicit projection.");
    const handoff = await readyHandoff(path, current, originalRequest);
    const replacementRequest = {
      ...originalRequest,
      projection: {
        ...originalRequest.projection,
        proposedStatement: "Replacement projection that was not reviewed in the handoff.",
      },
    };

    await assert.rejects(
      authorizeAdoptionAuthorizationHandoff(current, accepted(current), replacementRequest, handoff, path),
      /projection changed|Actionable Proposal/,
    );
    await assertMissing(resolve(path, ".project-brain", ".authorizations"));
  });
});

test("adoption authorization consumption rejects a handoff after the Project Brain baseline changes", async () => {
  await withProject(async (path) => {
    const current = review();
    const request = requestFor(current);
    const handoff = await readyHandoff(path, current, request);

    await recordAcceptedDecision("Unrelated durable decision after handoff preparation", path, { authorized: true });

    await assert.rejects(
      authorizeAdoptionAuthorizationHandoff(current, accepted(current), request, handoff, path),
      /current handoff that is still ready for explicit authorization|no longer matches the current Actionable Proposal, project identity, or baseline|stale or substituted Actionable Proposal/,
    );
    await assertMissing(resolve(path, ".project-brain", ".authorizations"));
  });
});

test("adoption authorization handoff cannot claim authority or semantic application support", async () => {
  await withProject(async (path) => {
    const current = review();
    const request = requestFor(current);
    const handoff = await readyHandoff(path, current, request);
    const forged = structuredClone(handoff);
    (forged.boundaries as { mutationAuthorization: boolean }).mutationAuthorization = true;

    await assert.rejects(
      authorizeAdoptionAuthorizationHandoff(current, accepted(current), request, forged, path),
      /boundary claims are invalid/,
    );
    await assertMissing(resolve(path, ".project-brain", ".authorizations"));
  });
});
