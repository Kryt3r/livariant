import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

async function source(path: string): Promise<string> {
  return readFile(resolve(process.cwd(), path), "utf8");
}

test("Windows Stage A secures Guardian parents without traversing existing Guardian production state", async () => {
  const installer = await source("scripts/installers/install-livariant-bootstrap.ps1.template");

  assert.match(installer, /Set-ProtectedDirectoryAcl \$LivariantProgramData/);
  assert.match(installer, /Set-ProtectedDirectoryAcl \$GuardianParent/);
  assert.match(installer, /historical pre-Authority Guardian state is inspected and\s*# repaired only by the separately protected Stage-B recovery path/s);

  assert.doesNotMatch(installer, /Harden-LivariantTree \$LivariantProgramData/);
  assert.doesNotMatch(installer, /Harden-LivariantTree \$GuardianParent/);
  assert.doesNotMatch(installer, /Repair-LegacyLivariantTreeAcl \$GuardianParent/);
});

test(
  "Windows Stage-A parent hardening leaves an existing Guardian root and leaf untouched",
  { skip: process.platform !== "win32" },
  () => {
    const powershell = resolve(
      process.env.SystemRoot ?? "C:\\Windows",
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    );
    const script = resolve(process.cwd(), "scripts", "windows-stage-a-guardian-boundary-smoke.ps1");
    const result = spawnSync(powershell, ["-NoProfile", "-NonInteractive", "-File", script], {
      encoding: "utf8",
    });

    assert.equal(
      result.status,
      0,
      `Windows Stage-A Guardian boundary smoke failed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
    assert.match(result.stdout, /leaves existing Guardian root, leaf ACLs, and bytes untouched/i);
  },
);
