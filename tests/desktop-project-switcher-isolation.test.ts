import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("global project control is host-backed and no longer hard-coded", async () => {
  const shell = await read("apps/desktop/src/shell-redesign.ts");
  const switcher = await read("apps/desktop/src/shell-project-switcher.ts");
  const registry = await read("apps/desktop/src/desktop-project-registry.ts");

  assert.match(shell, /data-shell-project-host/);
  assert.doesNotMatch(shell, /My project|Mein Projekt/);
  assert.match(registry, /"desktop_project_registry_snapshot"/);
  assert.match(registry, /"desktop_project_activate"/);
  assert.match(switcher, /data-project-switch-id/);
  assert.match(switcher, /await activateDesktopProject\(desktopProjectId\)/);
});

test("activation is published only from a host-confirmed active snapshot", async () => {
  const registry = await read("apps/desktop/src/desktop-project-registry.ts");

  assert.match(registry, /result\.state !== "activated"/);
  assert.match(registry, /active\.desktopProjectId !== desktopProjectId/);
  assert.match(registry, /publishRegistry\(snapshot\)/);
  assert.match(registry, /livariant:desktop-project-activated/);
  assert.match(registry, /showProjectActivationOverlay\(\)/);
  assert.match(registry, /await publishDesktopProjectActivated\(/);
  assert.match(registry, /await Promise\.all\(results\)/);
  assert.match(registry, /await settleProjectActivationFrame\(\)/);
  assert.match(registry, /hideProjectActivationOverlay\(\)/);
});

test("Source Review clears project-scoped renderer state and rejects late results", async () => {
  const bridge = await read("apps/desktop/src/project-source-review-bridge.ts");
  const navigation = await read("apps/desktop/src/project-source-review-navigation.ts");

  assert.match(bridge, /onDesktopProjectActivated\(\(\) => \{/);
  assert.match(bridge, /rendererProjectGeneration \+= 1/);
  assert.match(bridge, /resetProjectScopedRendererState\(\)/);
  assert.match(bridge, /generation !== rendererProjectGeneration/);
  assert.match(navigation, /onDesktopProjectActivated\(\(\) => \{/);
  assert.match(navigation, /renderGeneration \+= 1/);
  assert.match(navigation, /if \(sourceReviewActive\) return renderIntoContent\(\)/);
  assert.match(bridge, /loadFirstRunLifecycle\(\)/);
  assert.match(bridge, /presentationFromFirstRunLifecycle/);
  assert.match(bridge, /No repository scan was performed/);
});

test("First Run and project connection caches are rebound on activation", async () => {
  const firstRun = await read("apps/desktop/src/first-run-ui.ts");
  const settings = await read("apps/desktop/src/project-connections-settings.ts");

  assert.match(firstRun, /onDesktopProjectActivated\(\(\) => \{/);
  assert.match(firstRun, /projectActivationGeneration/);
  assert.match(firstRun, /generation !== projectActivationGeneration/);
  assert.match(firstRun, /return loadFirstRunLifecycle\(\)/);

  assert.match(settings, /onDesktopProjectActivated\(\(\) => \{/);
  assert.match(settings, /sourceRegistry = null/);
  assert.match(settings, /transitionForCurrentProject/);
  assert.match(settings, /generation !== projectActivationGeneration/);
  assert.match(settings, /return refreshProjectConnectionsSettings\(\)/);
});

test("project transition waits for project-scoped provider and diagnostics rehydration", async () => {
  const shell = await read("apps/desktop/src/shell-redesign.ts");
  const connections = await read("apps/desktop/src/connections-diagnostics.ts");
  const cockpit = await read("apps/desktop/src/diagnostics-cockpit.ts");

  assert.match(shell, /onDesktopProjectActivated\(async \(\) => \{/);
  assert.match(shell, /await refreshHealth\(\)/);
  assert.match(connections, /return Promise\.all\(\[providerRefresh, diagnosticsRefresh\]\)/);
  assert.match(cockpit, /return load\(surface\)/);
});

test("project switcher contrast and popover states are explicit", async () => {
  const css = await read("apps/desktop/src/shell-redesign.css");

  assert.match(css, /\.global-project-wrap/);
  assert.match(css, /\.global-project-popover/);
  assert.match(css, /\.global-project-option\.active/);
  assert.match(css, /\.global-project small \{[^}]*color: #b9b2cc/s);
  assert.match(css, /\.global-project strong \{[^}]*color: #fbf9ff/s);
  assert.match(css, /\.project-activation-overlay/);
  assert.match(css, /data-project-activation-pending="true"/);
});
