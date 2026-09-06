import assert from "node:assert/strict";
import test from "node:test";
import { getVersionInfo } from "../src/runtime/index.js";

test("version identity reports the executing Node runtime", () => {
  const version = getVersionInfo();
  assert.equal(version.runtime, "node");
  assert.equal(version.nodeVersion, process.version);
});
