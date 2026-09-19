import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("official Windows builds inject the GitHub App client identity from repository variables", async () => {
  const installer = await read(".github/workflows/desktop-windows-installer.yml");
  const preview = await read(".github/workflows/desktop-preview-update.yml");

  assert.match(installer, /LIVARIANT_GITHUB_CLIENT_ID:\s*\$\{\{ vars\.LIVARIANT_GITHUB_CLIENT_ID \}\}/);
  assert.match(preview, /LIVARIANT_GITHUB_CLIENT_ID:\s*\$\{\{ vars\.LIVARIANT_GITHUB_CLIENT_ID \}\}/);
});

test("signed Desktop Preview builds fail closed without the production GitHub App identity", async () => {
  const preview = await read(".github/workflows/desktop-preview-update.yml");

  assert.match(preview, /Require production GitHub App client identity/);
  assert.match(preview, /IsNullOrWhiteSpace\(\$env:LIVARIANT_GITHUB_CLIENT_ID\)/);
  assert.match(preview, /Signed Desktop Preview builds must carry the operator-owned GitHub App client identity/);
});

test("public docs preserve client-id-versus-secret boundaries", async () => {
  const en = await read("docs/desktop-github-connection.md");
  const de = await read("docs/de/desktop-github-connection.md");

  assert.match(en, /client ID is public application identity, not a secret/i);
  assert.match(en, /signed Desktop Preview build.*requires a configured production client ID/is);
  assert.match(de, /Client-ID ist öffentliche App-Identität und kein Secret/i);
  assert.match(de, /signierter Desktop-Preview-Build.*Produktions-Client-ID/is);
});
