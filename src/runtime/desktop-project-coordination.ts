import { readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface DesktopRegistryProject {
  desktopProjectId: string;
  localRoot: string;
  state: string;
}

interface DesktopProviderActivationRecord {
  desktopProjectId: string;
  activationId: string;
  processId: number;
}

type CoordinationState =
  | { state: "unbound" }
  | { state: "matched"; desktopProjectId: string; activationId: string }
  | { state: "mismatched"; desktopProjectId: string; activationId: string; activeLocalRoot: string; requestedProjectRoot: string }
  | { state: "invalid"; message: string };

export type DesktopProjectCoordinationState = CoordinationState;

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function defaultRegistryPath(): string | null {
  if (process.platform !== "win32") return null;
  const appData = process.env.APPDATA?.trim();
  if (!appData) return null;
  return resolve(appData, "dev.livariant.desktop", "projects", "registry.json");
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === "EPERM";
  }
}

function pathKey(value: string): string {
  return process.platform === "win32"
    ? value.replaceAll("/", "\\").toLowerCase()
    : value;
}

async function canonicalRoot(path: string): Promise<string> {
  return realpath(path);
}

export async function inspectDesktopProjectCoordination(
  projectPath: string,
  registryPathOverride?: string | null,
): Promise<DesktopProjectCoordinationState> {
  const registryPath = registryPathOverride === undefined ? defaultRegistryPath() : registryPathOverride;
  if (registryPath === null) return { state: "unbound" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(registryPath, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { state: "unbound" };
    return { state: "invalid", message: `Desktop project coordination registry could not be read: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (!plainObject(parsed)) return { state: "invalid", message: "Desktop project coordination registry is invalid." };

  const activation = parsed.providerActivation;
  if (activation === undefined || activation === null) return { state: "unbound" };
  if (!plainObject(activation)
    || typeof activation.desktopProjectId !== "string"
    || !UUID.test(activation.desktopProjectId)
    || typeof activation.activationId !== "string"
    || !UUID.test(activation.activationId)
    || !Number.isSafeInteger(activation.processId)
    || (activation.processId as number) <= 0) {
    return { state: "invalid", message: "Desktop project coordination activation record is invalid." };
  }
  const record = activation as unknown as DesktopProviderActivationRecord;
  if (!processAlive(record.processId)) return { state: "unbound" };

  if (!Array.isArray(parsed.projects)) {
    return { state: "invalid", message: "Desktop project coordination registry has no valid project list." };
  }
  const project = parsed.projects.find((candidate): candidate is DesktopRegistryProject =>
    plainObject(candidate)
    && candidate.desktopProjectId === record.desktopProjectId
    && typeof candidate.localRoot === "string"
    && typeof candidate.state === "string"
  );
  if (!project || project.state !== "registered") {
    return { state: "invalid", message: "Desktop project coordination activation does not reference a registered project." };
  }
  if (parsed.lastActiveDesktopProjectId !== record.desktopProjectId) {
    return { state: "invalid", message: "Desktop project coordination activation disagrees with the last-active project." };
  }

  let requestedRoot: string;
  let activeRoot: string;
  try {
    [requestedRoot, activeRoot] = await Promise.all([
      canonicalRoot(projectPath),
      canonicalRoot(project.localRoot),
    ]);
  } catch (error) {
    return { state: "invalid", message: `Desktop project coordination root could not be resolved: ${error instanceof Error ? error.message : String(error)}` };
  }

  if (pathKey(requestedRoot) !== pathKey(activeRoot)) {
    return {
      state: "mismatched",
      desktopProjectId: record.desktopProjectId,
      activationId: record.activationId,
      activeLocalRoot: activeRoot,
      requestedProjectRoot: requestedRoot,
    };
  }
  return {
    state: "matched",
    desktopProjectId: record.desktopProjectId,
    activationId: record.activationId,
  };
}
