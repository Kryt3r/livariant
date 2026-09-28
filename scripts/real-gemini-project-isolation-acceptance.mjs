import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
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
  throw new Error("Real Gemini acceptance is opt-in. Set LIVARIANT_REAL_PROVIDER_ACCEPTANCE=1.");
}

const dist = (path) => pathToFileURL(resolve(root, "dist", "src", ...path)).href;
const { inspectBundledLocalProvider } = await import(dist(["connectors", "local-provider-runtime.js"]));
const inspection = inspectBundledLocalProvider({ provider: "gemini" });
if (inspection.installationState !== "available") {
  throw new Error(inspection.detail ?? "Gemini CLI is not available.");
}

const projects = await createAcceptanceProjects();
const livariantCli = resolve(root, "dist", "src", "cli", "index.js");

async function configureProject(cwd) {
  const dir = resolve(cwd, ".gemini");
  await mkdir(dir);
  await writeJson(resolve(dir, "settings.json"), {
    mcpServers: {
      livariant: {
        command: process.execPath,
        args: [livariantCli, "mcp"],
        cwd,
        trust: true,
        includeTools: [
          "livariant_provider_context",
          "livariant_provider_return",
        ],
      },
    },
  });
}

async function runGemini(cwd, marker) {
  const prompt = acceptancePrompt("gemini", marker);
  const args = [
    ...inspection.argsPrefix,
    "--skip-trust",
    "--output-format", "stream-json",
    "--approval-mode", "yolo",
    "--allowed-mcp-server-names", "livariant",
    "-p", prompt,
  ];
  const result = await runProcess(inspection.command, args, cwd);
  const events = parseJsonLines(result.stdout);
  const init = events.find((event) => event?.type === "init");
  assert.equal(typeof init?.session_id, "string");
  assertToolEvidence(events, "livariant_provider_context", marker);
  assertToolEvidence(events, "livariant_provider_return", marker);
  return { sessionId: init.session_id, marker };
}

try {
  await configureProject(projects.projectA);
  await configureProject(projects.projectB);
  const now = Date.now();
  const [a1, a2, b1] = await Promise.all([
    runGemini(projects.projectA, `LIVARIANT_GEMINI_A1_${now}`),
    runGemini(projects.projectA, `LIVARIANT_GEMINI_A2_${now + 1}`),
    runGemini(projects.projectB, `LIVARIANT_GEMINI_B1_${now + 2}`),
  ]);
  assert.notEqual(a1.sessionId, a2.sessionId);
  assert.notEqual(a1.sessionId, b1.sessionId);
  assert.notEqual(a2.sessionId, b1.sessionId);
  process.stdout.write(JSON.stringify({
    schemaVersion: 1,
    state: "passed",
    provider: "gemini",
    realProvider: true,
    temporaryProjects: true,
    desktopSelectionRequired: false,
    globalProviderConfigurationMutated: false,
    projectProviderConfigurationWritten: true,
    projectProviderConfigurationTemporaryOnly: true,
    sessions: {
      projectA: [a1.sessionId, a2.sessionId],
      projectB: [b1.sessionId],
    },
  }, null, 2) + "\n");
} finally {
  await projects.cleanup();
}
