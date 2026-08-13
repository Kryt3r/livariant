import { lstat, readFile } from "node:fs/promises";
import { DRIFT_INPUT_MAX_BYTES, parseDriftObservation, type DriftObservation } from "./drift-observation.js";

export async function readDriftObservationFile(path: string): Promise<DriftObservation> {
  let metadata;
  try { metadata = await lstat(path); } catch { throw new Error("Observation file cannot be read."); }
  if (!metadata.isFile()) throw new Error("Observation input must be a regular file.");
  if (metadata.size > DRIFT_INPUT_MAX_BYTES) throw new Error("Observation file exceeds the supported size limit.");
  let raw: string;
  try { raw = await readFile(path, "utf8"); } catch { throw new Error("Observation file cannot be read."); }
  if (Buffer.byteLength(raw, "utf8") > DRIFT_INPUT_MAX_BYTES) throw new Error("Observation file exceeds the supported size limit.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Observation file is not valid JSON."); }
  return parseDriftObservation(parsed);
}
