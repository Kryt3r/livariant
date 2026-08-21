import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

async function source(path: string): Promise<string> {
  return readFile(resolve(process.cwd(), path), "utf8");
}

test("Windows Stage-A installer requires existing elevation and never initiates UAC", async () => {
  const text = await source("scripts/installers/install-livariant-bootstrap.ps1.template");
  assert.match(text, /IsInRole\(\[Security\.Principal\.WindowsBuiltInRole\]::Administrator\)/);
  assert.match(text, /already elevated Administrator terminal/i);
  assert.doesNotMatch(text, /Start-Process[^\n]*-Verb\s+RunAs/i);
  assert.doesNotMatch(text, /runas\.exe/i);
  assert.match(text, /C:\\Windows\\System32\\tar\.exe/);
});

test("Windows Stage-A installer verifies release bytes and refuses implicit replacement", async () => {
  const text = await source("scripts/installers/install-livariant-bootstrap.ps1.template");
  assert.match(text, /Get-FileHash[^\n]*SHA256/i);
  assert.match(text, /Protected bootstrap archive SHA-256 mismatch/i);
  assert.match(text, /bootstrap-release\.json/);
  assert.match(text, /Protected bootstrap file digest mismatch/i);
  assert.match(text, /ReparsePoint/);
  assert.match(text, /if \(-not \$Replace\)/);
  assert.match(text, /explicit verified release transition/i);
  assert.match(text, /Authority issued: no/i);
});

test("Windows Stage-A legacy ACL recovery is explicit, fixed-path bounded, and verifies prior Livariant bytes", async () => {
  const text = await source("scripts/installers/install-livariant-bootstrap.ps1.template");
  assert.match(text, /function Repair-LegacyLivariantTreeAcl/);
  assert.match(text, /confined to the fixed Livariant bootstrap target/i);
  assert.match(text, /Repair-LegacyLivariantTreeAcl \$Target/);
  assert.match(text, /Assert-ExistingLivariantRelease \$Target/);
  assert.match(text, /sourceId -ne 'github:Kryt3r\/livariant'/);
  assert.match(text, /Existing protected bootstrap file digest mismatch after bounded ACL recovery/i);
  assert.match(text, /if \(-not \$Replace\).*explicit verified release transition/s);
  assert.doesNotMatch(text, /takeown(?:\.exe)?\b/i);
  assert.doesNotMatch(text, /\bicacls(?:\.exe)?\b/i);
});

test("Windows Stage-A verifies fixed protected Node before executing it", async () => {
  const installer = await source("scripts/installers/install-livariant-bootstrap.ps1.template");
  const builder = await source("scripts/build-protected-bootstrap-assets.mjs");
  assert.match(installer, /\$ProtectedNode = 'C:\\Program Files\\nodejs\\node\.exe'/);
  assert.match(installer, /Assert-ProtectedNodeChain/);
  assert.match(installer, /Only execute Node after its fixed filesystem origin has passed the pre-execution ACL checks/i);
  assert.doesNotMatch(installer, /Get-Command\s+node/i);
  assert.match(builder, /\$Node = 'C:\\\\Program Files\\\\nodejs\\\\node\.exe'/);
  assert.doesNotMatch(builder, /Get-Command node\.exe/i);
});

test("Windows Stage-A hardens directories and leaf files with distinct effective ACLs", async () => {
  const installer = await source("scripts/installers/install-livariant-bootstrap.ps1.template");
  assert.match(installer, /function Set-ProtectedDirectoryAcl/);
  assert.match(installer, /function Set-ProtectedFileAcl/);
  assert.match(installer, /DirectorySecurity/);
  assert.match(installer, /FileSecurity/);
  assert.match(installer, /ReadAndExecute/);
  assert.match(installer, /\[System\.IO\.Directory\]::SetAccessControl/);
  assert.match(installer, /\[System\.IO\.File\]::SetAccessControl/);
  assert.doesNotMatch(installer, /&\s*\$Icacls\b/i);
  assert.doesNotMatch(installer, /\bSet-Acl\b/i);
});

