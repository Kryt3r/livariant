import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const temp = await mkdtemp(resolve(tmpdir(), "livariant-package-smoke-"));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(" ")} failed with exit ${result.status}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join("\n"));
  }
  return result;
}

try {
  const packDir = resolve(temp, "pack");
  const installDir = resolve(temp, "install");
  await import("node:fs/promises").then(({ mkdir }) => Promise.all([
    mkdir(packDir, { recursive: true }),
    mkdir(installDir, { recursive: true }),
  ]));

  const packed = run("npm", ["pack", "--json", "--pack-destination", packDir]);
  const packResult = JSON.parse(packed.stdout);
  const filename = packResult?.[0]?.filename;
  if (typeof filename !== "string") throw new Error("npm pack did not return a package filename");
  const tarball = resolve(packDir, filename);

  const entries = packResult[0]?.files?.map((file) => file.path) ?? [];
  const required = [
    "package.json",
    "dist/src/cli/index.js",
    "dist/src/cli/lifecycle.js",
    "dist/src/runtime/index.js",
    "dist/src/lifecycle/update.js",
    "dist/src/lifecycle/recovery.js",
    "dist/src/distribution/release-integrity.js",
    "dist/src/adapters/resume-provider.js",
    "dist/src/adapters/provider-resume-adapter.js",
  ];
  for (const path of required) {
    if (!entries.includes(path)) throw new Error(`Packed artifact is missing required file: ${path}`);
  }
  if (entries.some((path) => path.startsWith("tests/") || path.startsWith("dist/tests/"))) {
    throw new Error("Packed artifact unexpectedly contains test fixtures or compiled tests");
  }

  run("npm", ["init", "-y"], { cwd: installDir });
  run("npm", ["install", "--ignore-scripts", tarball], { cwd: installDir });

  const binPath = process.platform === "win32"
    ? resolve(installDir, "node_modules", ".bin", "livariant.cmd")
    : resolve(installDir, "node_modules", ".bin", "livariant");
  const cli = run(binPath, ["version"], { cwd: installDir });
  if (!/Livariant framework version: 0\.0\.0-development/.test(cli.stdout)) {
    throw new Error(`Installed CLI returned unexpected version output:\n${cli.stdout}`);
  }
  if (!/Channel: development/.test(cli.stdout)) {
    throw new Error(`Installed CLI returned unexpected channel output:\n${cli.stdout}`);
  }

  const init = run(binPath, ["init", "--apply"], { cwd: installDir });
  if (!/Project Brain initialized:/.test(init.stdout)) {
    throw new Error(`Installed CLI did not initialize Project Brain:\n${init.stdout}`);
  }

  const resume = run(binPath, ["resume", "--provider", "codex"], {
    cwd: installDir,
    env: { LIVARIANT_PROVIDER_ENV: "codex" },
  });
  if (!/livariant\.codex\.resume@0\.1\.0-preview/.test(resume.stdout)) {
    throw new Error(`Installed CLI did not invoke the expected Codex Preview adapter:\n${resume.stdout}`);
  }
  if (!/Compatibility: compatible/.test(resume.stdout) || !/Codex Resume Projection/.test(resume.stdout)) {
    throw new Error(`Installed CLI did not produce compatible Codex resume handoff evidence:\n${resume.stdout}`);
  }
  if (!/Execution authority granted: false/.test(resume.stdout) || !/Durable instruction mutation: false/.test(resume.stdout)) {
    throw new Error("Provider adapter must not convert environment detection into mutation or execution authority");
  }

  const emptyManifest = resolve(installDir, "empty-release-manifest.json");
  await writeFile(emptyManifest, "[]\n", "utf8");
  const update = run(binPath, ["update", "--manifest", emptyManifest], { cwd: installDir });
  if (!/No compatible Livariant update is available/.test(update.stdout)) {
    throw new Error(`Installed CLI did not expose read-only update discovery:\n${update.stdout}`);
  }
  const recover = run(binPath, ["recover"], { cwd: installDir });
  if (!/No interrupted migration requires recovery/.test(recover.stdout)) {
    throw new Error(`Installed CLI did not expose read-only recovery inspection:\n${recover.stdout}`);
  }

  const installedPackage = JSON.parse(await readFile(resolve(installDir, "node_modules", "livariant", "package.json"), "utf8"));
  if (installedPackage.name !== "livariant" || installedPackage.bin?.livariant !== "./dist/src/cli/index.js") {
    throw new Error("Installed package does not expose the expected Livariant CLI identity");
  }

  console.log("Package smoke test passed: Livariant packed, installed, initialized, exposed update/recovery inspection, and produced a capability-bounded provider resume handoff.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
