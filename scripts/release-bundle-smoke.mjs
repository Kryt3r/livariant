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
const sourceSha = "1111111111111111111111111111111111111111";
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

function digest(path) {
  return readFile(path).then((bytes) => createHash("sha256").update(bytes).digest("hex"));
}

try {
  await mkdir(consumer, { recursive: true });
  const built = run(process.execPath, [
    "scripts/build-release-bundle.mjs",
    "--source-id", sourceId,
    "--source-sha", sourceSha,
    "--channel", "preview",
    "--schema", "1",
    "--compatible-from", "0.1.0-rc.1,0.1.0-rc.2",
    "--output", bundle,
  ]);
  const summary = JSON.parse(built.stdout);
  if (summary.package !== "livariant") throw new Error("Release bundle did not pack the Livariant package identity.");
  if (summary.version !== expectedVersion) throw new Error("Release bundle package version mismatch.");
  if (summary.sourceId !== sourceId || summary.sourceSha !== sourceSha) throw new Error("Release bundle source identity mismatch.");

  const manifest = JSON.parse(await readFile(resolve(bundle, "release-manifest.json"), "utf8"));
  const release = manifest?.[0];
  if (!release) throw new Error("Release manifest contains no release descriptor.");
  if (release.sourceId !== sourceId || release.sourceSha !== sourceSha) throw new Error("Manifest source identity is not exact-source bound.");
  if (release.version !== expectedVersion || release.channel !== "preview") throw new Error("Manifest release identity mismatch.");
  if (release.projectBrainSchema !== 1 || !release.compatibility?.from?.includes("0.1.0-rc.1") || !release.compatibility?.from?.includes("0.1.0-rc.2")) {
    throw new Error("Manifest compatibility metadata mismatch.");
  }

  const artifactPath = resolve(bundle, summary.artifact);
  const observedSha = await digest(artifactPath);
  if (release.artifact?.id !== "runtime-node-cli" || release.artifact?.filename !== summary.artifact) throw new Error("Manifest runtime artifact identity mismatch.");
  if (release.artifact?.sha256 !== observedSha || summary.sha256 !== observedSha) throw new Error("Release manifest digest does not bind the packed runtime artifact bytes.");

  const protectedBootstrap = release.protectedBootstrap;
  if (protectedBootstrap?.schemaVersion !== 1 || protectedBootstrap?.authorityIssued !== false) throw new Error("Protected bootstrap manifest metadata is invalid.");
  if (protectedBootstrap.archive?.id !== "protected-guardian-bootstrap-source") throw new Error("Protected bootstrap archive identity is invalid.");
  const protectedArchive = resolve(bundle, protectedBootstrap.archive.filename);
  if (await digest(protectedArchive) !== protectedBootstrap.archive.sha256) throw new Error("Protected bootstrap archive digest mismatch.");

  for (const platform of ["win32", "linux"]) {
    const installer = protectedBootstrap.installers?.[platform];
    if (!installer?.filename || !/^[a-f0-9]{64}$/.test(installer.sha256)) throw new Error(`Protected bootstrap ${platform} installer metadata is invalid.`);
    const path = resolve(bundle, installer.filename);
    if (await digest(path) !== installer.sha256) throw new Error(`Protected bootstrap ${platform} installer digest mismatch.`);
    const source = await readFile(path, "utf8");
    if (!source.includes(sourceSha) || !source.includes(protectedBootstrap.archive.sha256)) throw new Error(`Protected bootstrap ${platform} installer is not bound to exact source/archive identity.`);
  }

  const windowsInstallerSource = await readFile(resolve(bundle, protectedBootstrap.installers.win32.filename), "utf8");
  if (!windowsInstallerSource.includes("C:\\Program Files\\Livariant\\Bootstrap\\v1")) throw new Error("Windows installer does not target the fixed protected bootstrap source root.");
  if (/Start-Process[^\n]*-Verb\s+RunAs/i.test(windowsInstallerSource)) throw new Error("Windows Stage-A installer must not initiate UAC elevation itself.");
  const linuxInstallerSource = await readFile(resolve(bundle, protectedBootstrap.installers.linux.filename), "utf8");
  if (!linuxInstallerSource.includes("/opt/livariant/bootstrap/v1")) throw new Error("Linux installer does not target the fixed protected bootstrap source root.");
  // Security prose may explicitly mention sudo/pkexec to say they are *not* invoked.
  // Reject only executable command-shaped use, matching the dedicated installer contract tests.
  if (/(^|[;&|()]\s*)sudo\s/m.test(linuxInstallerSource) || /(^|[;&|()]\s*)pkexec\s/m.test(linuxInstallerSource)) {
    throw new Error("Linux Stage-A installer must not initiate privilege elevation itself.");
  }

  const sums = await readFile(resolve(bundle, "SHA256SUMS"), "utf8");
  if (sums !== `${observedSha}  ${summary.artifact}\n`) throw new Error("SHA256SUMS no longer preserves the runtime package checksum contract.");
  const protectedSums = await readFile(resolve(bundle, "PROTECTED-SHA256SUMS"), "utf8");
  const expectedProtectedChecksums = [
    [protectedBootstrap.archive.sha256, protectedBootstrap.archive.filename],
    [protectedBootstrap.installers.win32.sha256, protectedBootstrap.installers.win32.filename],
    [protectedBootstrap.installers.linux.sha256, protectedBootstrap.installers.linux.filename],
  ].sort((a, b) => a[1].localeCompare(b[1])).map(([hash, filename]) => `${hash}  ${filename}`).join("\n") + "\n";
  if (protectedSums !== expectedProtectedChecksums) throw new Error("PROTECTED-SHA256SUMS does not bind the complete Stage-A release asset set.");

  const protectedAssets = JSON.parse(await readFile(resolve(bundle, "protected-bootstrap-assets.json"), "utf8"));
  if (protectedAssets.sourceSha !== sourceSha || protectedAssets.version !== expectedVersion || protectedAssets.authorityIssued !== false) {
    throw new Error("Protected bootstrap asset evidence is not exact-release bound or changed the Authority boundary.");
  }

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

  console.log(`Release bundle smoke passed for Livariant ${expectedVersion}: runtime and protected-bootstrap assets are exact-source bound, separately checksum-bound, and preserve the no-Authority Stage-A boundary.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
