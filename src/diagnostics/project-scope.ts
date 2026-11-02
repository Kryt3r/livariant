import {
  diagnosticEventsInRange,
  type DiagnosticEvent,
  type DiagnosticRange,
} from "./efficiency.js";

export type ProjectScopedDiagnosticEvents = {
  events: DiagnosticEvent[];
  unattributedEventCount: number;
};

export type DiagnosticSessionProjectBindings = ReadonlyMap<string, string>;

export function filterDiagnosticEventsByProjectScope(
  events: readonly DiagnosticEvent[],
  range: DiagnosticRange,
  projectId: string,
  sessionProjects: DiagnosticSessionProjectBindings = new Map(),
): ProjectScopedDiagnosticEvents {
  const normalizedProjectId = projectId.trim();
  if (!normalizedProjectId || normalizedProjectId.length > 240) {
    throw new Error("Diagnostics project scope projectId is invalid.");
  }
  const inRange = diagnosticEventsInRange(events, range);
  const attributedProject = (event: DiagnosticEvent): string | undefined => {
    const explicit = event.attribution?.projectId?.trim();
    if (explicit) return explicit;
    const sessionId = event.attribution?.sessionId?.trim();
    return sessionId ? sessionProjects.get(sessionId) : undefined;
  };
  return {
    events: inRange.filter((event) => attributedProject(event) === normalizedProjectId),
    unattributedEventCount: inRange.filter((event) => attributedProject(event) === undefined).length,
  };
}
