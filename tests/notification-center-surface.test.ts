import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("Notification Center renderer can read and update read state but cannot create durable events", async () => {
  const ui = await read("apps/desktop/src/notification-center.ts");
  const native = await read("apps/desktop/src-tauri/src/lib.rs");
  const entry = await read("apps/desktop/src/desktop-entry.ts");

  assert.match(entry, /import\("\.\/notification-center\.js"\)/);
  assert.match(ui, /invoke<NotificationCenterSnapshot>\("notification_center_list"\)/);
  assert.match(ui, /invoke<NotificationCenterSnapshot>\("notification_center_set_read"/);
  assert.match(ui, /invoke<NotificationCenterSnapshot>\("notification_center_mark_all_read"\)/);
  assert.doesNotMatch(ui, /notification_center_(create|record|append|push)/);
  assert.doesNotMatch(native, /notification_center::notification_center_(create|record|append|push)/);
});

test("Notification Center is a durable navigation surface with explicit unread controls", async () => {
  const ui = await read("apps/desktop/src/notification-center.ts");
  assert.match(ui, /data-view='notifications'/);
  assert.match(ui, /data-notification-mark-all/);
  assert.match(ui, /data-notification-read-toggle/);
  assert.match(ui, /Durable product events remain here independently of popup delivery/);
  assert.match(ui, /Dauerhafte Produkt-Ereignisse bleiben hier unabhängig davon erhalten/);
});
