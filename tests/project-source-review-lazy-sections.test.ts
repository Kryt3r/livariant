import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("Project Sources navigation stays lightweight until the user opens a detail section", async () => {
  const navigation = await read("apps/desktop/src/project-source-review-navigation.ts");
  assert.match(navigation, /loadProjectSourceReviewPresentation\(\)/);
  assert.doesNotMatch(navigation, /refreshProjectSourceReviewPresentation/);
  assert.doesNotMatch(navigation, /loadGitHubProjectTelemetry/);
  assert.doesNotMatch(navigation, /inventory_project_source_review_paths/);
  assert.doesNotMatch(navigation, /data-refresh-source-review/);
  assert.match(navigation, /teardownHeavySection/);
  assert.match(navigation, /heavyRoot\.replaceChildren\(\)/);
});

test("heavy Project Sources material is explicit and bounded in the DOM", async () => {
  const source = await read("apps/desktop/src/project-source-review-lazy-view.ts");
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
