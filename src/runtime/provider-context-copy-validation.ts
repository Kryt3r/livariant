import type { ProjectContextItem } from "./context-snapshot.js";
import type { ProviderContextEvidence } from "./provider-context-types.js";

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function strictKeys(value: Record<string, unknown>, required: readonly string[], label: string): void {
  const allowed = new Set(required);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${label} contains unsupported field: ${key}.`);
  }
  for (const key of required) {
    if (!(key in value)) throw new Error(`${label} is missing required field: ${key}.`);
  }
}

function parseEvidenceItem(value: unknown, expectedAuthorityClass: ProjectContextItem["authorityClass"], label: string): ProjectContextItem {
  if (!plainObject(value)) throw new Error(`${label} item must be an object.`);
  strictKeys(value, ["value", "authorityClass"], `${label} item`);
  if (typeof value.value !== "string" || value.value.trim().length === 0) {
    throw new Error(`${label} item value must be a non-empty string.`);
  }
  if (value.authorityClass !== expectedAuthorityClass) {
    throw new Error(`${label} item authority class is invalid.`);
  }
  return {
    value: value.value,
    authorityClass: expectedAuthorityClass,
  };
}

function parseEvidenceItems(value: unknown, expectedAuthorityClass: ProjectContextItem["authorityClass"], label: string): ProjectContextItem[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((item) => parseEvidenceItem(item, expectedAuthorityClass, label));
}

export function validateProviderContextEvidence(value: unknown): ProviderContextEvidence {
  if (!plainObject(value)) throw new Error("Provider context evidence must be an object.");
  strictKeys(value, [
    "projectIdentity",
    "confirmedGoals",
    "activeDecisions",
    "knownFacts",
    "unresolvedUnknowns",
  ], "Provider context evidence");

  return {
    projectIdentity: parseEvidenceItems(value.projectIdentity, "canonical-project", "Provider context project identity evidence"),
    confirmedGoals: parseEvidenceItems(value.confirmedGoals, "canonical-project", "Provider context confirmed goals evidence"),
    activeDecisions: parseEvidenceItems(value.activeDecisions, "canonical-project", "Provider context active decisions evidence"),
    knownFacts: parseEvidenceItems(value.knownFacts, "canonical-project", "Provider context known facts evidence"),
    unresolvedUnknowns: parseEvidenceItems(value.unresolvedUnknowns, "unresolved-project", "Provider context unresolved unknowns evidence"),
  };
}
