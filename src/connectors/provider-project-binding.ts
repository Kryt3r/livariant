import { isAbsolute, normalize, relative, resolve, sep } from "node:path";
import type { CodexThreadCatalogEntry } from "./codex-thread-catalog.js";
import type { CodexProjectCatalogEntry } from "./codex-project-catalog.js";

export interface ProviderProjectDescriptor {
  desktopProjectId: string;
  localRoot: string;
  projectId: string | null;
  stableProjectIdentity: string | null;
}

export interface CodexSessionProjectBinding {
  sessionId: string;
  threadIds: string[];
  project: ProviderProjectDescriptor | null;
  attribution: "consistent-project" | "mixed-projects" | "unattributed";
}

export interface CodexThreadProjectBinding {
  threadId: string;
  sessionId: string;
  cwd: string;
  providerProjectId: string | null;
  project: ProviderProjectDescriptor | null;
  attribution: "provider-context" | "provider-context-conflict" | "provider-workspace" | "provider-workspace-conflict" | "provider-project" | "provider-project-conflict" | "cwd-exact" | "cwd-descendant" | "unattributed";
}

function pathKey(value: string): string {
  const absolute = isAbsolute(value) ? normalize(value) : normalize(resolve(value));
  return process.platform === "win32" ? absolute.toLowerCase() : absolute;
}

function relativeInside(root: string, cwd: string): { matches: boolean; exact: boolean } {
  const rel = relative(root, cwd);
  if (rel === "") return { matches: true, exact: true };
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return { matches: false, exact: false };
  return { matches: true, exact: false };
}

export function bindCodexThreadsToProjects(
  threads: readonly CodexThreadCatalogEntry[],
  projects: readonly ProviderProjectDescriptor[],
): CodexThreadProjectBinding[] {
  const normalizedProjects = projects.map((project) => ({
    project,
    root: pathKey(project.localRoot),
  }));

  return threads.map((thread) => {
    const cwd = pathKey(thread.cwd);
    const candidates = normalizedProjects
      .map(({ project, root }) => {
        const relation = relativeInside(root, cwd);
        return { project, root, ...relation };
      })
      .filter((candidate) => candidate.matches)
      .sort((a, b) => b.root.length - a.root.length);

    const first = candidates[0];
    const tied = first !== undefined
      && candidates.filter((candidate) => candidate.root.length === first.root.length).length > 1;

    if (first === undefined || tied) {
      return {
        threadId: thread.threadId,
        sessionId: thread.sessionId,
        cwd: thread.cwd,
        providerProjectId: thread.projectId,
        project: null,
        attribution: "unattributed" as const,
      };
    }

    return {
      threadId: thread.threadId,
      sessionId: thread.sessionId,
      cwd: thread.cwd,
      providerProjectId: thread.projectId,
      project: { ...first.project },
      attribution: first.exact ? "cwd-exact" as const : "cwd-descendant" as const,
    };
  });
}



export function applyCodexRuntimeWorkspaceBindings(
  bindings: readonly CodexThreadProjectBinding[],
  threads: readonly CodexThreadCatalogEntry[],
  projects: readonly ProviderProjectDescriptor[],
): CodexThreadProjectBinding[] {
  const threadById = new Map(threads.map((thread) => [thread.threadId, thread]));
  const normalizedLivariant = projects.map((project) => ({ project, root: pathKey(project.localRoot) }));

  return bindings.map((binding) => {
    if (binding.attribution === "provider-context" || binding.attribution === "provider-context-conflict") return binding;
    const thread = threadById.get(binding.threadId);
    if (!thread || thread.runtimeWorkspaceRoots.length === 0) return binding;

    const candidates = new Map<string, ProviderProjectDescriptor>();
    for (const root of thread.runtimeWorkspaceRoots.map(pathKey)) {
      for (const candidate of normalizedLivariant) {
        const relation = relativeInside(candidate.root, root);
        const reverse = relativeInside(root, candidate.root);
        if (relation.matches || reverse.matches) candidates.set(candidate.project.desktopProjectId, candidate.project);
      }
    }
    if (candidates.size === 1) {
      return {
        ...binding,
        project: { ...[...candidates.values()][0]! },
        attribution: "provider-workspace" as const,
      };
    }
    if (candidates.size > 1) {
      return {
        ...binding,
        project: null,
        attribution: "provider-workspace-conflict" as const,
      };
    }
    return binding;
  });
}

export function applyCodexProviderProjectBindings(
  bindings: readonly CodexThreadProjectBinding[],
  providerProjects: readonly CodexProjectCatalogEntry[],
  projects: readonly ProviderProjectDescriptor[],
): CodexThreadProjectBinding[] {
  const providerById = new Map(providerProjects.map((project) => [project.projectId, project]));
  const normalizedLivariant = projects.map((project) => ({ project, root: pathKey(project.localRoot) }));

  return bindings.map((binding) => {
    if (binding.providerProjectId === null || binding.attribution === "provider-context" || binding.attribution === "provider-context-conflict") {
      return binding;
    }
    const providerProject = providerById.get(binding.providerProjectId);
    if (!providerProject) return binding;

    const candidates = new Map<string, ProviderProjectDescriptor>();
    for (const root of providerProject.roots.map(pathKey)) {
      for (const candidate of normalizedLivariant) {
        const relation = relativeInside(candidate.root, root);
        const reverse = relativeInside(root, candidate.root);
        if (relation.matches || reverse.matches) candidates.set(candidate.project.desktopProjectId, candidate.project);
      }
    }
    if (candidates.size === 1) {
      return {
        ...binding,
        project: { ...[...candidates.values()][0]! },
        attribution: "provider-project" as const,
      };
    }
    if (candidates.size > 1) {
      return {
        ...binding,
        project: null,
        attribution: "provider-project-conflict" as const,
      };
    }
    return binding;
  });
}

export function summarizeCodexSessionProjects(
  bindings: readonly CodexThreadProjectBinding[],
): CodexSessionProjectBinding[] {
  const groups = new Map<string, CodexThreadProjectBinding[]>();
  for (const binding of bindings) {
    const current = groups.get(binding.sessionId) ?? [];
    current.push(binding);
    groups.set(binding.sessionId, current);
  }

  return [...groups.entries()].map(([sessionId, sessionBindings]) => {
    const attributed = sessionBindings.filter((binding) => binding.project !== null);
    const projectIds = new Set(attributed.map((binding) => binding.project!.desktopProjectId));
    if (projectIds.size === 0) {
      return {
        sessionId,
        threadIds: sessionBindings.map((binding) => binding.threadId),
        project: null,
        attribution: "unattributed" as const,
      };
    }
    if (projectIds.size > 1 || attributed.length !== sessionBindings.length) {
      return {
        sessionId,
        threadIds: sessionBindings.map((binding) => binding.threadId),
        project: null,
        attribution: "mixed-projects" as const,
      };
    }
    return {
      sessionId,
      threadIds: sessionBindings.map((binding) => binding.threadId),
      project: { ...attributed[0]!.project! },
      attribution: "consistent-project" as const,
    };
  });
}
