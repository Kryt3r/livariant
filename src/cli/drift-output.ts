import type { DriftAssessmentResult } from "../runtime/drift-assessment.js";
import { renderDriftFinding, renderDriftText } from "./drift-render.js";

export function printDriftResult(result: DriftAssessmentResult, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(result));
    if (result.state === "blocked") process.exitCode = 3;
    return;
  }
  if (result.state === "blocked") {
    console.log("Conflict and drift assessment");
    console.log("State: blocked");
    console.log("Project: " + result.projectLocator);
    if (result.baseline) console.log(`Baseline: ${result.baseline.algorithm}:${result.baseline.digest}`);
    console.log("Findings:");
    for (const finding of result.findings) console.log(renderDriftFinding(finding));
    console.log("Changes made: 0");
    process.exitCode = 3;
    return;
  }
  const assessment = result.assessment;
  console.log("Conflict and drift assessment");
  console.log("State: assessment");
  console.log("Assessment ID: " + assessment.assessmentId);
  console.log("Project: " + assessment.projectLocator);
  console.log(`Baseline: ${assessment.baseline.algorithm}:${assessment.baseline.digest}`);
  console.log("Domain: " + assessment.observation.domain);
  console.log("Evidence class: " + assessment.observation.evidenceClass);
  console.log("Locator: " + renderDriftText(assessment.observation.locator));
  if (assessment.observation.decisionId) console.log("Decision ID: " + renderDriftText(assessment.observation.decisionId));
  console.log("Statement: " + renderDriftText(assessment.observation.statement));
  console.log("Diagnosis: " + assessment.diagnosis);
  console.log("Findings:");
  for (const finding of assessment.findings) console.log(renderDriftFinding(finding));
  console.log("Review only: true");
  console.log("Mutation authorization: false");
  console.log("Apply supported: false");
  console.log("Authorization eligible: false");
  console.log("Changes made: 0");
}
