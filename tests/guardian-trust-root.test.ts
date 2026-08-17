import assert from "node:assert/strict";
import { chmod, cp, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  buildGuardianRootDescriptor,
  inspectGuardianRootAt,
  isProtectedPosixOwner,
  isProtectedWindowsOwnerSid,
  productionGuardianRoot,
} from "../src/guardian/trust-root.js";

async function withTemp(run: (root: string, project: string) => Promise<void>): Promise<void> {
  const base = await mkdtemp(resolve(tmpdir(), "livariant-guardian-root-"));
  const root = resolve(base, "guardian");
  const project = resolve(base, "project");
  await mkdir(project);
  try {
    await run(root, project);
  } finally {
    try { await chmod(resolve(root, "records"), 0o755); } catch { /* cleanup only */ }
    try { await chmod(root, 0o755); } catch { /* cleanup only */ }
    try { await chmod(resolve(root, "guardian-root.json"), 0o644); } catch { /* cleanup only */ }
    try { await chmod(resolve(root, "guardian-helper.js"), 0o644); } catch { /* cleanup only */ }
    await rm(base, { recursive: true, force: true });
  }
}

async function writeValidLayout(root: string, platform: "win32" | "linux"): Promise<void> {
  await mkdir(resolve(root, "records"), { recursive: true });
  const helper = Buffer.from("// protected Livariant Guardian helper fixture\n", "utf8");
  await writeFile(resolve(root, "guardian-helper.js"), helper);
  const physicalRoot = await realpath(root);
  await writeFile(resolve(root, "guardian-root.json"), `${JSON.stringify(
    buildGuardianRootDescriptor(helper, physicalRoot, platform),
    null,
    2,
  )}\n`);
}

test("production Guardian roots are fixed platform locations and do not use environment overrides", () => {
  const oldProgramData = process.env.ProgramData;
  process.env.ProgramData = "D:\\attacker-controlled";
  try {
    assert.equal(productionGuardianRoot("win32"), "C:\\ProgramData\\Livariant\\Guardian\\v1");
    assert.equal(productionGuardianRoot("linux"), "/var/lib/livariant-guardian/v1");
    assert.equal(productionGuardianRoot("darwin"), null);
  } finally {
    if (oldProgramData === undefined) delete process.env.ProgramData;
    else process.env.ProgramData = oldProgramData;
  }
});

test("protected ownership rules accept only root/SYSTEM/built-in Administrators", () => {
  assert.equal(isProtectedPosixOwner(0), true);
  assert.equal(isProtectedPosixOwner(1000), false);
  assert.equal(isProtectedWindowsOwnerSid("S-1-5-18"), true);
  assert.equal(isProtectedWindowsOwnerSid("S-1-5-32-544"), true);
  assert.equal(isProtectedWindowsOwnerSid("S-1-5-21-123-456-789-1001"), false);
});

test("missing Guardian root is unavailable and makes zero changes", async () => {
  await withTemp(async (root, project) => {
    const inspection = await inspectGuardianRootAt(root, project, "linux");
    assert.equal(inspection.state, "unavailable");
    assert.equal(inspection.guardianReady, false);
    assert.equal(inspection.changesMade, 0);
  });
});

test("syntactically perfect Guardian files in a requester-writable directory are rejected", async () => {
  await withTemp(async (root, project) => {
    await writeValidLayout(root, "linux");
    const inspection = await inspectGuardianRootAt(root, project, "linux");
    assert.equal(inspection.state, "unsafe");
    assert.equal(inspection.guardianReady, false);
    assert.match(inspection.reason, /writable by the ordinary Livariant requester principal/i);
  });
});

test("Guardian root overlapping the project is rejected before it can become trust", async () => {
  const base = await mkdtemp(resolve(tmpdir(), "livariant-guardian-overlap-"));
  const project = resolve(base, "project");
  const root = resolve(project, "guardian");
  await mkdir(root, { recursive: true });
  try {
    const inspection = await inspectGuardianRootAt(root, project, "linux");
    assert.equal(inspection.state, "unsafe");
    assert.match(inspection.reason, /must not overlap the current project/i);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("malformed Guardian descriptor fails closed", async () => {
  await withTemp(async (root, project) => {
    await mkdir(resolve(root, "records"), { recursive: true });
    await writeFile(resolve(root, "guardian-helper.js"), "fixture\n");
    await writeFile(resolve(root, "guardian-root.json"), "{not-json\n");
    const inspection = await inspectGuardianRootAt(root, project, "linux");
    assert.equal(inspection.state, "unsafe");
    assert.equal(inspection.guardianReady, false);
  });
});

test("Guardian helper substitution is detected by the protected descriptor digest", async () => {
  await withTemp(async (root, project) => {
    await writeValidLayout(root, "linux");
    await writeFile(resolve(root, "guardian-helper.js"), "// substituted helper bytes\n");
    const inspection = await inspectGuardianRootAt(root, project, "linux");
    assert.equal(inspection.state, "unsafe");
    assert.match(inspection.reason, /helper bytes do not match/i);
  });
});

test("copying a valid Guardian layout to another physical root invalidates its trust binding", async () => {
  const base = await mkdtemp(resolve(tmpdir(), "livariant-guardian-relocation-"));
  const rootA = resolve(base, "guardian-a");
  const rootB = resolve(base, "guardian-b");
  const project = resolve(base, "project");
  await mkdir(project);
  try {
    await writeValidLayout(rootA, "linux");
    await cp(rootA, rootB, { recursive: true });
    const inspection = await inspectGuardianRootAt(rootB, project, "linux");
    assert.equal(inspection.state, "unsafe");
    assert.match(inspection.reason, /physical-location binding/i);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("symlinked Guardian root is rejected", { skip: process.platform === "win32" }, async () => {
  const base = await mkdtemp(resolve(tmpdir(), "livariant-guardian-symlink-"));
  const target = resolve(base, "target");
  const root = resolve(base, "guardian");
  const project = resolve(base, "project");
  await mkdir(target);
  await mkdir(project);
  await symlink(target, root, "dir");
  try {
    const inspection = await inspectGuardianRootAt(root, project, "linux");
    assert.equal(inspection.state, "unsafe");
    assert.match(inspection.reason, /real directory|symbolic link|junction/i);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("read-only but requester-owned Guardian layout remains unsafe on Linux", { skip: process.platform === "win32" }, async () => {
  await withTemp(async (root, project) => {
    await writeValidLayout(root, "linux");
    await chmod(resolve(root, "guardian-root.json"), 0o444);
    await chmod(resolve(root, "guardian-helper.js"), 0o444);
    await chmod(resolve(root, "records"), 0o555);
    await chmod(root, 0o555);

    const inspection = await inspectGuardianRootAt(root, project, "linux");
    assert.equal(inspection.state, "unsafe");
    assert.equal(inspection.guardianReady, false);
    assert.match(inspection.reason, /not owned by the protected root principal/i);
  });
});
