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

test("GitHub telemetry batches remote read surfaces through one bounded helper", async () => {
  const host = await text("apps/desktop/src-tauri/src/github_telemetry.rs");

  assert.match(host, /fn github_get_bundle/);
  assert.match(host, /repositoryJson/);
  assert.match(host, /actionsJson/);
  assert.match(host, /ConvertTo-Json -InputObject @\(\$prs\) -Compress -Depth 30/);
  assert.match(host, /ConvertTo-Json -InputObject @\(\$issues\) -Compress -Depth 30/);
  assert.match(host, /ConvertTo-Json -InputObject @\(\$releases\) -Compress -Depth 30/);
  assert.match(host, /assert_eq!\(list_items\(json!\(\[\]\), None\)\.unwrap\(\), json!\(\[\]\)\)/);
  assert.match(host, /assert_eq!\(list_items\(json!\(\[\{\"number\": 1\}\]\), None\)\.unwrap\(\), json!\(\[\{\"number\": 1\}\]\)\)/);
  assert.match(host, /assert!\(list_items\(json!\(\{\"number\": 1\}\), None\)\.is_err\(\)\)/);
});

test("GitHub telemetry is cache-first, persistent and nonblocking", async () => {
  const host = await text("apps/desktop/src-tauri/src/github_telemetry.rs");
  const ui = await text("apps/desktop/src/github-project-telemetry.ts");
  const lazyView = await text("apps/desktop/src/project-source-review-lazy-view.ts");

  assert.match(host, /const CACHE_FRESH_SECONDS: u64 = 600/);
  assert.match(host, /app_data_dir\(\)/);
  assert.match(host, /GitHubTelemetryCacheStore/);
  assert.match(host, /read_cache\(&cache_path/);
  assert.match(host, /write_cache\(&cache_path/);
  assert.match(host, /pub async fn github_project_telemetry/);
  assert.match(host, /spawn_blocking\(move \|\| github_project_telemetry_blocking/);

  assert.match(ui, /const memorySnapshots = new Map/);
  assert.match(ui, /const refreshes = new Map/);
  assert.match(ui, /invokeTelemetry\(repositoryId, false\)/);
  assert.match(ui, /invokeTelemetry\(repositoryId, true\)/);
  assert.match(ui, /\{ repositoryId, forceRefresh \}/);
  assert.doesNotMatch(ui, /github_connection_status/);
  assert.match(lazyView, /loaded\.snapshot\.telemetry/);
  assert.match(lazyView, /if \(loaded\.refresh\)/);
});

test("GitHub telemetry keeps remote evidence and mutation Authority separate", async () => {
  const host = await text("apps/desktop/src-tauri/src/github_telemetry.rs");
  const ui = await text("apps/desktop/src/github-project-telemetry.ts");
  const lazyView = await text("apps/desktop/src/project-source-review-lazy-view.ts");

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

  assert.match(host, /validate_cached_telemetry/);
  assert.match(host, /telemetryGrantsAuthority/);
  assert.match(ui, /GitHub data shown here is external evidence/);
  assert.match(ui, /GitHub-Lesezugriff erteilt keine Berechtigung/);
  assert.match(lazyView, /loadGitHubProjectTelemetry/);
  assert.match(lazyView, /source\.kind === "primary" && source\.identity\.provider === "github"/);
});

test("GitHub telemetry surfaces unavailable permissions honestly instead of inventing healthy emptiness", async () => {
  const host = await text("apps/desktop/src-tauri/src/github_telemetry.rs");
  const ui = await text("apps/desktop/src/github-project-telemetry.ts");

  assert.match(host, /state: "unavailable"/);
  assert.match(host, /detail: Some\(detail\.into\(\)\)/);
  assert.match(ui, /GitHub did not expose this read surface/);
  assert.match(ui, /No missing data is interpreted as healthy/);
});