test(
  "Windows Stage-A ACL smoke preserves real leaf readability after hardening and recovers RC5 partial ACL state",
  { skip: process.platform !== "win32" },
  () => {
    const powershell = resolve(
      process.env.SystemRoot ?? "C:\\Windows",
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    );
    const script = resolve(process.cwd(), "scripts", "windows-stage-a-acl-smoke.ps1");
    const result = spawnSync(powershell, ["-NoProfile", "-NonInteractive", "-File", script], {
      encoding: "utf8",
    });
    assert.equal(
      result.status,
      0,
      `Windows Stage-A ACL smoke failed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
    assert.match(result.stdout, /bounded RC5 partial-state recovery restores protected leaf access/i);
  },
);

test("Linux Stage-A installer requires existing root privilege and never initiates elevation", async () => {
  const text = await source("scripts/installers/install-livariant-bootstrap.sh.template");
  assert.match(text, /id -u/);
  assert.match(text, /already privileged root terminal/i);
  assert.doesNotMatch(text, /(^|[;&|()]\s*)sudo\s/m);
  assert.doesNotMatch(text, /(^|[;&|()]\s*)pkexec\s/m);
  assert.match(text, /sha256sum/);
  assert.match(text, /Protected bootstrap archive SHA-256 mismatch/i);
  assert.match(text, /--replace/);
  assert.match(text, /Authority issued: no/i);
});

test("Linux Stage-A sanitizes PATH and verifies fixed protected Node before executing it", async () => {
  const installer = await source("scripts/installers/install-livariant-bootstrap.sh.template");
  const builder = await source("scripts/build-protected-bootstrap-assets.mjs");
  assert.match(installer, /PATH='\/usr\/sbin:\/usr\/bin:\/sbin:\/bin'/);
  assert.match(installer, /PROTECTED_NODE='\/usr\/bin\/node'/);
  assert.match(installer, /assert_protected_node_chain/);
  assert.match(installer, /Only execute Node after its fixed filesystem origin passed pre-execution trust checks/i);
  assert.doesNotMatch(installer, /command -v node/i);
  assert.match(builder, /NODE='\/usr\/bin\/node'/);
  assert.doesNotMatch(builder, /command -v node/i);
});

test("Stage-A targets remain fixed OS-protected locations", async () => {
  const windows = await source("scripts/installers/install-livariant-bootstrap.ps1.template");
  const linux = await source("scripts/installers/install-livariant-bootstrap.sh.template");
  assert.match(windows, /C:\\Program Files\\Livariant\\Bootstrap\\v1/);
  assert.match(windows, /C:\\ProgramData\\Livariant\\Guardian/);
  assert.match(linux, /\/opt\/livariant\/bootstrap\/v1/);
  assert.match(linux, /\/var\/lib\/livariant-guardian/);
});

test("RC qualification requires signed provenance for installable release inputs", async () => {
  const workflow = await source(".github/workflows/rc-bundle.yml");
  assert.match(workflow, /attestations:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /actions\/attest@a1948c3f048ba23858d222213b7c278aabede763\s+# v4\.1\.1/);
  for (const subject of [
    "release-manifest.json",
    "SHA256SUMS",
    "PROTECTED-SHA256SUMS",
    "protected_archive",
    "windows_installer",
    "linux_installer",
  ]) {
    assert.ok(workflow.includes(subject), `RC provenance step must cover ${subject}`);
  }
  assert.doesNotMatch(workflow, /Expected exactly one tarball/);
  assert.match(workflow, /Expected runtime package is missing/);
});

test("draft Release asset attachment binds targetCommitish to exact qualified source before tag publication", async () => {
  const workflow = await source(".github/workflows/publish-qualified-rc-assets.yml");
  assert.match(workflow, /--json isDraft,tagName,targetCommitish,assets/);
  assert.match(workflow, /target_commitish=.*targetCommitish/);
  assert.match(workflow, /\[\[ "\$target_commitish" =~ \^\[a-f0-9\]\{40\}\$ \]\]/);
  assert.match(workflow, /test "\$target_commitish" = "\$SOURCE_SHA"/);
  assert.doesNotMatch(workflow, /commits\/\$RELEASE_TAG/);
  assert.match(workflow, /Release remains DRAFT; publication is still separately authorized/);
});

test("release asset verifier confines manifest-controlled filenames to exact bundle leaves", async () => {
  const verifier = await source("scripts/verify-release-asset-set.mjs");
  assert.match(verifier, /filename\.includes\("\/"\)/);
  assert.match(verifier, /filename\.includes\("\\\\"\)/);
  assert.match(verifier, /basename\(filename\) !== filename/);
  assert.match(verifier, /Release asset filename must be a single safe bundle leaf/);
  assert.match(verifier, /install-livariant-bootstrap-\$\{release\.version\}\.ps1/);
  assert.match(verifier, /install-livariant-bootstrap-\$\{release\.version\}\.sh/);
  assert.doesNotMatch(verifier, /installer\.filename\.includes\(release\.version\)/);
});
