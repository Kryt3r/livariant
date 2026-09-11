import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("Notification Center stays app-data durable and fails closed on invalid persisted state", async () => {
  const source = await read("apps/desktop/src-tauri/src/notification_center.rs");

  assert.match(source, /app_data_dir\(\)/);
  assert.match(source, /\["notifications", "center\.json"\]/);
  assert.match(source, /Unsupported Notification Center store schema/);
  assert.match(source, /duplicate notification ids/);
  assert.match(source, /center\.json\.tmp/);
  assert.match(source, /unread_count/);
});

test("Renderer IPC cannot forge durable product notifications", async () => {
  const nativeLib = await read("apps/desktop/src-tauri/src/lib.rs");
  const source = await read("apps/desktop/src-tauri/src/notification_center.rs");

  assert.match(nativeLib, /notification_center::notification_center_list/);
  assert.match(nativeLib, /notification_center::notification_center_set_read/);
  assert.match(nativeLib, /notification_center::notification_center_mark_all_read/);
  assert.doesNotMatch(nativeLib, /notification_center::notification_center_(?:create|record|append|insert)/);
  assert.doesNotMatch(source, /#\[tauri::command\][\s\S]{0,160}fn notification_center_(?:create|record|append|insert)/);
});
