import { appendFile, lstat, mkdir, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import type { ProviderContextProvider } from "../runtime/provider-context-types.js";

export interface ProviderContextSessionObservation {
  schemaVersion: 1;
  evidenceClass: "provider-context-session-observation";
  provider: ProviderContextProvider;
  providerSessionId: string;
  providerThreadId: string | null;
  projectPath: string;
  stableProjectIdentity: string;
  observedAt: string;
  projectTruth: false;
  grantsAuthority: false;
}

const MAX_PROVIDER_THREAD_ID_BYTES = 1024;
const MAX_PATH_BYTES = 8192;

function observationRoot(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA?.trim();
    if (!appData) throw new Error("APPDATA is unavailable; provider context session evidence cannot be stored safely.");
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

function boundedText(value: string, field: string, maxBytes: number): string {
  const normalized = value.trim();
  if (!normalized || Buffer.byteLength(normalized, "utf8") > maxBytes || /[\u0000]/.test(normalized)) {
    throw new Error(`${field} is invalid or exceeds its size bound.`);
  }
  return normalized;
}

export function providerContextSessionObservation(input: {
  provider: ProviderContextProvider;
  providerSessionId: string;
  providerThreadId?: string;
  projectPath: string;
  stableProjectIdentity: string;
  observedAt?: string;
}): ProviderContextSessionObservation {
  return {
    schemaVersion: 1,
    evidenceClass: "provider-context-session-observation",
    provider: input.provider,
    providerSessionId: boundedText(input.providerSessionId, "providerSessionId", 512),
    providerThreadId: input.providerThreadId === undefined
      ? null
      : boundedText(input.providerThreadId, "providerThreadId", MAX_PROVIDER_THREAD_ID_BYTES),
    projectPath: boundedText(input.projectPath, "projectPath", MAX_PATH_BYTES),
    stableProjectIdentity: boundedText(input.stableProjectIdentity, "stableProjectIdentity", 128),
    observedAt: input.observedAt ?? new Date().toISOString(),
    projectTruth: false,
    grantsAuthority: false,
  };
}

export async function appendProviderContextSessionObservation(
  observation: ProviderContextSessionObservation,
): Promise<string> {
  const root = observationRoot();
  await ensureRealDirectory(root);
  const target = resolve(root, "context-observations.jsonl");
  try {
    const metadata = await lstat(target);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("Provider context session evidence target must be a real non-symbolic-link file.");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await appendFile(target, `${JSON.stringify(observation)}\n`, { encoding: "utf8", mode: 0o600 });
  return target;
}
