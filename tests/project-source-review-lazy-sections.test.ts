import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const navigationPath = new URL("../apps/desktop/src/project-source-review-navigation.ts", import.meta.url);
const lazyViewPath = new URL("../apps/desktop/src/project-source-review-lazy-view.ts", import.meta.url);

test("Project Sources navigation stays lightweight until the user opens a detail section", async () => {
  const navigation = await readFile(navigationPath, "utf8");
  assert.match(navigation, /loadProjectSourceReviewPresentation\(\)/);
  assert.doesNotMatch(navigation, /refreshProjectSourceReviewPresentation/);
  assert.doesNotMatch(navigation, /loadGitHubProjectTelemetry/);
  assert.doesNotMatch(navigation, /inventory_project_source_review_paths/);
  assert.doesNotMatch(navigation, /data-refresh-source-review/);
  assert.match(navigation, /teardownHeavySection/);
  assert.match(navigation, /heavyRoot\.replaceChildren\(\)/);
});

test("heavy Project Sources material is explicit and bounded in the DOM", async () => {
  const source = await readFile(lazyViewPath, "utf8");
  assert.match(source, /const PAGE_SIZE = 24/);
  assert.match(source, /data-source-review-section="sources"/);
  assert.match(source, /data-source-review-section="material"/);
  assert.match(source, /data-source-review-section="findings"/);
  assert.match(source, /data-source-review-section="github"/);
  assert.match(source, /inventory_project_source_review_paths/);
  assert.match(source, /slice\(0, offset \+ PAGE_SIZE\)/);
  assert.match(source, /data-source-review-more="material"/);
  assert.match(source, /data-source-review-more="findings"/);
});
