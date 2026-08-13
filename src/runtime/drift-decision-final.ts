import type { DecisionRecord } from "../project-brain/decisions.js";
import type { DriftObservation } from "./drift-observation.js";
import { compareDecisionObservation } from "./drift-compare-decision.js";
import { compareActiveDecision } from "./drift-decision-active.js";
import { compareSupersededDecision } from "./drift-decision-superseded.js";

export function compareDecision(observation: DriftObservation, records: DecisionRecord[]) {
  const initial = compareDecisionObservation(observation, records) as any;
  if (!initial.record) return initial;
  const record = initial.record as DecisionRecord;
  return record.status === "active" ? compareActiveDecision(observation, record) : compareSupersededDecision(observation, record, records);
}
