import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const DIAGNOSTIC_MEASUREMENT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export interface DiagnosticMeasurementRecord {
  provider: string;
  connectionFingerprint: string;
  model: string | null;
  lastSuccessfulAt: string;
}

export interface DiagnosticMeasurementCatalog {
  provider: string;
  connectionFingerprint: string;
  models: string[];
}

interface DiagnosticMeasurementState {
  schemaVersion: 1;
  records: DiagnosticMeasurementRecord[];
  catalogs: DiagnosticMeasurementCatalog[];
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

const emptyState = (): DiagnosticMeasurementState => ({ schemaVersion: 1, records: [], catalogs: [] });

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
  const rawCatalogs = record.catalogs ?? [];
  if (!Array.isArray(rawCatalogs)) throw new Error("Diagnostics measurement state catalogs must be an array.");
  const catalogs = rawCatalogs.map((entry, index): DiagnosticMeasurementCatalog => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) throw new Error(`Diagnostics measurement catalog ${index} must be an object.`);
    const value = entry as Record<string, unknown>;
    if (!Array.isArray(value.models)) throw new Error(`Diagnostics measurement catalog ${index}.models must be an array.`);
    return {
      provider: requireText(value.provider, `Diagnostics measurement catalog ${index}.provider`),
      connectionFingerprint: requireText(value.connectionFingerprint, `Diagnostics measurement catalog ${index}.connectionFingerprint`),
      models: value.models.map((model, modelIndex) => requireText(model, `Diagnostics measurement catalog ${index}.models[${modelIndex}]`)),
    };
  });
  return { schemaVersion: 1, records, catalogs };
}

function sameTarget(record: DiagnosticMeasurementRecord, target: DiagnosticMeasurementTargetInput): boolean {
  return record.provider === target.provider
    && record.connectionFingerprint === target.connectionFingerprint
    && record.model === target.model;
}

function sameCatalog(catalog: DiagnosticMeasurementCatalog, provider: string, connectionFingerprint: string): boolean {
  return catalog.provider === provider && catalog.connectionFingerprint === connectionFingerprint;
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

  async read(): Promise<DiagnosticMeasurementState> {
    try {
      return parseState(JSON.parse(await readFile(this.#path, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
      throw error;
    }
  }

  async ensureCatalog(provider: string, connectionFingerprint: string, models: string[]): Promise<{ initialized: boolean; knownModels: string[] }> {
    const state = await this.read();
    const existing = state.catalogs.find((catalog) => sameCatalog(catalog, provider, connectionFingerprint));
    if (existing) return { initialized: true, knownModels: [...existing.models] };
    const catalog: DiagnosticMeasurementCatalog = {
      provider,
      connectionFingerprint,
      models: [...new Set(models)],
    };
    await this.#write({ ...state, catalogs: [...state.catalogs, catalog] });
    return { initialized: false, knownModels: [...catalog.models] };
  }

  async recordSuccess(target: DiagnosticMeasurementTargetInput, at = new Date()): Promise<void> {
    const state = await this.read();
    const next: DiagnosticMeasurementRecord = {
      provider: target.provider,
      connectionFingerprint: target.connectionFingerprint,
      model: target.model,
      lastSuccessfulAt: at.toISOString(),
    };
    const catalogs = state.catalogs.map((catalog) => {
      if (!sameCatalog(catalog, target.provider, target.connectionFingerprint) || !target.model || catalog.models.includes(target.model)) return catalog;
      return { ...catalog, models: [...catalog.models, target.model] };
    });
    await this.#write({
      ...state,
      records: [...state.records.filter((record) => !sameTarget(record, target)), next],
      catalogs,
    });
  }

  async #write(state: DiagnosticMeasurementState): Promise<void> {
    await mkdir(dirname(this.#path), { recursive: true });
    await writeFile(this.#path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }
}
