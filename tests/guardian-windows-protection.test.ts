import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  assertWindowsProtectedParentAnchor,
  assertWindowsProtectedPath,
  inspectWindowsProtection,
  parseWindowsProtectionOutput,
} from "../src/guardian/windows-protection.js";

const windowsOnly = { skip: process.platform !== "win32" } as const;
const resultPrefix = "LIVARIANT_GUARDIAN_ACL_RESULT|";

test("Windows Guardian ACL parser accepts exactly one sentinel-bound strict result amid incidental output", () => {
  assert.deepEqual(
    parseWindowsProtectionOutput(`incidental PowerShell output\r\n${resultPrefix}S-1-5-21-123-456-789-1001|yes|no\r\n`),
    {
      ownerSid: "S-1-5-21-123-456-789-1001",
      ordinaryRequesterWritable: true,
      ordinaryRequesterCanReplaceChildren: false,
    },
  );
  assert.throws(() => parseWindowsProtectionOutput("warning only\n"), /invalid or ambiguous result/i);
  assert.throws(
    () => parseWindowsProtectionOutput(`${resultPrefix}S-1-5-18|no|no\n${resultPrefix}S-1-5-18|yes|no\n`),
    /invalid or ambiguous result/i,
  );
  assert.throws(
    () => parseWindowsProtectionOutput("S-1-5-18|no|no\n"),
    /invalid or ambiguous result/i,
    "unmarked output must never be accepted as Guardian ACL evidence",
  );
});

test("ordinary requester-owned Windows directory is not a protected Guardian path", windowsOnly, async () => {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-guardian-win-protection-"));
  try {
    const protection = inspectWindowsProtection(root);
    assert.equal(protection.ordinaryRequesterWritable, true);
    assert.throws(
      () => assertWindowsProtectedPath(root, "fixture"),
      /not owned by SYSTEM|write-capable ACL rights/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Windows Guardian ACL inspection treats valid path metacharacters as data", windowsOnly, async () => {
  const base = await mkdtemp(resolve(tmpdir(), "livariant-guardian-win-meta-"));
  const root = resolve(base, "guardian & (acl) ! fixture");
  await mkdir(root);
  try {
    const protection = inspectWindowsProtection(root);
    assert.equal(protection.ordinaryRequesterWritable, true);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("ordinary requester-controlled Windows parent cannot anchor protected Guardian descendants", windowsOnly, async () => {
  const root = await mkdtemp(resolve(tmpdir(), "livariant-guardian-win-parent-"));
  const child = resolve(root, "child");
  await mkdir(child);
  try {
    const protection = inspectWindowsProtection(root);
    assert.equal(protection.ordinaryRequesterCanReplaceChildren, true);
    assert.throws(
      () => assertWindowsProtectedParentAnchor(root, "fixture parent"),
      /replace protected child paths/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
