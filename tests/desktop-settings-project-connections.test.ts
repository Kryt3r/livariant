import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFile(resolve(process.cwd(), path), "utf8");

test("Connections settings include GitHub account and project repository management", async () => {
  const connections = await read("apps/desktop/src/connections-diagnostics.ts");
  const management = await read("apps/desktop/src/project-connections-settings.ts");

  assert.match(connections, /renderProjectConnectionsSettings\(\)/);
  assert.match(connections, /bindProjectConnectionsSettingsEvents\(rerender\)/);
  assert.match(connections, /refreshProjectConnectionsSettings/);

  assert.match(management, /GitHub connection/);
  assert.match(management, /Zugeordnete Repositories/);
  assert.match(management, /data-project-gh-disconnect/);
  assert.match(management, /data-project-gh-connect/);
  assert.match(management, /data-source-save-description/);
  assert.match(management, /data-source-checkout/);
  assert.match(management, /data-source-remote-only/);
  assert.match(management, /data-source-remove/);
});

test("source management actions preserve local files and protect the primary repository", async () => {
  const management = await read("apps/desktop/src/project-connections-settings.ts");
  const lifecycle = await read("src/project/desktop-first-run-lifecycle.ts");
  const registry = await read("src/project/source-registry.ts");

  assert.match(management, /Das Hauptrepository bleibt.*kann hier nicht entfernt werden/s);
  assert.match(management, /Lokale Dateien und das GitHub-Repository werden nicht gelöscht/);
  assert.match(lifecycle, /set-primary-local-binding/);
  assert.match(lifecycle, /update-additional-repository-description/);
  assert.match(lifecycle, /set-additional-local-binding/);
  assert.match(lifecycle, /remove-additional-repository/);
  assert.match(registry, /disconnectDeletesLocalCheckout: false/);
  assert.match(registry, /localCheckoutDeleted: false/);
});

test("duplicate onboarding source errors point users to Connections management", async () => {
  const firstRun = await read("apps/desktop/src/first-run-ui.ts");

  assert.match(firstRun, /friendlyLifecycleError/);
  assert.match(firstRun, /Einstellungen → Verbindungen/);
  assert.match(firstRun, /Additional repository identity is already associated with this project/);
});


test("Connections settings present Windows checkout paths without verbatim prefixes", async () => {
  const management = await read("apps/desktop/src/project-connections-settings.ts");

  assert.match(management, /function displayLocalPath/);
  assert.match(management, /startsWith\("\\\\\\\\?\\\\UNC\\\\"\)/);
  assert.match(management, /startsWith\("\\\\\\\\?\\\\"\)/);
  assert.match(management, /esc\(displayLocalPath\(localPath\)\)/);
});

test("destructive-looking source actions use Livariant confirmation UI instead of native browser confirms", async () => {
  const management = await read("apps/desktop/src/project-connections-settings.ts");
  const css = await read("apps/desktop/src/project-connections-settings.css");

  assert.doesNotMatch(management, /window\.confirm/);
  assert.match(management, /project-confirm-backdrop/);
  assert.match(management, /role="alertdialog"/);
  assert.match(management, /Auf „Nur Remote“ umstellen\?/);
  assert.match(management, /Repository aus diesem Projekt entfernen\?/);
  assert.match(management, /Kein Repository und keine lokale Datei wird gelöscht/);
  assert.match(css, /\.project-confirm-dialog/);
  assert.match(css, /\.project-confirm-action\.danger/);
});
