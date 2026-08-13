import type { DriftAssessmentResult } from "../runtime/drift-assessment.js";
import { renderDriftFinding } from "./drift-render.js";

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
  console.log(JSON.stringify(result));
}
