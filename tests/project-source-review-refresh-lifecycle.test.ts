import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("Project Sources navigation loads cached snapshot without automatic heavy refresh", async () => {
  const navigation = await read("apps/desktop/src/project-source-review-navigation.ts");
  const bridge = await read("apps/desktop/src/project-source-review-bridge.ts");

  assert.match(navigation, /await loadProjectSourceReviewPresentation\(\)/);
  assert.match(bridge, /invoke<ProjectSourceReviewBridgeResult>\("project_source_review_presentation"\)/);
  assert.doesNotMatch(navigation, /refreshProjectSourceReviewPresentation/);
});

test("heavy Project Sources work is explicit and moved behind lazy detail actions", async () => {
  const navigation = await read("apps/desktop/src/project-source-review-navigation.ts");
  const lazyView = await read("apps/desktop/src/project-source-review-lazy-view.ts");

  assert.doesNotMatch(navigation, /data-refresh-source-review/);
  assert.doesNotMatch(navigation, /inventory_project_source_review_paths/);
  assert.match(lazyView, /data-source-review-section="material"/);
  assert.match(lazyView, /inventory_project_source_review_paths/);
  assert.match(lazyView, /const PAGE_SIZE = 24/);
});

test("large Project Sources rows use rendering containment", async () => {
  const css = await read("apps/desktop/src/project-source-review-performance.css");

  assert.match(css, /content-visibility:auto/);
  assert.match(css, /contain-intrinsic-size/);
  assert.match(css, /source-review-candidate-list\{contain:layout paint\}/);
});
