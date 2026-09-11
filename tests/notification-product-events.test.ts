import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path: string) => readFile(path, "utf8");

test("update availability records durable notification without changing updater authority", async () => {
  const producer = await text("apps/desktop/src-tauri/src/notification_product_events.rs");
  const host = await text("apps/desktop/src-tauri/src/notification_center.rs");
  const lib = await text("apps/desktop/src-tauri/src/lib.rs");

  assert.match(producer, /#\[tauri::command\(rename = "check_for_update"\)\]/);
  assert.match(producer, /check_for_update_with_notifications/);
  assert.match(producer, /crate::updater::check_for_update\(app\.clone\(\)\)\.await/);
  assert.match(producer, /state == Some\("available"\)/);
  assert.match(producer, /updater:available:\{version\}/);
  assert.match(producer, /record_product_notification/);
  assert.match(producer, /let _ = crate::notification_center::record_product_notification/);

  assert.match(host, /upsert_preserving_read_state/);
  assert.match(host, /notification\.read_at_ms = existing\.read_at_ms/);
  assert.match(host, /NOTIFICATION_CENTER_CHANGED_EVENT/);
  assert.match(host, /app\.emit\(NOTIFICATION_CENTER_CHANGED_EVENT, \(\)\)/);

  assert.match(lib, /notification_product_events::check_for_update_with_notifications/);
  assert.doesNotMatch(lib, /\n\s*updater::check_for_update,/);
});

test("renderer live refresh consumes only a change hint and rereads durable store", async () => {
  const renderer = await text("apps/desktop/src/notification-center.ts");

  assert.match(renderer, /listen\(NOTIFICATION_CENTER_CHANGED_EVENT/);
  assert.match(renderer, /snapshot = await loadSnapshot\(\)/);
  assert.match(renderer, /data-notification-nav-badge/);
  assert.doesNotMatch(renderer, /invoke<[^>]*>\("notification_center_record/);
  assert.doesNotMatch(renderer, /payload\.(title|body|severity|category)/);
});
