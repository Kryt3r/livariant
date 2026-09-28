import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("real Codex project-isolation acceptance is explicit opt-in and does not write provider configuration", async () => {
  const source = await readFile("scripts/real-codex-project-isolation-acceptance.mjs", "utf8");
  const pkg = JSON.parse(await readFile("package.json", "utf8")) as { scripts?: Record<string, string> };

  assert.equal(
    pkg.scripts?.["acceptance:real-codex-project-isolation"],
    "npm run build && node scripts/real-codex-project-isolation-acceptance.mjs",
  );
  assert.match(source, /LIVARIANT_REAL_PROVIDER_ACCEPTANCE !== "1"/);
  assert.match(source, /mkdtemp/);
  assert.match(source, /initializeProject\(projectA/);
  assert.match(source, /initializeProject\(projectB/);
  assert.match(source, /"mcp_servers\.livariant"/);
  assert.match(source, /connectCodexAppServer/);
  assert.match(source, /new CodexWorkflowClient/);
  assert.match(source, /startThread\(\{ cwd: projectA, config: livariantMcpConfig\(projectA\) \}\)/);
  assert.match(source, /startThread\(\{ cwd: projectB, config: livariantMcpConfig\(projectB\) \}\)/);
  assert.match(source, /livariant_provider_context/);
  assert.match(source, /livariant_provider_return/);
  assert.match(source, /listCodexThreads/);
  assert.match(source, /bindCodexThreadsToProjects/);
  assert.match(source, /summarizeCodexSessionProjects/);
  assert.match(source, /globalProviderConfigurationMutated: false/);

  assert.doesNotMatch(source, /codex mcp add|\.codex\/config\.toml|LIVARIANT_REAL_CODEX_PROJECT_/);
  assert.match(source, /projectProviderConfigurationWritten: false/);
  assert.match(source, /temporaryProjects: true/);
});

test("real Codex acceptance explicitly exercises two same-project threads and one other-project thread", async () => {
  const source = await readFile("scripts/real-codex-project-isolation-acceptance.mjs", "utf8");
  const projectAStarts = source.match(/startThread\(\{ cwd: projectA, config: livariantMcpConfig\(projectA\) \}\)/g) ?? [];
  const projectBStarts = source.match(/startThread\(\{ cwd: projectB, config: livariantMcpConfig\(projectB\) \}\)/g) ?? [];
  assert.equal(projectAStarts.length, 2);
  assert.equal(projectBStarts.length, 1);
  assert.match(source, /assert\.notEqual\(a1\.threadId, a2\.threadId\)/);
  assert.match(source, /acceptance-project-a/);
  assert.match(source, /acceptance-project-b/);
  assert.match(source, /mixed-projects/);
});

test("real-provider acceptance remains provider-wide and preserves provider-specific evidence", async () => {
  const [runner, claude, gemini, pkgSource] = await Promise.all([
    readFile("scripts/real-provider-project-isolation-acceptance.mjs", "utf8"),
    readFile("scripts/real-claude-project-isolation-acceptance.mjs", "utf8"),
    readFile("scripts/real-gemini-project-isolation-acceptance.mjs", "utf8"),
    readFile("package.json", "utf8"),
  ]);
  const pkg = JSON.parse(pkgSource) as { scripts?: Record<string, string> };

  assert.equal(
    pkg.scripts?.["acceptance:real-provider-project-isolation"],
    "npm run build && node scripts/real-provider-project-isolation-acceptance.mjs",
  );
  assert.match(runner, /selected = provider \? \[provider\] : \["codex", "claude", "gemini"\]/);
  assert.match(runner, /real-codex-project-isolation-acceptance\.mjs/);
  assert.match(runner, /real-claude-project-isolation-acceptance\.mjs/);
  assert.match(runner, /real-gemini-project-isolation-acceptance\.mjs/);

  assert.match(claude, /--mcp-config/);
  assert.match(claude, /init\?\.cwd, cwd/);
  assert.match(claude, /typeof init\?\.session_id, "string"/);
  assert.match(claude, /runClaude\("a1", projects\.projectA/);
  assert.match(claude, /runClaude\("a2", projects\.projectA/);
  assert.match(claude, /runClaude\("b1", projects\.projectB/);
  assert.match(claude, /desktopSelectionRequired: false/);

  assert.match(gemini, /\.gemini/);
  assert.match(gemini, /settings\.json/);
  assert.match(gemini, /typeof init\?\.session_id, "string"/);
  assert.match(gemini, /runGemini\(projects\.projectA/);
  assert.match(gemini, /runGemini\(projects\.projectB/);
  assert.match(gemini, /desktopSelectionRequired: false/);
  assert.match(gemini, /projectProviderConfigurationTemporaryOnly: true/);
});
