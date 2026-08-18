import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { inspectWindowsProtection } from "../src/guardian/windows-protection.js";

const WINDOWS_POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const ACL_TARGET_ENV = "LIVARIANT_WINDOWS_PROTECTION_TEST_TARGET";
const ACL_RIGHTS_ENV = "LIVARIANT_WINDOWS_PROTECTION_TEST_RIGHTS";

function setProtectedFixtureAcl(path: string, usersRights: "ReadAndExecute" | "ReadAndExecute, WriteData"): void {
  const script = [
    "$ErrorActionPreference='Stop'",
    `$target=$env:${ACL_TARGET_ENV}`,
    `$usersRights=$env:${ACL_RIGHTS_ENV}`,
    "$system=New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')",
    "$admins=New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')",
    "$users=New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-545')",
    "$inherit=[System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'",
    "$none=[System.Security.AccessControl.PropagationFlags]::None",
    "$allow=[System.Security.AccessControl.AccessControlType]::Allow",
    "$acl=New-Object System.Security.AccessControl.DirectorySecurity",
    "$acl.SetOwner($admins)",
    "$acl.SetAccessRuleProtection($true,$false)",
    "$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($system,'FullControl',$inherit,$none,$allow)))",
    "$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($admins,'FullControl',$inherit,$none,$allow)))",
    "$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($users,$usersRights,$inherit,$none,$allow)))",
    "[System.IO.Directory]::SetAccessControl($target,$acl)",
  ].join("; ");
  const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: { ...process.env, [ACL_TARGET_ENV]: path, [ACL_RIGHTS_ENV]: usersRights },
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`Windows ACL fixture setup failed: ${String(detail).trim()}`);
  }
}

test("Windows Guardian ACL inspection permits ordinary ReadAndExecute without treating composite read bits as write", { skip: process.platform !== "win32" }, async () => {
  const base = await mkdtemp(resolve(tmpdir(), "livariant-windows-rights-read-"));
  const target = resolve(base, "protected");
  await mkdir(target);
  try {
    setProtectedFixtureAcl(target, "ReadAndExecute");
    const inspection = inspectWindowsProtection(target);
    assert.equal(inspection.ordinaryRequesterWritable, false);
    assert.equal(inspection.ordinaryRequesterCanReplaceChildren, false);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("Windows Guardian ACL inspection still rejects a real granular ordinary-user write grant", { skip: process.platform !== "win32" }, async () => {
  const base = await mkdtemp(resolve(tmpdir(), "livariant-windows-rights-write-"));
  const target = resolve(base, "unsafe");
  await mkdir(target);
  try {
    setProtectedFixtureAcl(target, "ReadAndExecute, WriteData");
    const inspection = inspectWindowsProtection(target);
    assert.equal(inspection.ordinaryRequesterWritable, true);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
