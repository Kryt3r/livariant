import { aggregateObservedAttribution } from "./attribution.js";
import {
  aggregateDiagnosticEvents,
  diagnosticEventsInRange,
  type DiagnosticAttribution,
  type DiagnosticEvent,
  type DiagnosticPreset,
  type DiagnosticRange,
  type ObservedEvidenceSource,
} from "./efficiency.js";

export const DIAGNOSTIC_EXPORT_EVENT_LIMIT = 5000;

export type DiagnosticEvidenceExportEvent =
  | {
      kind: "observed";
      timestamp: string;
      source: ObservedEvidenceSource;
      attribution?: DiagnosticAttribution;
      usage: {
        inputTokens?: number;
        outputTokens?: number;
        cacheReadTokens?: number;
        cacheWriteTokens?: number;
        reasoningTokens?: number;
        totalTokens?: number;
      };
    }
  | {
      kind: "avoided";
      timestamp: string;
      attribution?: DiagnosticAttribution;
      metric: "context-tokens";
      consideredTokens: number;
      usedTokens: number;
      avoidedTokens: number;
    }
  | {
      kind: "estimated";
      timestamp: string;
      attribution?: DiagnosticAttribution;
      estimatedTokens: number;
      method: { id: string; version: string };
      confidence: "low" | "medium" | "high";
    };

export type DiagnosticEvidenceExport = {
  schemaVersion: 1;
  kind: "livariant-diagnostics-evidence-export";
  generatedAt: string;
  coreVersion: string;
  preset: DiagnosticPreset;
  range: DiagnosticRange;
  storage: "local-jsonl";
  measurementSemantics: {
    observed: "provider-or-runtime-owned-evidence";
    avoided: "qualified-demonstrably-avoided-work";
    estimated: "modeled-comparison-explicitly-estimated";
  };
  aggregate: ReturnType<typeof aggregateDiagnosticEvents>;
  attribution: ReturnType<typeof aggregateObservedAttribution>;
  evidenceSources: Array<ObservedEvidenceSource & { eventCount: number }>;
  eventWindow: { first?: string; last?: string };
  eventExport: {
    totalMatchingEvents: number;
    exportedEvents: number;
    limit: number;
    truncated: boolean;
  };
  events: DiagnosticEvidenceExportEvent[];
  privacy: {
    rawPromptsIncluded: false;
    freeformReasonsIncluded: false;
    projectFileContentsIncluded: false;
    localPathsIncluded: false;
    appCredentialStateIncluded: false;
  };
  boundaries: {
    modelAuthoredUsageAcceptedAsObserved: false;
    exportGrantsAuthority: false;
    exportPerformsSemanticApply: false;
    exportMutatesProjectFiles: false;
  };
};

function requireNonBlank(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be blank.`);
  return normalized;
}

function normalizeGeneratedAt(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Diagnostics export generatedAt must be a valid timestamp.");
  return date.toISOString();
}

function exportEvent(event: DiagnosticEvent): DiagnosticEvidenceExportEvent {
  if (event.kind === "observed") {
    return {
      kind: "observed",
      timestamp: event.timestamp,
      source: { ...event.source },
      ...(event.attribution === undefined ? {} : { attribution: { ...event.attribution } }),
      usage: { ...event.usage },
    };
  }
  if (event.kind === "avoided") {
    return {
      kind: "avoided",
      timestamp: event.timestamp,
      ...(event.attribution === undefined ? {} : { attribution: { ...event.attribution } }),
      metric: event.metric,
      consideredTokens: event.consideredTokens,
      usedTokens: event.usedTokens,
      avoidedTokens: event.consideredTokens - event.usedTokens,
    };
  }
  return {
    kind: "estimated",
    timestamp: event.timestamp,
    ...(event.attribution === undefined ? {} : { attribution: { ...event.attribution } }),
    estimatedTokens: event.estimatedTokens,
    method: { ...event.method },
    confidence: event.confidence,
  };
}

function evidenceSources(events: readonly DiagnosticEvent[]): DiagnosticEvidenceExport["evidenceSources"] {
  const groups = new Map<string, ObservedEvidenceSource & { eventCount: number }>();
  for (const event of events) {
    if (event.kind !== "observed") continue;
    const key = `${event.source.kind}\u0000${event.source.id}\u0000${event.source.version}`;
    const existing = groups.get(key);
    if (existing) existing.eventCount += 1;
    else groups.set(key, { ...event.source, eventCount: 1 });
  }
  return [...groups.values()].sort((left, right) =>
    right.eventCount - left.eventCount
      || left.kind.localeCompare(right.kind)
      || left.id.localeCompare(right.id)
      || left.version.localeCompare(right.version));
}

function eventWindow(events: readonly DiagnosticEvent[]): { first?: string; last?: string } {
  if (events.length === 0) return {};
  let first = events[0];
  let last = events[0];
  for (const event of events.slice(1)) {
    if (Date.parse(event.timestamp) < Date.parse(first.timestamp)) first = event;
    if (Date.parse(event.timestamp) > Date.parse(last.timestamp)) last = event;
  }
  return { first: first.timestamp, last: last.timestamp };
}

export function buildDiagnosticEvidenceExport(
  events: readonly DiagnosticEvent[],
  options: {
    preset: DiagnosticPreset;
    range: DiagnosticRange;
    coreVersion: string;
    generatedAt?: string | Date;
  },
): DiagnosticEvidenceExport {
  const coreVersion = requireNonBlank(options.coreVersion, "Diagnostics export coreVersion");
  const generatedAt = normalizeGeneratedAt(options.generatedAt ?? new Date());
  const selected = diagnosticEventsInRange(events, options.range);
  const aggregate = aggregateDiagnosticEvents(events, options.range);
  const attribution = aggregateObservedAttribution(events, options.range);
  const exported = selected.slice(0, DIAGNOSTIC_EXPORT_EVENT_LIMIT).map(exportEvent);

  return {
    schemaVersion: 1,
    kind: "livariant-diagnostics-evidence-export",
    generatedAt,
    coreVersion,
    preset: options.preset,
    range: { ...options.range },
    storage: "local-jsonl",
    measurementSemantics: {
      observed: "provider-or-runtime-owned-evidence",
      avoided: "qualified-demonstrably-avoided-work",
      estimated: "modeled-comparison-explicitly-estimated",
    },
    aggregate,
    attribution,
    evidenceSources: evidenceSources(selected),
    eventWindow: eventWindow(selected),
    eventExport: {
      totalMatchingEvents: selected.length,
      exportedEvents: exported.length,
      limit: DIAGNOSTIC_EXPORT_EVENT_LIMIT,
      truncated: selected.length > exported.length,
    },
    events: exported,
    privacy: {
      rawPromptsIncluded: false,
      freeformReasonsIncluded: false,
      projectFileContentsIncluded: false,
      localPathsIncluded: false,
      appCredentialStateIncluded: false,
    },
    boundaries: {
      modelAuthoredUsageAcceptedAsObserved: false,
      exportGrantsAuthority: false,
      exportPerformsSemanticApply: false,
      exportMutatesProjectFiles: false,
    },
  };
}
