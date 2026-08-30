import assert from "node:assert/strict";
import test from "node:test";
import {
  CodexAppServerHandshake,
  connectCodexAppServer,
  inspectCodexInstallation,
  type CodexLineTransport,
  type CodexVersionProbe,
} from "../src/connectors/codex-runtime.js";

function probe(result: ReturnType<CodexVersionProbe>): CodexVersionProbe {
  return () => result;
}

class FakeTransport implements CodexLineTransport {
  readonly writes: string[] = [];
  closed = false;
  readonly #lineListeners = new Set<(line: string) => void>();
  readonly #errorListeners = new Set<(error: Error) => void>();
  readonly #exitListeners = new Set<(code: number | null, signal: NodeJS.Signals | null) => void>();

  write(line: string): void { this.writes.push(line); }
  onLine(listener: (line: string) => void): () => void {
    this.#lineListeners.add(listener);
    return () => this.#lineListeners.delete(listener);
  }
  onError(listener: (error: Error) => void): () => void {
    this.#errorListeners.add(listener);
    return () => this.#errorListeners.delete(listener);
  }
  onExit(listener: (code: number | null, signal: NodeJS.Signals | null) => void): () => void {
    this.#exitListeners.add(listener);
    return () => this.#exitListeners.delete(listener);
  }
  close(): void { this.closed = true; }
  emitLine(line: string): void { for (const listener of [...this.#lineListeners]) listener(line); }
  emitError(error: Error): void { for (const listener of [...this.#errorListeners]) listener(error); }
  emitExit(code: number | null, signal: NodeJS.Signals | null): void {
    for (const listener of [...this.#exitListeners]) listener(code, signal);
  }
}

test("Codex installation inspection distinguishes not found, unusable and available", () => {
  assert.deepEqual(inspectCodexInstallation("codex", probe({
    status: null, stdout: "", stderr: "", errorCode: "ENOENT", errorMessage: "missing",
  })), {
    state: "not-found", command: "codex", evidence: "codex --version", detail: "missing",
  });
  assert.equal(inspectCodexInstallation("codex", probe({
    status: 1, stdout: "", stderr: "broken installation",
  })).state, "unusable");
  assert.deepEqual(inspectCodexInstallation("codex", probe({
    status: 0, stdout: "codex-cli 0.42.0\n", stderr: "",
  })), {
    state: "available", command: "codex", evidence: "codex --version", version: "0.42.0",
  });
});

test("installation evidence alone does not mark Codex connected", () => {
  const inspection = inspectCodexInstallation("codex", probe({
    status: 0, stdout: "codex-cli 0.42.0", stderr: "",
  }));
  assert.equal(inspection.state, "available");
  assert.equal("connected" in inspection, false);
});

test("successful initialize response creates connection evidence but does not invent capability availability", () => {
  const installation = inspectCodexInstallation("codex", probe({
    status: 0, stdout: "codex-cli 0.42.0", stderr: "",
  }));
  const handshake = new CodexAppServerHandshake(installation, 7);
  assert.deepEqual(JSON.parse(handshake.begin("0.1.0")), {
    method: "initialize",
    id: 7,
    params: { clientInfo: { name: "livariant", title: "Livariant", version: "0.1.0" } },
  });
  const result = handshake.acceptInitializeResponse(JSON.stringify({
    id: 7,
    result: { userAgent: "codex-cli/0.42.0", codexHome: "/tmp/codex", platformFamily: "unix", platformOs: "linux" },
  }), "2026-08-30T12:30:00.000Z");
  assert.equal(handshake.state, "connected");
  assert.equal(result.connector.state, "connected");
  assert.deepEqual(result.connector.observedCapabilities, {
    "task.execute": "unknown",
    "session.resume": "unknown",
    "approval.bidirectional": "unknown",
    "telemetry.usage.provider-owned": "unknown",
  });
});

test("local transport requires handshake evidence before reporting connected and drains runtime messages", async () => {
  const transport = new FakeTransport();
  const connecting = connectCodexAppServer({
    clientVersion: "0.1.0",
    requestId: 11,
    timeoutMs: 1000,
    versionProbe: probe({ status: 0, stdout: "codex-cli 0.42.0", stderr: "" }),
    transportFactory: () => transport,
    now: () => "2026-08-30T12:45:00.000Z",
  });
  assert.equal(JSON.parse(transport.writes[0]!).method, "initialize");
  transport.emitLine(JSON.stringify({ id: 11, result: { userAgent: "codex-cli/0.42.0", platformOs: "win32" } }));

  const session = await connecting;
  assert.equal(session.connector.state, "connected");
  assert.equal(session.isOpen(), true);
  assert.equal(JSON.parse(transport.writes[1]!).method, "initialized");

  const messages: Record<string, unknown>[] = [];
  session.onMessage((message) => messages.push(message));
  transport.emitLine(JSON.stringify({ method: "thread/started", params: { thread: { id: "thread-1" } } }));
  assert.equal(messages.length, 1);
  session.send({ method: "thread/list", id: 12, params: {} });
  assert.equal(JSON.parse(transport.writes[2]!).method, "thread/list");

  session.close();
  assert.equal(session.isOpen(), false);
  assert.equal(session.connector.state, "disconnected");
  assert.equal(transport.closed, true);
});

test("post-handshake process exit invalidates connector lifecycle and live session", async () => {
  const transport = new FakeTransport();
  const connecting = connectCodexAppServer({
    clientVersion: "0.1.0",
    versionProbe: probe({ status: 0, stdout: "codex-cli 0.42.0", stderr: "" }),
    transportFactory: () => transport,
  });
  transport.emitLine(JSON.stringify({ id: 0, result: {} }));
  const session = await connecting;

  const reasons: string[] = [];
  session.onDisconnect((reason) => reasons.push(reason));
  transport.emitExit(2, null);

  assert.equal(session.isOpen(), false);
  assert.equal(session.connector.state, "error");
  assert.deepEqual(reasons, ["process-exit: 2"]);
  assert.throws(() => session.send({ method: "thread/list" }), /session is closed/i);
});

test("runtime process failure before handshake fails closed", async () => {
  const transport = new FakeTransport();
  const connecting = connectCodexAppServer({
    clientVersion: "0.1.0",
    timeoutMs: 1000,
    versionProbe: probe({ status: 0, stdout: "codex-cli 0.42.0", stderr: "" }),
    transportFactory: () => transport,
  });
  transport.emitError(new Error("spawn failed"));
  await assert.rejects(connecting, /process error: spawn failed/i);
  assert.equal(transport.closed, true);
});

test("handshake fails closed on mismatched id, provider error or malformed result", () => {
  const installation = { state: "available", command: "codex", evidence: "codex --version", version: "0.42.0" } as const;
  const mismatched = new CodexAppServerHandshake(installation, 1);
  mismatched.begin("0.1.0");
  assert.throws(() => mismatched.acceptInitializeResponse(JSON.stringify({ id: 2, result: {} })), /does not match/i);
  assert.equal(mismatched.state, "failed");

  const rejected = new CodexAppServerHandshake(installation, 1);
  rejected.begin("0.1.0");
  assert.throws(() => rejected.acceptInitializeResponse(JSON.stringify({ id: 1, error: { message: "no" } })), /rejected initialization/i);

  const malformed = new CodexAppServerHandshake(installation, 1);
  malformed.begin("0.1.0");
  assert.throws(() => malformed.acceptInitializeResponse(JSON.stringify({ id: 1, result: "bad" })), /result object/i);
});

test("handshake cannot start for missing Codex and initialize cannot be repeated", () => {
  assert.throws(() => new CodexAppServerHandshake({
    state: "not-found", command: "codex", evidence: "codex --version",
  }), /requires an available/i);

  const handshake = new CodexAppServerHandshake({
    state: "available", command: "codex", evidence: "codex --version", version: "0.42.0",
  });
  handshake.begin("0.1.0");
  assert.throws(() => handshake.begin("0.1.0"), /only be sent once/i);
});
