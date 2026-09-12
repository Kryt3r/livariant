import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("Project Sources runtime processes stay off the UI-facing command thread", async () => {
  const observation = await read("apps/desktop/src-tauri/src/project_source_observation.rs");
  const selection = await read("apps/desktop/src-tauri/src/project_review_selection.rs");
  const refresh = await read("apps/desktop/src-tauri/src/project_source_review_async.rs");

  assert.match(observation, /pub async fn observe_project_sources/);
  assert.match(observation, /spawn_blocking\(move \|\| observe_project_sources_blocking\(app\)\)/);

  assert.match(selection, /pub async fn inventory_project_source_review_paths/);
  assert.match(selection, /spawn_blocking\(move \|\| inventory_project_source_review_paths_blocking\(app\)\)/);
  assert.match(selection, /pub async fn start_project_source_review/);
  assert.match(selection, /spawn_blocking\(move \|\| start_project_source_review_blocking\(app, selection\)\)/);

  assert.match(refresh, /pub async fn refresh_project_source_review_presentation_nonblocking/);
  assert.match(refresh, /spawn_blocking\(move \|\| refresh_project_source_review_presentation\(app\)\)/);
});

test("Desktop bridge uses the nonblocking refresh command", async () => {
  const bridge = await read("apps/desktop/src/project-source-review-bridge.ts");
  const lib = await read("apps/desktop/src-tauri/src/lib.rs");

  assert.match(bridge, /invoke<ProjectSourceReviewBridgeResult>\("refresh_project_source_review_presentation_nonblocking"\)/);
  assert.doesNotMatch(bridge, /invoke<ProjectSourceReviewBridgeResult>\("refresh_project_source_review_presentation"\)/);
  assert.match(lib, /project_source_review_async::refresh_project_source_review_presentation_nonblocking/);
});
