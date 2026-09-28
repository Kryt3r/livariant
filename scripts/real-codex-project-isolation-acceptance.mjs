import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (process.env.LIVARIANT_REAL_PROVIDER_ACCEPTANCE !== "1") {
  throw new Error("Real Codex acceptance is opt-in. Set LIVARIANT_REAL_PROVIDER_ACCEPTANCE=1.");
}

const tempRoot = await mkdtemp(resolve(tmpdir(), "livariant-real-codex-isolation-"));
const projectA = resolve(tempRoot, "project-a");
const projectB = resolve(tempRoot, "project-b");
await mkdir(projectA);
await mkdir(projectB);

const root = process.cwd();
const dist = (path) => pathToFileURL(resolve(root, "dist", "src", ...path)).href;
const { resolveCodexCommand } = await import(dist(["connectors", "codex-command.js"]));
const { connectCodexAppServer } = await import(dist(["connectors", "codex-runtime.js"]));
const { CodexWorkflowClient } = await import(dist(["connectors", "codex-workflow.js"]));
const { listCodexThreads } = await import(dist(["connectors", "codex-thread-catalog.js"]));
const { bindCodexThreadsToProjects, summarizeCodexSessionProjects } = await import(
  dist(["connectors", "provider-project-binding.js"])
);
const { initializeProject } = await import(dist(["runtime", "index.js"]));

await initializeProject(projectA, { authorized: true });
await initializeProject(projectB, { authorized: true });

const livariantCli = resolve(root, "dist", "src", "cli", "index.js");
const livariantMcpConfig = (cwd) => ({
  "mcp_servers.livariant": {
    command: process.execPath,
    args: [livariantCli, "mcp"],
    cwd,
    enabled_tools: [
      "livariant_provider_context",
      "livariant_provider_return",
      "livariant_verification_trace",
    ],
  },
});

const resolution = resolveCodexCommand();
if (!resolution) throw new Error("A local Codex installation could not be resolved safely.");

const session = await connectCodexAppServer({
  clientVersion: "livariant-real-provider-acceptance",
  command: resolution.command,
  argsPrefix: resolution.argsPrefix,
  timeoutMs: 10_000,
});

const workflow = new CodexWorkflowClient(session, {
  appServerVersion: session.evidence.installationVersion ?? "0.0.0",
  requestTimeoutMs: 30_000,
  requestIdStart: 20_000,
});

