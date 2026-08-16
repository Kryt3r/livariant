import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const temp = await mkdtemp(resolve(tmpdir(), "livariant-discovery-package-smoke-"));

function npmInvocation(args) {
  return process.platform === "win32"
    ? {
        command: process.execPath,
        args: [resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args],
      }
    : { command: "npm", args };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
    shell: false,
  });
  if (result.error || result.status !== 0) {
    throw new Error([
      `${command} ${args.join(" ")} failed with exit ${String(result.status)}`,
      result.error?.message,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join("\n"));
  }
  return result;
}

function runNpm(args, options = {}) {
  const invocation = npmInvocation(args);
  return run(invocation.command, invocation.args, options);
}

try {
  const packDir = resolve(temp, "pack");
  const installDir = resolve(temp, "project");
  await mkdir(packDir, { recursive: true });
  await mkdir(installDir, { recursive: true });

  const packed = runNpm(["pack", "--json", "--pack-destination", packDir]);
  const packResult = JSON.parse(packed.stdout);
  const filename = packResult?.[0]?.filename;
  if (typeof filename !== "string") throw new Error("npm pack did not return a package filename");
  const entries = packResult[0]?.files?.map((file) => file.path) ?? [];
  for (const required of [
    "dist/src/cli/discover-command.js",
    "dist/src/project/bootstrap-discovery.js",
    "dist/src/runtime/initialization.js",
  ]) {
    if (!entries.includes(required)) throw new Error(`Packed artifact is missing discovery runtime file: ${required}`);
  }

  await writeFile(resolve(installDir, "package.json"), JSON.stringify({
    name: "installed-discovery-smoke",
    dependencies: { react: "1.0.0" },
  }), "utf8");
  await writeFile(resolve(installDir, "README.md"), "# Installed discovery smoke\n", "utf8");
  await writeFile(resolve(installDir, ".env"), "TOKEN=PACKAGE_SMOKE_SECRET\n", "utf8");

  const tarball = resolve(packDir, filename);
  runNpm(["install", "--ignore-scripts", tarball], { cwd: installDir });
  const cliPath = resolve(installDir, "node_modules", "livariant", "dist", "src", "cli", "index.js");
  const result = run(process.execPath, [cliPath, "discover", "--json"], {
    cwd: installDir,
    env: { PBF_RUNTIME_DELEGATION_BYPASS: "1" },
  });
  const report = JSON.parse(result.stdout.trim());
  if (report.changesMade !== 0 || report.projectShape !== "existing") {
    throw new Error(`Installed discover returned unexpected state:\n${result.stdout}`);
  }
  if (!report.evidence?.some((item) => item.kind === "documentation" && item.provenance === "README.md")) {
    throw new Error(`Installed discover did not report README provenance:\n${result.stdout}`);
  }
  if (!report.evidence?.some((item) => item.kind === "stack" && item.value === "React")) {
    throw new Error(`Installed discover did not report package stack evidence:\n${result.stdout}`);
  }
  if (!report.attention?.some((item) => item.code === "discovery-sensitive-file-present")) {
    throw new Error(`Installed discover did not report sensitive-file presence:\n${result.stdout}`);
  }
  if (result.stdout.includes("PACKAGE_SMOKE_SECRET")) {
    throw new Error("Installed discover exposed sensitive file contents");
  }

  const entriesAfter = await import("node:fs/promises").then(({ readdir }) => readdir(installDir));
  if (entriesAfter.includes(".project-brain")) {
    throw new Error("Installed discover mutated the project by creating Project Brain state");
  }

  const installedPackage = JSON.parse(await readFile(resolve(installDir, "node_modules", "livariant", "package.json"), "utf8"));
  console.log(`Discovery package smoke passed for Livariant ${installedPackage.version}: packaged discover command returned structured evidence with zero project mutation.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
