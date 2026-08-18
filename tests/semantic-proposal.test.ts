import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  initializeProject,
  parseSemanticProposalCandidate,
  recordAcceptedDecision,
  SEMANTIC_PROPOSAL_CANDIDATE_FILE_MAX_BYTES,
  supersedeAcceptedDecision,
} from "../src/runtime/index.js";
import { buildSemanticProposal } from "../src/runtime/semantic-proposal.js";
import { mutateAcceptedFixture } from "./accepted-project-brain-fixture.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

function runCli(projectPath: string, args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-semantic-proposal-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

function addCandidate(statement: string, origin = "explicit-user") {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-decision",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "Review the proposed project direction",
    origin,
  });
}

test("read-only add proposal is deterministic, baseline-bound, and permanently non-actionable", async () => {
  await withProject(async (path) => {
    await mutateAcceptedFixture(path, () => recordAcceptedDecision("Keep authentication local", path, { authorized: true }));
    const candidate = addCandidate("Use passkeys for authentication");
    const managed = ["project.md", "goals.md", "decisions.md", "knowledge.md", "metadata.json"];
    const before = new Map(await Promise.all(managed.map(async (name) => [name, await readFile(resolve(path, ".project-brain", name))] as const)));

    const first = await buildSemanticProposal(candidate, path);
    const second = await buildSemanticProposal(candidate, path);
    assert.equal(first.state, "proposal");
    assert.equal(second.state, "proposal");
    if (first.state !== "proposal" || second.state !== "proposal") return;

    assert.equal(first.proposal.proposalId, second.proposal.proposalId);
    assert.equal(first.proposal.materialDigest.digest, second.proposal.materialDigest.digest);
    assert.equal(first.proposal.baseline.digest, second.proposal.baseline.digest);
    assert.equal(first.proposal.candidate.originClaim, "explicit-user");
    assert.equal(first.proposal.candidate.originVerified, false);
    assert.equal(first.proposal.actionability.reviewOnly, true);
    assert.equal(first.proposal.actionability.mutationAuthorization, false);
    assert.equal(first.proposal.actionability.applySupported, false);
    assert.equal(first.proposal.actionability.authorizationEligible, false);
    assert.equal(first.proposal.changesMade, 0);
    assert.ok(first.proposal.findings.some((finding) => finding.code === "semantic-relation-not-evaluated"));

    for (const name of managed) assert.deepEqual(await readFile(resolve(path, ".project-brain", name)), before.get(name));
  });
});

test("material candidate change changes proposal digest while identical material does not", async () => {
  await withProject(async (path) => {
    const first = await buildSemanticProposal(addCandidate("Use passkeys"), path);
    const same = await buildSemanticProposal(addCandidate("Use passkeys"), path);
    const changed = await buildSemanticProposal(addCandidate("Use hardware keys"), path);
    assert.equal(first.state, "proposal");
    assert.equal(same.state, "proposal");
    assert.equal(changed.state, "proposal");
    if (first.state !== "proposal" || same.state !== "proposal" || changed.state !== "proposal") return;
    assert.equal(first.proposal.materialDigest.digest, same.proposal.materialDigest.digest);
    assert.notEqual(first.proposal.materialDigest.digest, changed.proposal.materialDigest.digest);
  });
});

test("exact active duplicate is surfaced without creating another decision", async () => {
  await withProject(async (path) => {
    await mutateAcceptedFixture(path, () => recordAcceptedDecision("Use passkeys", path, { authorized: true }));
    const before = await readFile(resolve(path, ".project-brain", "decisions.md"));
    const result = await buildSemanticProposal(addCandidate("Use passkeys"), path);
    assert.equal(result.state, "proposal");
    if (result.state !== "proposal") return;
    assert.ok(result.proposal.findings.some((finding) => finding.category === "consistent" && finding.code === "exact-active-duplicate"));
    assert.deepEqual(await readFile(resolve(path, ".project-brain", "decisions.md")), before);
  });
});

test("supersede proposal binds the exact active target", async () => {
  await withProject(async (path) => {
    let target!: Awaited<ReturnType<typeof recordAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      target = await recordAcceptedDecision("Use passwords", path, { authorized: true });
    });
    const candidate = parseSemanticProposalCandidate({
      schemaVersion: 1,
      domain: "project-decision",
      changeKind: "supersede",
      targetDecisionId: target.id,
      proposedStatement: "Use passkeys",
      rationale: "Authentication direction changed",
      origin: "provider-observation",
    });
    const result = await buildSemanticProposal(candidate, path);
    assert.equal(result.state, "proposal");
    if (result.state !== "proposal") return;
    assert.equal(result.proposal.evidence.targetDecision?.id, target.id);
    assert.equal(result.proposal.evidence.targetDecision?.text, "Use passwords");
    assert.equal(result.proposal.intendedScope.targetDecisionId, target.id);
    assert.ok(result.proposal.findings.some((finding) => finding.category === "canonical-conflict"));
  });
});

