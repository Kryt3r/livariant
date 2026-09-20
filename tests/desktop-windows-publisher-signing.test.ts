import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("public Windows preview makes Authenticode an explicit opt-in", async () => {
  const workflow = await read(".github/workflows/desktop-preview-update.yml");

  assert.match(workflow, /windows_authenticode:/);
  assert.match(workflow, /default: false/);
  assert.match(workflow, /if: \$\{\{ inputs\.publish_preview && inputs\.windows_authenticode \}\}/);
  assert.match(workflow, /WINDOWS_CERTIFICATE: \$\{\{ secrets\.WINDOWS_CERTIFICATE \}\}/);
  assert.match(workflow, /Import-PfxCertificate/);
  assert.match(workflow, /certificateThumbprint/);
  assert.match(workflow, /digestAlgorithm = "sha256"/);
});

test("unsigned direct publication keeps updater signing mandatory and records publisher mode", async () => {
  const workflow = await read(".github/workflows/desktop-preview-update.yml");

  assert.match(workflow, /Require updater signing custody/);
  assert.match(workflow, /TAURI_SIGNING_PRIVATE_KEY is not configured/);
  assert.match(workflow, /Build updater-signed artifacts without Windows publisher identity/);
  assert.match(workflow, /if: \$\{\{ !inputs\.publish_preview \|\| !inputs\.windows_authenticode \}\}/);
  assert.match(workflow, /unsigned-direct-download/);
  assert.match(workflow, /Unknown publisher \/ SmartScreen warnings/);
  assert.match(workflow, /publisher_mode=\$publisherMode/);
  assert.match(workflow, /The updater payload remains cryptographically signed/);
});

test("Authenticode mode verifies publisher signature before publication", async () => {
  const workflow = await read(".github/workflows/desktop-preview-update.yml");

  assert.match(workflow, /Get-AuthenticodeSignature -LiteralPath \$installers\[0\]\.FullName/);
  assert.match(workflow, /SignatureStatus\]::Valid/);
  assert.match(workflow, /unexpected publisher certificate/);
  assert.match(workflow, /Get-AuthenticodeSignature -LiteralPath \$app/);

  const verifyIndex = workflow.indexOf("Get-AuthenticodeSignature -LiteralPath $installers[0].FullName");
  const publishIndex = workflow.indexOf("- name: Publish immutable preview candidate");
  assert.ok(verifyIndex >= 0 && publishIndex > verifyIndex, "Authenticode verification must precede publication when enabled");
});

test("Windows qualification workflows are triggered by preview publication workflow changes", async () => {
  const installer = await read(".github/workflows/desktop-windows-installer.yml");
  const foundation = await read(".github/workflows/desktop-windows-foundation.yml");

  assert.match(installer, /\.github\/workflows\/desktop-preview-update\.yml/);
  assert.match(foundation, /\.github\/workflows\/desktop-preview-update\.yml/);
});

test("publisher certificate policy still rejects unusable identities before Authenticode build", async () => {
  const workflow = await read(".github/workflows/desktop-preview-update.yml");

  assert.match(workflow, /WINDOWS_CODE_SIGNING_TIMESTAMP_URL must be an absolute HTTPS URL/);
  assert.match(workflow, /WINDOWS_CODE_SIGNING_TIMESTAMP_URL must use HTTPS and must not contain a fragment/);
  assert.match(workflow, /Windows code-signing certificate is not valid yet/);
  assert.match(workflow, /Windows code-signing certificate has expired/);
  assert.match(workflow, /2\.5\.29\.37/);
  assert.match(workflow, /1\.3\.6\.1\.5\.5\.7\.3\.3/);
  assert.match(workflow, /Windows code-signing certificate is not valid for Code Signing/);

  const policyIndex = workflow.indexOf("Windows code-signing certificate is not valid for Code Signing");
  const buildIndex = workflow.indexOf("Build Authenticode + updater signed publication artifacts");
  assert.ok(policyIndex >= 0 && buildIndex > policyIndex, "publisher certificate policy must be enforced before Authenticode build");
});
