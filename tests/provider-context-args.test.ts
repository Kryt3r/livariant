import assert from "node:assert/strict";
import test from "node:test";
import { parseProviderContextArgs } from "../src/cli/provider-context-args.js";

test("provider context arguments are strict", () => {
  assert.deepEqual(parseProviderContextArgs(["--provider", "codex", "--task", "task.txt", "--json"]), {
    provider: "codex",
    taskPath: "task.txt",
    json: true,
  });
  assert.throws(() => parseProviderContextArgs(["--provider", "codex", "--task", "task.txt", "codex"]));
  assert.throws(() => parseProviderContextArgs(["--provider", "other", "--task", "task.txt"]));
  assert.throws(() => parseProviderContextArgs(["--provider", "codex", "--task", "task.txt", "--json", "--json"]));
});
