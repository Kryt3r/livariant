import { readFileSync } from "node:fs";
import { stdin, stdout } from "node:process";
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

async function main(): Promise<void> {
  const input = JSON.parse(readFileSync(0, "utf8")) as unknown;
  const projects = parseProjects(input);
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
    const bindings = bindCodexThreadsToProjects(threads, projects);
    const sessions = summarizeCodexSessionProjects(bindings);
    stdout.write(JSON.stringify({
      schemaVersion: 1,
      state: "ready",
      provider: "codex",
      observedAt: new Date().toISOString(),
      detail: "Codex persisted threads were reconciled against registered Livariant project roots by provider-owned cwd.",
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
