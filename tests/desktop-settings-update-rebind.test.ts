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
