import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function runNpm(args, cwd) {
  const result = process.platform === "win32"
    ? spawnSync(
        process.execPath,
        [resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"), ...args],
        { cwd, encoding: "utf8", shell: false },
      )
    : spawnSync("npm", args, { cwd, encoding: "utf8", shell: false });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || `exit ${String(result.status)}`;
    throw new Error(`npm ${args.join(" ")} failed: ${detail}`);
  }
  return result;
}

async function filesBelow(base, current = base) {
  const result = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = resolve(current, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Protected bootstrap staging refuses symlink: ${path}`);
    if (entry.isDirectory()) result.push(...await filesBelow(base, path));
    else if (entry.isFile()) result.push(path);
    else throw new Error(`Protected bootstrap staging contains unsupported filesystem object: ${path}`);
  }
  return result;
}

function portableRelative(base, path) {
  const rel = relative(base, path);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`)) throw new Error(`Protected bootstrap path escaped staging root: ${path}`);
  return rel.split(sep).join("/");
}

function renderTemplate(template, values) {
  let rendered = template;
  for (const [name, value] of Object.entries(values)) rendered = rendered.replaceAll(`@@${name}@@`, String(value));
  if (/@@[A-Z0-9_]+@@/.test(rendered)) throw new Error("Protected bootstrap installer template contains an unresolved placeholder.");
  return rendered;
}

