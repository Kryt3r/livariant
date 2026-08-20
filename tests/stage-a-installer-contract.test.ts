import assert from "node:assert/strict";
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
  assert.match(text, /C:\\Windows\\System32\\icacls\.exe/);
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
  assert.match(workflow, /actions\/attest@1e69f48acb82d1966a394da916b4c1698aa569d6\s+# v4\.2\.2/);
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
