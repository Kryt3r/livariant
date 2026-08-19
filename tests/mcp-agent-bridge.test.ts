import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { initializeProject } from "../src/runtime/index.js";
import { buildProviderContext } from "../src/runtime/provider-context.js";
import { providerReturnTaskDigest } from "../src/runtime/provider-return.js";
import { createVerificationEvidenceRecord } from "../src/verification/index.js";
import {
  MCP_CONTEXT_TOOL,
  MCP_RETURN_TOOL,
  MCP_VERIFICATION_TRACE_TOOL,
  createMcpSession,
  type JsonRpcResponse,
} from "../src/mcp/server.js";

async function withProject(run: (path: string) => Promise<void>): Promise<void> {
  const path = await mkdtemp(resolve(tmpdir(), "livariant-mcp-"));
  try {
    await initializeProject(path, { authorized: true });
    await run(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

async function initializedSession(path: string) {
  const session = createMcpSession(path);
  const initialize = await session.handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "livariant-test", version: "1" },
    },
  });
  assert.ok(initialize && "result" in initialize);
  const notification = await session.handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" });
  assert.equal(notification, null);
  return session;
}

function successResult(response: JsonRpcResponse | null): Record<string, unknown> {
  assert.ok(response && "result" in response);
  assert.equal(typeof response.result, "object");
  assert.ok(response.result !== null && !Array.isArray(response.result));
  return response.result as Record<string, unknown>;
}

function structuredToolResult(response: JsonRpcResponse | null): Record<string, unknown> {
  const result = successResult(response);
  assert.equal(result.isError, false);
  assert.ok(result.structuredContent && typeof result.structuredContent === "object" && !Array.isArray(result.structuredContent));
  return result.structuredContent as Record<string, unknown>;
}

async function mcpContext(path: string, task = "Review durable project changes") {
  const session = await initializedSession(path);
  const response = await session.handleMessage({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: MCP_CONTEXT_TOOL,
      arguments: { provider: "codex", task },
    },
  });
  const context = structuredToolResult(response);
  assert.equal(context.state, "ready");
  return { session, context };
}

function noCandidateReturn(context: Record<string, unknown>) {
  const task = context.task as { value: string };
  const baseline = context.baseline as { digest: string };
  return {
    schemaVersion: 1,
    packetVersion: 1,
    provider: context.provider,
    contextPacketId: context.packetId,
    stableProjectIdentity: context.stableProjectIdentity,
    baselineDigest: baseline.digest,
    taskDigest: providerReturnTaskDigest(task.value),
    candidate: null,
  };
}

function goalCandidate(statement: string) {
  return {
    schemaVersion: 1,
    domain: "project-goal",
    changeKind: "add",
    proposedStatement: statement,
    rationale: "Agent observed one explicit durable goal candidate.",
    origin: "provider-observation",
  };
}

function traceEvidence(
  target: { kind: "acceptance-criterion" | "implementation-claim"; id: string },
  outcome: "supports" | "contradicts" | "inconclusive",
  sourceReference: string,
) {
  return createVerificationEvidenceRecord({
    schemaVersion: 1,
    target,
    evidenceClass: "E2",
    outcome,
    sourceReference,
    grantsAuthority: false,
  });
}

test("MCP lifecycle blocks tools before initialization and lists only bounded tools after initialization", async () => {
  await withProject(async (path) => {
    const session = createMcpSession(path);
    const early = await session.handleMessage({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    assert.ok(early && "error" in early);

    const ready = await initializedSession(path);
    const listed = successResult(await ready.handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }));
    const tools = listed.tools as Array<{
      name: string;
      inputSchema: { properties?: Record<string, unknown> };
      annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; openWorldHint?: boolean };
    }>;
    assert.deepEqual(tools.map((tool) => tool.name), [MCP_CONTEXT_TOOL, MCP_RETURN_TOOL, MCP_VERIFICATION_TRACE_TOOL]);
    assert.equal("authorization" in (tools[1]?.inputSchema.properties ?? {}), false);
    assert.equal("authorizationId" in (tools[1]?.inputSchema.properties ?? {}), false);
    assert.deepEqual(tools[2]?.annotations, {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
  });
});

test("MCP context tool delegates to the existing Provider Context semantics", async () => {
  await withProject(async (path) => {
    const task = "Compare MCP provider context";
    const direct = await buildProviderContext("codex", task, path);
    assert.equal(direct.state, "ready");
    if (direct.state !== "ready") return;

    const { context } = await mcpContext(path, task);
    assert.equal(context.provider, direct.provider);
    assert.equal(context.packetId, direct.packetId);
    assert.equal(context.stableProjectIdentity, direct.stableProjectIdentity);
    assert.deepEqual(context.baseline, direct.baseline);
    assert.deepEqual(context.evidence, direct.evidence);
    assert.deepEqual(context.task, direct.task);
    assert.equal(context.mutationAuthorization, false);
    assert.equal(context.changesMade, 0);
  });
});

test("MCP verification trace exposes supported, contradicted and unproven without mutation", async () => {
  await withProject(async (path) => {
    const session = await initializedSession(path);
    const before = await readFile(resolve(path, ".project-brain", "goals.md"), "utf8");
    const result = structuredToolResult(await session.handleMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: MCP_VERIFICATION_TRACE_TOOL,
        arguments: {
          schemaVersion: 1,
          targets: [
            {
              kind: "acceptance-criterion",
              id: "AC-LOGIN",
              title: "Email login works",
              implementationClaims: [{ claimId: "CLAIM-LOGIN", statement: "Email login implemented" }],
            },
            {
              kind: "acceptance-criterion",
              id: "AC-RATE-LIMIT",
              title: "Login attempts are rate limited",
              implementationClaims: [{ claimId: "CLAIM-RATE-LIMIT", statement: "Rate limiting implemented" }],
            },
            {
              kind: "acceptance-criterion",
              id: "AC-RESET",
              title: "Password reset is verified",
              implementationClaims: [{ claimId: "CLAIM-RESET", statement: "Password reset implemented" }],
            },
          ],
          evidence: [
            traceEvidence({ kind: "acceptance-criterion", id: "AC-LOGIN" }, "supports", "test:login-happy-path"),
            traceEvidence({ kind: "implementation-claim", id: "CLAIM-RATE-LIMIT" }, "contradicts", "test:rate-limit-negative"),
            traceEvidence({ kind: "implementation-claim", id: "CLAIM-RESET" }, "inconclusive", "test:reset-partial"),
          ],
        },
      },
    }));

    assert.equal(result.coverage, "attention-required");
    assert.deepEqual(result.counts, { supported: 1, contradicted: 1, unproven: 1 });
    const items = result.items as Array<{ target: { id: string }; assessment: string; grantsAuthority: boolean }>;
    assert.deepEqual(items.map((item) => [item.target.id, item.assessment]), [
      ["AC-LOGIN", "supported"],
      ["AC-RATE-LIMIT", "contradicted"],
      ["AC-RESET", "unproven"],
    ]);
    assert.equal(result.grantsAuthority, false);
    assert.equal(items.every((item) => item.grantsAuthority === false), true);
    assert.equal(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), before);
  });
});

