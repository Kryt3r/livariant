import type { DecisionRecord } from "../project-brain/decisions.js";
import type { DriftObservation } from "./drift-observation.js";
import type { DriftComparisonEvidence, DriftFinding } from "./drift-assessment-types.js";

function finding(category: DriftFinding["category"], code: string, message: string, informational = false): DriftFinding {
  return { category, code, effect: informational ? "informational" : "review-required", message };
}

export function compareDecisionObservation(observation: DriftObservation, records: DecisionRecord[]) {
  if (!observation.decisionId) {
    return {
      diagnosis: "insufficient-evidence" as const,
      evidence: [] as DriftComparisonEvidence[],
      findings: [finding("insufficient-evidence", "decision-identity-not-bound", "A structured decision id is required for a strong decision relationship diagnosis in this slice.")],
    };
  }
  const matches = records.filter((record) => record.id === observation.decisionId);
  if (matches.length !== 1 || matches[0].legacy) {
    return {
      diagnosis: "authority-ambiguous" as const,
      evidence: [] as DriftComparisonEvidence[],
      findings: [finding("authority-ambiguous", "decision-identity-ambiguous", "The observation does not resolve to exactly one structured canonical decision record.")],
    };
  }
  const record = matches[0];
  if (record.text !== observation.statement) {
    return {
      diagnosis: "insufficient-evidence" as const,
      evidence: [{ authorityClass: "canonical-project" as const, relationship: "none" as const, value: record.text, decisionId: record.id }],
      findings: [finding("insufficient-evidence", "decision-text-differs", "Different text alone is not proof of drift or contradiction.")],
    };
  }
  return { record };
}
