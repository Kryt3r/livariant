import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path: string) => readFile(path, "utf8");

test("Notification Center keeps technical load errors out of normal user copy", async () => {
  const renderer = await text("apps/desktop/src/notification-center.ts");

  assert.match(renderer, /severityLabel/);
  assert.match(renderer, /categoryLabel/);
  assert.match(renderer, /Notification Center load failed/);
  assert.doesNotMatch(renderer, /<p>\$\{escapeHtml\(String\(cause\)\)\}<\/p>/);
  assert.match(renderer, /review Diagnostics for more detail/);
  assert.match(renderer, /prüfe die Diagnose für weitere Details/);
});

test("Operator Live Notice localizes normal-user status and accessibility copy", async () => {
  const renderer = await text("apps/desktop/src/operator-live-notice.ts");

  assert.match(renderer, /getLanguage/);
  assert.match(renderer, /Livariant service status/);
  assert.match(renderer, /Livariant-Servicestatus/);
  assert.match(renderer, /text\("Live", "Aktiv"\)/);
  assert.match(renderer, /text\("Livariant Service", "Livariant-Service"\)/);
  assert.match(renderer, /operator-live-notice-source/);
  assert.match(renderer, /operator_live_notice_list/);
  assert.doesNotMatch(renderer, /operator_live_notice_(record|write|apply)/);
});

test("Desktop entry keeps first-run startup exceptions out of normal user copy", async () => {
  const entry = await text("apps/desktop/src/desktop-entry.ts");

  assert.match(entry, /console\.error\("Livariant first-run startup failed", error\)/);
  assert.match(entry, /Livariant setup could not start/);
  assert.match(entry, /Livariant-Einrichtung konnte nicht gestartet werden/);
  assert.doesNotMatch(entry, /\$\{String\(error\)/);
  assert.match(entry, /No project-owned files were changed\./);
  assert.match(entry, /Es wurden keine projekt-eigenen Dateien verändert\./);
});
