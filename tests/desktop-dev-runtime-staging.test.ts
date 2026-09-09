import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";

const repoRoot = process.cwd();

async function text(path: string): Promise<string> {
  return readFile(resolve(repoRoot, path), "utf8");
}

test("Tauri dev stages the bounded Core runtime before native launch", async () => {
  const desktopPackage = JSON.parse(await text("apps/desktop/package.json")) as { scripts?: Record<string, string> };
  assert.equal(desktopPackage.scripts?.["tauri:dev:prepare"], "node ./scripts/stage-dev-runtime.mjs");
  assert.equal(desktopPackage.scripts?.["tauri:dev"], "npm run tauri:dev:prepare && tauri dev");

  const stageScript = await text("apps/desktop/scripts/stage-dev-runtime.mjs");
  assert.match(stageScript, /src-tauri[\s\S]*target[\s\S]*debug/);
  assert.match(stageScript, /cpSync\(process\.execPath, nodeTarget\)/);
  assert.match(stageScript, /process\.env\.npm_execpath/);
  assert.match(stageScript, /run\(process\.execPath, \[npmCli, \.\.\.args\], cwd\)/);
  assert.doesNotMatch(stageScript, /npm\.cmd/);
  assert.match(stageScript, /coreSourceSha:/);
  assert.match(stageScript, /developmentRuntime:\s*true/);
  assert.match(stageScript, /authorityIssued:\s*false/);
  assert.doesNotMatch(stageScript, /shell:\s*true/);
});
