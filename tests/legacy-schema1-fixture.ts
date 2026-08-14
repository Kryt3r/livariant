import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Convert a freshly initialized current Project Brain into an explicit legacy
 * schema-1 fixture for lifecycle migration/recovery tests.
 *
 * This is test-only historical state construction. Product reads must never
 * perform this transformation or mint/repair identity implicitly.
 */
export async function makeLegacySchema1Project(projectPath: string): Promise<void> {
  const metadataPath = resolve(projectPath, ".project-brain", "metadata.json");
  const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as {
    framework: { version: string; channel: string };
    projectBrain: { schemaVersion: number; projectId?: string };
    [key: string]: unknown;
  };
  metadata.projectBrain = { ...metadata.projectBrain, schemaVersion: 1 };
  delete metadata.projectBrain.projectId;
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}
