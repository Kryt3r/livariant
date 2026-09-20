import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("updater primary UI does not expose raw caught host errors", async () => {
  const updater = await read("apps/desktop/src/updater-ui.ts");
  const main = await read("apps/desktop/src/main.ts");

  assert.doesNotMatch(updater, /Update host bridge failed without changing the installation: \$\{String\(error\)\}/);
  assert.doesNotMatch(updater, /Signed Desktop update installation failed without granting additional Authority: \$\{String\(error\)\}/);
  assert.doesNotMatch(main, /Update host bridge failed without changing the installation: \$\{String\(error\)\}/);

  assert.match(updater, /updaterHostFailureCopy\("check"\)/);
  assert.match(updater, /updaterHostFailureCopy\("install"\)/);
  assert.match(main, /updateHostFailureCopy\(\)/);
});

test("updater recovery copy preserves fail-closed installation semantics", async () => {
  const updater = await read("apps/desktop/src/updater-ui.ts");
  const main = await read("apps/desktop/src/main.ts");

  assert.match(updater, /existing installation was not changed/i);
  assert.match(updater, /existing installation was not treated as successfully replaced/i);
  assert.match(updater, /Check your connection and try again/);
  assert.match(main, /existing installation was not changed/i);
});


test("runtime health and source-review bridge failures stay bounded", async () => {
  const runtimeHealth = await read("apps/desktop/src/runtime-health.ts");
  const sourceReview = await read("apps/desktop/src/project-source-review-bridge.ts");

  assert.doesNotMatch(runtimeHealth, /String\(error\)/);
  assert.doesNotMatch(sourceReview, /String\(error\)/);

  assert.match(runtimeHealth, /installed application remains unchanged/);
  assert.match(runtimeHealth, /Existing runtime state was not treated as healthy/);
  assert.match(sourceReview, /Existing source state was not treated as current/);
  assert.match(sourceReview, /Check the linked checkout and try again/);
});
