import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const temp = await mkdtemp(resolve(tmpdir(), "livariant-release-bundle-"));
const bundle = resolve(temp, "bundle");
const consumer = resolve(temp, "consumer");
const sourceId = "github:Kryt3r/livariant";
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const expectedVersion = packageJson.version;

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
    shell: false,
    env: { ...process.env, ...(options.env ?? {}) },
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
  await mkdir(consumer, { recursive: true });
  const built = run(process.execPath, [
    "scripts/build-release-bundle.mjs",
    "--source-id", sourceId,
    "--channel", "preview",
    "--schema", "1",
    "--compatible-from", "0.1.0-rc.1,0.1.0-rc.2",
    "--output", bundle,
  ]);
  const summary = JSON.parse(built.stdout);
  if (summary.package !== "livariant") throw new Error("Release bundle did not pack the Livariant package identity.");
  if (summary.version !== expectedVersion) throw new Error("Release bundle package version mismatch.");
  if (summary.sourceId !== sourceId) throw new Error("Release bundle source identity mismatch.");

  const manifest = JSON.parse(await readFile(resolve(bundle, "release-manifest.json"), "utf8"));
  const release = manifest?.[0];
  if (!release) throw new Error("Release manifest contains no release descriptor.");
  if (release.sourceId !== sourceId) throw new Error("Manifest sourceId is not the requested canonical source identity.");
  if (release.version !== expectedVersion || release.channel !== "preview") throw new Error("Manifest release identity mismatch.");
  if (release.projectBrainSchema !== 1 || !release.compatibility?.from?.includes("0.1.0-rc.1") || !release.compatibility?.from?.includes("0.1.0-rc.2")) {
    throw new Error("Manifest compatibility metadata mismatch.");
  }

  const artifactPath = resolve(bundle, summary.artifact);
  const observedSha = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
  if (release.artifact?.id !== "runtime-node-cli") throw new Error("Manifest artifact identity mismatch.");
  if (release.artifact?.sha256 !== observedSha || summary.sha256 !== observedSha) throw new Error("Release manifest digest does not bind the packed artifact bytes.");

  const sums = await readFile(resolve(bundle, "SHA256SUMS"), "utf8");
  if (sums !== `${observedSha}  ${summary.artifact}\n`) throw new Error("SHA256SUMS does not match the packed artifact.");

  runNpm(["init", "-y"], { cwd: consumer });
  runNpm(["install", "--ignore-scripts", "--no-audit", "--no-fund", artifactPath], { cwd: consumer });
  const cliPath = resolve(consumer, "node_modules", "livariant", "dist", "src", "cli", "index.js");
  const versionResult = run(process.execPath, [cliPath, "version", "--json"], { cwd: consumer });
  let version;
  try {
    version = JSON.parse(versionResult.stdout);
  } catch {
    throw new Error(`Release-bundle consumer returned invalid machine-readable version identity:\n${versionResult.stdout}\n${versionResult.stderr}`);
  }
  if (version.frameworkVersion !== expectedVersion || version.runtime !== "node" || version.channel !== "preview") {
    throw new Error(`Release-bundle consumer identity mismatch: ${JSON.stringify(version)}`);
  }

  console.log(`Release bundle smoke passed for Livariant ${expectedVersion}: exact packed bytes are manifest-bound, checksum-bound, installable, and executable under the canonical Livariant CLI identity.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
