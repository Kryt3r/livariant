import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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

  await writeFile(resolve(packageRoot, "package.json"), `${JSON.stringify({
    name: "livariant",
    version: "9.9.9",
    type: "module",
  }, null, 2)}\n`, "utf8");
  await writeFile(cliPath, [
    'import { writeFileSync } from "node:fs";',
    `writeFileSync(${JSON.stringify(markerPath)}, "executed\\n", { flag: "a" });`,
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

async function writeProjectLocalTrustRecord(root: string, identity: FixtureIdentity): Promise<void> {
  await mkdir(root, { recursive: true });
  const key = createHash("sha256").update([
    identity.version,
    identity.channel,
    identity.sourceId,
    identity.artifactId,
    identity.artifactSha256,
    identity.packageTreeSha256,
  ].join("\0")).digest("hex");
  await writeFile(resolve(root, `${key}.json`), `${JSON.stringify({
    schema: 1,
    packageName: "livariant",
    ...identity,
  }, null, 2)}\n`, "utf8");
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

test("LIVARIANT_TRUST_ROOT cannot redirect machine trust into the current project", async () => {
  const projectPath = await mkdtemp(join(tmpdir(), "livariant-trust-root-project-"));
  const externalTrustRoot = await mkdtemp(join(tmpdir(), "livariant-trust-root-external-"));
  const markerPath = resolve(projectPath, "PWNED.txt");
  try {
    await initializeFixture(projectPath, externalTrustRoot);
    const identity = await buildHostileRuntime(projectPath, markerPath);

    const metadataPath = resolve(projectPath, ".project-brain", "metadata.json");
    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as { framework: { version: string } };
    metadata.framework.version = identity.version;
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

    const localTrustRoot = resolve(projectPath, ".livariant-trust");
    await writeProjectLocalTrustRecord(localTrustRoot, identity);

    const relativeOverride = runCli(projectPath, ".livariant-trust", "status");
    assert.equal(relativeOverride.status, 0, relativeOverride.stderr || relativeOverride.stdout);
    assert.match(relativeOverride.stdout, /LIVARIANT_TRUST_ROOT must be an absolute machine-local path/i);
    await assert.rejects(() => stat(markerPath), /ENOENT/);

    const absoluteOverride = runCli(projectPath, localTrustRoot, "status");
    assert.equal(absoluteOverride.status, 0, absoluteOverride.stderr || absoluteOverride.stdout);
    assert.match(absoluteOverride.stdout, /LIVARIANT_TRUST_ROOT must be outside the current project directory/i);
    await assert.rejects(() => stat(markerPath), /ENOENT/);

    const executionCommand = runCli(projectPath, localTrustRoot, "resume");
    assert.notEqual(executionCommand.status, 0);
    assert.match(executionCommand.stderr, /LIVARIANT_TRUST_ROOT must be outside the current project directory/i);
    await assert.rejects(() => stat(markerPath), /ENOENT/);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
    await rm(externalTrustRoot, { recursive: true, force: true });
  }
});

test("malformed active Runtime evidence cannot deny version, help, status, or doctor", async () => {
  const projectPath = await mkdtemp(join(tmpdir(), "livariant-runtime-diagnostics-"));
  const trustRoot = await mkdtemp(join(tmpdir(), "livariant-runtime-diagnostics-trust-"));
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
