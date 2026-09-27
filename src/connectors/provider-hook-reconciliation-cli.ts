import { readFileSync } from "node:fs";
import { isAbsolute, normalize, relative, resolve, sep } from "node:path";

type JsonObject = Record<string, unknown>;

interface Project {
  desktopProjectId: string;
  localRoot: string;
  projectId: string | null;
  stableProjectIdentity: string | null;
}

interface Observation {
  provider: "claude" | "gemini";
  sessionId: string;
  cwd: string;
  transcriptPath: string | null;
  hookEventName: string;
  observedAt: string;
}


interface ManualDecision {
  provider: "codex" | "claude" | "gemini" | "custom";
  providerItemId: string;
  decision: "assigned" | "unassigned";
  desktopProjectId: string | null;
  updatedAtUnixMs: number;
}

function object(value: unknown, field: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${field} must be an object.`);
  return value as JsonObject;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-blank string.`);
  return value.trim();
}

function nullableText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return text(value, field);
}

function pathKey(value: string): string {
  const absolute = isAbsolute(value) ? normalize(value) : normalize(resolve(value));
  return process.platform === "win32" ? absolute.toLowerCase() : absolute;
}

function inside(root: string, cwd: string): boolean {
  const rel = relative(root, cwd);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

const input = object(JSON.parse(readFileSync(0, "utf8")) as unknown, "input");
if (!Array.isArray(input.projects) || !Array.isArray(input.observations)) {
  throw new Error("Provider hook reconciliation input must contain projects and observations arrays.");
}
const manualRaw = input.manualDecisions === undefined ? [] : input.manualDecisions;
if (!Array.isArray(manualRaw)) throw new Error("manualDecisions must be an array.");

const projects: Project[] = input.projects.map((raw, index) => {
  const value = object(raw, `projects[${index}]`);
  return {
    desktopProjectId: text(value.desktopProjectId, `projects[${index}].desktopProjectId`),
    localRoot: text(value.localRoot, `projects[${index}].localRoot`),
    projectId: nullableText(value.projectId, `projects[${index}].projectId`),
    stableProjectIdentity: nullableText(value.stableProjectIdentity, `projects[${index}].stableProjectIdentity`),
  };
});

const observations: Observation[] = input.observations.map((raw, index) => {
  const value = object(raw, `observations[${index}]`);
  if (value.provider !== "claude" && value.provider !== "gemini") throw new Error("Provider hook observation provider is unsupported.");
  return {
    provider: value.provider,
    sessionId: text(value.sessionId, `observations[${index}].sessionId`),
    cwd: text(value.cwd, `observations[${index}].cwd`),
    transcriptPath: nullableText(value.transcriptPath, `observations[${index}].transcriptPath`),
    hookEventName: text(value.hookEventName, `observations[${index}].hookEventName`),
    observedAt: text(value.observedAt, `observations[${index}].observedAt`),
  };
});

const manualDecisions: ManualDecision[] = manualRaw.map((raw, index) => {
  const value = object(raw, `manualDecisions[${index}]`);
  const provider = value.provider;
  if (provider !== "codex" && provider !== "claude" && provider !== "gemini" && provider !== "custom") {
    throw new Error(`manualDecisions[${index}].provider is unsupported.`);
  }
  if (value.decision !== "assigned" && value.decision !== "unassigned") {
    throw new Error(`manualDecisions[${index}].decision is unsupported.`);
  }
  return {
    provider,
    providerItemId: text(value.providerItemId, `manualDecisions[${index}].providerItemId`),
    decision: value.decision,
    desktopProjectId: nullableText(value.desktopProjectId, `manualDecisions[${index}].desktopProjectId`),
    updatedAtUnixMs: typeof value.updatedAtUnixMs === "number" && Number.isFinite(value.updatedAtUnixMs) ? value.updatedAtUnixMs : 0,
  };
});

const groups = new Map<string, Observation[]>();
for (const observation of observations) {
  const key = `${observation.provider}\u0000${observation.sessionId}`;
  groups.set(key, [...(groups.get(key) ?? []), observation]);
}

const automaticBindings = [...groups.values()].map((events) => {
  const first = events[0]!;
  const matchedProjects = new Map<string, Project>();
  let unattributed = false;
  for (const event of events) {
    const cwd = pathKey(event.cwd);
    const candidates = projects
      .map((project) => ({ project, root: pathKey(project.localRoot) }))
      .filter(({ root }) => inside(root, cwd))
      .sort((a, b) => b.root.length - a.root.length);
    const candidate = candidates[0];
    if (!candidate) {
      unattributed = true;
      continue;
    }
    const sameLength = candidates.filter((item) => item.root.length === candidate.root.length);
    if (sameLength.length !== 1) {
      unattributed = true;
      continue;
    }
    matchedProjects.set(candidate.project.desktopProjectId, candidate.project);
  }

  const consistent = matchedProjects.size === 1 && !unattributed;
  const project = consistent ? [...matchedProjects.values()][0]! : null;
  const latest = [...events].sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0]!;
  return {
    provider: first.provider,
    sessionId: first.sessionId,
    project,
    attribution: consistent ? "cwd-consistent" : matchedProjects.size > 1 ? "mixed-projects" : "unattributed",
    cwdEvidence: [...new Set(events.map((event) => event.cwd))],
    transcriptPaths: [...new Set(events.map((event) => event.transcriptPath).filter((value): value is string => value !== null))],
    latestObservedAt: latest.observedAt,
    eventCount: events.length,
  };
});

const latestManual = new Map(
  manualDecisions
    .filter((decision) => decision.provider === "claude" || decision.provider === "gemini")
    .sort((a, b) => a.updatedAtUnixMs - b.updatedAtUnixMs)
    .map((decision) => [`${decision.provider}\u0000${decision.providerItemId}`, decision] as const),
);
const projectById = new Map(projects.map((project) => [project.desktopProjectId, project]));
const bindings = automaticBindings.map((binding) => {
  const decision = latestManual.get(`${binding.provider}\u0000${binding.sessionId}`);
  if (!decision) return binding;
  if (decision.decision === "unassigned") {
    return { ...binding, project: null, attribution: "user-unassigned" as const };
  }
  const project = decision.desktopProjectId === null ? undefined : projectById.get(decision.desktopProjectId);
  if (!project) return { ...binding, project: null, attribution: "manual-project-unavailable" as const };
  return { ...binding, project, attribution: "manual" as const };
});

process.stdout.write(JSON.stringify({
  schemaVersion: 1,
  state: "ready",
  observedAt: new Date().toISOString(),
  bindings,
  boundaries: {
    desktopSelectionControlsRouting: false,
    evidenceIsProjectTruth: false,
    evidenceGrantsAuthority: false,
    changesProjectOwnedFiles: false,
  },
}));
