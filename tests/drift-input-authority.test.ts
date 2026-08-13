import assert from "node:assert/strict";
import test from "node:test";
import { parseDriftObservation } from "../src/runtime/drift-assessment.js";

const base = { schemaVersion: 1, domain: "project-goal", evidenceClass: "dependent-current", statement: "Ship preview", locator: "goal-surface" };

test("observation input rejects unsupported control fields", () => {
  for (const key of ["diagnosis", "severity", "canonical", "approved", "authorized", "baseline", "assessmentId"]) {
    assert.throws(() => parseDriftObservation({ ...base, [key]: "caller-value" }), /unsupported field/);
  }
});
