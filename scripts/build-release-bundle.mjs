import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

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
    ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm", ...args], {
        cwd: root,
        encoding: "utf8",
        shell: false,
      })
    : spawnSync("npm", args, {
        cwd: root,
        encoding: "utf8",
        shell: false,
      });

  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`npm ${args.join(" ")} failed: ${detail}`);
  }
  return result;
}

const sourceId = option("--source-id");
const channel = option("--channel");
const schemaRaw = option("--schema");
const compatibleRaw = option("--compatible-from");
const outputRaw = option("--output") ?? "release-bundle";

if (!sourceId || !/^github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(sourceId)) {
  throw new Error("--source-id must use the canonical GitHub source form: github:<owner>/<repository>.");
}
if (!channel || !["stable", "preview", "development"].includes(channel)) {
  throw new Error("--channel must be stable, preview, or development.");
}
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
const manifest = [{
  version: packageJson.version,
  channel,
  projectBrainSchema: schema,
  compatibility: { from: compatibleFrom },
  sourceId,
  artifact: {
    id: "runtime-node-cli",
    sha256,
  },
}];

await writeFile(resolve(output, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(resolve(output, "SHA256SUMS"), `${sha256}  ${entry.filename}\n`, "utf8");

console.log(JSON.stringify({
  package: entry.name,
  version: entry.version,
  sourceId,
  channel,
  projectBrainSchema: schema,
  compatibleFrom,
  artifact: entry.filename,
  sha256,
  manifest: "release-manifest.json",
  checksums: "SHA256SUMS",
}, null, 2));
