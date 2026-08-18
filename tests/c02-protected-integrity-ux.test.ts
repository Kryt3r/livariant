import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

test("init --apply explains protected integrity acceptance before canonical reads", async () => {
  const projectPath = await mkdtemp(resolve(tmpdir(), "livariant-c02-init-ux-"));
  try {
    const result = spawnSync(process.execPath, [cliPath, "init", "--apply"], {
      cwd: projectPath,
      encoding: "utf8",
      shell: false,
      env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Project Brain initialized:/);
    assert.match(result.stdout, /Protected integrity: required before canonical Project Brain reads/i);
    assert.match(result.stdout, /integrity inspect/i);
    assert.match(result.stdout, /integrity accept-current/i);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
});
