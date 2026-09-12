import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("Project Sources navigation loads cached snapshot without automatic heavy refresh", async () => {
  const navigation = await read("apps/desktop/src/project-source-review-navigation.ts");
  const bridge = await read("apps/desktop/src/project-source-review-bridge.ts");

  assert.match(navigation, /await loadProjectSourceReviewPresentation\(\)/);
  assert.match(bridge, /invoke<ProjectSourceReviewBridgeResult>\("project_source_review_presentation"\)/);
  assert.doesNotMatch(navigation, /const renderIntoContent[\s\S]*?await refreshProjectSourceReviewPresentation\(\)/);
});

test("heavy Project Sources refresh is explicit and bounded to the refresh control", async () => {
  const navigation = await read("apps/desktop/src/project-source-review-navigation.ts");

  assert.match(navigation, /data-refresh-source-review/);
  assert.match(navigation, /button\?\.addEventListener\("click", async \(\) => \{[\s\S]*?await refreshProjectSourceReviewPresentation\(\)/);
});

test("large Project Sources rows use rendering containment", async () => {
  const css = await read("apps/desktop/src/project-source-review-performance.css");

  assert.match(css, /content-visibility:auto/);
  assert.match(css, /contain-intrinsic-size/);
  assert.match(css, /source-review-candidate-list\{contain:layout paint\}/);
});
