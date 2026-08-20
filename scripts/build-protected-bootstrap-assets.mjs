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

function windowsInstaller({ version, sourceSha, archive, archiveSha256 }) {
  return `param(
  [string]$ArchivePath = (Join-Path $PSScriptRoot '${archive}'),
  [switch]$Replace
)
$ErrorActionPreference = 'Stop'
$ExpectedVersion = '${version}'
$ExpectedSourceSha = '${sourceSha}'
$ExpectedArchiveSha256 = '${archiveSha256}'
$Target = 'C:\\Program Files\\Livariant\\Bootstrap\\v1'
$BootstrapParent = 'C:\\Program Files\\Livariant\\Bootstrap'
$LivariantProgramFiles = 'C:\\Program Files\\Livariant'
$GuardianParent = 'C:\\ProgramData\\Livariant\\Guardian'
$LivariantProgramData = 'C:\\ProgramData\\Livariant'
$Icacls = 'C:\\Windows\\System32\\icacls.exe'
$Tar = 'C:\\Windows\\System32\\tar.exe'

function Assert-Administrator {
  $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Livariant Stage-A installation requires an already elevated Administrator terminal. The installer does not initiate UAC elevation.'
  }
}

function Assert-RealDirectory([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Container)) { throw "Required directory is missing: $Path" }
  $item = Get-Item -LiteralPath $Path -Force
  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Directory must not be a reparse point: $Path" }
}

function Ensure-RealDirectory([string]$Path) {
  if (Test-Path -LiteralPath $Path) { Assert-RealDirectory $Path; return }
  New-Item -ItemType Directory -Path $Path | Out-Null
  Assert-RealDirectory $Path
}

function Harden-LivariantTree([string]$Path) {
  & $Icacls $Path '/inheritance:r' '/grant:r' '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' '/T' '/C' '/Q' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Failed to harden ACLs for $Path" }
  & $Icacls $Path '/setowner' '*S-1-5-32-544' '/T' '/C' '/Q' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Failed to set protected owner for $Path" }
}

function Assert-DescriptorFiles([string]$Root) {
  $descriptorPath = Join-Path $Root 'bootstrap-release.json'
  if (-not (Test-Path -LiteralPath $descriptorPath -PathType Leaf)) { throw 'Protected bootstrap release descriptor is missing.' }
  $descriptor = Get-Content -LiteralPath $descriptorPath -Raw | ConvertFrom-Json
  if ($descriptor.schemaVersion -ne 1 -or $descriptor.kind -ne 'livariant-protected-bootstrap-release') { throw 'Protected bootstrap release descriptor schema mismatch.' }
  if ($descriptor.version -ne $ExpectedVersion -or $descriptor.sourceSha -ne $ExpectedSourceSha) { throw 'Protected bootstrap release identity mismatch.' }
  foreach ($file in $descriptor.files) {
    $relative = [string]$file.path
    if ($relative.Contains('..') -or $relative.StartsWith('/') -or $relative.Contains('\\')) { throw "Unsafe descriptor path: $relative" }
    $candidate = Join-Path $Root ($relative -replace '/', '\\')
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { throw "Protected bootstrap file is missing: $relative" }
    $item = Get-Item -LiteralPath $candidate -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Protected bootstrap file must not be a reparse point: $relative" }
    $observed = (Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($observed -ne ([string]$file.sha256).ToLowerInvariant()) { throw "Protected bootstrap file digest mismatch: $relative" }
  }
}

Assert-Administrator
if (-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)) { throw "Protected bootstrap archive is missing: $ArchivePath" }
$archiveHash = (Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($archiveHash -ne $ExpectedArchiveSha256) { throw "Protected bootstrap archive SHA-256 mismatch. Expected $ExpectedArchiveSha256, observed $archiveHash" }
if (-not (Test-Path -LiteralPath $Tar -PathType Leaf)) { throw 'Windows system tar.exe is required for Stage-A installation.' }

$temp = Join-Path ([IO.Path]::GetTempPath()) ('livariant-stage-a-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temp | Out-Null
try {
  & $Tar -xzf $ArchivePath -C $temp
  if ($LASTEXITCODE -ne 0) { throw 'Failed to extract protected bootstrap archive.' }
  $packageRoot = Join-Path $temp 'package'
  Assert-RealDirectory $packageRoot
  Assert-DescriptorFiles $packageRoot

  Ensure-RealDirectory $LivariantProgramFiles
  Ensure-RealDirectory $BootstrapParent
  if (Test-Path -LiteralPath $Target) {
    Assert-RealDirectory $Target
    if (-not $Replace) { throw "Protected bootstrap source already exists at $Target. Re-run with -Replace only for an explicit verified release transition." }
    $backup = Join-Path $BootstrapParent ('v1.previous-' + (Get-Date -Format 'yyyyMMddHHmmss'))
    Move-Item -LiteralPath $Target -Destination $backup
    Harden-LivariantTree $backup
  }
  New-Item -ItemType Directory -Path $Target | Out-Null
  Copy-Item -Path (Join-Path $packageRoot '*') -Destination $Target -Recurse -Force
  Assert-DescriptorFiles $Target
  Harden-LivariantTree $LivariantProgramFiles

  Ensure-RealDirectory $LivariantProgramData
  Ensure-RealDirectory $GuardianParent
  Harden-LivariantTree $LivariantProgramData
  Assert-DescriptorFiles $Target

  Write-Output 'Livariant protected Stage-A installation complete.'
  Write-Output "Release: $ExpectedVersion"
  Write-Output "Source SHA: $ExpectedSourceSha"
  Write-Output "Protected source: $Target"
  Write-Output "Guardian parent prepared: $GuardianParent"
  Write-Output 'Authority issued: no'
  Write-Output 'Next: close this Administrator terminal, run `livariant guardian status` from an ordinary terminal, then use the protected Stage-B launcher shown there.'
} finally {
  Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
}
`;
}

