import { promises as fs } from "node:fs";
import path from "node:path";

export type ConnectionMode = "auto" | "manual";

export type ConnectionIntent = {
  schemaVersion: 1;
  desiredConnected: boolean;
  mode: ConnectionMode;
  manualPath?: string;
};

export const disconnectedConnectionIntent = (): ConnectionIntent => ({
  schemaVersion: 1,
  desiredConnected: false,
  mode: "auto",
});

function parseConnectionIntent(value: unknown): ConnectionIntent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Persisted Codex connection intent must be an object.");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1) throw new Error("Persisted Codex connection intent schema version is unsupported.");
  if (typeof record.desiredConnected !== "boolean") throw new Error("Persisted Codex connection intent desiredConnected must be boolean.");
  if (record.mode !== "auto" && record.mode !== "manual") throw new Error("Persisted Codex connection intent mode is invalid.");

  const manualPath = typeof record.manualPath === "string" ? record.manualPath.trim() : undefined;
  if (record.mode === "manual" && record.desiredConnected && !manualPath) {
    throw new Error("Persisted manual Codex connection intent is missing its executable path.");
  }

  return {
    schemaVersion: 1,
    desiredConnected: record.desiredConnected,
    mode: record.mode,
    ...(manualPath ? { manualPath } : {}),
  };
}

export async function readConnectionIntent(filePath: string): Promise<ConnectionIntent> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseConnectionIntent(JSON.parse(raw) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return disconnectedConnectionIntent();
    throw error;
  }
}

export async function writeConnectionIntent(filePath: string, intent: ConnectionIntent): Promise<void> {
  const validated = parseConnectionIntent(intent);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(validated)}\n`, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporaryPath, filePath);
}
