import { appendFile, lstat, mkdir, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

export type HookEvidenceProvider = "claude" | "gemini";

export interface ProviderHookObservation {
  schemaVersion: 1;
  evidenceClass: "provider-hook-observation";
  provider: HookEvidenceProvider;
  sessionId: string;
  cwd: string;
  transcriptPath: string | null;
  hookEventName: string;
  providerTimestamp: string | null;
  observedAt: string;
  projectTruth: false;
  grantsAuthority: false;
}

const MAX_INPUT_BYTES = 64 * 1024;
const MAX_SESSION_ID_BYTES = 512;
const MAX_PATH_BYTES = 8192;
const MAX_EVENT_BYTES = 256;
const MAX_TIMESTAMP_BYTES = 256;

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(
  value: unknown,
  field: string,
  maxBytes: number,
  options: { nullable?: boolean } = {},
): string | null {
  if ((value === null || value === undefined) && options.nullable) return null;
  if (typeof value !== "string") throw new Error(`${field} must be a string.`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must not be blank.`);
  if (Buffer.byteLength(normalized, "utf8") > maxBytes || /[\u0000]/.test(normalized)) {
    throw new Error(`${field} is invalid or exceeds its size bound.`);
  }
  return normalized;
}

function observationRoot(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA?.trim();
    if (!appData) throw new Error("APPDATA is unavailable; provider hook evidence cannot be stored safely.");
    return resolve(appData, "dev.livariant.desktop", "provider-sessions");
  }
  if (process.platform === "darwin") {
    return resolve(homedir(), "Library", "Application Support", "dev.livariant.desktop", "provider-sessions");
  }
  const xdgData = process.env.XDG_DATA_HOME?.trim();
  return resolve(xdgData || resolve(homedir(), ".local", "share"), "dev.livariant.desktop", "provider-sessions");
}

async function ensureRealDirectory(path: string): Promise<void> {
  try {
    const metadata = await lstat(path);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error("Provider session evidence directory must be a real non-symbolic-link directory.");
    }
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const parent = dirname(path);
  if (parent !== path) await ensureRealDirectory(parent);
  await mkdir(path);
  const physical = await realpath(path);
  if (physical !== path && process.platform !== "win32") {
    throw new Error("Provider session evidence directory did not resolve to the requested path.");
  }
}

export function parseProviderHookObservation(
  provider: HookEvidenceProvider,
  raw: string,
  observedAt = new Date().toISOString(),
): ProviderHookObservation {
  if (Buffer.byteLength(raw, "utf8") > MAX_INPUT_BYTES) {
    throw new Error("Provider hook input exceeds the Livariant size bound.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Provider hook input must be valid JSON.");
  }
  if (!plainObject(parsed)) throw new Error("Provider hook input must be a JSON object.");

  const sessionId = boundedText(parsed.session_id, "session_id", MAX_SESSION_ID_BYTES) as string;
  const cwd = boundedText(parsed.cwd, "cwd", MAX_PATH_BYTES) as string;
  const transcriptPath = boundedText(parsed.transcript_path, "transcript_path", MAX_PATH_BYTES, { nullable: true });
  const hookEventName = boundedText(parsed.hook_event_name, "hook_event_name", MAX_EVENT_BYTES) as string;
  const providerTimestamp = boundedText(parsed.timestamp, "timestamp", MAX_TIMESTAMP_BYTES, { nullable: true });

  return {
    schemaVersion: 1,
    evidenceClass: "provider-hook-observation",
    provider,
    sessionId,
    cwd,
    transcriptPath,
    hookEventName,
    providerTimestamp,
    observedAt,
    projectTruth: false,
    grantsAuthority: false,
  };
}

export async function appendProviderHookObservation(observation: ProviderHookObservation): Promise<string> {
  const root = observationRoot();
  await ensureRealDirectory(root);
  const target = resolve(root, "hook-observations.jsonl");
  try {
    const metadata = await lstat(target);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("Provider hook evidence target must be a real non-symbolic-link file.");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await appendFile(target, `${JSON.stringify(observation)}\n`, { encoding: "utf8", mode: 0o600 });
  return target;
}
