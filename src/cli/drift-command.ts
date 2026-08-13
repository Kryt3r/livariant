import { buildConflictDriftAssessment, readDriftObservationFile } from "../runtime/drift-assessment.js";
import { driftInputPath } from "./drift-args.js";
import { printDriftResult } from "./drift-output.js";

export async function handleDriftCommand(args: string[]): Promise<void> {
  const json = args.includes("--json");
  let observation;
  try {
    observation = await readDriftObservationFile(driftInputPath(args));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Observation input is invalid.";
    if (json) console.log(JSON.stringify({ state: "invalid-observation", error: { code: "observation-invalid", message }, changesMade: 0 }));
    else {
      console.log("Conflict and drift observation invalid");
      console.log("Reason: " + message);
      console.log("Changes made: 0");
    }
    process.exitCode = 2;
    return;
  }
  printDriftResult(await buildConflictDriftAssessment(observation), json);
}
