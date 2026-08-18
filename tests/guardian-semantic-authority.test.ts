import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { buildSemanticGuardianAuthorityRequest } from "../src/guardian/semantic-authority.js";
import {
  buildActionableProposal,
  initializeProject,
  parseSemanticProposalCandidate,
} from "../src/runtime/index.js";

const AUTH_A = "22222222-2222-4222-8222-222222222222";
const AUTH_B = "33333333-3333-4333-8333-333333333333";

function candidate(statement = "Use passkeys") {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-decision",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "Explicitly review the project direction",
    origin: "explicit-user",
  });
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-guardian-semantic-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

async function proposal(path: string, statement = "Use passkeys") {
  const built = await buildActionableProposal(candidate(statement), path);
  assert.equal(built.state, "actionable-proposal");
  if (built.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  return built.proposal;
}

test("semantic Guardian Authority binds project, physical root, operation, proposal, baseline, and exact scope", async () => {
  await withProject(async (path) => {
    const physical = await realpath(path);
    const firstProposal = await proposal(path);
    const first = buildSemanticGuardianAuthorityRequest({
      authorizationId: AUTH_A,
      physicalProjectRoot: physical,
      proposal: firstProposal,
    });
    const same = buildSemanticGuardianAuthorityRequest({
      authorizationId: AUTH_A,
      physicalProjectRoot: physical,
      proposal: firstProposal,
    });
    assert.equal(first.materialSha256, same.materialSha256);
    assert.equal(first.request.consumer, "semantic-mutation");
    assert.equal(first.request.mode, "one-shot");
    assert.equal(first.request.materialFields.length, 13);

    const differentOperation = buildSemanticGuardianAuthorityRequest({
      authorizationId: AUTH_B,
      physicalProjectRoot: physical,
      proposal: firstProposal,
    });
    assert.notEqual(first.materialSha256, differentOperation.materialSha256);

    const differentPhysicalRoot = buildSemanticGuardianAuthorityRequest({
      authorizationId: AUTH_A,
      physicalProjectRoot: resolve(physical, "relocated"),
      proposal: firstProposal,
    });
    assert.notEqual(first.materialSha256, differentPhysicalRoot.materialSha256);

    const differentScope = buildSemanticGuardianAuthorityRequest({
      authorizationId: AUTH_A,
      physicalProjectRoot: physical,
      proposal: await proposal(path, "Use hardware keys"),
    });
    assert.notEqual(first.materialSha256, differentScope.materialSha256);

    const differentBaselineProposal = structuredClone(firstProposal);
    differentBaselineProposal.baseline.digest = "f".repeat(64);
    const differentBaseline = buildSemanticGuardianAuthorityRequest({
      authorizationId: AUTH_A,
      physicalProjectRoot: physical,
      proposal: differentBaselineProposal,
    });
    assert.notEqual(first.materialSha256, differentBaseline.materialSha256);
  });
});

test("semantic Guardian Authority material preserves reviewable exact identity fields", async () => {
  await withProject(async (path) => {
    const built = buildSemanticGuardianAuthorityRequest({
      authorizationId: AUTH_A,
      physicalProjectRoot: await realpath(path),
      proposal: await proposal(path),
    });
    const fields = new Map(built.request.materialFields.map((field) => [field.label, field.value]));
    assert.equal(fields.get("authorization-operation-id"), AUTH_A);
    assert.equal(fields.get("stable-project-identity")?.length, 36);
    assert.match(fields.get("actionable-proposal-material-sha256") ?? "", /^[a-f0-9]{64}$/u);
    assert.match(fields.get("baseline-sha256") ?? "", /^[a-f0-9]{64}$/u);
    assert.equal(fields.get("scope-domain"), "project-decision");
    assert.equal(fields.get("scope-change-kind"), "add");
    assert.equal(fields.get("scope-proposed-statement"), "Use passkeys");
  });
});
