import assert from "node:assert/strict";
import test from "node:test";
import { parseProviderReturnArgs } from "../src/cli/provider-return-args.js";

test("provider-return args require one context and input path", () => {
  assert.deepEqual(
    parseProviderReturnArgs(["--context", "context.json", "--input", "return.json", "--json"]),
    { contextPath: "context.json", inputPath: "return.json", json: true },
  );
  assert.deepEqual(
    parseProviderReturnArgs(["--context", "context.json", "--input", "return.json", "--authorization", "auth_123"]),
    { contextPath: "context.json", inputPath: "return.json", authorizationId: "auth_123", json: false },
  );
  assert.throws(() => parseProviderReturnArgs(["--input", "return.json"]), /--context/);
  assert.throws(() => parseProviderReturnArgs(["--context", "context.json"]), /--input/);
  assert.throws(() => parseProviderReturnArgs(["--context", "a", "--context", "b", "--input", "c"]), /exactly once/);
  assert.throws(() => parseProviderReturnArgs(["--context", "a", "--input", "b", "--yes"]), /Unsupported/);
});
