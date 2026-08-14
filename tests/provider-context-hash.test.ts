import assert from "node:assert/strict";
import test from "node:test";
import { providerContextPacketId } from "../src/runtime/provider-context-hash.js";

test("provider context packet identity binds provider baseline and task", () => {
  const first = providerContextPacketId("claude-code", "baseline-a", "task-a");
  assert.equal(first, providerContextPacketId("claude-code", "baseline-a", "task-a"));
  assert.notEqual(first, providerContextPacketId("codex", "baseline-a", "task-a"));
  assert.notEqual(first, providerContextPacketId("claude-code", "baseline-b", "task-a"));
  assert.notEqual(first, providerContextPacketId("claude-code", "baseline-a", "task-b"));
});
