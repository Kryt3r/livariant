import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  addConfirmedGoal,
  addConfirmedKnowledge,
  initializeProject,
  inspectInitialization,
  recordAcceptedDecision,
} from "../dist/src/runtime/index-core.js";
import { buildResumeContext } from "../dist/src/runtime/resume.js";
import { buildProjectContextSnapshot } from "../dist/src/runtime/context-snapshot.js";
import { buildProviderContext } from "../dist/src/runtime/provider-context.js";
import { buildUnderstandingReview } from "../dist/src/project/understanding-review.js";
import { recordAcceptedProjectBrainState } from "../dist/src/project-brain/integrity.js";
import {
  createMcpSession,
  MCP_CONTEXT_TOOL,
  MCP_PROTOCOL_VERSION,
} from "../dist/src/mcp/server.js";

const TASK = "Review whether the planned authentication change fits the accepted architecture and project constraints.";
const DUPLICATE_STRING_MIN_BYTES = 16;
const TOKEN_PROXY_METHOD = "ceil(utf8-bytes/4); deterministic proxy, not provider tokenizer output";

function bytes(value) {
  return Buffer.byteLength(value, "utf8");
}

function serialize(value) {
  return JSON.stringify(value);
}

function flattenStrings(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenStrings(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) flattenStrings(item, output);
  }
  return output;
}

function withinPayloadDuplicateBytes(value) {
  const counts = new Map();
  for (const text of flattenStrings(value)) {
    if (bytes(text) < DUPLICATE_STRING_MIN_BYTES) continue;
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  let duplicateBytes = 0;
  for (const [text, count] of counts) {
    if (count > 1) duplicateBytes += bytes(text) * (count - 1);
  }
  return duplicateBytes;
}

function measureSurface(name, value) {
  const json = serialize(value);
  const payloadBytes = bytes(json);
  return {
    surface: name,
    bytes: payloadBytes,
    characters: json.length,
    estimatedTokens: Math.ceil(payloadBytes / 4),
    duplicateStringBytesWithinPayload: withinPayloadDuplicateBytes(value),
  };
}

function crossSurfaceDuplicateBytes(surfaceValues) {
  const occurrences = new Map();
  for (const [surface, value] of Object.entries(surfaceValues)) {
    const unique = new Set(flattenStrings(value).filter((text) => bytes(text) >= DUPLICATE_STRING_MIN_BYTES));
    for (const text of unique) {
      const set = occurrences.get(text) ?? new Set();
      set.add(surface);
      occurrences.set(text, set);
    }
  }
  let duplicateBytes = 0;
  for (const [text, surfaces] of occurrences) {
    if (surfaces.size > 1) duplicateBytes += bytes(text) * (surfaces.size - 1);
  }
  return duplicateBytes;
}

async function createFixture() {
  const projectPath = await mkdtemp(resolve(tmpdir(), "livariant-token-baseline-"));
  await mkdir(resolve(projectPath, "src"), { recursive: true });
  await writeFile(resolve(projectPath, "README.md"), "# Benchmark Project\n\nA local-first service with explicit architecture and reliability constraints.\n", "utf8");
  await writeFile(resolve(projectPath, "AGENTS.md"), "# Agent guidance\n\nInspect project evidence before proposing durable changes.\n", "utf8");
  await writeFile(resolve(projectPath, "package.json"), JSON.stringify({ name: "livariant-benchmark-project", type: "module", scripts: { test: "node --test" } }, null, 2), "utf8");
  await writeFile(resolve(projectPath, "src", "index.ts"), "export function authenticate(token: string): boolean { return token.length > 0; }\n", "utf8");

  await initializeProject(projectPath, { authorized: true });

  for (const goal of [
    "Keep project-owned truth stable across AI sessions and providers",
    "Require explicit authorization before durable semantic mutation",
    "Keep the authentication subsystem local-first and deterministic",
    "Preserve recoverability when an automated change is interrupted",
  ]) {
    await addConfirmedGoal(goal, projectPath, { authorized: true });
  }

  for (const fact of [
    "The project targets Node.js 20 or newer",
    "Authentication currently uses a local deterministic token check",
    "External provider output is treated as evidence rather than canonical truth",
    "The project stores durable project state separately from provider memory",
    "Canonical mutations require a verified project baseline",
    "Repository instructions cannot independently grant mutation Authority",
  ]) {
    await addConfirmedKnowledge(fact, projectPath, { authorized: true });
  }

  for (const decision of [
    "Use local-first project operation by default",
    "Keep Capability separate from Authority",
    "Treat stale context as non-current evidence",
    "Require verification after consequential durable changes",
  ]) {
    await recordAcceptedDecision(decision, projectPath, { authorized: true });
  }

  await recordAcceptedProjectBrainState(projectPath, "manual-bootstrap");
  return projectPath;
}

async function mcpProviderContext(projectPath) {
  const session = createMcpSession(projectPath);
  await session.handleMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "token-baseline", version: "1" },
    },
  });
  await session.handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" });
  return session.handleMessage({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: MCP_CONTEXT_TOOL, arguments: { provider: "codex", task: TASK } },
  });
}

function mcpMirrorBytes(response) {
  const result = response?.result;
  const structured = result?.structuredContent;
  const text = result?.content?.[0]?.text;
  if (!structured || typeof text !== "string") return 0;
  return text === JSON.stringify(structured) ? bytes(text) : 0;
}

export async function runTokenEfficiencyBaseline() {
  const projectPath = await createFixture();
  try {
    const resume = await buildResumeContext(projectPath);
    const context = await buildProjectContextSnapshot(projectPath);
    const providerContext = await buildProviderContext("codex", TASK, projectPath);
    const initialization = await inspectInitialization(projectPath);
    const understand = buildUnderstandingReview(initialization.discovery);
    const mcpContext = await mcpProviderContext(projectPath);

    const surfaceValues = { resume, context, providerContext, understand, mcpContext };
    const surfaces = Object.entries(surfaceValues).map(([name, value]) => measureSurface(name, value));
    const totalBytes = surfaces.reduce((sum, item) => sum + item.bytes, 0);

    return {
      schemaVersion: 1,
      benchmarkState: "B-current-livariant",
      sourceBaseline: "f325ab57b862e1e13526e6d75e17d93a243e2284",
      workload: "authentication-architecture-review",
      task: TASK,
      methodology: {
        serialization: "JSON.stringify compact JSON",
        tokenProxy: TOKEN_PROXY_METHOD,
        duplicateStringMinBytes: DUPLICATE_STRING_MIN_BYTES,
        note: "Token proxy is used because no provider tokenizer dependency is installed. Public claims must not present it as exact provider billing tokens.",
      },
      surfaces,
      totals: {
        bytes: totalBytes,
        estimatedTokens: Math.ceil(totalBytes / 4),
        crossSurfaceDuplicateStringBytes: crossSurfaceDuplicateBytes(surfaceValues),
        mcpStructuredContentMirroredInTextBytes: mcpMirrorBytes(mcpContext),
      },
      reliabilityAssertions: {
        providerContextState: providerContext.state,
        contextSafetyState: context.safetyState,
        mcpReturnedWithoutMutationAuthority: providerContext.mutationAuthorization === false,
        changesMade: providerContext.changesMade,
      },
    };
  } finally {
    await rm(projectPath, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runTokenEfficiencyBaseline();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
