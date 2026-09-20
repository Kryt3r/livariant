import {
  diagnosticEventsInRange,
  type DiagnosticEvent,
  type DiagnosticRange,
} from "./efficiency.js";

export type ProjectScopedDiagnosticEvents = {
  events: DiagnosticEvent[];
  unattributedEventCount: number;
};

export function filterDiagnosticEventsByProjectScope(
  events: readonly DiagnosticEvent[],
  range: DiagnosticRange,
  projectId: string,
): ProjectScopedDiagnosticEvents {
  const normalizedProjectId = projectId.trim();
  if (!normalizedProjectId || normalizedProjectId.length > 240) {
    throw new Error("Diagnostics project scope projectId is invalid.");
  }
  const inRange = diagnosticEventsInRange(events, range);
  return {
    events: inRange.filter((event) => event.attribution?.projectId === normalizedProjectId),
    unattributedEventCount: inRange.filter((event) => event.attribution?.projectId === undefined).length,
  };
}
