import assert from "node:assert/strict";
import test from "node:test";
import { CodexWorkflowClient, type CodexWorkflowEvent } from "../src/connectors/codex-workflow.js";
import type { CodexAppServerSession } from "../src/connectors/codex-runtime.js";
import type { ConnectorInstance } from "../src/connectors/connector-registry.js";

class FakeSession implements CodexAppServerSession {
  evidence = {
    state: "connected" as const,
    observedAt: "2026-08-30T12:00:00.000Z",
    connectorTypeId: "openai.codex.app-server" as const,
    initializeRequestId: 0,
    server: {},
  };
  connector: ConnectorInstance = {
    instanceId: "codex-local",
    connectorTypeId: "openai.codex.app-server",
    label: "Local Codex",
    state: "connected",
    observedCapabilities: {
      "task.execute": "unknown",
      "session.resume": "unknown",
      "approval.bidirectional": "unknown",
      "telemetry.usage.provider-owned": "unknown",
    },
    roles: [],
  };
  sent: Record<string, unknown>[] = [];
  #messageListeners = new Set<(message: Record<string, unknown>) => void>();
  #disconnectListeners = new Set<(reason: string) => void>();
  #open = true;

  isOpen(): boolean { return this.#open; }
  send(message: Record<string, unknown>): void { this.sent.push(message); }
  onMessage(listener: (message: Record<string, unknown>) => void): () => void {
    this.#messageListeners.add(listener);
    return () => this.#messageListeners.delete(listener);
  }
  onDisconnect(listener: (reason: string) => void): () => void {
    this.#disconnectListeners.add(listener);
    return () => this.#disconnectListeners.delete(listener);
  }
  close(): void { this.#open = false; }
  emit(message: Record<string, unknown>): void { for (const listener of this.#messageListeners) listener(message); }
  disconnect(reason = "test"): void {
    this.#open = false;
    for (const listener of this.#disconnectListeners) listener(reason);
  }
}

function nextTick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

test("thread start and turn start use official method shapes and capability evidence stays bounded", async () => {
  const session = new FakeSession();
  const client = new CodexWorkflowClient(session, { appServerVersion: "0.142.4", requestIdStart: 10 });

  const threadPromise = client.startThread({ cwd: "C:/work/project", ephemeral: true });
  assert.deepEqual(session.sent[0], {
    method: "thread/start",
    id: 10,
    params: { cwd: "C:/work/project", ephemeral: true },
  });
  session.emit({ id: 10, result: { thread: { id: "thread-1" } } });
  assert.deepEqual(await threadPromise, { threadId: "thread-1", source: "started" });
  assert.equal(session.connector.observedCapabilities["task.execute"], "unknown");

  const turnPromise = client.startTurn("thread-1", "Inspect this repository.");
  assert.deepEqual(session.sent[1], {
    method: "turn/start",
    id: 11,
    params: {
      threadId: "thread-1",
      input: [{ type: "text", text: "Inspect this repository.", textElements: [] }],
    },
  });
  session.emit({ id: 11, result: { turn: { id: "turn-1", status: "inProgress" } } });
  assert.deepEqual(await turnPromise, { threadId: "thread-1", turnId: "turn-1" });
  assert.equal(session.connector.observedCapabilities["task.execute"], "available");
  assert.equal(session.connector.observedCapabilities["approval.bidirectional"], "unknown");
});

test("resume capability becomes available only after a matching successful resume", async () => {
  const session = new FakeSession();
  const client = new CodexWorkflowClient(session, { appServerVersion: "0.142.4" });
  const promise = client.resumeThread("thread-existing");
  session.emit({ id: 100, result: { thread: { id: "thread-existing" } } });
  assert.deepEqual(await promise, { threadId: "thread-existing", source: "resumed" });
  assert.equal(session.connector.observedCapabilities["session.resume"], "available");
});

test("approval requests are surfaced but never auto-answered or promoted to authority", async () => {
  const session = new FakeSession();
  const client = new CodexWorkflowClient(session, { appServerVersion: "0.142.4" });
  const events: CodexWorkflowEvent[] = [];
  client.onEvent((event) => events.push(event));

  session.emit({
    method: "item/commandExecution/requestApproval",
    id: "server-request-1",
    params: { threadId: "thread-1", turnId: "turn-1", command: "git status" },
  });
  await nextTick();

  assert.equal(session.sent.length, 0);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.kind, "approval-request");
  assert.equal(session.connector.observedCapabilities["approval.bidirectional"], "unknown");
});

test("provider-owned usage notification enables telemetry evidence and preserves snapshot semantics", async () => {
  const session = new FakeSession();
  const client = new CodexWorkflowClient(session, { appServerVersion: "0.142.4" });
  const events: CodexWorkflowEvent[] = [];
  client.onEvent((event) => events.push(event));

  session.emit({
    method: "thread/tokenUsage/updated",
    emittedAtMs: 1234,
    params: {
      threadId: "thread-1",
      turnId: "turn-1",
      tokenUsage: {
        last: { inputTokens: 10, cachedInputTokens: 2, outputTokens: 3, reasoningOutputTokens: 1, totalTokens: 13 },
        total: { inputTokens: 20, cachedInputTokens: 4, outputTokens: 6, reasoningOutputTokens: 2, totalTokens: 26 },
        modelContextWindow: 200000,
      },
    },
  });
  await nextTick();

  assert.equal(session.connector.observedCapabilities["telemetry.usage.provider-owned"], "available");
  assert.equal(events[0]?.kind, "usage");
  if (events[0]?.kind === "usage") {
    assert.equal(events[0].snapshot.last.inputTokens, 10);
    assert.equal(events[0].snapshot.total.inputTokens, 20);
  }
});

test("turn completion is surfaced with thread, turn and status", async () => {
  const session = new FakeSession();
  const client = new CodexWorkflowClient(session, { appServerVersion: "0.142.4" });
  const events: CodexWorkflowEvent[] = [];
  client.onEvent((event) => events.push(event));

  session.emit({ method: "turn/completed", params: { threadId: "thread-1", turn: { id: "turn-1", status: "completed" } } });
  await nextTick();

  assert.deepEqual(events[0] && events[0].kind === "turn-completed" ? {
    kind: events[0].kind,
    threadId: events[0].threadId,
    turnId: events[0].turnId,
    status: events[0].status,
  } : undefined, {
    kind: "turn-completed",
    threadId: "thread-1",
    turnId: "turn-1",
    status: "completed",
  });
});

test("disconnect rejects in-flight requests and workflow never fabricates success", async () => {
  const session = new FakeSession();
  const client = new CodexWorkflowClient(session, { appServerVersion: "0.142.4", requestTimeoutMs: 5000 });
  const pending = client.startThread();
  session.disconnect("process-exit: 1");
  await assert.rejects(pending, /disconnected/i);
});
