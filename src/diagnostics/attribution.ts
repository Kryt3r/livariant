import {
  type DiagnosticAttribution,
  type DiagnosticEvent,
  type DiagnosticRange,
  validateDiagnosticEvent,
} from "./efficiency.js";

export type DiagnosticAttributionDimension = keyof DiagnosticAttribution;

export type ObservedAttributionGroup = {
  value: string;
  eventCount: number;
  totalTokens: number;
  knownTotalTokenEvents: number;
  unknownTotalTokenEvents: number;
};

export type ObservedAttributionDimensionSummary = {
  attributedEventCount: number;
  unattributedEventCount: number;
  groups: ObservedAttributionGroup[];
};

export type ObservedAttributionSummary = Record<DiagnosticAttributionDimension, ObservedAttributionDimensionSummary>;

const DIMENSIONS: readonly DiagnosticAttributionDimension[] = ["provider", "model", "projectId", "sessionId", "taskId"];

function parseTimestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid timestamp.`);
  return parsed;
}

function normalizeRange(range: DiagnosticRange): { start?: number; end?: number } {
  const start = range.start === undefined ? undefined : parseTimestamp(range.start, "Range start");
  const end = range.end === undefined ? undefined : parseTimestamp(range.end, "Range end");
  if (start !== undefined && end !== undefined && start >= end) throw new Error("Diagnostic range start must be earlier than end.");
  return { start, end };
}

function inRange(timestamp: string, range: { start?: number; end?: number }): boolean {
  const value = parseTimestamp(timestamp, "Diagnostic event timestamp");
  return (range.start === undefined || value >= range.start) && (range.end === undefined || value < range.end);
}

function emptyDimension(): ObservedAttributionDimensionSummary {
  return { attributedEventCount: 0, unattributedEventCount: 0, groups: [] };
}

export function aggregateObservedAttribution(
  events: readonly DiagnosticEvent[],
  range: DiagnosticRange = {},
): ObservedAttributionSummary {
  const normalizedRange = normalizeRange(range);
  const result: ObservedAttributionSummary = {
    provider: emptyDimension(),
    model: emptyDimension(),
    projectId: emptyDimension(),
    sessionId: emptyDimension(),
    taskId: emptyDimension(),
  };
  const groupMaps = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, new Map<string, ObservedAttributionGroup>()])) as Record<
    DiagnosticAttributionDimension,
    Map<string, ObservedAttributionGroup>
  >;

  for (const event of events) {
    validateDiagnosticEvent(event);
    if (event.kind !== "observed" || !inRange(event.timestamp, normalizedRange)) continue;

    for (const dimension of DIMENSIONS) {
      const value = event.attribution?.[dimension]?.trim();
      if (!value) {
        result[dimension].unattributedEventCount += 1;
        continue;
      }
      result[dimension].attributedEventCount += 1;
      const groups = groupMaps[dimension];
      const group = groups.get(value) ?? {
        value,
        eventCount: 0,
        totalTokens: 0,
        knownTotalTokenEvents: 0,
        unknownTotalTokenEvents: 0,
      };
      group.eventCount += 1;
      if (event.usage.totalTokens === undefined) group.unknownTotalTokenEvents += 1;
      else {
        group.knownTotalTokenEvents += 1;
        group.totalTokens += event.usage.totalTokens;
      }
      groups.set(value, group);
    }
  }

  for (const dimension of DIMENSIONS) {
    result[dimension].groups = [...groupMaps[dimension].values()].sort(
      (left, right) => right.totalTokens - left.totalTokens || right.eventCount - left.eventCount || left.value.localeCompare(right.value),
    );
  }
  return result;
}
