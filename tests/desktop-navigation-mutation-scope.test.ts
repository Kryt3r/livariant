import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("dynamic navigation observers are scoped to nav rather than the whole document body", async () => {
  const notification = await read("apps/desktop/src/notification-center.ts");
  const sourceReview = await read("apps/desktop/src/project-source-review-navigation.ts");

  for (const source of [notification, sourceReview]) {
    assert.match(source, /observer\.observe\(nav, \{ childList: true \}\)/);
    assert.doesNotMatch(source, /observer\.observe\(document\.body/);
    assert.doesNotMatch(source, /subtree:\s*true/);
  }
});

test("notification badge avoids idempotent DOM text mutations", async () => {
  const notification = await read("apps/desktop/src/notification-center.ts");

  assert.match(notification, /const desiredText = unread > 99 \? "99\+" : String\(unread\)/);
  assert.match(notification, /if \(badge\.textContent !== desiredText\) badge\.textContent = desiredText/);
  assert.doesNotMatch(notification, /\n\s*badge\.textContent = unread > 99/);
});
