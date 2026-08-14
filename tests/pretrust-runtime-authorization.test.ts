import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { initializeProject } from "../src/runtime/index.js";
import { makeLegacySchema1Project } from "./legacy-schema1-fixture.js";
import { NORMAL_TARGET_VERSION, TEST_SOURCE_CHANNEL, TEST_SOURCE_VERSION } from "./release-test-baseline.js";
import { provisionArtifactAuthorizationForTest } from "./runtime-package-fixture.js";

const cliPath = fileURLToPath(new URL("../src/cli/index.js", import.meta.url));

function run(projectPath: string, args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectPath,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
}

function npmPack(packageRoot: string, packRoot: string): string {
  const args = ["pack", "--json", "--pack-destination", packRoot];
  const result = process.platform === "win32"
    ? spawnSync(
        process.execPath,
        [resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args],
        { cwd: packageRoot, encoding: "utf8", shell: false },
      )
    : spawnSync("npm", args, { cwd: packageRoot, encoding: "utf8", shell: false });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout) as Array<{ filename: string }>;
  return resolve(packRoot, parsed[0]!.filename);
}

test("project-supplied Runtime cannot create its own machine release authority before execution", async () => {
  const projectPath = await mkdtemp(resolve(tmpdir(), "livariant-pretrust-"));
  const packageRoot = resolve(projectPath, "hostile-package");
  const packRoot = resolve(projectPath, "pack");
  const markerPath = resolve(projectPath, "PWNED.txt");
  const sourceId = "hostile-project-source";
  const artifactId = "runtime-node-cli";
  try {
    await initializeProject(projectPath, { authorized: true });
    await makeLegacySchema1Project(projectPath);
    await mkdir(resolve(packageRoot, "dist", "src", "cli"), { recursive: true });
    await mkdir(packRoot, { recursive: true });
    await writeFile(resolve(packageRoot, "package.json"), `${JSON.stringify({
      name: "livariant",
      version: NORMAL_TARGET_VERSION,
      type: "module",
      files: ["dist/src"],
    }, null, 2)}\n`, "utf8");
    await writeFile(resolve(packageRoot, "dist", "src", "cli", "index.js"), [
      'import { writeFileSync } from "node:fs";',
      `writeFileSync(${JSON.stringify(markerPath)}, "executed\\n", { flag: "a" });`,
      `console.log(JSON.stringify({ frameworkVersion: ${JSON.stringify(NORMAL_TARGET_VERSION)}, runtime: "node", channel: ${JSON.stringify(TEST_SOURCE_CHANNEL)} }));`,
      "",
    ].join("\n"), "utf8");

    const artifactPath = npmPack(packageRoot, packRoot);
    const sha256 = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
    const manifestPath = resolve(projectPath, "release-manifest.json");
    await writeFile(manifestPath, `${JSON.stringify([{
      version: NORMAL_TARGET_VERSION,
      channel: TEST_SOURCE_CHANNEL,
      projectBrainSchema: 1,
      compatibility: { from: [TEST_SOURCE_VERSION] },
      sourceId,
      artifact: { id: artifactId, sha256 },
    }], null, 2)}\n`, "utf8");

    const blocked = run(projectPath, ["update", "--manifest", manifestPath, "--apply", "--artifact", artifactPath, "--trusted-source", sourceId]);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /not independently authorized|independent machine-local release process/i);
    await assert.rejects(() => stat(markerPath), /ENOENT/);

    const selfAuthorize = run(projectPath, [
      "authorize-runtime",
      "--version", NORMAL_TARGET_VERSION,
      "--channel", TEST_SOURCE_CHANNEL,
      "--source", sourceId,
      "--artifact-id", artifactId,
      "--sha256", sha256,
      "--apply",
    ]);
    assert.notEqual(selfAuthorize.status, 0);
    assert.match(selfAuthorize.stderr, /unknown command/i);
    await assert.rejects(() => stat(markerPath), /ENOENT/);

    const stillBlocked = run(projectPath, ["update", "--manifest", manifestPath, "--apply", "--artifact", artifactPath, "--trusted-source", sourceId]);
    assert.notEqual(stillBlocked.status, 0);
    await assert.rejects(() => stat(markerPath), /ENOENT/);

    await provisionArtifactAuthorizationForTest(sha256);

    const applied = run(projectPath, ["update", "--manifest", manifestPath, "--apply", "--artifact", artifactPath, "--trusted-source", sourceId]);
    assert.equal(applied.status, 0, applied.stderr || applied.stdout);
    assert.match(await readFile(markerPath, "utf8"), /executed/);
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
});
