import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("public README separates Windows Desktop from Core/CLI first-use paths", async () => {
  const en = await read("README.md");
  const de = await read("README.de.md");

  assert.match(en, /Windows Desktop/);
  assert.match(en, /docs\/desktop-installation\.md/);
  assert.match(en, /Core \/ CLI \/ protected Guardian workflows/);

  assert.match(de, /Windows Desktop/);
  assert.match(de, /docs\/de\/desktop-installation\.md/);
  assert.match(de, /Core \/ CLI \/ geschützte Guardian-Workflows/);
});

test("Desktop install docs bind the published Preview to exact immutable identity", async () => {
  const en = await read("docs/desktop-installation.md");
  const de = await read("docs/de/desktop-installation.md");

  for (const doc of [en, de]) {
    assert.match(doc, /desktop-preview-0\.1\.0-rc\.29-bbfd076f0710/);
    assert.match(doc, /bbfd076f07103026688611f4e5438c8a58687e83/);
    assert.match(doc, /Livariant_0\.1\.0-rc\.29_x64-setup\.exe/);
    assert.match(doc, /12065505aac7b3c620e3cb0396b66aa6cc620bdb168bc184bd63a09b57ed8199/);
    assert.match(doc, /Unknown publisher|SmartScreen/);
  }
});

test("privacy docs describe actual Desktop network channels without claiming automatic update checks", async () => {
  const en = await read("docs/privacy-and-network.md");
  const de = await read("docs/de/privacy-and-network.md");

  for (const doc of [en, de]) {
    assert.match(doc, /https:\/\/broadcast\.livariant\.dev\/v1\/operator\.json/);
    assert.match(doc, /GitHub App/);
    assert.match(doc, /DPAPI/);
    assert.match(doc, /five minutes|fünf Minuten/);
    assert.match(doc, /does \*\*not\*\* automatically perform a remote update check|keinen automatischen Remote-Update-Check/);
  }
});

test("Desktop package and Windows bundle metadata use product-facing wording", async () => {
  const cargo = await read("apps/desktop/src-tauri/Cargo.toml");
  const tauri = await read("apps/desktop/src-tauri/tauri.conf.json");
  const desktopReadme = await read("apps/desktop/README.md");

  assert.doesNotMatch(cargo, /Desktop Foundation/);
  assert.doesNotMatch(tauri, /desktop foundation/i);
  assert.doesNotMatch(desktopReadme.split("\n", 1)[0] ?? "", /Foundation/);
  assert.match(cargo, /controlled, verifiable AI-assisted project work/);
  assert.match(tauri, /Controlled, verifiable AI-assisted project work/);
});
