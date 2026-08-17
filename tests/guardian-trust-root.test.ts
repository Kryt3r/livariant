import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  GUARDIAN_ROOT_KIND,
  GUARDIAN_ROOT_SCHEMA_VERSION,
  GUARDIAN_VERSION,
  inspectGuardianRootAt,
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
  const helper = "// protected Livariant Guardian helper fixture\n";
  await writeFile(resolve(root, "guardian-helper.js"), helper);
  await writeFile(resolve(root, "guardian-root.json"), `${JSON.stringify({
    schemaVersion: GUARDIAN_ROOT_SCHEMA_VERSION,
    kind: GUARDIAN_ROOT_KIND,
    guardianVersion: GUARDIAN_VERSION,
    platform,
    helperSha256: createHash("sha256").update(helper).digest("hex"),
  }, null, 2)}\n`);
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

test("read-only protected Guardian layout can be recognized as ready on Linux", { skip: process.platform === "win32" }, async () => {
  await withTemp(async (root, project) => {
    await writeValidLayout(root, "linux");
    await chmod(resolve(root, "guardian-root.json"), 0o444);
    await chmod(resolve(root, "guardian-helper.js"), 0o444);
    await chmod(resolve(root, "records"), 0o555);
    await chmod(root, 0o555);

    const inspection = await inspectGuardianRootAt(root, project, "linux");
    assert.equal(inspection.state, "ready");
    assert.equal(inspection.guardianReady, true);
    assert.equal(inspection.changesMade, 0);
  });
});
