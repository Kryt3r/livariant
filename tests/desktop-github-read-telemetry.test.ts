import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const text = (path: string) => readFile(path, "utf8");

test("GitHub project telemetry is bounded to read-only owner/name repository requests", async () => {
  const host = await text("apps/desktop/src-tauri/src/github_telemetry.rs");
  const lib = await text("apps/desktop/src-tauri/src/lib.rs");

  assert.match(lib, /github_telemetry::github_project_telemetry/);
  assert.match(host, /GitHub repository ID must use exact owner\/name form/);
  assert.match(host, /\/actions\/runs\?per_page=10/);
  assert.match(host, /\/pulls\?state=open/);
  assert.match(host, /\/issues\?state=open/);
  assert.match(host, /\/releases\?per_page=10/);
  assert.match(host, /Invoke-RestMethod -Method Get/);
  assert.doesNotMatch(host, /Invoke-RestMethod -Method (Post|Patch|Put|Delete)/);
});

test("GitHub telemetry keeps remote evidence and mutation Authority separate", async () => {
  const host = await text("apps/desktop/src-tauri/src/github_telemetry.rs");
  const ui = await text("apps/desktop/src/github-project-telemetry.ts");
  const navigation = await text("apps/desktop/src/project-source-review-navigation.ts");

  for (const boundary of [
    '"remoteEvidenceIsProjectTruth": false',
    '"telemetryGrantsAuthority": false',
    '"writeCapabilityEnabled": false',
    '"workflowDispatchEnabled": false',
    '"pullRequestMutationEnabled": false',
    '"issueMutationEnabled": false',
    '"releaseMutationEnabled": false',
    '"mergeEnabled": false',
    '"performsSemanticApply": false',
  ]) assert.match(host, new RegExp(boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(ui, /GitHub data shown here is external evidence/);
  assert.match(ui, /GitHub-Lesezugriff erteilt keine Berechtigung/);
  assert.match(navigation, /loadGitHubProjectTelemetry/);
  assert.match(navigation, /identity\.provider !== "github"/);
});

test("GitHub telemetry surfaces unavailable permissions honestly instead of inventing healthy emptiness", async () => {
  const host = await text("apps/desktop/src-tauri/src/github_telemetry.rs");
  const ui = await text("apps/desktop/src/github-project-telemetry.ts");

  assert.match(host, /state: "unavailable"/);
  assert.match(host, /detail: Some\(detail\.into\(\)\)/);
  assert.match(ui, /GitHub did not expose this read surface/);
  assert.match(ui, /No missing data is interpreted as healthy/);
});
