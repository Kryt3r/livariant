import type { ProjectContextBaseline } from "./project-context-material.js";
import type { DoctorFinding } from "./doctor.js";
import type { DriftObservation } from "./drift-observation.js";
import type { DriftComparisonEvidence, DriftDiagnosis, DriftFinding } from "./drift-assessment-types.js";

export interface DriftAssessment {
  schemaVersion: 1;
  assessmentVersion: 1;
  assessmentId: string;
  materialDigest: { algorithm: "sha256"; domain: "livariant:drift-assessment:v1"; digest: string };
  generatedAt: string;
  projectLocator: string;
  stableProjectIdentity: null;
  baseline: ProjectContextBaseline;
  observation: DriftObservation;
  comparisonEvidence: DriftComparisonEvidence[];
  diagnosis: DriftDiagnosis;
  findings: DriftFinding[];
  actionability: { reviewOnly: true; mutationAuthorization: false; applySupported: false; authorizationEligible: false };
  changesMade: 0;
}

export type DriftAssessmentResult =
  | { state: "assessment"; assessment: DriftAssessment; changesMade: 0 }
  | { state: "blocked"; projectLocator: string; stableProjectIdentity: null; baseline: ProjectContextBaseline | null; assessment: null; findings: Array<DriftFinding | DoctorFinding>; reviewOnly: true; mutationAuthorization: false; applySupported: false; authorizationEligible: false; changesMade: 0 };

export interface DriftAssessmentBuildOptions {
  beforeRevalidate?: () => void | Promise<void>;
}
