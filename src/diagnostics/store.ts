import { lstat, mkdir, readFile, appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
  DiagnosticAttribution,
  DiagnosticEvent,
  ObservedEvidenceSource,
  ObservedTokenUsage,
} from "./efficiency.js";
import { validateDiagnosticEvent } from "./efficiency.js";

const DIAGNOSTIC_STORAGE_SCHEMA_VERSION = 1;
const DEFAULT_DIAGNOSTIC_FILENAME = "diagnostic-events.jsonl";

type PersistedDiagnosticEnvelope = {
  schemaVersion: typeof DIAGNOSTIC_STORAGE_SCHEMA_VERSION;
  event: DiagnosticEvent;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Diagnostic ${key} must be a string when present.`);
  }
  return value;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`Diagnostic ${key} must be a string.`);
  }
  return value;
}

function requiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number") {
    throw new Error(`Diagnostic ${key} must be a number.`);
  }
  return value;
}

function readAttribution(value: unknown): DiagnosticAttribution | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error("Diagnostic attribution must be an object when present.");
  }

  const attribution: DiagnosticAttribution = {};
  for (const key of ["provider", "model", "projectId", "sessionId", "taskId"] as const) {
    const item = optionalString(value, key);
    if (item !== undefined) {
      attribution[key] = item;
    }
  }
  return attribution;
}

function readObservedSource(value: unknown): ObservedEvidenceSource {
  if (!isRecord(value)) {
    throw new Error("Observed diagnostic source must be an object.");
  }
  const kind = requiredString(value, "kind");
  if (kind !== "provider" && kind !== "runtime") {
    throw new Error("Observed evidence source kind must be provider or runtime.");
  }
  return {
    kind,
    id: requiredString(value, "id"),
    version: requiredString(value, "version"),
  };
}

function readObservedUsage(value: unknown): ObservedTokenUsage {
  if (!isRecord(value)) {
    throw new Error("Observed diagnostic usage must be an object.");
  }

  const usage: ObservedTokenUsage = {};
  for (const key of ["inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"] as const) {
    const item = value[key];
    if (item !== undefined) {
      if (typeof item !== "number") {
        throw new Error(`Observed ${key} must be a number when present.`);
      }
      usage[key] = item;
    }
  }
  return usage;
}

function canonicalizeDiagnosticEvent(value: unknown): DiagnosticEvent {
  if (!isRecord(value)) {
    throw new Error("Diagnostic event must be an object.");
  }

  const id = requiredString(value, "id");
  const timestamp = requiredString(value, "timestamp");
  const attribution = readAttribution(value.attribution);
  const kind = requiredString(value, "kind");

  let event: DiagnosticEvent;
  if (kind === "observed") {
    event = {
      id,
      timestamp,
      kind,
      source: readObservedSource(value.source),
      usage: readObservedUsage(value.usage),
      ...(attribution === undefined ? {} : { attribution }),
    };
  } else if (kind === "avoided") {
    if (value.metric !== "context-tokens") {
      throw new Error("Avoided diagnostic metric must be context-tokens.");
    }
    event = {
      id,
      timestamp,
      kind,
      metric: "context-tokens",
      consideredTokens: requiredNumber(value, "consideredTokens"),
      usedTokens: requiredNumber(value, "usedTokens"),
      reason: requiredString(value, "reason"),
      ...(attribution === undefined ? {} : { attribution }),
    };
  } else if (kind === "estimated") {
    if (!isRecord(value.method)) {
      throw new Error("Estimated diagnostic method must be an object.");
    }
    const confidence = requiredString(value, "confidence");
    if (confidence !== "low" && confidence !== "medium" && confidence !== "high") {
      throw new Error("Estimated diagnostic confidence must be low, medium or high.");
    }
    event = {
      id,
      timestamp,
      kind,
      estimatedTokens: requiredNumber(value, "estimatedTokens"),
      method: {
        id: requiredString(value.method, "id"),
        version: requiredString(value.method, "version"),
      },
      confidence,
      reason: requiredString(value, "reason"),
      ...(attribution === undefined ? {} : { attribution }),
    };
  } else {
    throw new Error(`Unsupported diagnostic event kind '${kind}'.`);
  }

  validateDiagnosticEvent(event);
  return event;
}

function parseEnvelope(line: string, lineNumber: number): DiagnosticEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line) as unknown;
  } catch {
    throw new Error(`Diagnostic evidence line ${lineNumber} is not valid JSON.`);
  }

  if (!isRecord(parsed) || parsed.schemaVersion !== DIAGNOSTIC_STORAGE_SCHEMA_VERSION) {
    throw new Error(`Diagnostic evidence line ${lineNumber} has an unsupported schema version.`);
  }

  try {
    return canonicalizeDiagnosticEvent(parsed.event);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid diagnostic event";
    throw new Error(`Diagnostic evidence line ${lineNumber} is invalid: ${detail}`);
  }
}

export class DiagnosticEventStore {
  readonly path: string;

  constructor(storageDirectory: string, filename = DEFAULT_DIAGNOSTIC_FILENAME) {
    if (!filename.trim() || filename === "." || filename === ".." || filename.includes("/") || filename.includes("\\")) {
      throw new Error("Diagnostic storage filename must be a plain filename.");
    }
    const directory = resolve(storageDirectory);
    this.path = resolve(directory, filename);
    if (dirname(this.path) !== directory) {
      throw new Error("Diagnostic storage path must remain inside its configured directory.");
    }
  }

  async append(event: DiagnosticEvent): Promise<void> {
    const canonical = canonicalizeDiagnosticEvent(event);
    await this.ensureStorageDirectory();
    await this.assertExistingFileIsRegular();

    const envelope: PersistedDiagnosticEnvelope = {
      schemaVersion: DIAGNOSTIC_STORAGE_SCHEMA_VERSION,
      event: canonical,
    };
    await appendFile(this.path, `${JSON.stringify(envelope)}\n`, { encoding: "utf8", flag: "a" });
  }

  async readAll(): Promise<DiagnosticEvent[]> {
    await this.ensureStorageDirectory();
    const exists = await this.assertExistingFileIsRegular();
    if (!exists) {
      return [];
    }

    const content = await readFile(this.path, "utf8");
    const lines = content.split(/\r?\n/);
    const events: DiagnosticEvent[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      if (!line.trim()) {
        continue;
      }
      events.push(parseEnvelope(line, index + 1));
    }
    return events;
  }

  private async ensureStorageDirectory(): Promise<void> {
    const directory = dirname(this.path);
    await mkdir(directory, { recursive: true });
    const stats = await lstat(directory);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error("Diagnostic storage directory must be a real directory and not a symbolic link.");
    }
  }

  private async assertExistingFileIsRegular(): Promise<boolean> {
    try {
      const stats = await lstat(this.path);
      if (!stats.isFile() || stats.isSymbolicLink()) {
        throw new Error("Diagnostic evidence path must be a regular file and not a symbolic link.");
      }
      return true;
    } catch (error) {
      if (isRecord(error) && error.code === "ENOENT") {
        return false;
      }
      throw error;
    }
  }
}
