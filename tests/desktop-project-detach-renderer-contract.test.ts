import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("desktop project renderer accepts host detached availability after removal", () => {
  const source = readFileSync("apps/desktop/src/desktop-project-registry.ts", "utf8");
  assert.match(source, /availability: "available" \| "unavailable" \| "detached"/);
  assert.match(source, /row\.availability === "detached"/);
});
