import { lstat, readFile } from "node:fs/promises";

export const DRIFT_SCHEMA_VERSION = 1;
export const DRIFT_INPUT_MAX_BYTES = 65536;
export const DRIFT_TEXT_MAX_BYTES = 4096;
export const DRIFT_LOCATOR_MAX_BYTES = 2048;

export type DriftDomain = "project-decision" | "project-goal" | "project-knowledge";
export type DriftEvidenceClass = "dependent-current" | "historical" | "provider-observation";

export interface DriftObservation {
  schemaVersion: 1;
  domain: DriftDomain;
  evidenceClass: DriftEvidenceClass;
  statement: string;
  locator: string;
  decisionId?: string;
}

const DOMAINS = new Set<DriftDomain>(["project-decision", "project-goal", "project-knowledge"]);
const EVIDENCE_CLASSES = new Set<DriftEvidenceClass>(["dependent-current", "historical", "provider-observation"]);

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function boundedText(value: unknown, label: string, maxBytes: number, scalar = false): string {
  if (typeof value !== "string") throw new Error(label + " must be a string.");
  const normalized = value.trim();
  if (!normalized) throw new Error(label + " must not be empty.");
  if (Buffer.byteLength(normalized, "utf8") > maxBytes) throw new Error(label + " exceeds the supported size limit.");
  if (scalar && /\r|\n/.test(normalized)) throw new Error(label + " must be a single-line scalar value.");
  return normalized;
}

export function parseDriftObservation(value: unknown): DriftObservation {
  if (!plainObject(value)) throw new Error("Observation JSON must contain one object.");
  if (value.schemaVersion !== DRIFT_SCHEMA_VERSION) throw new Error("Observation schema version is unsupported.");
  if (typeof value.domain !== "string" || !DOMAINS.has(value.domain as DriftDomain)) throw new Error("Observation domain is unsupported.");
  if (typeof value.evidenceClass !== "string" || !EVIDENCE_CLASSES.has(value.evidenceClass as DriftEvidenceClass)) throw new Error("Observation evidence class is unsupported.");

  const domain = value.domain as DriftDomain;
  const allowed = new Set(domain === "project-decision"
    ? ["schemaVersion", "domain", "evidenceClass", "statement", "locator", "decisionId"]
    : ["schemaVersion", "domain", "evidenceClass", "statement", "locator"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error("Observation schema contains an unsupported field.");
  for (const key of ["schemaVersion", "domain", "evidenceClass", "statement", "locator"]) {
    if (!(key in value)) throw new Error("Observation schema is missing a required field.");
  }

  const observation: DriftObservation = {
    schemaVersion: 1,
    domain,
    evidenceClass: value.evidenceClass as DriftEvidenceClass,
    statement: boundedText(value.statement, "Observation statement", DRIFT_TEXT_MAX_BYTES, domain !== "project-decision"),
    locator: boundedText(value.locator, "Observation locator", DRIFT_LOCATOR_MAX_BYTES, true),
  };
  if (domain === "project-decision" && value.decisionId !== undefined) observation.decisionId = boundedText(value.decisionId, "Decision id", 256, true);
  return observation;
}
