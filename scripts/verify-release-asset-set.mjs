import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, isAbsolute, resolve } from "node:path";

const args = process.argv.slice(2);
const bundleDir = resolve(process.cwd(), args[0] ?? "rc-bundle");
const expectedSourceSha = args[1];
const requireRcEvidence = args.includes("--require-rc-evidence");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assetPath(filename) {
  if (typeof filename !== "string" || filename.length === 0) throw new Error("Release asset filename is missing.");
  if (
    isAbsolute(filename) ||
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\\") ||
    basename(filename) !== filename
  ) {
    throw new Error(`Release asset filename must be a single safe bundle leaf: ${filename}`);
  }
  return resolve(bundleDir, filename);
}

async function readJson(name) {
  return JSON.parse(await readFile(assetPath(name), "utf8"));
}

async function assertDigest(filename, expected) {
  const path = assetPath(filename);
  if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) throw new Error(`Release asset digest is invalid: ${filename}`);
  const observed = sha256(await readFile(path));
  if (observed !== expected) throw new Error(`Release asset digest mismatch: ${filename}`);
}

const manifest = await readJson("release-manifest.json");
const release = manifest?.[0];
if (!release || manifest.length !== 1) throw new Error("Release asset verification requires exactly one release descriptor.");
if (typeof release.version !== "string" || !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(release.version)) {
  throw new Error("Release version is missing or not a safe SemVer-compatible release identifier.");
}
if (typeof release.sourceSha !== "string" || !/^[a-f0-9]{40}$/.test(release.sourceSha)) throw new Error("Release manifest is not exact-source bound.");
if (expectedSourceSha && release.sourceSha !== expectedSourceSha) throw new Error(`Release source SHA mismatch: expected ${expectedSourceSha}, observed ${release.sourceSha}.`);
if (release.sourceId !== "github:Kryt3r/livariant") throw new Error("Release sourceId is not canonical Livariant source.");
if (!release.artifact || release.artifact.id !== "runtime-node-cli") throw new Error("Runtime release artifact descriptor is missing.");
if (release.artifact.filename !== `livariant-${release.version}.tgz`) throw new Error("Runtime release artifact filename does not match the installable Livariant npm tarball convention.");
await assertDigest(release.artifact.filename, release.artifact.sha256);

const protectedBootstrap = release.protectedBootstrap;
if (!protectedBootstrap || protectedBootstrap.schemaVersion !== 1 || protectedBootstrap.authorityIssued !== false) {
  throw new Error("Protected bootstrap release metadata is missing or violates the no-Authority boundary.");
}
if (protectedBootstrap.archive?.id !== "protected-guardian-bootstrap-source") throw new Error("Protected bootstrap archive identity is missing.");
if (protectedBootstrap.archive.filename !== `livariant-protected-bootstrap-${release.version}.tgz`) throw new Error("Protected bootstrap archive filename does not match release version.");
await assertDigest(protectedBootstrap.archive.filename, protectedBootstrap.archive.sha256);

for (const platform of ["win32", "linux"]) {
  const installer = protectedBootstrap.installers?.[platform];
  if (!installer) throw new Error(`Protected bootstrap installer is missing for ${platform}.`);
  const expectedInstaller = platform === "win32"
    ? `install-livariant-bootstrap-${release.version}.ps1`
    : `install-livariant-bootstrap-${release.version}.sh`;
  if (installer.filename !== expectedInstaller) throw new Error(`Protected bootstrap ${platform} installer filename does not match exact release convention.`);
  await assertDigest(installer.filename, installer.sha256);
}

const runtimeSums = await readFile(assetPath("SHA256SUMS"), "utf8");
if (runtimeSums !== `${release.artifact.sha256}  ${release.artifact.filename}\n`) throw new Error("SHA256SUMS does not exactly bind the runtime install artifact.");
const protectedSums = await readFile(assetPath("PROTECTED-SHA256SUMS"), "utf8");
const expectedProtected = [
  [protectedBootstrap.archive.sha256, protectedBootstrap.archive.filename],
  [protectedBootstrap.installers.win32.sha256, protectedBootstrap.installers.win32.filename],
  [protectedBootstrap.installers.linux.sha256, protectedBootstrap.installers.linux.filename],
].sort((a, b) => a[1].localeCompare(b[1])).map(([digest, filename]) => `${digest}  ${filename}`).join("\n") + "\n";
if (protectedSums !== expectedProtected) throw new Error("PROTECTED-SHA256SUMS does not exactly bind protected Stage-A assets.");

const protectedEvidence = await readJson("protected-bootstrap-assets.json");
if (protectedEvidence.version !== release.version || protectedEvidence.sourceSha !== release.sourceSha || protectedEvidence.sourceId !== release.sourceId || protectedEvidence.authorityIssued !== false) {
  throw new Error("Protected bootstrap asset evidence does not match release identity.");
}

const requiredAssets = [
  release.artifact.filename,
  "release-manifest.json",
  "SHA256SUMS",
  protectedBootstrap.archive.filename,
  protectedBootstrap.installers.win32.filename,
  protectedBootstrap.installers.linux.filename,
  "PROTECTED-SHA256SUMS",
  "protected-bootstrap-assets.json",
];

if (requireRcEvidence) {
  const sourceCommit = (await readFile(assetPath("RC-SOURCE-COMMIT"), "utf8")).trim();
  if (sourceCommit !== release.sourceSha) throw new Error("RC-SOURCE-COMMIT does not match release source SHA.");
  const metadata = await readJson("RC-BUILD-METADATA.json");
  if (metadata.sourceSha !== release.sourceSha || metadata.version !== release.version || metadata.sha256 !== release.artifact.sha256) {
    throw new Error("RC build metadata does not match release runtime identity.");
  }
  for (const filename of [
    "RC-SOURCE-COMMIT",
    "RC-BUILD-METADATA.json",
    "release-sbom.spdx.json",
    "release-decision-dossier.json",
    "release-decision-dossier.md",
    "release-decision-evidence.json",
  ]) {
    await readFile(assetPath(filename));
    requiredAssets.push(filename);
  }
}

console.log(JSON.stringify({
  schemaVersion: 1,
  version: release.version,
  sourceSha: release.sourceSha,
  runtimeSha256: release.artifact.sha256,
  requiredAssets,
  authorityGranted: false,
  publicationAuthorized: false,
}, null, 2));
