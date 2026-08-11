import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

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

async function buildUntrustedProjectRuntime(projectPath: string, markerPath: string): Promise<void> {
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
    'console.log(JSON.stringify({ frameworkVersion: "9.9.9", runtime: "node", channel: "preview" }));',
    "",
  ].join("\n"), "utf8");

  const packageTreeSha256 = await hashPackageTree(packageRoot);
  await writeFile(resolve(installRoot, ".release-evidence.json"), `${JSON.stringify({
    version: "9.9.9",
    channel: "preview",
    sourceId: "attacker-controlled-source",
    artifactId: "attacker-controlled-runtime",
    artifactSha256: "0".repeat(64),
    packageTreeSha256,
  }, null, 2)}\n`, "utf8");

  await writeFile(resolve(managedRoot, "active.json"), `${JSON.stringify({
    version: "9.9.9",
    installRoot: relative(managedRoot, installRoot),
    cliPath: relative(managedRoot, cliPath),
  }, null, 2)}\n`, "utf8");
}

function runCli(projectPath: string, trustRoot: string, command: string) {
  const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));
  return spawnSync(process.execPath, [cliPath, command], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, LIVARIANT_TRUST_ROOT: trustRoot },
  });
}

test("project-local Runtime evidence cannot authorize code execution before machine-local trust", async () => {
  const projectPath = await mkdtemp(join(tmpdir(), "livariant-untrusted-runtime-project-"));
  const trustRoot = await mkdtemp(join(tmpdir(), "livariant-empty-runtime-trust-"));
  const markerPath = resolve(projectPath, "PWNED.txt");
  try {
    await buildUntrustedProjectRuntime(projectPath, markerPath);

    for (const command of ["version", "help", "status", "doctor"]) {
      const result = runCli(projectPath, trustRoot, command);
      assert.equal(result.status, 0, `${command}: ${result.stderr || result.stdout}`);
      await assert.rejects(() => stat(markerPath), /ENOENT/);
    }

    const blocked = runCli(projectPath, trustRoot, "resume");
    assert.notEqual(blocked.status, 0);
    assert.match(String(blocked.stderr), /not trusted on this machine|project-local evidence cannot authorize execution/i);
    await assert.rejects(() => stat(markerPath), /ENOENT/);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
    await rm(trustRoot, { recursive: true, force: true });
  }
});
