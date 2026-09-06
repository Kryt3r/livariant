import assert from "node:assert/strict";
import test from "node:test";
import { assertDiagnosticsMeasurementSession } from "../src/connectors/diagnostics-connection-policy.js";

test("diagnostics measurement accepts an already connected session", () => {
  assert.doesNotThrow(() => assertDiagnosticsMeasurementSession(true));
});

test("diagnostics measurement rejects implicit connection", () => {
  assert.throws(
    () => assertDiagnosticsMeasurementSession(false),
    /requires an already connected session/,
  );
});
