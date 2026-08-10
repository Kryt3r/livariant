import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = process.cwd();
const temp = await mkdtemp(resolve(tmpdir(), "livariant-release-bundle-"));
const bundle = resolve(temp, "bundle");
const consumer = resolve(temp, "consumer");
const sourceId = "github:Kryt3r/livariant";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, ...(options.env ?? {}) },
  });
  if (result.status !== 0) {
    throw new Error([`${command} ${args.join(" ")} failed with exit ${result.status}`, result.stdout, result.stderr].filter(Boolean).join("\n"));
  }
  return result;
}

try {
  await mkdir(consumer, { recursive: true });
  const built = run(process.execPath, [
    "scripts/build-release-bundle.mjs",
    "--source-id", sourceId,
    "--channel", "development",
    "--schema", "1",
    "--compatible-from", "0.0.0-development",
    "--output", bundle,
  ]);
  const summary = JSON.parse(built.stdout);
  if (summary.package !== "livariant") throw new Error("Release bundle did not pack the Livariant package identity.");
  if (summary.sourceId !== sourceId) throw new Error("Release bundle source identity mismatch.");

  const manifest = JSON.parse(await readFile(resolve(bundle, "release-manifest.json"), "utf8"));
  const release = manifest?.[0];
  if (!release) throw new Error("Release manifest contains no release descriptor.");
  if (release.sourceId !== sourceId) throw new Error("Manifest sourceId is not the requested canonical source identity.");
  if (release.version !== "0.0.0-development" || release.channel !== "development") throw new Error("Manifest release identity mismatch.");
  if (release.projectBrainSchema !== 1 || !release.compatibility?.from?.includes("0.0.0-development")) throw new Error("Manifest compatibility metadata mismatch.");

  const artifactPath = resolve(bundle, summary.artifact);
  const observedSha = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
  if (release.artifact?.id !== "runtime-node-cli") throw new Error("Manifest artifact identity mismatch.");
  if (release.artifact?.sha256 !== observedSha || summary.sha256 !== observedSha) throw new Error("Release manifest digest does not bind the packed artifact bytes.");

  const sums = await readFile(resolve(bundle, "SHA256SUMS"), "utf8");
  if (sums !== `${observedSha}  ${summary.artifact}\n`) throw new Error("SHA256SUMS does not match the packed artifact.");

  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  run(npm, ["init", "-y"], { cwd: consumer });
  run(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund", artifactPath], { cwd: consumer });
  const bin = process.platform === "win32"
    ? resolve(consumer, "node_modules", ".bin", "livariant.cmd")
    : resolve(consumer, "node_modules", ".bin", "livariant");
  const versionResult = run(bin, ["version", "--json"], { cwd: consumer });
  let version;
  try {
    version = JSON.parse(versionResult.stdout);
  } catch {
    throw new Error(`Release-bundle consumer returned invalid machine-readable version identity:\n${versionResult.stdout}\n${versionResult.stderr}`);
  }
  if (version.frameworkVersion !== "0.0.0-development" || version.runtime !== "node" || version.channel !== "development") {
    throw new Error(`Release-bundle consumer identity mismatch: ${JSON.stringify(version)}`);
  }

  console.log("Release bundle smoke passed: exact packed bytes are manifest-bound, checksum-bound, installable, and executable under the canonical Livariant CLI identity.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
