import { readFileSync } from "node:fs";
import { stdout } from "node:process";
import { resolveCodexCommand } from "./codex-command.js";
import { connectCodexAppServer } from "./codex-runtime.js";
import { listCodexThreads } from "./codex-thread-catalog.js";
import { bindCodexThreadsToProjects, summarizeCodexSessionProjects, type ProviderProjectDescriptor } from "./provider-project-binding.js";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${field} must be a non-blank string.`);
  return value;
}

function optionalText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return requireText(value, field);
}

interface ProviderContextObservation {
  provider: "claude-code" | "codex" | "gemini" | "custom";
  providerSessionId: string;
  providerThreadId: string | null;
  projectPath: string;
  stableProjectIdentity: string;
  observedAt: string;
}

function parseProjects(value: unknown): ProviderProjectDescriptor[] {
  if (!isObject(value) || !Array.isArray(value.projects)) {
    throw new Error("Codex session reconciliation input must contain projects.");
  }
  return value.projects.map((raw, index) => {
    if (!isObject(raw)) throw new Error(`projects[${index}] must be an object.`);
    return {
      desktopProjectId: requireText(raw.desktopProjectId, `projects[${index}].desktopProjectId`),
      localRoot: requireText(raw.localRoot, `projects[${index}].localRoot`),
      projectId: optionalText(raw.projectId, `projects[${index}].projectId`),
      stableProjectIdentity: optionalText(raw.stableProjectIdentity, `projects[${index}].stableProjectIdentity`),
    };
  });
}


function parseContextObservations(value: unknown): ProviderContextObservation[] {
  if (!isObject(value)) throw new Error("Codex session reconciliation input must be an object.");
  const raw = value.contextObservations;
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error("contextObservations must be an array.");
  return raw.map((item, index) => {
    if (!isObject(item)) throw new Error(`contextObservations[${index}] must be an object.`);
    const provider = item.provider;
    if (provider !== "claude-code" && provider !== "codex" && provider !== "gemini" && provider !== "custom") {
      throw new Error(`contextObservations[${index}].provider is unsupported.`);
    }
    return {
      provider,
      providerSessionId: requireText(item.providerSessionId, `contextObservations[${index}].providerSessionId`),
      providerThreadId: optionalText(item.providerThreadId, `contextObservations[${index}].providerThreadId`),
      projectPath: requireText(item.projectPath, `contextObservations[${index}].projectPath`),
      stableProjectIdentity: requireText(item.stableProjectIdentity, `contextObservations[${index}].stableProjectIdentity`),
      observedAt: requireText(item.observedAt, `contextObservations[${index}].observedAt`),
    };
  });
}

function applyDirectProviderContextEvidence(
  bindings: ReturnType<typeof bindCodexThreadsToProjects>,
  projects: ProviderProjectDescriptor[],
  observations: ProviderContextObservation[],
) {
  const codex = observations.filter((observation) => observation.provider === "codex" && observation.providerThreadId !== null);
  return bindings.map((binding) => {
    const matching = codex.filter((observation) => observation.providerThreadId === binding.threadId);
    if (!matching.length) return binding;

    const directProjects = new Map<string, ProviderProjectDescriptor>();
    for (const observation of matching) {
      for (const project of projects) {
        if (project.stableProjectIdentity === observation.stableProjectIdentity
          || project.projectId === observation.stableProjectIdentity) {
          directProjects.set(project.desktopProjectId, project);
        }
      }
    }
    if (directProjects.size === 1) {
      return {
        ...binding,
        project: { ...[...directProjects.values()][0]! },
        attribution: "provider-context" as const,
      };
    }
    if (directProjects.size > 1) {
      return {
        ...binding,
        project: null,
        attribution: "provider-context-conflict" as const,
      };
    }
    return binding;
  });
}

async function main(): Promise<void> {
  const input = JSON.parse(readFileSync(0, "utf8")) as unknown;
  const projects = parseProjects(input);
  const contextObservations = parseContextObservations(input);
  const resolution = resolveCodexCommand();
  if (!resolution) {
    stdout.write(JSON.stringify({
      schemaVersion: 1,
      state: "unavailable",
      provider: "codex",
      observedAt: new Date().toISOString(),
      detail: "Codex executable could not be resolved safely.",
      bindings: [],
    }));
    return;
  }

  const clientVersion = process.env.LIVARIANT_CORE_VERSION?.trim() || "livariant-provider-reconciliation";
  let session;
  try {
    session = await connectCodexAppServer({
      clientVersion,
      command: resolution.command,
      argsPrefix: resolution.argsPrefix,
      timeoutMs: 5000,
    });
  } catch (error) {
    stdout.write(JSON.stringify({
      schemaVersion: 1,
      state: "unavailable",
      provider: "codex",
      observedAt: new Date().toISOString(),
      detail: error instanceof Error ? error.message : String(error),
      bindings: [],
    }));
    return;
  }

  try {
    const threads = await listCodexThreads(session);
    const bindings = applyDirectProviderContextEvidence(
      bindCodexThreadsToProjects(threads, projects),
      projects,
      contextObservations,
    );
    const sessions = summarizeCodexSessionProjects(bindings);
    stdout.write(JSON.stringify({
      schemaVersion: 1,
      state: "ready",
      provider: "codex",
      observedAt: new Date().toISOString(),
      detail: "Codex persisted threads were reconciled using direct Livariant Provider Context thread evidence first, with provider-owned cwd as fallback only.",
      bindings,
      sessions,
    }));
  } finally {
    session.close();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
