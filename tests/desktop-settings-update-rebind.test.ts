import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("Settings-only rerenders rebind the update check action", async () => {
  const main = await read("apps/desktop/src/main.ts");

  assert.match(main, /const bindUpdateCheckEvent = \(\) => \{/);
  assert.match(main, /renderSettingsSectionOnly[\s\S]*bindUpdateCheckEvent\(\);[\s\S]*bindConnectionDiagnosticsEvents/);
  assert.match(main, /const bindEvents = \(\) => \{[\s\S]*bindUpdateCheckEvent\(\);/);
  assert.match(main, /invoke<UpdateCheckResult>\("check_for_update"\)/);
});


test("Settings updater surface is owned by the active updater UI and exposes install after availability", async () => {
  const updater = await read("apps/desktop/src/updater-ui.ts");
  const main = await read("apps/desktop/src/main.ts");

  assert.match(updater, /\[data-settings-surface='updates'\]/);
  assert.match(updater, /settings-status-hero/);
  assert.match(updater, /updateSurfaceRoot/);
  assert.match(updater, /root\?\.querySelector<HTMLButtonElement>\("\.check-updates"\)/);
  assert.match(updater, /root\?\.querySelector<HTMLButtonElement>\("\.install-update"\)/);
  assert.match(updater, /invoke<UpdateResult>\("apply_update", \{ expectedVersion \}\)/);
  assert.match(updater, /updaterSurfaceAdded/);

  assert.match(main, /querySelectorAll<HTMLButtonElement>\("\.check-updates"\)/);
  assert.match(main, /dataset\.updateCheckBound/);
});
