import type { DecisionRecord } from "../project-brain/decisions.js";
import type { DriftObservation } from "./drift-observation.js";
import type { DriftComparisonEvidence, DriftFinding } from "./drift-assessment-types.js";

function finding(category: DriftFinding["category"], code: string, message: string, informational = false): DriftFinding {
  return { category, code, effect: informational ? "informational" : "review-required", message };
}

export function compareSupersededDecision(observation: DriftObservation, record: DecisionRecord, records: DecisionRecord[]) {
  const replacement = record.supersededBy
    ? records.find((candidate) => candidate.id === record.supersededBy && candidate.status === "active" && !candidate.legacy)
    : undefined;
  const evidence: DriftComparisonEvidence[] = [{
    authorityClass: "canonical-project",
    relationship: "superseded-match",
    value: record.text,
    decisionId: record.id,
    replacementDecisionId: replacement?.id,
    replacementValue: replacement?.text,
  }];

  if (observation.evidenceClass === "historical") {
    return { diagnosis: "historical-match" as const, evidence, findings: [finding("historical-match", "superseded-decision-historical-match", "The historical observation exactly matches a superseded canonical decision record.", true)] };
  }
  if (observation.evidenceClass === "provider-observation" || !replacement) {
    return { diagnosis: "authority-ambiguous" as const, evidence, findings: [finding("authority-ambiguous", "superseded-decision-not-current-proof", "This observation does not establish a current dependent relationship to the superseded decision.")] };
  }
  return { diagnosis: "confirmed-drift" as const, evidence, findings: [finding("confirmed-drift", "dependent-current-superseded-decision", "The dependent-current observation matches a superseded canonical decision and the current replacement is known.")] };
}
