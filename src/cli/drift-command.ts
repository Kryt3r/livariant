import { buildConflictDriftAssessment, readDriftObservationFile } from "../runtime/drift-assessment.js";
import { driftInputPath } from "./drift-args.js";

export async function handleDriftCommand(args: string[]): Promise<void> {
  const observation = await readDriftObservationFile(driftInputPath(args));
  const result = await buildConflictDriftAssessment(observation);
  console.log(JSON.stringify(result));
}
