import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertPathWithinRoot, assertRegularFile } from "../project-brain/path-safety.js";

export const CHECKPOINT_CANONICAL_FILES = [
  "project.md",
  "goals.md",
  "decisions.md",
  "knowledge.md",
  "metadata.json",
] as const;

export type CheckpointDigests = Record<(typeof CHECKPOINT_CANONICAL_FILES)[number], string>;

async function sha256File(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

export async function computeCheckpointDigests(checkpointPath: string): Promise<CheckpointDigests> {
  const result = {} as CheckpointDigests;
  for (const file of CHECKPOINT_CANONICAL_FILES) {
    const candidate = resolve(checkpointPath, file);
    assertPathWithinRoot(checkpointPath, candidate, `Checkpoint file '${file}'`);
    await assertRegularFile(candidate, `Checkpoint file '${file}'`);
    result[file] = await sha256File(candidate);
  }
  return result;
}

export function isCheckpointDigests(value: unknown): value is CheckpointDigests {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return CHECKPOINT_CANONICAL_FILES.every((file) => typeof record[file] === "string" && /^[a-f0-9]{64}$/i.test(record[file] as string));
}

export async function validateCheckpointDigests(checkpointPath: string, expected: CheckpointDigests): Promise<void> {
  const actual = await computeCheckpointDigests(checkpointPath);
  for (const file of CHECKPOINT_CANONICAL_FILES) {
    if (actual[file].toLowerCase() !== expected[file].toLowerCase()) {
      throw new Error(`Checkpoint integrity mismatch for ${file}.`);
    }
  }
}
