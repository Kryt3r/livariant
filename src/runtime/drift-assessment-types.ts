import type { ProjectContextBaseline } from "./project-context-material.js";
import type { DriftObservation } from "./drift-observation.js";

export type DriftDiagnosis = "consistent" | "confirmed-drift" | "historical-match" | "authority-ambiguous" | "insufficient-evidence";

export interface DriftComparisonEvidence {
  authorityClass: "canonical-project" | "unresolved-project";
  relationship: "active-match" | "superseded-match" | "confirmed-match" | "unresolved-match" | "none";
  value?: string;
  decisionId?: string;
  replacementDecisionId?: string;
  replacementValue?: string;
}

export interface DriftFinding {
  category: DriftDiagnosis;
  code: string;
  effect: "informational" | "review-required";
  message: string;
}

export interface DriftAssessmentMaterial {
  projectLocator: string;
  baseline: ProjectContextBaseline;
  observation: DriftObservation;
  comparisonEvidence: DriftComparisonEvidence[];
  diagnosis: DriftDiagnosis;
  findings: DriftFinding[];
}
