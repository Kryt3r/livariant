import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function runNpm(args) {
  const result = process.platform === "win32"
    ? spawnSync(
        process.execPath,
        [resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args],
        { cwd: root, encoding: "utf8", shell: false },
      )
    : spawnSync("npm", args, { cwd: root, encoding: "utf8", shell: false });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`npm ${args.join(" ")} failed: ${detail}`);
  }
  return result;
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`node ${args.join(" ")} failed: ${detail}`);
  }
  return result;
}

const sourceId = option("--source-id");
const sourceSha = option("--source-sha");
const channel = option("--channel");
const schemaRaw = option("--schema");
const compatibleRaw = option("--compatible-from");
const outputRaw = option("--output") ?? "release-bundle";

if (!sourceId || !/^github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(sourceId)) throw new Error("--source-id must use the canonical GitHub source form: github:<owner>/<repository>.");
if (!sourceSha || !/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error("--source-sha must be an exact 40-character lowercase Git commit SHA.");
if (!channel || !["stable", "preview", "development"].includes(channel)) throw new Error("--channel must be stable, preview, or development.");
const schema = Number(schemaRaw);
if (!Number.isInteger(schema) || schema < 1) throw new Error("--schema must be a positive integer.");
const compatibleFrom = compatibleRaw?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
if (compatibleFrom.length === 0) throw new Error("--compatible-from must contain at least one source version.");

const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (packageJson.name !== "livariant") throw new Error(`Release bundle expected package name 'livariant', observed '${packageJson.name}'.`);
if (typeof packageJson.version !== "string" || packageJson.version.length === 0) throw new Error("Package version is missing.");

const output = resolve(root, outputRaw);
await mkdir(output, { recursive: false });

const packed = runNpm(["pack", "--json", "--pack-destination", output]);
const result = JSON.parse(packed.stdout);
const entry = result?.[0];
if (!entry || typeof entry.filename !== "string") throw new Error("npm pack did not return a package filename.");
if (entry.name !== "livariant") throw new Error(`Packed package identity mismatch: ${String(entry.name)}.`);
if (entry.version !== packageJson.version) throw new Error(`Packed package version mismatch: ${String(entry.version)}.`);

const artifactPath = resolve(output, entry.filename);
const sha256 = createHash("sha256").update(await readFile(artifactPath)).digest("hex");
const protectedBuild = runNode([
  "scripts/build-protected-bootstrap-assets.mjs",
  "--source-id", sourceId,
  "--source-sha", sourceSha,
  "--channel", channel,
  "--output", outputRaw,
]);
const protectedAssets = JSON.parse(protectedBuild.stdout);
if (protectedAssets.version !== packageJson.version || protectedAssets.sourceId !== sourceId || protectedAssets.sourceSha !== sourceSha || protectedAssets.channel !== channel) {
  throw new Error("Protected bootstrap assets are not bound to the requested release identity.");
}
if (protectedAssets.authorityIssued !== false) throw new Error("Protected bootstrap asset build must not issue Authority.");

const manifest = [{
  version: packageJson.version,
  channel,
  projectBrainSchema: schema,
  compatibility: { from: compatibleFrom },
  sourceId,
  sourceSha,
  artifact: {
    id: "runtime-node-cli",
    filename: entry.filename,
    sha256,
  },
  protectedBootstrap: {
    schemaVersion: 1,
    archive: {
      id: "protected-guardian-bootstrap-source",
      filename: protectedAssets.archive.filename,
      sha256: protectedAssets.archive.sha256,
    },
    installers: protectedAssets.installers,
    authorityIssued: false,
  },
}];

const checksumEntries = [
  [sha256, entry.filename],
  [protectedAssets.archive.sha256, protectedAssets.archive.filename],
  [protectedAssets.installers.win32.sha256, protectedAssets.installers.win32.filename],
  [protectedAssets.installers.linux.sha256, protectedAssets.installers.linux.filename],
].sort((a, b) => a[1].localeCompare(b[1]));

await writeFile(resolve(output, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(resolve(output, "SHA256SUMS"), `${checksumEntries.map(([digest, filename]) => `${digest}  ${filename}`).join("\n")}\n`, "utf8");

console.log(JSON.stringify({
  package: entry.name,
  version: entry.version,
  sourceId,
  sourceSha,
  channel,
  projectBrainSchema: schema,
  compatibleFrom,
  artifact: entry.filename,
  sha256,
  protectedBootstrap: protectedAssets,
  manifest: "release-manifest.json",
  checksums: "SHA256SUMS",
}, null, 2));
