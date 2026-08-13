import type { DecisionRecord } from "../project-brain/decisions.js";
import type { DriftObservation } from "./drift-observation.js";
import { compareDecisionObservation } from "./drift-compare-decision.js";
import { compareActiveDecision } from "./drift-decision-active.js";
import { compareSupersededDecision } from "./drift-decision-superseded.js";

export function compareDecision(observation: DriftObservation, records: DecisionRecord[]) {
  const initial = compareDecisionObservation(observation, records);
  if (!("record" in initial)) return initial;
  return initial.record.status === "active"
    ? compareActiveDecision(observation, initial.record)
    : compareSupersededDecision(observation, initial.record, records);
}
