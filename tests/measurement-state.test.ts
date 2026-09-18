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
    [{ provider: "openai-codex", connectionFingerprint: "connection-a", model: "gpt-default", lastSuccessfulAt: existingAt }],
    now,
  );
  assert.equal(targets[0]?.ready, false);
  assert.equal(targets[0]?.readiness, "cooldown");
  assert.equal(targets[1]?.ready, true);
  assert.equal(targets[1]?.readiness, "unmeasured");
});

test("successful targets become measurable again after the six hour cooldown", () => {
  const measuredAt = Date.parse("2026-09-17T06:00:00.000Z");
  const record = {
    provider: "openai-codex",
    connectionFingerprint: "connection-a",
    model: "gpt-default",
    lastSuccessfulAt: new Date(measuredAt).toISOString(),
  };
  const before = buildDiagnosticMeasurementTargets([target("gpt-default")], [record], measuredAt + DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS - 1);
  const after = buildDiagnosticMeasurementTargets([target("gpt-default")], [record], measuredAt + DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS);
  assert.equal(before[0]?.ready, false);
  assert.equal(after[0]?.ready, true);
  assert.equal(after[0]?.readiness, "cooldown-complete");
});

test("measurement state is isolated by connection fingerprint", () => {
  const now = Date.parse("2026-09-17T12:00:00.000Z");
  const replacement = { ...target("gpt-default"), connectionFingerprint: "connection-b" };
  const targets = buildDiagnosticMeasurementTargets(
    [replacement],
    [{ provider: "openai-codex", connectionFingerprint: "connection-a", model: "gpt-default", lastSuccessfulAt: new Date(now).toISOString() }],
    now,
  );
  assert.equal(targets[0]?.ready, true);
  assert.equal(targets[0]?.readiness, "unmeasured");
});

test("first catalog observation establishes a baseline without marking every model as newly added", async () => {
  const root = await mkdtemp(join(tmpdir(), "livariant-measurement-catalog-"));
  try {
    const store = new DiagnosticMeasurementStateStore(join(root, "state.json"));
    const first = await store.ensureCatalog("openai-codex", "connection-a", ["gpt-default", "gpt-other"]);
    assert.equal(first.initialized, false);
    assert.deepEqual(first.knownModels, ["gpt-default", "gpt-other"]);

    const second = await store.ensureCatalog("openai-codex", "connection-a", ["gpt-default", "gpt-other", "gpt-new"]);
    assert.equal(second.initialized, true);
    assert.deepEqual(second.knownModels, ["gpt-default", "gpt-other"]);
    assert.deepEqual(["gpt-default", "gpt-other", "gpt-new"].filter((model) => !second.knownModels.includes(model)), ["gpt-new"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("state store replaces matching records and marks successfully measured new models as known", async () => {
  const root = await mkdtemp(join(tmpdir(), "livariant-measurement-state-"));
  try {
    const store = new DiagnosticMeasurementStateStore(join(root, "state.json"));
    await store.ensureCatalog("openai-codex", "connection-a", ["gpt-default"]);
    await store.recordSuccess(target("gpt-default"), new Date("2026-09-17T10:00:00.000Z"));
    await store.recordSuccess(target("gpt-new"), new Date("2026-09-17T11:00:00.000Z"));
    await store.recordSuccess(target("gpt-default"), new Date("2026-09-17T12:00:00.000Z"));
    const state = await store.read();
    assert.equal(state.records.length, 2);
    assert.equal(state.records.find((record) => record.model === "gpt-default")?.lastSuccessfulAt, "2026-09-17T12:00:00.000Z");
    assert.equal(state.records.find((record) => record.model === "gpt-new")?.lastSuccessfulAt, "2026-09-17T11:00:00.000Z");
    assert.deepEqual(state.catalogs[0]?.models, ["gpt-default", "gpt-new"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
