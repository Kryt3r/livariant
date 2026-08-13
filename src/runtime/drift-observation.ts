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
