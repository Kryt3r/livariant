import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const PROJECT_CONTEXT_BASELINE_DOMAIN = "livariant:project-context-baseline:v1";
export const PROJECT_CONTEXT_MANAGED_INPUTS = ["decisions.md", "goals.md", "knowledge.md", "metadata.json", "project.md"] as const;

export type ProjectContextManagedInputName = typeof PROJECT_CONTEXT_MANAGED_INPUTS[number];

export interface ProjectContextBaseline {
  algorithm: "sha256";
  domain: typeof PROJECT_CONTEXT_BASELINE_DOMAIN;
  digest: string;
  schemaVersion: number;
}

export function frameHashField(hash: ReturnType<typeof createHash>, label: string, bytes: Buffer): void {
  const labelBytes = Buffer.from(label, "utf8");
  const lengths = Buffer.allocUnsafe(8);
  lengths.writeUInt32BE(labelBytes.length, 0);
  lengths.writeUInt32BE(bytes.length, 4);
  hash.update(lengths);
  hash.update(labelBytes);
  hash.update(bytes);
}

export function buildProjectContextBaseline(
  inputs: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
  schemaVersion: number,
): ProjectContextBaseline {
  const hash = createHash("sha256");
  frameHashField(hash, "domain", Buffer.from(PROJECT_CONTEXT_BASELINE_DOMAIN, "utf8"));
  frameHashField(hash, "schema-version", Buffer.from(String(schemaVersion), "utf8"));
  for (const name of PROJECT_CONTEXT_MANAGED_INPUTS) {
    const bytes = inputs.get(name);
    if (!bytes) throw new Error(`Missing managed Project Brain input: ${name}`);
    frameHashField(hash, `managed:${name}`, bytes);
  }
  return {
    algorithm: "sha256",
    domain: PROJECT_CONTEXT_BASELINE_DOMAIN,
    digest: hash.digest("hex"),
    schemaVersion,
  };
}

export async function readProjectContextManagedInputs(
  brainPath: string,
): Promise<Map<ProjectContextManagedInputName, Buffer>> {
  const entries = await Promise.all(
    PROJECT_CONTEXT_MANAGED_INPUTS.map(async (name) => [name, await readFile(resolve(brainPath, name))] as const),
  );
  return new Map(entries);
}

export function projectContextManagedInputsEqual(
  left: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
  right: ReadonlyMap<ProjectContextManagedInputName, Buffer>,
): boolean {
  return PROJECT_CONTEXT_MANAGED_INPUTS.every((name) => {
    const leftBytes = left.get(name);
    const rightBytes = right.get(name);
    return leftBytes !== undefined && rightBytes !== undefined && leftBytes.equals(rightBytes);
  });
}
