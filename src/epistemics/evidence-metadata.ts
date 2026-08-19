export const EPISTEMIC_EVIDENCE_SCHEMA_VERSION = 1 as const;

export type EvidenceSourceClass =
  | "human-confirmed"
  | "canonical-project"
  | "project-observation"
  | "external-evidence"
  | "tool-observation"
  | "ai-inference"
  | "ai-summary"
  | "historical-state";

export type EpistemicState =
  | "confirmed"
  | "observed"
  | "inferred"
  | "unknown"
  | "conflicted"
  | "historical";

export type EvidenceCurrencyState =
  | "current"
  | "possibly-stale"
  | "requires-revalidation"
  | "historical";

export type EvidenceBindingKind =
  | "project-baseline"
  | "source-snapshot"
  | "content-digest"
  | "material-digest"
  | "explicit-state";

export interface EvidenceBinding {
  kind: EvidenceBindingKind;
  id: string;
}

/**
 * Descriptive evidence metadata only.
 *
 * This contract never grants mutation, runtime or release Authority. Existing
 * consumer-specific trust, freshness and roundtrip validation remains stronger
 * and must not be replaced by this metadata.
 */
export interface EpistemicEvidenceMetadata {
  schemaVersion: 1;
  sourceClass: EvidenceSourceClass;
  epistemicState: EpistemicState;
  currency: EvidenceCurrencyState;
  binding?: EvidenceBinding;
  sourceId?: string;
  derivedFrom?: string[];
  grantsAuthority: false;
}

const SOURCE_CLASSES = new Set<EvidenceSourceClass>([
  "human-confirmed",
  "canonical-project",
  "project-observation",
  "external-evidence",
  "tool-observation",
  "ai-inference",
  "ai-summary",
  "historical-state",
]);

const EPISTEMIC_STATES = new Set<EpistemicState>([
  "confirmed",
  "observed",
  "inferred",
  "unknown",
  "conflicted",
  "historical",
]);

const CURRENCY_STATES = new Set<EvidenceCurrencyState>([
  "current",
  "possibly-stale",
  "requires-revalidation",
  "historical",
]);

const BINDING_KINDS = new Set<EvidenceBindingKind>([
  "project-baseline",
  "source-snapshot",
  "content-digest",
  "material-digest",
  "explicit-state",
]);

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${label} must be a non-empty string.`);
  return value;
}

function strictKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`Epistemic evidence metadata contains unsupported field: ${key}.`);
  }
}

function parseBinding(value: unknown): EvidenceBinding | undefined {
  if (value === undefined) return undefined;
  if (!plainObject(value)) throw new Error("Epistemic evidence binding must be an object.");
  strictKeys(value, ["kind", "id"]);
  if (!BINDING_KINDS.has(value.kind as EvidenceBindingKind)) throw new Error("Epistemic evidence binding kind is unsupported.");
  return {
    kind: value.kind as EvidenceBindingKind,
    id: nonEmptyString(value.id, "Epistemic evidence binding id"),
  };
}

function parseDerivedFrom(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("Epistemic evidence derivedFrom must be an array when present.");
  const result = value.map((item) => nonEmptyString(item, "Epistemic evidence derivedFrom item"));
  if (new Set(result).size !== result.length) throw new Error("Epistemic evidence derivedFrom entries must be unique.");
  return result;
}

export function validateEpistemicEvidenceMetadata(value: unknown): EpistemicEvidenceMetadata {
  if (!plainObject(value)) throw new Error("Epistemic evidence metadata must be an object.");
  strictKeys(value, [
    "schemaVersion",
    "sourceClass",
    "epistemicState",
    "currency",
    "binding",
    "sourceId",
    "derivedFrom",
    "grantsAuthority",
  ]);

  if (value.schemaVersion !== EPISTEMIC_EVIDENCE_SCHEMA_VERSION) throw new Error("Epistemic evidence schema version is unsupported.");
  if (!SOURCE_CLASSES.has(value.sourceClass as EvidenceSourceClass)) throw new Error("Epistemic evidence source class is unsupported.");
  if (!EPISTEMIC_STATES.has(value.epistemicState as EpistemicState)) throw new Error("Epistemic evidence state is unsupported.");
  if (!CURRENCY_STATES.has(value.currency as EvidenceCurrencyState)) throw new Error("Epistemic evidence currency state is unsupported.");
  if (value.grantsAuthority !== false) throw new Error("Epistemic evidence metadata cannot grant Authority.");

  const sourceClass = value.sourceClass as EvidenceSourceClass;
  const epistemicState = value.epistemicState as EpistemicState;
  const currency = value.currency as EvidenceCurrencyState;
  const binding = parseBinding(value.binding);
  const sourceId = value.sourceId === undefined ? undefined : nonEmptyString(value.sourceId, "Epistemic evidence sourceId");
  const derivedFrom = parseDerivedFrom(value.derivedFrom);

  if (epistemicState === "confirmed" && sourceClass !== "human-confirmed" && sourceClass !== "canonical-project") {
    throw new Error("Only human-confirmed or canonical-project evidence may use the confirmed epistemic state.");
  }

  if ((sourceClass === "ai-inference" || sourceClass === "ai-summary") && epistemicState === "confirmed") {
    throw new Error("AI-derived evidence cannot become confirmed merely through metadata.");
  }

  if (currency === "current" && binding === undefined) {
    throw new Error("Current epistemic evidence requires an explicit material, snapshot, baseline, digest or state binding.");
  }

  if ((epistemicState === "historical") !== (currency === "historical")) {
    throw new Error("Historical epistemic state and historical currency must agree.");
  }

  if (sourceClass === "historical-state" && epistemicState !== "historical") {
    throw new Error("Historical-state evidence must use the historical epistemic state.");
  }

  return {
    schemaVersion: EPISTEMIC_EVIDENCE_SCHEMA_VERSION,
    sourceClass,
    epistemicState,
    currency,
    ...(binding ? { binding } : {}),
    ...(sourceId ? { sourceId } : {}),
    ...(derivedFrom ? { derivedFrom } : {}),
    grantsAuthority: false,
  };
}
