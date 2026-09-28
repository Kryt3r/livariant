import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  acceptancePrompt,
  assertToolEvidence,
  createAcceptanceProjects,
  parseJsonLines,
  root,
  runProcess,
  writeJson,
} from "./real-provider-isolation-common.mjs";

if (process.env.LIVARIANT_REAL_PROVIDER_ACCEPTANCE !== "1") {
  throw new Error("Real Claude acceptance is opt-in. Set LIVARIANT_REAL_PROVIDER_ACCEPTANCE=1.");
}

const dist = (path) => pathToFileURL(resolve(root, "dist", "src", ...path)).href;
const { inspectBundledLocalProvider } = await import(dist(["connectors", "local-provider-runtime.js"]));
const inspection = inspectBundledLocalProvider({ provider: "claude" });
if (inspection.installationState !== "available" || inspection.authState !== "authenticated") {
  throw new Error(inspection.detail ?? "Claude Code is not available and authenticated.");
}

const projects = await createAcceptanceProjects();
const livariantCli = resolve(root, "dist", "src", "cli", "index.js");

async function runClaude(label, cwd, marker) {
  const mcpConfig = resolve(projects.tempRoot, `claude-${label}-mcp.json`);
  await writeJson(mcpConfig, {
    mcpServers: {
      livariant: {
        command: process.execPath,
        args: [livariantCli, "mcp"],
        cwd,
      },
    },
  });
  const prompt = acceptancePrompt("claude-code", marker);
  const args = [
    ...inspection.argsPrefix,
    "-p", prompt,
    "--output-format", "stream-json",
    "--verbose",
    "--max-turns", "6",
    "--mcp-config", mcpConfig,
    "--allowedTools", "mcp__livariant__livariant_provider_context,mcp__livariant__livariant_provider_return",
  ];
  const result = await runProcess(inspection.command, args, cwd);
  const events = parseJsonLines(result.stdout);
  const init = events.find((event) => event?.type === "system" && event?.subtype === "init");
  assert.equal(init?.cwd, cwd);
  assert.equal(typeof init?.session_id, "string");
  assertToolEvidence(events, "livariant_provider_context", marker);
  assertToolEvidence(events, "livariant_provider_return", marker);
  return { sessionId: init.session_id, marker };
}

try {
  const now = Date.now();
  const [a1, a2, b1] = await Promise.all([
    runClaude("a1", projects.projectA, `LIVARIANT_CLAUDE_A1_${now}`),
    runClaude("a2", projects.projectA, `LIVARIANT_CLAUDE_A2_${now + 1}`),
    runClaude("b1", projects.projectB, `LIVARIANT_CLAUDE_B1_${now + 2}`),
  ]);
  assert.notEqual(a1.sessionId, a2.sessionId);
  assert.notEqual(a1.sessionId, b1.sessionId);
  assert.notEqual(a2.sessionId, b1.sessionId);
  process.stdout.write(JSON.stringify({
    schemaVersion: 1,
    state: "passed",
    provider: "claude",
    realProvider: true,
    temporaryProjects: true,
    desktopSelectionRequired: false,
    globalProviderConfigurationMutated: false,
    projectProviderConfigurationWritten: false,
    sessions: {
      projectA: [a1.sessionId, a2.sessionId],
      projectB: [b1.sessionId],
    },
  }, null, 2) + "\n");
} finally {
  await projects.cleanup();
}
