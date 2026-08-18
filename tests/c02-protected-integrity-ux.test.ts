import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test("init --apply refuses mutation before protected lifecycle Authority exists", async () => {
  const projectPath = await mkdtemp(resolve(tmpdir(), "livariant-c02-init-ux-"));
  try {
    const result = spawnSync(process.execPath, [cliPath, "init", "--apply"], {
      cwd: projectPath,
      encoding: "utf8",
      shell: false,
      env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /Independent lifecycle authorization required: yes/i);
    assert.match(`${result.stdout}\n${result.stderr}`, /Guardian|lifecycle Authority|--apply expresses intent/i);
    assert.equal(await exists(resolve(projectPath, ".project-brain")), false);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
});