test("MCP verification trace rejects completion and Authority smuggling", async () => {
  await withProject(async (path) => {
    const session = await initializedSession(path);
    for (const injected of [
      { done: true },
      { accepted: true },
      { grantsAuthority: true },
      { authorization: "approved" },
    ]) {
      const result = successResult(await session.handleMessage({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: MCP_VERIFICATION_TRACE_TOOL,
          arguments: {
            schemaVersion: 1,
            targets: [{ kind: "requirement", id: "REQ-1", title: "Known requirement", implementationClaims: [] }],
            evidence: [],
            ...injected,
          },
        },
      }));
      assert.equal(result.isError, true);
    }
  });
});

test("MCP provider return with no candidate performs zero mutation", async () => {
  await withProject(async (path) => {
    const { session, context } = await mcpContext(path);
    const before = await readFile(resolve(path, ".project-brain", "goals.md"), "utf8");
    const returned = structuredToolResult(await session.handleMessage({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: MCP_RETURN_TOOL,
        arguments: { context, providerReturn: noCandidateReturn(context) },
      },
    }));
    assert.equal(returned.state, "no-candidate");
    assert.equal(returned.semanticChangesMade, 0);
    assert.equal(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), before);
  });
});

test("MCP candidate return reaches authorization-required without mutation", async () => {
  await withProject(async (path) => {
    const { session, context } = await mcpContext(path);
    const providerReturn = {
      ...noCandidateReturn(context),
      candidate: goalCandidate("MCP cannot authorize this durable goal"),
    };
    const returned = structuredToolResult(await session.handleMessage({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: MCP_RETURN_TOOL, arguments: { context, providerReturn } },
    }));
    assert.equal(returned.state, "candidate-received");
    const maintenance = returned.maintenance as { state: string; semanticChangesMade: number };
    assert.equal(maintenance.state, "authorization-required");
    assert.equal(maintenance.semanticChangesMade, 0);
    assert.doesNotMatch(await readFile(resolve(path, ".project-brain", "goals.md"), "utf8"), /MCP cannot authorize this durable goal/);
  });
});

test("MCP return tool rejects authorization and approval smuggling fields", async () => {
  await withProject(async (path) => {
    const { session, context } = await mcpContext(path);
    for (const injected of [
      { authorizationId: "88888888-8888-4888-8888-888888888888" },
      { authorization: "approved" },
      { approved: true },
      { mutationPermission: true },
    ]) {
      const response = successResult(await session.handleMessage({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: {
          name: MCP_RETURN_TOOL,
          arguments: { context, providerReturn: noCandidateReturn(context), ...injected },
        },
      }));
      assert.equal(response.isError, true);
    }
  });
});

test("MCP malformed arguments and unknown tools fail closed", async () => {
  await withProject(async (path) => {
    const session = await initializedSession(path);
    const malformed = successResult(await session.handleMessage({
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: { name: MCP_CONTEXT_TOOL, arguments: { provider: "codex" } },
    }));
    assert.equal(malformed.isError, true);

    const unknown = await session.handleMessage({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: { name: "livariant_unknown", arguments: {} },
    });
    assert.ok(unknown && "error" in unknown);
    if (unknown && "error" in unknown) assert.equal(unknown.error.code, -32601);
  });
});

test("MCP preserves provider-return mismatch semantics", async () => {
  await withProject(async (path) => {
    const { session, context } = await mcpContext(path);
    const mismatched = { ...noCandidateReturn(context), taskDigest: "0".repeat(64) };
    const returned = structuredToolResult(await session.handleMessage({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: { name: MCP_RETURN_TOOL, arguments: { context, providerReturn: mismatched } },
    }));
    assert.equal(returned.state, "mismatched-context");
    assert.equal(returned.semanticChangesMade, 0);
  });
});