function linuxInstaller({ version, sourceSha, archive, archiveSha256 }) {
  return `#!/usr/bin/env sh
set -eu
EXPECTED_VERSION='${version}'
EXPECTED_SOURCE_SHA='${sourceSha}'
EXPECTED_ARCHIVE_SHA256='${archiveSha256}'
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ARCHIVE="$SCRIPT_DIR/${archive}"
REPLACE=0
if [ "${1:-}" = "--replace" ]; then REPLACE=1; shift; fi
if [ "$#" -gt 0 ]; then ARCHIVE="$1"; shift; fi
if [ "$#" -ne 0 ]; then echo 'usage: install-livariant-bootstrap.sh [--replace] [archive]' >&2; exit 2; fi
TARGET='/opt/livariant/bootstrap/v1'
BOOTSTRAP_PARENT='/opt/livariant/bootstrap'
LIVARIANT_OPT='/opt/livariant'
GUARDIAN_PARENT='/var/lib/livariant-guardian'

if [ "$(id -u)" -ne 0 ]; then
  echo 'Livariant Stage-A installation requires an already privileged root terminal. The installer does not initiate sudo/pkexec elevation.' >&2
  exit 1
fi
if [ ! -f "$ARCHIVE" ] || [ -L "$ARCHIVE" ]; then echo "Protected bootstrap archive is missing or unsafe: $ARCHIVE" >&2; exit 1; fi
OBSERVED=$(sha256sum "$ARCHIVE" | awk '{print $1}')
if [ "$OBSERVED" != "$EXPECTED_ARCHIVE_SHA256" ]; then
  echo "Protected bootstrap archive SHA-256 mismatch. Expected $EXPECTED_ARCHIVE_SHA256, observed $OBSERVED" >&2
  exit 1
fi
TMP=$(mktemp -d /tmp/livariant-stage-a.XXXXXX)
trap 'rm -rf "$TMP"' EXIT INT TERM

tar -xzf "$ARCHIVE" -C "$TMP"
PACKAGE_ROOT="$TMP/package"
for required in bootstrap-release.json guardian-bootstrap-entry.mjs guardian-bootstrap dist/src/guardian/bootstrap.js dist/src/guardian/protected-helper.js; do
  if [ ! -f "$PACKAGE_ROOT/$required" ] || [ -L "$PACKAGE_ROOT/$required" ]; then
    echo "Protected bootstrap archive is missing required regular file: $required" >&2
    exit 1
  fi
done

mkdir -p "$LIVARIANT_OPT" "$BOOTSTRAP_PARENT" "$GUARDIAN_PARENT"
if [ -e "$TARGET" ]; then
  if [ -L "$TARGET" ] || [ ! -d "$TARGET" ]; then echo "Existing protected bootstrap target is unsafe: $TARGET" >&2; exit 1; fi
  if [ "$REPLACE" -ne 1 ]; then
    echo "Protected bootstrap source already exists at $TARGET. Re-run with --replace only for an explicit verified release transition." >&2
    exit 1
  fi
  BACKUP="$BOOTSTRAP_PARENT/v1.previous-$(date -u +%Y%m%d%H%M%S)"
  mv "$TARGET" "$BACKUP"
  chown -R 0:0 "$BACKUP"
  find "$BACKUP" -type d -exec chmod 755 {} +
  find "$BACKUP" -type f -exec chmod 444 {} +
  [ ! -f "$BACKUP/guardian-bootstrap" ] || chmod 555 "$BACKUP/guardian-bootstrap"
fi
mkdir "$TARGET"
cp -R "$PACKAGE_ROOT/." "$TARGET/"
chown -R 0:0 "$LIVARIANT_OPT" "$GUARDIAN_PARENT"
chmod 755 "$LIVARIANT_OPT" "$BOOTSTRAP_PARENT" "$TARGET" "$GUARDIAN_PARENT"
find "$TARGET" -type d -exec chmod 755 {} +
find "$TARGET" -type f -exec chmod 444 {} +
chmod 555 "$TARGET/guardian-bootstrap"

printf '%s\n' \
  'Livariant protected Stage-A installation complete.' \
  "Release: $EXPECTED_VERSION" \
  "Source SHA: $EXPECTED_SOURCE_SHA" \
  "Protected source: $TARGET" \
  "Guardian parent prepared: $GUARDIAN_PARENT" \
  'Authority issued: no' \
  'Next: close this root terminal, run `livariant guardian status` as the ordinary user, then use the protected Stage-B launcher shown there.'
`;
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

  await writeFile(resolve(staging, "guardian-bootstrap-entry.mjs"), `import { bootstrapProductionGuardian } from "./dist/src/guardian/bootstrap.js";\ntry {\n  const result = await bootstrapProductionGuardian();\n  console.log("Livariant Guardian bootstrap");\n  console.log(\`State: \${result.state}\`);\n  console.log(\`Platform: \${result.platform}\`);\n  console.log(\`Root: \${result.root}\`);\n  console.log(\`Helper SHA-256: \${result.helperSha256}\`);\n  console.log("Authority issued: no");\n  console.log(\`Changes made: \${result.changesMade}\`);\n  console.log(\`Next: \${result.nextStep}\`);\n} catch (error) {\n  console.error(\`Runtime error: \${error instanceof Error ? error.message : String(error)}\`);\n  process.exitCode = 1;\n}\n`);
  await writeFile(resolve(staging, "guardian-bootstrap.ps1"), `$ErrorActionPreference = 'Stop'\n$Node = (Get-Command node.exe -ErrorAction Stop).Source\n& $Node (Join-Path $PSScriptRoot 'guardian-bootstrap-entry.mjs')\nexit $LASTEXITCODE\n`);
  await writeFile(resolve(staging, "guardian-bootstrap"), `#!/usr/bin/env sh\nset -eu\nROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)\nNODE=$(command -v node)\nexec "$NODE" "$ROOT/guardian-bootstrap-entry.mjs"\n`);
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
  if (!packResult || packResult.name !== "livariant-protected-bootstrap" || packResult.version !== version) {
    throw new Error("Protected bootstrap npm pack identity mismatch.");
  }
  const archive = packResult.filename;
  const archivePath = resolve(output, archive);
  const archiveSha256 = sha256(await readFile(archivePath));

  const windowsName = `install-livariant-bootstrap-${version}.ps1`;
  const linuxName = `install-livariant-bootstrap-${version}.sh`;
  await writeFile(resolve(output, windowsName), windowsInstaller({ version, sourceSha, archive, archiveSha256 }));
  await writeFile(resolve(output, linuxName), linuxInstaller({ version, sourceSha, archive, archiveSha256 }));
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
