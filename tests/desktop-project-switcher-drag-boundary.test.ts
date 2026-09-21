import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("global project switcher is not nested inside a Tauri drag-region container", () => {
  const source = readFileSync("apps/desktop/src/shell-redesign.ts", "utf8");
  assert.match(source, /<div class="global-header-left">/);
  assert.doesNotMatch(source, /<div class="global-header-left" data-tauri-drag-region>/);
  assert.match(source, /<div class="global-brand" data-tauri-drag-region>/);
});
