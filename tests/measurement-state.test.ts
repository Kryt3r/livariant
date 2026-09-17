import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS,
  DiagnosticMeasurementStateStore,
  buildDiagnosticMeasurementTargets,
} from "../src/diagnostics/measurement-state.js";

const target = (model: string) => ({
  provider: "openai-codex",
  connectionFingerprint: "connection-a",
  model,
  displayName: model,
  isDefault: model === "gpt-default",
});

test("newly discovered models are immediately measurable while existing targets remain in cooldown", () => {
  const now = Date.parse("2026-09-17T12:00:00.000Z");
  const existingAt = new Date(now - 60 * 60 * 1000).toISOString();
  const targets = buildDiagnosticMeasurementTargets(
    [target("gpt-default"), target("gpt-new")],
    [{ ...target("gpt-default"), lastSuccessfulAt: existingAt }],
    now,
  );
  assert.equal(targets[0]?.ready, false);
  assert.equal(targets[0]?.readiness, "cooldown");
  assert.equal(targets[1]?.ready, true);
  assert.equal(targets[1]?.readiness, "unmeasured");
});

test("successful targets become measurable again after the six hour cooldown", () => {
  const measuredAt = Date.parse("2026-09-17T06:00:00.000Z");
  const before = buildDiagnosticMeasurementTargets(
    [target("gpt-default")],
    [{ ...target("gpt-default"), lastSuccessfulAt: new Date(measuredAt).toISOString() }],
    measuredAt + DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS - 1,
  );
  const after = buildDiagnosticMeasurementTargets(
    [target("gpt-default")],
    [{ ...target("gpt-default"), lastSuccessfulAt: new Date(measuredAt).toISOString() }],
    measuredAt + DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS,
  );
  assert.equal(before[0]?.ready, false);
  assert.equal(after[0]?.ready, true);
  assert.equal(after[0]?.readiness, "cooldown-complete");
});

test("measurement state is isolated by connection fingerprint", () => {
  const now = Date.parse("2026-09-17T12:00:00.000Z");
  const old = target("gpt-default");
  const replacement = { ...old, connectionFingerprint: "connection-b" };
  const targets = buildDiagnosticMeasurementTargets(
    [replacement],
    [{ ...old, lastSuccessfulAt: new Date(now).toISOString() }],
    now,
  );
  assert.equal(targets[0]?.ready, true);
  assert.equal(targets[0]?.readiness, "unmeasured");
});

test("state store replaces only the matching target record", async () => {
  const root = await mkdtemp(join(tmpdir(), "livariant-measurement-state-"));
  try {
    const store = new DiagnosticMeasurementStateStore(join(root, "state.json"));
    await store.recordSuccess(target("gpt-default"), new Date("2026-09-17T10:00:00.000Z"));
    await store.recordSuccess(target("gpt-new"), new Date("2026-09-17T11:00:00.000Z"));
    await store.recordSuccess(target("gpt-default"), new Date("2026-09-17T12:00:00.000Z"));
    const records = await store.read();
    assert.equal(records.length, 2);
    assert.equal(records.find((record) => record.model === "gpt-default")?.lastSuccessfulAt, "2026-09-17T12:00:00.000Z");
    assert.equal(records.find((record) => record.model === "gpt-new")?.lastSuccessfulAt, "2026-09-17T11:00:00.000Z");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
