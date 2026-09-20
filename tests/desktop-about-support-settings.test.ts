import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("About and support Settings surface exposes release identity and public resources", async () => {
  const main = await read("apps/desktop/src/main.ts");
  const surface = await read("apps/desktop/src/about-support-settings.ts");

  assert.match(main, /"about"/);
  assert.match(main, /renderAboutSupportSettingsView/);
  assert.match(main, /refreshAboutSupportSettings/);
  assert.match(main, /Über Livariant & Hilfe/);

  assert.match(surface, /desktop_public_identity/);
  assert.match(surface, /runtime_health/);
  assert.match(surface, /GitHub/);
  assert.match(surface, /Issues/);
  assert.match(surface, /Security reporting/);
  assert.match(surface, /Imprint \/ provider information/);
  assert.match(surface, /Privacy/);
  assert.match(surface, /Software license/);
  assert.match(surface, /Third-party notices/);
});

test("public-resource host command is fixed allowlist and cannot open renderer-supplied URLs", async () => {
  const host = await read("apps/desktop/src-tauri/src/public_resources.rs");
  const lib = await read("apps/desktop/src-tauri/src/lib.rs");

  assert.match(host, /"repository" => Some\("https:\/\/github\.com\/Kryt3r\/livariant"\)/);
  assert.match(host, /"issues" => Some\("https:\/\/github\.com\/Kryt3r\/livariant\/issues"\)/);
  assert.match(host, /"security" => Some\("https:\/\/github\.com\/Kryt3r\/livariant\/security\/policy"\)/);
  assert.match(host, /"imprint" => Some\("https:\/\/www\.einfachrobin\.de\/impressum"\)/);
  assert.match(host, /"privacy" => Some/);
  assert.match(host, /"license" => Some/);
  assert.match(host, /"third-party" => Some/);
  assert.match(host, /Unknown public Livariant resource/);
  assert.match(host, /assert_eq!\(public_resource_url\("https:\/\/example\.com"\), None\)/);
  assert.match(lib, /public_resources::open_public_resource/);
  assert.match(lib, /public_resources::desktop_public_identity/);
});

test("social and Discord destinations are not exposed before real links exist", async () => {
  const surface = await read("apps/desktop/src/about-support-settings.ts");

  assert.doesNotMatch(surface, /data-public-resource="discord"/);
  assert.doesNotMatch(surface, /data-public-resource="youtube"/);
  assert.doesNotMatch(surface, /data-public-resource="tiktok"/);
  assert.match(surface, /only appear here once real public destinations exist/);
});
