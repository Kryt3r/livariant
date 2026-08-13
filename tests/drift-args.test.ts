import assert from "node:assert/strict";
import test from "node:test";
import { driftInputPath } from "../src/cli/drift-args.js";

test("drift arguments accept one input", () => {
  assert.equal(driftInputPath(["--input", "observation.json", "--json"]), "observation.json");
  assert.throws(() => driftInputPath([]));
});
