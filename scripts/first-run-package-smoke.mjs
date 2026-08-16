import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const temp = await mkdtemp(resolve(tmpdir(), "livariant-first-run-package-smoke-"));

function npmInvocation(args) {
  return process.platform === "win32"
    ? { command: process.execPath, args: [resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args] }
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
  const installHost = resolve(temp, "install-host");
  const projectDir = resolve(temp, "project");
  const secondBrain = resolve(temp, "second-brain");
  await mkdir(packDir, { recursive: true });
  await mkdir(installHost, { recursive: true });
  await mkdir(projectDir, { recursive: true });
  await mkdir(secondBrain, { recursive: true });

  const packed = runNpm(["pack", "--json", "--pack-destination", packDir]);
  const packResult = JSON.parse(packed.stdout);
  const filename = packResult?.[0]?.filename;
  if (typeof filename !== "string") throw new Error("npm pack did not return a package filename");
  const entries = packResult[0]?.files?.map((file) => file.path) ?? [];
  if (!entries.includes("dist/src/cli/first-run-command.js")) {
    throw new Error("Packed artifact is missing dist/src/cli/first-run-command.js");
  }

  await writeFile(resolve(installHost, "package.json"), JSON.stringify({ name: "first-run-install-host", private: true }), "utf8");
  runNpm(["install", "--ignore-scripts", resolve(packDir, filename)], { cwd: installHost });

  await writeFile(resolve(projectDir, "package.json"), JSON.stringify({ name: "first-run-package", dependencies: { react: "1.0.0" } }), "utf8");
  await writeFile(resolve(projectDir, "README.md"), "# First-run package smoke\n", "utf8");
  await writeFile(resolve(secondBrain, "notes.md"), "Existing external project notes.\n", "utf8");
  const before = (await readdir(projectDir)).sort();

  const cliPath = resolve(installHost, "node_modules", "livariant", "dist", "src", "cli", "index.js");
  const result = run(process.execPath, [
    cliPath,
    "first-run",
    "--language", "Deutsch",
    "--external-source-type", "local-directory",
    "--external-source", secondBrain,
    "--provider", "codex",
    "--json",
  ], { cwd: projectDir, env: { PBF_RUNTIME_DELEGATION_BYPASS: "1" } });

  const report = JSON.parse(result.stdout.trim());
  if (report.preferredLanguage !== "Deutsch") throw new Error("Installed first-run lost the language preference");
  if (report.boundaries?.changesMade !== 0 || report.boundaries?.mutationAuthorized !== false) {
    throw new Error(`Installed first-run returned unsafe mutation boundaries:\n${result.stdout}`);
  }
  if (report.understanding?.externalEvidence?.length !== 1) {
    throw new Error(`Installed first-run did not compose external evidence:\n${result.stdout}`);
  }
  if (report.understanding?.candidateEvidence?.length !== 0) {
    throw new Error("Installed first-run manufactured candidate evidence from raw discovery/external material");
  }
  const provider = report.nextActions?.find((item) => item.id === "configure-provider");
  if (
    provider?.command !== "livariant mcp setup --provider codex" ||
    provider?.changesProject !== false ||
    provider?.requiresSeparateAuthorization !== false ||
    !/no provider-configuration write/i.test(provider?.purpose ?? "")
  ) {
    throw new Error("Installed first-run misreported the zero-write MCP setup guidance boundary");
  }

  const after = (await readdir(projectDir)).sort();
  if (JSON.stringify(before) !== JSON.stringify(after) || after.includes(".project-brain")) {
    throw new Error("Installed first-run mutated the inspected project");
  }

  console.log("First-run package smoke passed: installed package composes language, project discovery, optional external evidence, and zero-write provider guidance without mutation or authority escalation.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
