import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("dynamic desktop navigation survives root shell replacement without observing rendered content", async () => {
  const notifications = await read("apps/desktop/src/notification-center.ts");
  const sourceReview = await read("apps/desktop/src/project-source-review-navigation.ts");

  for (const source of [notifications, sourceReview]) {
    assert.match(source, /document\.querySelector<HTMLElement>\("#app"\)/);
    assert.match(source, /observer\.observe\(appRoot, \{ childList: true \}\)/);
    assert.doesNotMatch(source, /observer\.observe\(nav,/);
    assert.doesNotMatch(source, /subtree:\s*true/);
    assert.doesNotMatch(source, /observer\.observe\(document\.body/);
  }
});
