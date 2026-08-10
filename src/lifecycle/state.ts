import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function readExecutingPackageVersion(): string {
  const packagePath = fileURLToPath(new URL("../../../package.json", import.meta.url));
  const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: unknown };
  if (typeof parsed.version !== "string" || parsed.version.trim().length === 0) {
    throw new Error("Executing Runtime package does not expose a valid Framework version identity.");
  }
  return parsed.version.trim();
}

export const FRAMEWORK_VERSION: string = readExecutingPackageVersion();
export const UPDATE_CHANNEL = "preview" as const;
export const PROJECT_BRAIN_SCHEMA_VERSION = 1 as const;

export type LifecycleState = "uninitialized" | "initialized" | "recovery-required" | "installation-required";
