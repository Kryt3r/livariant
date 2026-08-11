import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

interface FixtureIdentity {
  version: string;
  channel: "preview";
  sourceId: string;
  artifactId: string;
  artifactSha256: string;
  packageTreeSha256: string;
}

function machineTrustBase(): string {
  return resolve(userInfo().homedir, ".livariant", "trust", "runtimes");
}

function machineTestTrustRoot(label: string): string {
  return resolve(machineTrustBase(), `test-${label}-${randomUUID()}`);
}

async function hashPackageTree(packageRoot: string): Promise<string> {
  const hash = createHash("sha256");
  async function walk(directory: string, prefix: string): Promise<void> {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolute = resolve(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        hash.update(`D\0${relativePath}\0`);
        await walk(absolute, relativePath);
      } else if (entry.isFile()) {
        hash.update(`F\0${relativePath}\0`);
        hash.update(await readFile(absolute));
        hash.update("\0");
      } else {
        throw new Error(`unsupported fixture entry: ${relativePath}`);
      }
    }
  }
  await walk(packageRoot, "");
  return hash.digest("hex");
}

async function buildHostileRuntime(projectPath: string, markerPath: string): Promise<FixtureIdentity> {
  const managedRoot = resolve(projectPath, ".framework-runtime");
  const installRoot = resolve(managedRoot, "releases", "9.9.9");
  const packageRoot = resolve(installRoot, "node_modules", "livariant");
  const cliPath = resolve(packageRoot, "dist", "src", "cli", "index.js");
  await mkdir(resolve(cliPath, ".."), { recursive: true });

  await writeFile(resolve(packageRoot, "package.json"), `${JSON.stringify({ name: "livariant", version: "9.9.9", type: "module" }, null, 2)}\n`, "utf8");
  await writeFile(cliPath, [
    'import { writeFileSync } from "node:fs";',
    `writeFileSync(${JSON.stringify(markerPath)}, "executed\\n", { flag: "a" });`,
    'console.log(JSON.stringify({ frameworkVersion: "9.9.9", runtime: "node", channel: "preview" }));',
    "",
  ].join("\n"), "utf8");

  const identity: FixtureIdentity = {
    version: "9.9.9",
    channel: "preview",
    sourceId: "attacker-controlled-source",
    artifactId: "attacker-controlled-runtime",
    artifactSha256: "0".repeat(64),
    packageTreeSha256: await hashPackageTree(packageRoot),
  };

  await writeFile(resolve(installRoot, ".release-evidence.json"), `${JSON.stringify(identity, null, 2)}\n`, "utf8");
  await writeFile(resolve(managedRoot, "active.json"), `${JSON.stringify({
    version: identity.version,
    installRoot: relative(managedRoot, installRoot),
    cliPath: relative(managedRoot, cliPath),
  }, null, 2)}\n`, "utf8");
  return identity;
}

async function writeTrustRecord(root: string, identity: FixtureIdentity): Promise<void> {
  await mkdir(root, { recursive: true });
  const key = createHash("sha256").update([
    identity.version,
    identity.channel,
    identity.sourceId,
    identity.artifactId,
    identity.artifactSha256,
    identity.packageTreeSha256,
  ].join("\0")).digest("hex");
  await writeFile(resolve(root, `${key}.json`), `${JSON.stringify({ schema: 1, packageName: "livariant", ...identity }, null, 2)}\n`, "utf8");
}

function runCli(projectPath: string, trustRoot: string, command: string, args: string[] = []) {
  const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
  return spawnSync(process.execPath, [cliPath, command, ...args], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, LIVARIANT_TRUST_ROOT: trustRoot },
  });
}

async function initializeFixture(projectPath: string, trustRoot: string): Promise<void> {
  await writeFile(resolve(projectPath, "package.json"), `${JSON.stringify({ name: "fixture-project", private: true }, null, 2)}\n`, "utf8");
  const initialized = runCli(projectPath, trustRoot, "init", ["--apply"]);
  assert.equal(initialized.status, 0, initialized.stderr || initialized.stdout);
}

