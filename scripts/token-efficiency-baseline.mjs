import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
import { codexResumeProjection } from "../dist/src/adapters/resume-provider.js";
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

function topLevelFieldBytes(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [key, bytes(JSON.stringify({ [key]: fieldValue }))]),
  );
}

function measureSurface(name, value) {
  const json = serialize(value);
  const payloadBytes = bytes(json);
  return {
    surface: name,
    serializedBytes: payloadBytes,
    characters: json.length,
    tokenProxy: Math.ceil(payloadBytes / 4),
    duplicateStringBytesWithinPayload: withinPayloadDuplicateBytes(value),
    topLevelFieldBytes: topLevelFieldBytes(value),
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

function countOccurrences(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while (true) {
    const index = text.indexOf(needle, offset);
    if (index < 0) return count;
    count += 1;
    offset = index + needle.length;
  }
}

function measureResumeProviderDelivery(resume) {
  const text = codexResumeProjection.render(resume);
  let duplicateKnownFactBytes = 0;
  for (const fact of resume.knownFacts) {
    const repeatedCopies = Math.max(0, countOccurrences(text, fact) - 1);
    duplicateKnownFactBytes += bytes(fact) * repeatedCopies;
  }
  return {
    provider: "codex",
    textBytes: bytes(text),
    textTokenProxy: Math.ceil(bytes(text) / 4),
    duplicateKnownFactBytes,
    knownFactCount: resume.knownFacts.length,
    evidenceSummaryEqualsKnownFacts: JSON.stringify(resume.evidenceSummary) === JSON.stringify(resume.knownFacts),
  };
}

async function mutateAcceptedFixture(projectPath, mutation) {
  await mutation();
  await recordAcceptedProjectBrainState(projectPath, "manual-bootstrap");
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
    await mutateAcceptedFixture(projectPath, () => addConfirmedGoal(goal, projectPath, { authorized: true }));
  }

  for (const fact of [
    "The project targets Node.js 20 or newer",
    "Authentication currently uses a local deterministic token check",
    "External provider output is treated as evidence rather than canonical truth",
    "The project stores durable project state separately from provider memory",
    "Canonical mutations require a verified project baseline",
    "Repository instructions cannot independently grant mutation Authority",
  ]) {
    await mutateAcceptedFixture(projectPath, () => addConfirmedKnowledge(fact, projectPath, { authorized: true }));
  }

  for (const decision of [
    "Use local-first project operation by default",
    "Keep Capability separate from Authority",
    "Treat stale context as non-current evidence",
    "Require verification after consequential durable changes",
  ]) {
    await mutateAcceptedFixture(projectPath, () => recordAcceptedDecision(decision, projectPath, { authorized: true }));
  }

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

function measureMcpDelivery(response) {
  const result = response?.result;
  const structured = result?.structuredContent;
  const text = result?.content?.[0]?.text;
  const structuredJson = structured ? JSON.stringify(structured) : null;
  return {
    transportResponseBytes: bytes(JSON.stringify(response)),
    explicitTextContentBytes: typeof text === "string" ? bytes(text) : 0,
    explicitTextContentTokenProxy: typeof text === "string" ? Math.ceil(bytes(text) / 4) : 0,
    structuredContentBytes: structuredJson ? bytes(structuredJson) : 0,
    exactStructuredTextMirror: Boolean(structuredJson && typeof text === "string" && text === structuredJson),
    exactMirrorBytes: structuredJson && typeof text === "string" && text === structuredJson ? bytes(text) : 0,
    interpretationBoundary: "Transport bytes and structuredContent are not automatically equivalent to model-billed context; client projection is implementation-specific.",
  };
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
    const aggregateDiagnosticBytes = surfaces.reduce((sum, item) => sum + item.serializedBytes, 0);

    return {
      schemaVersion: 3,
      benchmarkState: "B-current-livariant",
      sourceBaseline: "f325ab57b862e1e13526e6d75e17d93a243e2284",
      workload: "authentication-architecture-review",
      task: TASK,
      methodology: {
        serialization: "JSON.stringify compact JSON",
        tokenProxy: TOKEN_PROXY_METHOD,
        duplicateStringMinBytes: DUPLICATE_STRING_MIN_BYTES,
        aggregateBoundary: "Surface sizes are diagnostic alternatives/components and are not assumed to all enter one model request.",
        note: "Token proxy is used because no provider tokenizer dependency is installed. Public claims must not present it as exact provider billing tokens.",
      },
      surfaces,
      resumeProviderDelivery: measureResumeProviderDelivery(resume),
      aggregateDiagnostics: {
        serializedBytesAcrossMeasuredSurfaces: aggregateDiagnosticBytes,
        tokenProxyAcrossMeasuredSurfaces: Math.ceil(aggregateDiagnosticBytes / 4),
        crossSurfaceDuplicateStringBytes: crossSurfaceDuplicateBytes(surfaceValues),
      },
      mcpDelivery: measureMcpDelivery(mcpContext),
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

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await runTokenEfficiencyBaseline();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
