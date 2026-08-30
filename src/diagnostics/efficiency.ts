export type DiagnosticConfidence = "low" | "medium" | "high";

export type DiagnosticAttribution = {
  provider?: string;
  model?: string;
  projectId?: string;
  sessionId?: string;
  taskId?: string;
};

type DiagnosticEventBase = {
  id: string;
  timestamp: string;
  attribution?: DiagnosticAttribution;
};

export type ObservedTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};

export type ObservedDiagnosticEvent = DiagnosticEventBase & {
  kind: "observed";
  usage: ObservedTokenUsage;
};

export type AvoidedDiagnosticEvent = DiagnosticEventBase & {
  kind: "avoided";
  metric: "context-tokens";
  consideredTokens: number;
  usedTokens: number;
  reason: string;
};

export type EstimatedDiagnosticEvent = DiagnosticEventBase & {
  kind: "estimated";
  estimatedTokens: number;
  method: {
    id: string;
    version: string;
  };
  confidence: DiagnosticConfidence;
  reason: string;
};

export type DiagnosticEvent =
  | ObservedDiagnosticEvent
  | AvoidedDiagnosticEvent
  | EstimatedDiagnosticEvent;

export type DiagnosticRange = {
  start?: string;
  end?: string;
};

export type DiagnosticAggregate = {
  range: DiagnosticRange;
  eventCount: number;
  observed: {
    eventCount: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    knownFieldCount: number;
    unknownFieldCount: number;
  };
  avoided: {
    eventCount: number;
    contextTokens: number;
  };
  estimated: {
    eventCount: number;
    tokens: number;
    byConfidence: Record<DiagnosticConfidence, number>;
    byMethod: Record<string, number>;
  };
};

export type DiagnosticPreset = "1d" | "7d" | "30d" | "90d" | "all";

const TOKEN_FIELDS = ["inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"] as const;

type TokenField = (typeof TOKEN_FIELDS)[number];

function assertFiniteNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
}

function parseTimestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid timestamp.`);
  }
  return parsed;
}

export function validateDiagnosticEvent(event: DiagnosticEvent): void {
  if (!event.id.trim()) {
    throw new Error("Diagnostic event id must not be empty.");
  }
  parseTimestamp(event.timestamp, "Diagnostic event timestamp");

  if (event.kind === "observed") {
    for (const field of TOKEN_FIELDS) {
      const value = event.usage[field];
      if (value !== undefined) {
        assertFiniteNonNegativeInteger(value, `Observed ${field}`);
      }
    }
    return;
  }

  if (event.kind === "avoided") {
    assertFiniteNonNegativeInteger(event.consideredTokens, "Avoided consideredTokens");
    assertFiniteNonNegativeInteger(event.usedTokens, "Avoided usedTokens");
    if (event.usedTokens > event.consideredTokens) {
      throw new Error("Avoided usedTokens must not exceed consideredTokens.");
    }
    if (!event.reason.trim()) {
      throw new Error("Avoided event reason must not be empty.");
    }
    return;
  }

  assertFiniteNonNegativeInteger(event.estimatedTokens, "Estimated estimatedTokens");
  if (!event.method.id.trim() || !event.method.version.trim()) {
    throw new Error("Estimated events require method id and version.");
  }
  if (!event.reason.trim()) {
    throw new Error("Estimated event reason must not be empty.");
  }
}

export function diagnosticRangeForPreset(
  preset: DiagnosticPreset,
  now: string | Date = new Date(),
): DiagnosticRange {
  if (preset === "all") {
    return {};
  }

  const endMs = now instanceof Date ? now.getTime() : parseTimestamp(now, "Range now");
  if (!Number.isFinite(endMs)) {
    throw new Error("Range now must be a valid timestamp.");
  }

  const days = Number.parseInt(preset, 10);
  return {
    start: new Date(endMs - days * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(endMs).toISOString(),
  };
}

function normalizeRange(range: DiagnosticRange): { start?: number; end?: number } {
  const start = range.start === undefined ? undefined : parseTimestamp(range.start, "Range start");
  const end = range.end === undefined ? undefined : parseTimestamp(range.end, "Range end");
  if (start !== undefined && end !== undefined && start >= end) {
    throw new Error("Diagnostic range start must be earlier than end.");
  }
  return { start, end };
}

function inRange(timestamp: string, range: { start?: number; end?: number }): boolean {
  const value = parseTimestamp(timestamp, "Diagnostic event timestamp");
  return (range.start === undefined || value >= range.start) && (range.end === undefined || value < range.end);
}

export function aggregateDiagnosticEvents(
  events: readonly DiagnosticEvent[],
  range: DiagnosticRange = {},
): DiagnosticAggregate {
  const normalizedRange = normalizeRange(range);
  const result: DiagnosticAggregate = {
    range: { ...range },
    eventCount: 0,
    observed: {
      eventCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      knownFieldCount: 0,
      unknownFieldCount: 0,
    },
    avoided: {
      eventCount: 0,
      contextTokens: 0,
    },
    estimated: {
      eventCount: 0,
      tokens: 0,
      byConfidence: { low: 0, medium: 0, high: 0 },
      byMethod: {},
    },
  };

  for (const event of events) {
    validateDiagnosticEvent(event);
    if (!inRange(event.timestamp, normalizedRange)) {
      continue;
    }

    result.eventCount += 1;

    if (event.kind === "observed") {
      result.observed.eventCount += 1;
      for (const field of TOKEN_FIELDS) {
        const value = event.usage[field];
        if (value === undefined) {
          result.observed.unknownFieldCount += 1;
        } else {
          result.observed.knownFieldCount += 1;
          result.observed[field as TokenField] += value;
        }
      }
      continue;
    }

    if (event.kind === "avoided") {
      result.avoided.eventCount += 1;
      result.avoided.contextTokens += event.consideredTokens - event.usedTokens;
      continue;
    }

    result.estimated.eventCount += 1;
    result.estimated.tokens += event.estimatedTokens;
    result.estimated.byConfidence[event.confidence] += event.estimatedTokens;
    const methodKey = `${event.method.id}@${event.method.version}`;
    result.estimated.byMethod[methodKey] = (result.estimated.byMethod[methodKey] ?? 0) + event.estimatedTokens;
  }

  return result;
}
