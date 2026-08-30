import assert from "node:assert/strict";
import test from "node:test";
import {
  CODEX_APP_SERVER_CONNECTOR,
  CODEX_APP_SERVER_LAUNCH,
  createCodexInitializedNotification,
  createCodexInitializeRequest,
  extractCodexUsageSnapshot,
  parseCodexAppServerLine,
} from "../src/connectors/codex-app-server.js";

test("Codex connector declares execution, resume, approvals and provider-owned usage without authority", () => {
  assert.equal(CODEX_APP_SERVER_CONNECTOR.typeId, "openai.codex.app-server");
  assert.deepEqual(CODEX_APP_SERVER_CONNECTOR.declaredCapabilities, [
    "task.execute",
    "session.resume",
    "approval.bidirectional",
    "telemetry.usage.provider-owned",
  ]);
  assert.equal("authority" in CODEX_APP_SERVER_CONNECTOR, false);
});

test("Codex App Server launch and initialization follow the stdio JSONL handshake", () => {
  assert.deepEqual(CODEX_APP_SERVER_LAUNCH, {
    command: "codex",
    args: ["app-server", "--stdio"],
    transport: "stdio-jsonl",
  });
  assert.deepEqual(createCodexInitializeRequest("0.1.0", 7), {
    method: "initialize",
    id: 7,
    params: {
      clientInfo: {
        name: "livariant",
        title: "Livariant",
        version: "0.1.0",
      },
    },
  });
  assert.deepEqual(createCodexInitializedNotification(), { method: "initialized", params: {} });
});

test("dedicated Codex token usage notification becomes a provenance-bearing snapshot", () => {
  const message = parseCodexAppServerLine(JSON.stringify({
    method: "thread/tokenUsage/updated",
    emittedAtMs: 1788090000123,
    params: {
      threadId: "thread-1",
      turnId: "turn-9",
      tokenUsage: {
        last: {
          inputTokens: 1200,
          cachedInputTokens: 800,
          outputTokens: 300,
          reasoningOutputTokens: 125,
          totalTokens: 1500,
          cacheWriteInputTokens: 25,
        },
        total: {
          inputTokens: 5200,
          cachedInputTokens: 2800,
          outputTokens: 1300,
          reasoningOutputTokens: 525,
          totalTokens: 6500,
          cacheWriteInputTokens: 75,
        },
        modelContextWindow: 200000,
      },
    },
  }));

  assert.deepEqual(extractCodexUsageSnapshot(message, "0.42.0"), {
    source: {
      kind: "provider-runtime",
      id: "openai.codex.app-server.thread-token-usage",
      version: "0.42.0",
    },
    threadId: "thread-1",
    turnId: "turn-9",
    last: {
      inputTokens: 1200,
      cachedInputTokens: 800,
      outputTokens: 300,
      reasoningOutputTokens: 125,
      totalTokens: 1500,
      cacheWriteInputTokens: 25,
    },
    total: {
      inputTokens: 5200,
      cachedInputTokens: 2800,
      outputTokens: 1300,
      reasoningOutputTokens: 525,
      totalTokens: 6500,
      cacheWriteInputTokens: 75,
    },
    modelContextWindow: 200000,
    emittedAtMs: 1788090000123,
  });
});

test("model-authored or generic turn usage claims are not treated as provider-owned telemetry", () => {
  const agentClaim = parseCodexAppServerLine(JSON.stringify({
    method: "item/completed",
    params: {
      item: {
        type: "agentMessage",
        text: "I used 12345 tokens",
        usage: { inputTokens: 12345 },
      },
    },
  }));
  const genericTurnClaim = parseCodexAppServerLine(JSON.stringify({
    method: "turn/completed",
    params: { usage: { inputTokens: 999999 } },
  }));

  assert.equal(extractCodexUsageSnapshot(agentClaim, "0.42.0"), undefined);
  assert.equal(extractCodexUsageSnapshot(genericTurnClaim, "0.42.0"), undefined);
});

test("malformed or negative provider usage fails closed", () => {
  assert.throws(() => parseCodexAppServerLine("not-json"), /malformed JSON/i);

  const malformed = parseCodexAppServerLine(JSON.stringify({
    method: "thread/tokenUsage/updated",
    params: {
      threadId: "thread-1",
      turnId: "turn-1",
      tokenUsage: {
        last: {
          inputTokens: -1,
          cachedInputTokens: 0,
          outputTokens: 0,
          reasoningOutputTokens: 0,
          totalTokens: 0,
        },
        total: {
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          reasoningOutputTokens: 0,
          totalTokens: 0,
        },
      },
    },
  }));

  assert.throws(() => extractCodexUsageSnapshot(malformed, "0.42.0"), /non-negative safe integer/i);
  assert.throws(() => extractCodexUsageSnapshot(malformed, ""), /version must not be blank/i);
});
