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