async function pinHostileVersion(projectPath: string, identity: FixtureIdentity): Promise<void> {
  const metadataPath = resolve(projectPath, ".project-brain", "metadata.json");
  const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as { framework: { version: string } };
  metadata.framework.version = identity.version;
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

test("LIVARIANT_TRUST_ROOT cannot redirect machine trust into project-controlled paths", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "livariant-hostile-workspace-"));
  const projectPath = resolve(workspace, "packages", "victim");
  const safeTrustRoot = machineTestTrustRoot("boundary");
  const markerPath = resolve(projectPath, "PWNED.txt");
  try {
    await mkdir(projectPath, { recursive: true });
    await initializeFixture(projectPath, safeTrustRoot);
    const identity = await buildHostileRuntime(projectPath, markerPath);
    await pinHostileVersion(projectPath, identity);

    const localTrustRoot = resolve(projectPath, ".livariant-trust");
    await writeTrustRecord(localTrustRoot, identity);
    const parentTrustRoot = resolve(workspace, ".livariant-trust");
    await writeTrustRecord(parentTrustRoot, identity);

    for (const override of [".livariant-trust", localTrustRoot, parentTrustRoot]) {
      const status = runCli(projectPath, override, "status");
      assert.equal(status.status, 0, status.stderr || status.stdout);
      assert.match(status.stdout, /LIVARIANT_TRUST_ROOT must/i);
      await assert.rejects(() => stat(markerPath), /ENOENT/);

      const resume = runCli(projectPath, override, "resume");
      assert.notEqual(resume.status, 0);
      assert.match(resume.stderr, /LIVARIANT_TRUST_ROOT must/i);
      await assert.rejects(() => stat(markerPath), /ENOENT/);
    }

    if (process.platform === "win32") {
      const namespaced = `\\\\?\\${localTrustRoot}`;
      const status = runCli(projectPath, namespaced, "status");
      assert.equal(status.status, 0, status.stderr || status.stdout);
      assert.match(status.stdout, /must not use Windows namespace, device, or UNC path aliases/i);
      await assert.rejects(() => stat(markerPath), /ENOENT/);
    }
  } finally {
    await rm(workspace, { recursive: true, force: true });
    await rm(safeTrustRoot, { recursive: true, force: true });
  }
});

test("a project inside the machine trust tree cannot self-authorize a sibling hostile Runtime trust store", async () => {
  const stagingProject = await mkdtemp(join(tmpdir(), "livariant-trust-authority-staging-"));
  const stagingTrustRoot = machineTestTrustRoot("authority-staging");
  const hostileRepoRoot = resolve(machineTrustBase(), `hostile-repo-${randomUUID()}`);
  const projectPath = resolve(hostileRepoRoot, "packages", "victim");
  const attackerTrustRoot = resolve(hostileRepoRoot, "attacker-trust");
  const markerPath = resolve(projectPath, "PWNED.txt");

  try {
    await initializeFixture(stagingProject, stagingTrustRoot);
    await mkdir(projectPath, { recursive: true });
    await writeFile(resolve(projectPath, "package.json"), `${JSON.stringify({ name: "fixture-project", private: true }, null, 2)}\n`, "utf8");
    await cp(resolve(stagingProject, ".project-brain"), resolve(projectPath, ".project-brain"), { recursive: true });

    const identity = await buildHostileRuntime(projectPath, markerPath);
    await pinHostileVersion(projectPath, identity);
    await writeTrustRecord(attackerTrustRoot, identity);

    const status = runCli(projectPath, attackerTrustRoot, "status");
    assert.equal(status.status, 0, status.stderr || status.stdout);
    assert.match(status.stdout, /project directories must not reside inside the machine-local Runtime trust directory/i);
    await assert.rejects(() => stat(markerPath), /ENOENT/);

    const resume = runCli(projectPath, attackerTrustRoot, "resume");
    assert.notEqual(resume.status, 0);
    assert.match(resume.stderr, /project directories must not reside inside the machine-local Runtime trust directory/i);
    await assert.rejects(() => stat(markerPath), /ENOENT/);
  } finally {
    await rm(stagingProject, { recursive: true, force: true });
    await rm(stagingTrustRoot, { recursive: true, force: true });
    await rm(hostileRepoRoot, { recursive: true, force: true });
  }
});

test("malformed active Runtime evidence cannot deny version, help, status, or doctor", async () => {
  const projectPath = await mkdtemp(join(tmpdir(), "livariant-runtime-diagnostics-"));
  const trustRoot = machineTestTrustRoot("diagnostics");
  try {
    await initializeFixture(projectPath, trustRoot);
    const managedRoot = resolve(projectPath, ".framework-runtime");
    await mkdir(managedRoot, { recursive: true });
    await writeFile(resolve(managedRoot, "active.json"), "}{ not json at all\n", "utf8");

    for (const command of ["version", "help"]) {
      const result = runCli(projectPath, trustRoot, command);
      assert.equal(result.status, 0, `${command}: ${result.stderr || result.stdout}`);
    }

    const status = runCli(projectPath, trustRoot, "status");
    assert.equal(status.status, 0, status.stderr || status.stdout);
    assert.match(status.stdout, /Lifecycle:\s*recovery-required/i);
    assert.match(status.stdout, /invalid active Runtime evidence/i);

    const doctor = runCli(projectPath, trustRoot, "doctor");
    assert.equal(doctor.status, 0, doctor.stderr || doctor.stdout);
    assert.match(doctor.stdout, /State:\s*recovery-required/i);
    assert.match(doctor.stdout, /invalid-runtime-evidence/i);

    const resume = runCli(projectPath, trustRoot, "resume");
    assert.notEqual(resume.status, 0);
    assert.match(resume.stderr, /not valid JSON|Unexpected token/i);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
    await rm(trustRoot, { recursive: true, force: true });
  }
});
