import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("Settings is the sole Desktop updater surface", async () => {
  const main = await read("apps/desktop/src/main.ts");
  const updater = await read("apps/desktop/src/updater-ui.ts");

  assert.match(main, /data-settings-surface="updates"/);
  assert.doesNotMatch(main, /renderUpdatesView/);
  assert.doesNotMatch(main, /data-view="updates"/);
  assert.doesNotMatch(main, /currentView === "updates"/);
  assert.doesNotMatch(main, /bindUpdateCheckEvent/);
  assert.doesNotMatch(main, /invoke<UpdateCheckResult>\("check_for_update"\)/);

  assert.match(updater, /\[data-settings-surface='updates'\]/);
  assert.doesNotMatch(updater, /data-view='updates'/);
  assert.doesNotMatch(updater, /\.updates-workspace/);
});

test("Settings updater owns check, install and rerender reconciliation", async () => {
  const updater = await read("apps/desktop/src/updater-ui.ts");

  assert.match(updater, /root\.querySelector<HTMLButtonElement>\("\.check-updates"\)/);
  assert.match(updater, /root\.querySelector<HTMLButtonElement>\("\.install-update"\)/);
  assert.match(updater, /invoke<UpdateResult>\("check_for_update"\)/);
  assert.match(updater, /invoke<UpdateResult>\("apply_update", \{ expectedVersion \}\)/);
  assert.match(updater, /settingsSurfaceAdded/);
  assert.match(updater, /settings-update-release-notes/);
  assert.match(updater, /settings-updater-progress/);
});
