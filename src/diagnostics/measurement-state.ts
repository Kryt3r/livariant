import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export interface DiagnosticMeasurementRecord {
  provider: string;
  connectionFingerprint: string;
  model: string | null;
  lastSuccessfulAt: string;
}

interface DiagnosticMeasurementState {
  schemaVersion: 1;
  records: DiagnosticMeasurementRecord[];
}

export interface DiagnosticMeasurementTargetInput {
  provider: string;
  connectionFingerprint: string;
  model: string | null;
  displayName: string;
  isDefault: boolean;
}

export interface DiagnosticMeasurementTarget extends DiagnosticMeasurementTargetInput {
  lastSuccessfulAt: string | null;
  retryAt: string | null;
  ready: boolean;
  readiness: "unmeasured" | "cooldown" | "cooldown-complete";
}

const emptyState = (): DiagnosticMeasurementState => ({ schemaVersion: 1, records: [] });

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${field} must be a non-blank string.`);
  return value;
}

function parseState(raw: unknown): DiagnosticMeasurementState {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("Diagnostics measurement state must be an object.");
  const record = raw as Record<string, unknown>;
  if (record.schemaVersion !== 1) throw new Error("Diagnostics measurement state schema version is unsupported.");
  if (!Array.isArray(record.records)) throw new Error("Diagnostics measurement state records must be an array.");
  const records = record.records.map((entry, index): DiagnosticMeasurementRecord => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) throw new Error(`Diagnostics measurement record ${index} must be an object.`);
    const value = entry as Record<string, unknown>;
    const model = value.model === null ? null : requireText(value.model, `Diagnostics measurement record ${index}.model`);
    const lastSuccessfulAt = requireText(value.lastSuccessfulAt, `Diagnostics measurement record ${index}.lastSuccessfulAt`);
    if (!Number.isFinite(Date.parse(lastSuccessfulAt))) throw new Error(`Diagnostics measurement record ${index}.lastSuccessfulAt is invalid.`);
    return {
      provider: requireText(value.provider, `Diagnostics measurement record ${index}.provider`),
      connectionFingerprint: requireText(value.connectionFingerprint, `Diagnostics measurement record ${index}.connectionFingerprint`),
      model,
      lastSuccessfulAt,
    };
  });
  return { schemaVersion: 1, records };
}

function sameTarget(record: DiagnosticMeasurementRecord, target: DiagnosticMeasurementTargetInput): boolean {
  return record.provider === target.provider
    && record.connectionFingerprint === target.connectionFingerprint
    && record.model === target.model;
}

export function buildDiagnosticMeasurementTargets(
  targets: DiagnosticMeasurementTargetInput[],
  records: DiagnosticMeasurementRecord[],
  nowMs = Date.now(),
): DiagnosticMeasurementTarget[] {
  return targets.map((target) => {
    const match = records.find((record) => sameTarget(record, target));
    if (!match) {
      return { ...target, lastSuccessfulAt: null, retryAt: null, ready: true, readiness: "unmeasured" };
    }
    const lastMs = Date.parse(match.lastSuccessfulAt);
    const retryMs = lastMs + DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS;
    const ready = nowMs >= retryMs;
    return {
      ...target,
      lastSuccessfulAt: match.lastSuccessfulAt,
      retryAt: new Date(retryMs).toISOString(),
      ready,
      readiness: ready ? "cooldown-complete" : "cooldown",
    };
  });
}

export class DiagnosticMeasurementStateStore {
  readonly #path: string;

  constructor(path: string) {
    this.#path = path;
  }

  async read(): Promise<DiagnosticMeasurementRecord[]> {
    try {
      return parseState(JSON.parse(await readFile(this.#path, "utf8"))).records;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async recordSuccess(target: DiagnosticMeasurementTargetInput, at = new Date()): Promise<void> {
    const records = await this.read();
    const next: DiagnosticMeasurementRecord = {
      provider: target.provider,
      connectionFingerprint: target.connectionFingerprint,
      model: target.model,
      lastSuccessfulAt: at.toISOString(),
    };
    const state: DiagnosticMeasurementState = {
      ...emptyState(),
      records: [...records.filter((record) => !sameTarget(record, target)), next],
    };
    await mkdir(dirname(this.#path), { recursive: true });
    await writeFile(this.#path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }
}
