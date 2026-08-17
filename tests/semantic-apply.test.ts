import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  applyActionableProposal,
  buildActionableProposal,
  initializeProject,
  inspectAuthorizationAudit,
  parseSemanticProposalCandidate,
  recordAcceptedDecision,
} from "../src/runtime/index.js";
import type { ActionableProposal } from "../src/runtime/actionable-proposal.js";
import { parseDecisionsMarkdown } from "../src/project-brain/decisions.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

const FIXED_AUTH_ID = "33333333-3333-4333-8333-333333333333";

async function projectId(path: string): Promise<string> {
  const metadata = JSON.parse(await readFile(resolve(path, ".project-brain", "metadata.json"), "utf8")) as { projectBrain: { projectId: string } };
  return metadata.projectBrain.projectId;
}

async function cleanupMachineAuthority(path: string): Promise<void> {
  let id: string;
  try { id = await projectId(path); } catch { return; }
  await rm(resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", id), { recursive: true, force: true });
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-semantic-apply-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await cleanupMachineAuthority(path);
    await rm(path, { recursive: true, force: true });
  }
}

async function prepare(path: string, input: unknown): Promise<ActionableProposal> {
  const candidate = parseSemanticProposalCandidate(input);
  const result = await buildActionableProposal(candidate, path);
  assert.equal(result.state, "actionable-proposal");
  if (result.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  return result.proposal;
}

async function seedAuthorizedEvidence(path: string, proposal: ActionableProposal, authorizationId = FIXED_AUTH_ID): Promise<void> {
  const authorizedAt = new Date().toISOString();
  const binding = {
    authorizationId,
    stableProjectIdentity: proposal.stableProjectIdentity,
    actionableProposalId: proposal.actionableProposalId,
    actionableProposalVersion: 1,
    proposalDigest: proposal.materialDigest.digest,
    mutationScope: proposal.mutationScope,
    baseline: proposal.baseline,
  };
  const projectRoot = resolve(path, ".project-brain", ".authorizations");
  await mkdir(resolve(projectRoot, "history"), { recursive: true });
  await writeFile(resolve(projectRoot, "active.json"), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization-audit",
    state: "authorized",
    authorizedAt,
  }, null, 2)}\n`, "utf8");

  const machineRoot = resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", proposal.stableProjectIdentity);
  await mkdir(machineRoot, { recursive: true });
  await writeFile(resolve(machineRoot, `${authorizationId}.json`), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization",
    state: "authorized",
    authorizedAt,
  }, null, 2)}\n`, "utf8");
}

function candidate(domain: "project-decision" | "project-goal" | "project-knowledge", proposedStatement: string) {
  return {
    schemaVersion: 1,
    domain,
    changeKind: "add",
    proposedStatement,
    rationale: "WP-009 semantic apply test",
    origin: "explicit-user",
  };
}

test("semantic apply consumes exact authority and completes decision add once", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, candidate("project-decision", "Use passkeys"));
    await seedAuthorizedEvidence(path, proposal);
    const result = await applyActionableProposal(FIXED_AUTH_ID, proposal, path);
    assert.equal(result.state, "completed");
    assert.equal(result.semanticChangesMade, 1);
    assert.equal(result.mutationAuthorizationConsumed, true);

    const decisions = parseDecisionsMarkdown(await readFile(resolve(path, ".project-brain", "decisions.md"), "utf8"));
    assert.equal(decisions.issues.length, 0);
    assert.equal(decisions.records.filter((record) => record.status === "active" && record.text === "Use passkeys").length, 1);
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
    assert.equal(audit.history.filter((record) => record.authorizationId === FIXED_AUTH_ID && record.state === "completed").length, 1);

    await assert.rejects(applyActionableProposal(FIXED_AUTH_ID, proposal, path), /No active project-local authorization audit|no longer matches|cannot reproduce/i);
  });
});

test("semantic apply supports confirmed goal and knowledge add with exact authority", async () => {
  await withProject(async (path) => {
    const goal = await prepare(path, candidate("project-goal", "Ship bounded Semantic Apply"));
    await seedAuthorizedEvidence(path, goal);
    await applyActionableProposal(FIXED_AUTH_ID, goal, path);
    assert.match(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /- Ship bounded Semantic Apply/);

    const knowledge = await prepare(path, candidate("project-knowledge", "Semantic Apply consumes WP-008 Authority"));
    await seedAuthorizedEvidence(path, knowledge, "44444444-4444-4444-8444-444444444444");
    await applyActionableProposal("44444444-4444-4444-8444-444444444444", knowledge, path);
    assert.match(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), /- Semantic Apply consumes WP-008 Authority/);
  });
});

test("semantic apply supports exact decision supersession and preserves history", async () => {
  await withProject(async (path) => {
    let existing!: Awaited<ReturnType<typeof recordAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      existing = await recordAcceptedDecision("Use passwords", path, { authorized: true });
    });
    const proposal = await prepare(path, {
      schemaVersion: 1,
      domain: "project-decision",
      changeKind: "supersede",
      targetDecisionId: existing.id,
      proposedStatement: "Use passkeys",
      rationale: "Replace accepted authentication direction",
      origin: "explicit-user",
    });
    await seedAuthorizedEvidence(path, proposal);
    await applyActionableProposal(FIXED_AUTH_ID, proposal, path);

    const decisions = parseDecisionsMarkdown(await readFile(resolve(path, ".project-brain", "decisions.md"), "utf8"));
    const target = decisions.records.find((record) => record.id === existing.id);
    assert.equal(target?.status, "superseded");
    const replacement = decisions.records.find((record) => record.id === target?.supersededBy);
    assert.equal(replacement?.status, "active");
    assert.equal(replacement?.text, "Use passkeys");
  });
});

test("stale baseline is refused before Authority consumption and semantic mutation", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, candidate("project-decision", "Use passkeys"));
    await seedAuthorizedEvidence(path, proposal);
    await recordAcceptedDecision("Concurrent durable decision", path, { authorized: true });
    await assert.rejects(applyActionableProposal(FIXED_AUTH_ID, proposal, path), /no longer matches|cannot reproduce/i);
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active?.state, "authorized");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "decisions.md"), "utf8"), /Use passkeys/);
  });
});

test("failure before semantic promote after Authority consumption becomes terminal recovery-required", async () => {
  await withProject(async (path) => {
    const proposal = await prepare(path, candidate("project-goal", "Never promote stale apply"));
    await seedAuthorizedEvidence(path, proposal);
    await assert.rejects(
      applyActionableProposal(FIXED_AUTH_ID, proposal, path, {
        beforePromote: async () => { throw new Error("injected pre-promote failure"); },
      }),
      /recovery-required/i,
    );
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /Never promote stale apply/);
    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active, null);
    assert.ok(audit.history.some((record) => record.authorizationId === FIXED_AUTH_ID && record.state === "failed-recovery-required"));
  });
});
