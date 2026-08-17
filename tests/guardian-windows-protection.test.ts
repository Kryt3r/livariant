import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  assertWindowsProtectedParentAnchor,
  assertWindowsProtectedPath,
  inspectWindowsProtection,
} from "../src/guardian/windows-protection.js";

const windowsOnly = { skip: process.platform !== "win32" } as const;

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
