import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("GitHub disconnect truth surface matches local credential lifecycle", async () => {
  const surface = await read("apps/desktop/src/project-connections-settings.ts");
  const host = await read("apps/desktop/src-tauri/src/github_remote.rs");
  const privacyEn = await read("docs/privacy-and-network.md");
  const privacyDe = await read("docs/de/privacy-and-network.md");

  assert.match(host, /pub fn github_disconnect/);
  assert.match(host, /delete_credential\(\)\?/);
  assert.match(host, /pending\.lock/);
  assert.doesNotMatch(host, /DELETE[^\n]*applications|revoke[^\n]*token/i);

  assert.match(surface, /locally stored protected GitHub credential/);
  assert.match(surface, /GitHub-side app authorization is not revoked here/);
  assert.match(surface, /Local GitHub credential removed/);
  assert.match(surface, /GitHub-side app authorization was not revoked/);

  assert.match(privacyEn, /Disconnect GitHub/);
  assert.match(privacyEn, /does not revoke the GitHub-side app authorization/);
  assert.match(privacyDe, /GitHub trennen/);
  assert.match(privacyDe, /widerruft dabei nicht die GitHub-seitige App-Autorisierung/);
});
