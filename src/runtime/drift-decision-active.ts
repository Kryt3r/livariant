import type { DecisionRecord } from "../project-brain/decisions.js";
import type { DriftObservation } from "./drift-observation.js";
import type { DriftFinding } from "./drift-assessment-types.js";

function finding(category: DriftFinding["category"], code: string, message: string, informational = false): DriftFinding {
  return { category, code, effect: informational ? "informational" : "review-required", message };
}

export function compareActiveDecision(observation: DriftObservation, record: DecisionRecord) {
  const evidence = [{ authorityClass: "canonical-project" as const, relationship: "active-match" as const, value: record.text, decisionId: record.id }];
  if (observation.evidenceClass === "dependent-current") {
    return { diagnosis: "consistent" as const, evidence, findings: [finding("consistent", "active-decision-match", "The dependent-current observation exactly matches the named active canonical decision.", true)] };
  }
  return { diagnosis: "authority-ambiguous" as const, evidence, findings: [finding("authority-ambiguous", "noncurrent-class-matches-active", "Text equality does not promote historical or provider evidence to current project authority.")] };
}