const sourceId = option("--source-id");
const sourceSha = option("--source-sha");
const channel = option("--channel");
const outputRaw = option("--output");
if (!sourceId || !/^github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(sourceId)) throw new Error("--source-id must use github:<owner>/<repository>.");
if (!sourceSha || !/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error("--source-sha must be an exact 40-character lowercase Git commit SHA.");
if (!channel || !["preview", "stable", "development"].includes(channel)) throw new Error("--channel must be preview, stable, or development.");
if (!outputRaw) throw new Error("--output is required.");

const output = resolve(root, outputRaw);
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const version = packageJson.version;
if (packageJson.name !== "livariant" || typeof version !== "string") throw new Error("Protected bootstrap build requires the Livariant package identity.");

const staging = await mkdtemp(resolve(tmpdir(), "livariant-protected-bootstrap-"));
try {
  await mkdir(resolve(staging, "dist"), { recursive: true });
  await cp(resolve(root, "dist", "src"), resolve(staging, "dist", "src"), { recursive: true, errorOnExist: true });
  await writeFile(resolve(staging, "package.json"), `${JSON.stringify({
    name: "livariant-protected-bootstrap",
    version,
    private: true,
    type: "module",
    description: "Release-bound Livariant Guardian protected bootstrap source.",
    files: ["dist/src", "bootstrap-release.json", "guardian-bootstrap-entry.mjs", "guardian-bootstrap.ps1", "guardian-bootstrap"],
  }, null, 2)}\n`);

  const entry = [
    'import { bootstrapProductionGuardian } from "./dist/src/guardian/bootstrap.js";',
    "try {",
    "  const result = await bootstrapProductionGuardian();",
    '  console.log("Livariant Guardian bootstrap");',
    '  console.log(`State: ${result.state}`);',
    '  console.log(`Platform: ${result.platform}`);',
    '  console.log(`Root: ${result.root}`);',
    '  console.log(`Helper SHA-256: ${result.helperSha256}`);',
    '  console.log("Authority issued: no");',
    '  console.log(`Changes made: ${result.changesMade}`);',
    '  console.log(`Next: ${result.nextStep}`);',
    "} catch (error) {",
    '  console.error(`Runtime error: ${error instanceof Error ? error.message : String(error)}`);',
    "  process.exitCode = 1;",
    "}",
    "",
  ].join("\n");
  await writeFile(resolve(staging, "guardian-bootstrap-entry.mjs"), entry);

  // Stage B must never resolve its privileged interpreter from ambient PATH.
  // Stage A verifies these fixed OS-protected paths before this launcher is used;
  // bootstrap.ts re-verifies the same interpreter chain in-process as defense-in-depth.
  await writeFile(
    resolve(staging, "guardian-bootstrap.ps1"),
    "$ErrorActionPreference = 'Stop'\n$Node = 'C:\\Program Files\\nodejs\\node.exe'\nif (-not (Test-Path -LiteralPath $Node -PathType Leaf)) { throw 'Protected Node executable is missing. Re-run the verified Stage-A installer after installing system-wide Node.js 20+.' }\n& $Node (Join-Path $PSScriptRoot 'guardian-bootstrap-entry.mjs')\nexit $LASTEXITCODE\n",
  );
  await writeFile(
    resolve(staging, "guardian-bootstrap"),
    "#!/usr/bin/env sh\nset -eu\nROOT=$(CDPATH= cd -- \"$(dirname -- \"$0\")\" && pwd)\nNODE='/usr/bin/node'\nif [ ! -f \"$NODE\" ] || [ -L \"$NODE\" ]; then echo 'Protected Node executable is missing or redirected. Re-run the verified Stage-A installer after installing system-wide Node.js 20+.' >&2; exit 1; fi\nexec \"$NODE\" \"$ROOT/guardian-bootstrap-entry.mjs\"\n",
  );
  await chmod(resolve(staging, "guardian-bootstrap"), 0o755);

  const hashedFiles = [];
  for (const path of (await filesBelow(staging)).sort()) {
    const portable = portableRelative(staging, path);
    if (portable === "bootstrap-release.json") continue;
    hashedFiles.push({ path: portable, sha256: sha256(await readFile(path)) });
  }
  const descriptor = {
    schemaVersion: 1,
    kind: "livariant-protected-bootstrap-release",
    version,
    channel,
    sourceId,
    sourceSha,
    files: hashedFiles,
  };
  await writeFile(resolve(staging, "bootstrap-release.json"), `${JSON.stringify(descriptor, null, 2)}\n`);

  const packed = runNpm(["pack", "--json", "--ignore-scripts", "--pack-destination", output], staging);
  const packResult = JSON.parse(packed.stdout)?.[0];
  if (!packResult || packResult.name !== "livariant-protected-bootstrap" || packResult.version !== version) throw new Error("Protected bootstrap npm pack identity mismatch.");
  const archive = packResult.filename;
  const archivePath = resolve(output, archive);
  const archiveSha256 = sha256(await readFile(archivePath));

  const templateValues = {
    VERSION: version,
    SOURCE_SHA: sourceSha,
    ARCHIVE: archive,
    ARCHIVE_SHA256: archiveSha256,
  };
  const windowsTemplate = await readFile(resolve(root, "scripts", "installers", "install-livariant-bootstrap.ps1.template"), "utf8");
  const linuxTemplate = await readFile(resolve(root, "scripts", "installers", "install-livariant-bootstrap.sh.template"), "utf8");
  const windowsName = `install-livariant-bootstrap-${version}.ps1`;
  const linuxName = `install-livariant-bootstrap-${version}.sh`;
  await writeFile(resolve(output, windowsName), renderTemplate(windowsTemplate, templateValues));
  await writeFile(resolve(output, linuxName), renderTemplate(linuxTemplate, templateValues));
  await chmod(resolve(output, linuxName), 0o755);

  const assets = {
    schemaVersion: 1,
    kind: "livariant-protected-bootstrap-assets",
    version,
    channel,
    sourceId,
    sourceSha,
    archive: { filename: archive, sha256: archiveSha256 },
    installers: {
      win32: { filename: windowsName, sha256: sha256(await readFile(resolve(output, windowsName))) },
      linux: { filename: linuxName, sha256: sha256(await readFile(resolve(output, linuxName))) },
    },
    authorityIssued: false,
  };
  await writeFile(resolve(output, "protected-bootstrap-assets.json"), `${JSON.stringify(assets, null, 2)}\n`);
  console.log(JSON.stringify(assets, null, 2));
} finally {
  await rm(staging, { recursive: true, force: true });
}