const rawMessages = [];
const completedTurns = [];
const unsubscribeRaw = session.onMessage((message) => rawMessages.push(message));
const unsubscribeWorkflow = workflow.onEvent((event) => {
  if (event.kind === "turn-completed") completedTurns.push(event);
});

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function waitForTurn(threadId, turnId, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const completed = completedTurns.find((event) => event.threadId === threadId && event.turnId === turnId);
    if (completed) {
      if (completed.status !== "completed") {
        throw new Error(`Codex turn ${turnId} in thread ${threadId} completed with status ${completed.status}.`);
      }
      return;
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for Codex turn ${turnId} in thread ${threadId}.`);
}

function mcpCallsForThread(threadId) {
  return rawMessages
    .filter((message) => message.method === "item/completed")
    .map((message) => message.params)
    .filter((params) => params && typeof params === "object" && params.threadId === threadId)
    .map((params) => params.item)
    .filter((item) => item && typeof item === "object" && item.type === "mcpToolCall" && item.server === "livariant");
}

function providerContextCall(calls, marker) {
  const call = calls.find((item) => item.tool === "livariant_provider_context");
  assert.ok(call, `Codex did not call livariant_provider_context for ${marker}.`);
  assert.equal(call.status, "completed", `Provider Context call failed for ${marker}.`);
  assert.equal(call.arguments?.provider, "codex");
  assert.equal(call.arguments?.task, marker);
  return call;
}

function providerReturnCall(calls, marker) {
  const call = calls.find((item) => item.tool === "livariant_provider_return");
  assert.ok(call, `Codex did not call livariant_provider_return for ${marker}.`);
  assert.equal(call.status, "completed", `Provider Return call failed for ${marker}.`);
  return call;
}

function acceptancePrompt(marker) {
  return [
    "This is a Livariant real-provider isolation acceptance turn.",
    "Do not edit files, do not run shell commands, do not use web search, and do not call any tool except the Livariant MCP server.",
    `First call livariant_provider_context with provider='codex' and task exactly '${marker}'.`,
    "Then call livariant_provider_return using the exact ready Provider Context returned by that call and no durable-change candidate.",
    `After the return succeeds, reply with exactly '${marker}'.`,
  ].join("\n");
}

async function runThread(threadId, marker) {
  const turn = await workflow.startTurn(threadId, acceptancePrompt(marker));
  await waitForTurn(threadId, turn.turnId);
  const calls = mcpCallsForThread(threadId);
  providerContextCall(calls, marker);
  providerReturnCall(calls, marker);
  return { threadId, turnId: turn.turnId, marker, calls };
}

try {
  // Three independent real Codex threads through one real App Server process:
  // A1 + A2 target the same project; B1 targets a different project.
  const [a1, a2, b1] = await Promise.all([
    workflow.startThread({ cwd: projectA, config: livariantMcpConfig(projectA) }),
    workflow.startThread({ cwd: projectA, config: livariantMcpConfig(projectA) }),
    workflow.startThread({ cwd: projectB, config: livariantMcpConfig(projectB) }),
  ]);
  assert.notEqual(a1.threadId, a2.threadId);
  assert.notEqual(a1.threadId, b1.threadId);
  assert.notEqual(a2.threadId, b1.threadId);

  const markers = {
    a1: `LIVARIANT_REAL_A1_${Date.now()}`,
    a2: `LIVARIANT_REAL_A2_${Date.now() + 1}`,
    b1: `LIVARIANT_REAL_B1_${Date.now() + 2}`,
  };

  await Promise.all([
    runThread(a1.threadId, markers.a1),
    runThread(a2.threadId, markers.a2),
    runThread(b1.threadId, markers.b1),
  ]);

  // Provider-owned persisted thread metadata must independently map back to A/A/B.
  const catalog = await listCodexThreads(session);
  const created = catalog.filter((thread) => [a1.threadId, a2.threadId, b1.threadId].includes(thread.threadId));
  assert.equal(created.length, 3, "Codex thread catalog did not return all acceptance threads.");

  const projects = [
    { desktopProjectId: "acceptance-project-a", localRoot: projectA, projectId: null, stableProjectIdentity: null },
    { desktopProjectId: "acceptance-project-b", localRoot: projectB, projectId: null, stableProjectIdentity: null },
  ];
  const bindings = bindCodexThreadsToProjects(created, projects);
  const byThread = new Map(bindings.map((binding) => [binding.threadId, binding]));
  assert.equal(byThread.get(a1.threadId)?.project?.desktopProjectId, "acceptance-project-a");
  assert.equal(byThread.get(a2.threadId)?.project?.desktopProjectId, "acceptance-project-a");
  assert.equal(byThread.get(b1.threadId)?.project?.desktopProjectId, "acceptance-project-b");

  // Session-tree summaries must never guess across projects. Independent roots
  // should be consistently attributed; if Codex reports a shared/forked tree,
  // mixed project evidence must remain fail-closed.
  const sessionSummaries = summarizeCodexSessionProjects(bindings);
  for (const summary of sessionSummaries) {
    const projectIds = new Set(
      bindings
        .filter((binding) => binding.sessionId === summary.sessionId)
        .map((binding) => binding.project?.desktopProjectId)
        .filter(Boolean)
    );
    if (projectIds.size > 1) {
      assert.equal(summary.attribution, "mixed-projects");
      assert.equal(summary.project, null);
    } else {
      assert.equal(summary.attribution, "consistent-project");
      assert.ok(summary.project);
    }
  }

  // Thread-native MCP metadata must keep calls attached to the originating thread.
  for (const [threadId, marker] of [
    [a1.threadId, markers.a1],
    [a2.threadId, markers.a2],
    [b1.threadId, markers.b1],
  ]) {
    const calls = mcpCallsForThread(threadId);
    assert.equal(calls.some((call) => call.tool === "livariant_provider_context"), true);
    assert.equal(calls.some((call) => call.tool === "livariant_provider_return"), true);
    const context = providerContextCall(calls, marker);
    assert.equal(context.arguments.task, marker);
  }

  process.stdout.write(JSON.stringify({
    schemaVersion: 1,
    state: "passed",
    provider: "codex",
    realProvider: true,
    desktopSelectionRequired: false,
    globalProviderConfigurationMutated: false,
    projectProviderConfigurationWritten: false,
    temporaryProjects: true,
    threads: {
      projectA: [a1.threadId, a2.threadId],
      projectB: [b1.threadId],
    },
    bindings: bindings.map((binding) => ({
      threadId: binding.threadId,
      sessionId: binding.sessionId,
      project: binding.project?.desktopProjectId ?? null,
      attribution: binding.attribution,
    })),
  }, null, 2) + "\n");
} finally {
  unsubscribeRaw();
  unsubscribeWorkflow();
  workflow.close();
  session.close();
  await rm(tempRoot, { recursive: true, force: true });
}
