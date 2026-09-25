import { isAbsolute, normalize, relative, resolve, sep } from "node:path";
import type { CodexThreadCatalogEntry } from "./codex-thread-catalog.js";

export interface ProviderProjectDescriptor {
  desktopProjectId: string;
  localRoot: string;
  projectId: string | null;
  stableProjectIdentity: string | null;
}

export interface CodexThreadProjectBinding {
  threadId: string;
  sessionId: string;
  cwd: string;
  providerProjectId: string | null;
  project: ProviderProjectDescriptor | null;
  attribution: "cwd-exact" | "cwd-descendant" | "unattributed";
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