test("missing or superseded target fails closed", async () => {
  await withProject(async (path) => {
    const missing = parseSemanticProposalCandidate({
      schemaVersion: 1,
      domain: "project-decision",
      changeKind: "supersede",
      targetDecisionId: "D-missing",
      proposedStatement: "Replacement",
      rationale: "Test missing target",
      origin: "project-evidence",
    });
    assert.equal((await buildSemanticProposal(missing, path)).state, "blocked");

    let target!: Awaited<ReturnType<typeof recordAcceptedDecision>>;
    await mutateAcceptedFixture(path, async () => {
      target = await recordAcceptedDecision("Old", path, { authorized: true });
    });
    await mutateAcceptedFixture(path, () => supersedeAcceptedDecision({ decisionId: target.id, replacement: "Current" }, path, { authorized: true }));
    const stale = parseSemanticProposalCandidate({
      schemaVersion: 1,
      domain: "project-decision",
      changeKind: "supersede",
      targetDecisionId: target.id,
      proposedStatement: "Another",
      rationale: "Test stale target",
      origin: "project-evidence",
    });
    assert.equal((await buildSemanticProposal(stale, path)).state, "blocked");
  });
});

test("candidate schema rejects workflow-policy and unknown fields", () => {
  const forbidden = ["approved", "authorized", "canonical", "blockingEffect", "baseline", "proposalDigest", "reviewOnly", "applySupported", "authorizationEligible", "diagnosis", "severity"];
  for (const key of forbidden) {
    assert.throws(() => parseSemanticProposalCandidate({
      schemaVersion: 1,
      domain: "project-decision",
      changeKind: "add",
      proposedStatement: "Use passkeys",
      rationale: "Test strict schema",
      origin: "explicit-user",
      [key]: "caller-value",
    }), /unsupported field/);
  }
});

test("managed-state change during proposal construction fails closed", async () => {
  await withProject(async (path) => {
    const result = await buildSemanticProposal(addCandidate("Use passkeys"), path, {
      beforeRevalidate: async () => {
        await writeFile(resolve(path, ".project-brain", "goals.md"), "# Goals\n\n- Concurrent change\n", "utf8");
      },
    });
    assert.equal(result.state, "blocked");
    if (result.state !== "blocked") return;
    assert.ok(result.findings.some((finding) => "code" in finding && finding.code === "proposal-concurrent-change"));
  });
});

test("propose CLI refuses local-only Project Brain truth before rendering candidate material", async () => {
  await withProject(async (path) => {
    const candidatePath = resolve(path, "candidate.json");
    await writeFile(candidatePath, JSON.stringify({
      schemaVersion: 1,
      domain: "project-decision",
      changeKind: "add",
      proposedStatement: "Use passkeys\u001b[2J\nStatus: review",
      rationale: "Review\u0007candidate",
      origin: "explicit-user",
    }), "utf8");

    const human = runCli(path, ["propose", "--input", candidatePath]);
    assert.equal(human.status, 3, human.stderr);
    assert.match(human.stdout, /State: blocked/);
    assert.doesNotMatch(human.stdout, /Origin claim:|Proposed statement:/);
    assert.match(human.stdout, /project-brain-integrity-/i);

    const json = runCli(path, ["propose", "--input", candidatePath, "--json"]);
    assert.equal(json.status, 3, json.stderr);
    const parsed = JSON.parse(json.stdout) as { state: string; proposal: unknown; findings: Array<{ code: string }> };
    assert.equal(parsed.state, "blocked");
    assert.equal(parsed.proposal, null);
    assert.ok(parsed.findings.some((finding) => finding.code.startsWith("project-brain-integrity-")));
  });
});

test("oversized and malformed candidate input fails with structured non-success", async () => {
  await withProject(async (path) => {
    const oversized = resolve(path, "oversized.json");
    await writeFile(oversized, "x".repeat(SEMANTIC_PROPOSAL_CANDIDATE_FILE_MAX_BYTES + 1), "utf8");
    const sizeResult = runCli(path, ["propose", "--input", oversized, "--json"]);
    assert.equal(sizeResult.status, 2, sizeResult.stderr);
    assert.equal((JSON.parse(sizeResult.stdout) as { state: string }).state, "invalid-candidate");

    const malformed = resolve(path, "malformed.json");
    const marker = "FIXTURE_MARKER_DO_NOT_REFLECT";
    await writeFile(malformed, `{\"value\":\"${marker}\"`, "utf8");
    const malformedResult = runCli(path, ["propose", "--input", malformed, "--json"]);
    assert.equal(malformedResult.status, 2, malformedResult.stderr);
    assert.equal(malformedResult.stdout.includes(marker), false);
  });
});
