import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("first-run revisit control is inserted after Settings has rendered", async () => {
  const revisit = await read("apps/desktop/src/first-run-revisit.ts");

  assert.match(revisit, /window\.setTimeout\(addRevisitControl, 0\)/);
  assert.match(revisit, /\[data-open-settings\], \[data-settings-section='general'\]/);
  assert.match(revisit, /data-reopen-first-run/);
  assert.match(revisit, /livariant:open-first-run/);
  assert.doesNotMatch(revisit, /queueMicrotask\(addRevisitControl\)/);
});
