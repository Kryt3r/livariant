import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  buildActionableProposal,
  initializeProject,
  inspectAuthorizationAudit,
  parseSemanticProposalCandidate,
} from "../src/runtime/index.js";
import type { ActionableProposal } from "../src/runtime/actionable-proposal.js";
import { providerReturnTaskDigest } from "../src/runtime/provider-return.js";
import type { SemanticProposalCandidate } from "../src/runtime/semantic-proposal.js";
import {
  MCP_CONTEXT_TOOL,
  MCP_RETURN_TOOL,
  createMcpSession,
  type JsonRpcResponse,
} from "../src/mcp/server.js";

const AUTH_ID = "99999999-9999-4999-8999-999999999999";

async function projectId(path: string): Promise<string> {
  const metadata = JSON.parse(await readFile(resolve(path, ".project-brain", "metadata.json"), "utf8")) as {
    projectBrain: { projectId: string };
  };
  return metadata.projectBrain.projectId;
}

function machineRoot(id: string): string {
  return resolve(userInfo().homedir, ".livariant", "trust", "semantic-authorizations", id);
}

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-mcp-authority-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    try {
      await rm(machineRoot(await projectId(path)), { recursive: true, force: true });
    } catch {
      // Project setup may have failed before identity existed.
    }
    await rm(path, { recursive: true, force: true });
  }
}

function goalCandidate(statement: string): SemanticProposalCandidate {
  return parseSemanticProposalCandidate({
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "Exercise MCP authority isolation",
    origin: "provider-observation",
  });
}

function externalCandidate(candidate: SemanticProposalCandidate) {
  return {
    schemaVersion: candidate.schemaVersion,
    domain: candidate.domain,
    changeKind: candidate.changeKind,
    proposedStatement: candidate.proposedStatement,
    rationale: candidate.rationale,
    origin: candidate.originClaim,
  };
}

async function actionable(path: string, candidate: SemanticProposalCandidate): Promise<ActionableProposal> {
  const result = await buildActionableProposal(candidate, path);
  assert.equal(result.state, "actionable-proposal");
  if (result.state !== "actionable-proposal") throw new Error("expected actionable proposal");
  return result.proposal;
}

async function seedAuthorizedEvidence(path: string, proposal: ActionableProposal): Promise<void> {
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
  await writeFile(resolve(projectRoot, "active.json"), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization-audit",
    state: "authorized",
    authorizedAt,
  }, null, 2)}\n`, "utf8");

  const root = machineRoot(proposal.stableProjectIdentity);
  await mkdir(root, { recursive: true });
  await writeFile(resolve(root, `${AUTH_ID}.json`), `${JSON.stringify({
    ...binding,
    schemaVersion: 1,
    kind: "semantic-mutation-authorization",
    state: "authorized",
    authorizedAt,
  }, null, 2)}\n`, "utf8");
}

function successResult(response: JsonRpcResponse | null): Record<string, unknown> {
  assert.ok(response && "result" in response);
  return response.result as Record<string, unknown>;
}

function structured(response: JsonRpcResponse | null): Record<string, unknown> {
  const result = successResult(response);
  assert.equal(result.isError, false);
  return result.structuredContent as Record<string, unknown>;
}

async function readySession(path: string) {
  const session = createMcpSession(path);
  await session.handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "authority-test", version: "1" } },
  });
  await session.handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" });
  return session;
}

test("MCP never discovers or consumes matching existing Authority", async () => {
  await withProject(async (path) => {
    const candidate = goalCandidate("MCP must not consume pre-existing Authority");
    await seedAuthorizedEvidence(path, await actionable(path, candidate));

    const session = await readySession(path);
    const context = structured(await session.handleMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: MCP_CONTEXT_TOOL,
        arguments: { provider: "codex", task: "Return one durable candidate" },
      },
    }));
    const task = context.task as { value: string };
    const baseline = context.baseline as { digest: string };
    const providerReturn = {
      schemaVersion: 1,
      packetVersion: 1,
      provider: context.provider,
      contextPacketId: context.packetId,
      stableProjectIdentity: context.stableProjectIdentity,
      baselineDigest: baseline.digest,
      taskDigest: providerReturnTaskDigest(task.value),
      candidate: externalCandidate(candidate),
    };

    const returned = structured(await session.handleMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: MCP_RETURN_TOOL, arguments: { context, providerReturn } },
    }));
    assert.equal(returned.state, "candidate-received");
    const maintenance = returned.maintenance as { state: string; semanticChangesMade: number };
    assert.equal(maintenance.state, "authorization-required");
    assert.equal(maintenance.semanticChangesMade, 0);

    const audit = await inspectAuthorizationAudit(path);
    assert.equal(audit.active?.authorizationId, AUTH_ID);
    assert.equal(audit.active?.state, "authorized");
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /MCP must not consume pre-existing Authority/);
  });
});
