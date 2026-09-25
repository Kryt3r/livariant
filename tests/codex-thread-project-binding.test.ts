import assert from "node:assert/strict";
import test from "node:test";
import { bindCodexThreadsToProjects } from "../src/connectors/provider-project-binding.js";
import { listCodexThreads } from "../src/connectors/codex-thread-catalog.js";
import type { CodexAppServerSession } from "../src/connectors/codex-runtime.js";
import type { ConnectorInstance } from "../src/connectors/connector-registry.js";

class FakeSession implements CodexAppServerSession {
  evidence = {
    state: "connected" as const,
    observedAt: "2026-09-26T00:00:00.000Z",
    connectorTypeId: "openai.codex.app-server" as const,
    initializeRequestId: 0,
    server: {},
  };
  connector: ConnectorInstance = {
    instanceId: "codex-local",
    connectorTypeId: "openai.codex.app-server",
    label: "Local Codex",
    state: "connected",
    observedCapabilities: {},
    roles: [],
  };
  sent: Record<string, unknown>[] = [];
  #listeners = new Set<(message: Record<string, unknown>) => void>();
  #open = true;

  isOpen(): boolean { return this.#open; }
  send(message: Record<string, unknown>): void { this.sent.push(message); }
  onMessage(listener: (message: Record<string, unknown>) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  onDisconnect(): () => void { return () => {}; }
  close(): void { this.#open = false; }
  emit(message: Record<string, unknown>): void {
    for (const listener of this.#listeners) listener(message);
  }
}

test("Codex thread catalog preserves provider-owned thread/session/cwd identity across pages", async () => {
  const session = new FakeSession();
  const pending = listCodexThreads(session);

  assert.equal(session.sent.length, 1);
  const firstId = session.sent[0]?.id;
  session.emit({
    id: firstId,
    result: {
      data: [
        { id: "thread-a1", sessionId: "session-a", cwd: "/work/project-a", projectId: "codex-project-a" },
        { id: "thread-a2", sessionId: "session-a", cwd: "/work/project-a/packages/api", projectId: null },
      ],
      nextCursor: "next-1",
    },
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.sent.length, 2);
  const secondId = session.sent[1]?.id;
  session.emit({
    id: secondId,
    result: {
      data: [
        { id: "thread-b1", sessionId: "session-b", cwd: "/work/project-b", projectId: "codex-project-b" },
      ],
      nextCursor: null,
    },
  });

  assert.deepEqual(await pending, [
    { threadId: "thread-a1", sessionId: "session-a", cwd: "/work/project-a", projectId: "codex-project-a" },
    { threadId: "thread-a2", sessionId: "session-a", cwd: "/work/project-a/packages/api", projectId: null },
    { threadId: "thread-b1", sessionId: "session-b", cwd: "/work/project-b", projectId: "codex-project-b" },
  ]);
});

test("multiple Codex threads and sessions can bind to the same project while another session binds to another project", () => {
  const projects = [
    {
      desktopProjectId: "desktop-a",
      localRoot: "/work/project-a",
      projectId: "livariant-a",
      stableProjectIdentity: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    },
    {
      desktopProjectId: "desktop-b",
      localRoot: "/work/project-b",
      projectId: "livariant-b",
      stableProjectIdentity: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    },
  ];
  const threads = [
    { threadId: "thread-a1", sessionId: "session-a1", cwd: "/work/project-a", projectId: null },
    { threadId: "thread-a2", sessionId: "session-a2", cwd: "/work/project-a/packages/api", projectId: null },
    { threadId: "thread-b1", sessionId: "session-b1", cwd: "/work/project-b", projectId: null },
    { threadId: "thread-foreign", sessionId: "session-x", cwd: "/work/other", projectId: null },
  ];

  const bindings = bindCodexThreadsToProjects(threads, projects);
  assert.deepEqual(bindings.map((binding) => [
    binding.threadId,
    binding.project?.desktopProjectId ?? null,
    binding.attribution,
  ]), [
    ["thread-a1", "desktop-a", "cwd-exact"],
    ["thread-a2", "desktop-a", "cwd-descendant"],
    ["thread-b1", "desktop-b", "cwd-exact"],
    ["thread-foreign", null, "unattributed"],
  ]);
});

test("nested registered project root wins over broader parent root", () => {
  const bindings = bindCodexThreadsToProjects(
    [{ threadId: "thread-nested", sessionId: "session-nested", cwd: "/work/mono/apps/service", projectId: null }],
    [
      { desktopProjectId: "mono", localRoot: "/work/mono", projectId: null, stableProjectIdentity: null },
      { desktopProjectId: "service", localRoot: "/work/mono/apps/service", projectId: null, stableProjectIdentity: null },
    ],
  );
  assert.equal(bindings[0]?.project?.desktopProjectId, "service");
  assert.equal(bindings[0]?.attribution, "cwd-exact");
});
