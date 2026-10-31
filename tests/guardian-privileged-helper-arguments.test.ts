import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeHelperArguments } from "../src/guardian/privileged-helper.js";

const legacy = ["consume-authority", "--consumer", "semantic-mutation", "--record",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "--material", "a".repeat(64)];

test("real privileged launcher validator permits exact scoped consumption and existing grammar", () => {
  assert.doesNotThrow(() => assertSafeHelperArguments(legacy));
  assert.doesNotThrow(() => assertSafeHelperArguments([...legacy, "--request", "request.json"]));
  assert.doesNotThrow(() => assertSafeHelperArguments(["issue-authority", "--request", "authority-request.json"]));
});

test("scoped consumption does not expand the generic privileged argument bound", () => {
  for (const args of [
    [...legacy, "--request", "../request.json"],
    [...legacy, "--request", "request.json", "extra"],
    [...legacy, "--other", "request.json"],
    ["issue-authority", ...legacy.slice(1), "--request", "request.json"],
    [...legacy, "--request", "request.json;echo"],
  ]) assert.throws(() => assertSafeHelperArguments(args), /unsupported|unbounded/);
});
