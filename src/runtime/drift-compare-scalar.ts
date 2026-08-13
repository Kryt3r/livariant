import type { DriftObservation } from "./drift-observation.js";
import type { DriftComparisonEvidence, DriftFinding } from "./drift-assessment-types.js";

function finding(category: DriftFinding["category"], code: string, message: string, informational = false): DriftFinding {
  return { category, code, effect: informational ? "informational" : "review-required", message };
}

export function compareScalarObservation(observation: DriftObservation, confirmed: string[], unresolved: string[] = []) {
  if (confirmed.includes(observation.statement)) {
    const evidence: DriftComparisonEvidence[] = [{ authorityClass: "canonical-project", relationship: "confirmed-match", value: observation.statement }];
    if (observation.evidenceClass === "dependent-current") {
      return { diagnosis: "consistent" as const, evidence, findings: [finding("consistent", "confirmed-current-match", "The dependent-current observation exactly matches confirmed Project Brain evidence.", true)] };
    }
    return { diagnosis: "authority-ambiguous" as const, evidence, findings: [finding("authority-ambiguous", "noncurrent-class-matches-current", "Text equality does not promote historical or provider evidence to dependent-current authority.")] };
  }

  if (unresolved.includes(observation.statement)) {
    return {
      diagnosis: "authority-ambiguous" as const,
      evidence: [{ authorityClass: "unresolved-project" as const, relationship: "unresolved-match" as const, value: observation.statement }],
      findings: [finding("authority-ambiguous", "matches-unresolved-project-evidence", "The observation matches unresolved Project Brain evidence, not confirmed canonical truth.")],
    };
  }

  return {
    diagnosis: "insufficient-evidence" as const,
    evidence: [] as DriftComparisonEvidence[],
    findings: [finding("insufficient-evidence", "different-text-not-drift", "Different text alone is not proof of drift or contradiction.")],
  };
}
