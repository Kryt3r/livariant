import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

const primaryErrorSurfaces = [
  "apps/desktop/src/shell-project-switcher.ts",
  "apps/desktop/src/project-connections-settings.ts",
  "apps/desktop/src/connections-diagnostics.ts",
  "apps/desktop/src/project-source-review-lazy-view.ts",
  "apps/desktop/src/diagnostics-cockpit.ts",
  "apps/desktop/src/wp056-redesign-polish.ts",
];

test("normal Desktop error surfaces do not render raw caught host errors", async () => {
  for (const path of primaryErrorSurfaces) {
    const source = await read(path);
    assert.doesNotMatch(source, /String\(cause\)/, path);
    assert.doesNotMatch(source, /return raw;/, path);
  }
});

test("normalized errors tell users how to recover without weakening fail-closed behavior", async () => {
  const switcher = await read("apps/desktop/src/shell-project-switcher.ts");
  const connections = await read("apps/desktop/src/project-connections-settings.ts");
  const diagnostics = await read("apps/desktop/src/connections-diagnostics.ts");
  const review = await read("apps/desktop/src/project-source-review-lazy-view.ts");

  assert.match(switcher, /current project remains active/);
  assert.match(connections, /Nothing was deleted/);
  assert.match(connections, /Check your network connection and try again/);
  assert.match(diagnostics, /Existing evidence was kept/);
  assert.match(review, /Try refreshing this section/);
});
