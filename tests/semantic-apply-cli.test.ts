import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyActionableProposal,
  buildActionableProposal,
  initializeProject,
  parseSemanticProposalCandidate,
} from "../src/runtime/index-core.js";
import { buildSemanticProposal } from "../src/runtime/semantic-proposal.js";
import type { ActionableProposal } from "../src/runtime/actionable-proposal.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
const AUTH_ID = "66666666-6666-4666-8666-666666666666";

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
  const path = await mkdtemp(resolve(tmpdir(), "livariant-apply-cli-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await cleanupMachineAuthority(path);
    await rm(path, { recursive: true, force: true });
  }
}

function candidate() {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-knowledge",
    changeKind: "add",
    proposedStatement: "Apply accepts Authority, not claims",
    rationale: "Exercise the WP-009 input boundary",
    origin: "provider-observation",
  });
}

async function prepared(path: string): Promise<ActionableProposal> {
  const result = await buildActionableProposal(candidate(), path);
  assert.equal(result.state, "actionable-proposal");
  if (result.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  return result.proposal;
}

async function seedAuthorized(path: string, proposal: ActionableProposal): Promise<void> {
  const authorizedAt = new Date().toISOString();
  const binding = {
    authorizationId: AUTH_ID,
    stableProjectIdentity: proposal.stableProjectIdentity,
    actionableProposalId: proposal.actionableProposalId,
    actionableProposalVersion: 1,
    proposalDigest: proposal.materialDigest.digest,
    mutationScope: proposal.mutationScope,
    baseline: proposal.baseline,
  };
  const projectRoot = resolve(path, ".project-brain", ".authorizations");
  await mkdir(resolve(projectRoot, "history"), { recursive: true });
  await writeFile(resolve(projectRoot, "active.json"), `${JSON.stringify({ ...binding, schemaVersion: 1, kind: "semantic-mutation-authorization-audit", state: "authorized", authorizedAt }, null, 2)}\n`, "utf8");
  const machineRoot = resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", proposal.stableProjectIdentity);
  await mkdir(machineRoot, { recursive: true });
  await writeFile(resolve(machineRoot, `${AUTH_ID}.json`), `${JSON.stringify({ ...binding, schemaVersion: 1, kind: "semantic-mutation-authorization", state: "authorized", authorizedAt }, null, 2)}\n`, "utf8");
}

function runCli(path: string, args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
}

test("apply CLI rejects permanently review-only Semantic Proposal input", async () => {
  await withProject(async (path) => {
    const review = await buildSemanticProposal(candidate(), path);
    assert.equal(review.state, "proposal");
    if (review.state !== "proposal") return;
    const input = resolve(path, "review-only.json");
    await writeFile(input, `${JSON.stringify(review.proposal)}\n`, "utf8");
    const result = runCli(path, ["apply", "--authorization", AUTH_ID, "--input", input, "--json"]);
    assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
    const output = JSON.parse(result.stdout.trim()) as { state: string; semanticChangesMade: number; error: { message: string } };
    assert.equal(output.state, "blocked");
    assert.equal(output.semanticChangesMade, 0);
    assert.match(output.error.message, /actionable proposal/i);
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), /Apply accepts Authority, not claims/);
  });
});

test("apply CLI rejects candidate JSON as a substitute for Actionable Proposal", async () => {
  await withProject(async (path) => {
    const input = resolve(path, "candidate.json");
    await writeFile(input, `${JSON.stringify({
      schemaVersion: 1,
      domain: "project-knowledge",
      changeKind: "add",
      proposedStatement: "Apply accepts Authority, not claims",
      rationale: "Not an actionable proposal",
      origin: "explicit-user",
    })}\n`, "utf8");
    const result = runCli(path, ["apply", "--authorization", AUTH_ID, "--input", input, "--json"]);
    assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
    assert.equal((JSON.parse(result.stdout.trim()) as { semanticChangesMade: number }).semanticChangesMade, 0);
  });
});

test("wrong authorization id blocks both high-level API and CLI without semantic mutation", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    await seedAuthorized(path, proposal);
    const wrong = "77777777-7777-4777-8777-777777777777";
    await assert.rejects(applyActionableProposal(wrong, proposal, path), /not safely consumable|authorization|binding/i);

    const input = resolve(path, "actionable.json");
    await writeFile(input, `${JSON.stringify(proposal)}\n`, "utf8");
    const result = runCli(path, ["apply", "--authorization", wrong, "--input", input, "--json"]);
    assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
    assert.equal((JSON.parse(result.stdout.trim()) as { semanticChangesMade: number }).semanticChangesMade, 0);
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), /Apply accepts Authority, not claims/);
  });
});

test("matching active authorization with stale baseline does not overclaim a zero-write outcome", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    await seedAuthorized(path, proposal);
    const input = resolve(path, "actionable.json");
    await writeFile(input, `${JSON.stringify(proposal)}\n`, "utf8");
    await writeFile(resolve(path, ".project-brain", "goals.md"), "# Goals\n\n## Confirmed goals\n\n- Concurrent baseline change\n\n## Deferred goals\n\n- None recorded\n", "utf8");

    const result = runCli(path, ["apply", "--authorization", AUTH_ID, "--input", input, "--json"]);
    assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
    const output = JSON.parse(result.stdout.trim()) as {
      recoveryRequired: boolean;
      mutationOutcome: string;
      semanticChangesMade: number | string;
    };
    assert.equal(output.recoveryRequired, true);
    assert.equal(output.mutationOutcome, "unknown-recovery-required");
    assert.equal(output.semanticChangesMade, "unknown");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), /Apply accepts Authority, not claims/);
  });
});

test("tampered Actionable Proposal bytes fail strict digest parsing before Authority consumption", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    await seedAuthorized(path, proposal);
    const tampered = structuredClone(proposal) as ActionableProposal;
    tampered.mutationScope.proposedStatement = "Injected different mutation";
    const input = resolve(path, "tampered-actionable.json");
    await writeFile(input, `${JSON.stringify(tampered)}\n`, "utf8");
    const result = runCli(path, ["apply", "--authorization", AUTH_ID, "--input", input, "--json"]);
    assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
    const output = JSON.parse(result.stdout.trim()) as { semanticChangesMade: number; error: { message: string } };
    assert.equal(output.semanticChangesMade, 0);
    assert.match(output.error.message, /digest/i);
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "knowledge.md"), "utf8"), /Injected different mutation/);
  });
});

test("apply CLI argument surface is exact and rejects missing or duplicate authority arguments", async () => {
  await withProject(async (path) => {
    const proposal = await prepared(path);
    const input = resolve(path, "actionable.json");
    await writeFile(input, `${JSON.stringify(proposal)}\n`, "utf8");
    const missing = runCli(path, ["apply", "--input", input, "--json"]);
    assert.equal(missing.status, 2);
    const duplicate = runCli(path, ["apply", "--authorization", AUTH_ID, "--authorization", AUTH_ID, "--input", input, "--json"]);
    assert.equal(duplicate.status, 2);
  });
});
