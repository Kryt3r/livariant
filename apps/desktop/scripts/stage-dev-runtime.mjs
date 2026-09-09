import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(scriptDir, "..");
const repoRoot = resolve(desktopRoot, "..", "..");
const targetRoot = join(desktopRoot, "src-tauri", "target", "debug");
const runtimeRoot = join(targetRoot, "runtime");
const coreRoot = join(runtimeRoot, "core");
const coreDistRoot = join(coreRoot, "dist");
const nodeTarget = join(targetRoot, process.platform === "win32" ? "livariant-node.exe" : "livariant-node");

function run(program, args, cwd) {
  const result = spawnSync(program, args, { cwd, stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${program} ${args.join(" ")} failed with exit code ${result.status}`);
}

function capture(program, args, cwd) {
  const result = spawnSync(program, args, { cwd, encoding: "utf8", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${program} ${args.join(" ")} failed with exit code ${result.status}`);
  return result.stdout.trim();
}

function runNpm(args, cwd) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error("npm_execpath is unavailable; run Tauri development through the npm script so the bounded npm CLI path is known.");
  }
  run(process.execPath, [npmCli, ...args], cwd);
}

const rootNodeModules = join(repoRoot, "node_modules");
if (!existsSync(rootNodeModules)) {
  runNpm(["ci", "--no-audit", "--no-fund"], repoRoot);
}
runNpm(["run", "build"], repoRoot);

const sourceDir = join(repoRoot, "dist", "src");
if (!existsSync(sourceDir)) throw new Error(`Built Core source directory is missing: ${sourceDir}`);

mkdirSync(targetRoot, { recursive: true });
rmSync(runtimeRoot, { recursive: true, force: true });
mkdirSync(coreDistRoot, { recursive: true });
cpSync(sourceDir, join(coreDistRoot, "src"), { recursive: true });
cpSync(process.execPath, nodeTarget);

const rootPackage = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
writeFileSync(join(coreRoot, "package.json"), `${JSON.stringify({
  name: "livariant-bundled-core-dev",
  version: rootPackage.version,
  private: true,
  type: "module",
}, null, 2)}\n`);

const manifest = {
  schemaVersion: 1,
  coreVersion: rootPackage.version,
  coreSourceSha: capture("git", ["rev-parse", "HEAD"], repoRoot),
  nodeVersion: process.version.replace(/^v/, ""),
  developmentRuntime: true,
  authorityIssued: false,
};
writeFileSync(join(runtimeRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Staged non-authoritative Tauri dev runtime for ${manifest.coreSourceSha} using Node ${process.version}.`);
