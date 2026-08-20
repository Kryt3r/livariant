import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const PROTECTED_BOOTSTRAP_RELEASE_SCHEMA_VERSION = 1 as const;
export const PROTECTED_BOOTSTRAP_RELEASE_KIND = "livariant-protected-bootstrap-release" as const;
export const PROTECTED_BOOTSTRAP_RELEASE_DESCRIPTOR = "bootstrap-release.json" as const;

export interface ProtectedBootstrapReleaseFile {
  path: string;
  sha256: string;
}

export interface ProtectedBootstrapReleaseDescriptor {
  schemaVersion: typeof PROTECTED_BOOTSTRAP_RELEASE_SCHEMA_VERSION;
  kind: typeof PROTECTED_BOOTSTRAP_RELEASE_KIND;
  version: string;
  channel: "preview" | "stable" | "development";
  sourceId: string;
  sourceSha: string;
  files: ProtectedBootstrapReleaseFile[];
}

function pathWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}

function strictDescriptor(value: unknown): ProtectedBootstrapReleaseDescriptor {
  if (typeof value !== "object" || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("Protected bootstrap release descriptor is invalid.");
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set(["schemaVersion", "kind", "version", "channel", "sourceId", "sourceSha", "files"]);
  for (const key of Object.keys(record)) if (!allowed.has(key)) throw new Error("Protected bootstrap release descriptor contains an unsupported field.");
  for (const key of allowed) if (!(key in record)) throw new Error(`Protected bootstrap release descriptor is missing required field: ${key}.`);
  if (record.schemaVersion !== PROTECTED_BOOTSTRAP_RELEASE_SCHEMA_VERSION || record.kind !== PROTECTED_BOOTSTRAP_RELEASE_KIND) {
    throw new Error("Protected bootstrap release descriptor schema is unsupported.");
  }
  if (typeof record.version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(record.version)) {
    throw new Error("Protected bootstrap release descriptor version is invalid.");
  }
  if (record.channel !== "preview" && record.channel !== "stable" && record.channel !== "development") {
    throw new Error("Protected bootstrap release descriptor channel is invalid.");
  }
  if (typeof record.sourceId !== "string" || !/^github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(record.sourceId)) {
    throw new Error("Protected bootstrap release descriptor sourceId is invalid.");
  }
  if (typeof record.sourceSha !== "string" || !/^[a-f0-9]{40}$/.test(record.sourceSha)) {
    throw new Error("Protected bootstrap release descriptor source SHA is invalid.");
  }
  if (!Array.isArray(record.files) || record.files.length === 0) throw new Error("Protected bootstrap release descriptor files are missing.");

  const seen = new Set<string>();
  const files = record.files.map((entry): ProtectedBootstrapReleaseFile => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry) || Object.getPrototypeOf(entry) !== Object.prototype) {
      throw new Error("Protected bootstrap release descriptor contains an invalid file record.");
    }
    const item = entry as Record<string, unknown>;
    if (Object.keys(item).some((key) => key !== "path" && key !== "sha256")) throw new Error("Protected bootstrap release file record contains an unsupported field.");
    if (typeof item.path !== "string" || item.path.length === 0 || isAbsolute(item.path) || item.path.includes("\\") || item.path.split("/").some((part) => part === "" || part === "." || part === "..")) {
      throw new Error("Protected bootstrap release file path is unsafe.");
    }
    if (seen.has(item.path)) throw new Error("Protected bootstrap release descriptor contains a duplicate file path.");
    seen.add(item.path);
    if (typeof item.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error("Protected bootstrap release file digest is invalid.");
    return { path: item.path, sha256: item.sha256 };
  });

  for (const required of [
    "dist/src/guardian/bootstrap.js",
    "dist/src/guardian/protected-helper.js",
    "guardian-bootstrap-entry.mjs",
  ]) {
    if (!seen.has(required)) throw new Error(`Protected bootstrap release descriptor is missing required file: ${required}.`);
  }

  return {
    schemaVersion: PROTECTED_BOOTSTRAP_RELEASE_SCHEMA_VERSION,
    kind: PROTECTED_BOOTSTRAP_RELEASE_KIND,
    version: record.version,
    channel: record.channel,
    sourceId: record.sourceId,
    sourceSha: record.sourceSha,
    files,
  };
}

export async function verifyProtectedBootstrapReleaseDescriptor(root: string): Promise<{
  descriptorPath: string;
  descriptor: ProtectedBootstrapReleaseDescriptor;
}> {
  const descriptorPath = resolve(root, PROTECTED_BOOTSTRAP_RELEASE_DESCRIPTOR);
  if (!pathWithin(root, descriptorPath)) throw new Error("Protected bootstrap release descriptor resolves outside the protected source root.");
  const descriptorStats = await lstat(descriptorPath);
  if (!descriptorStats.isFile() || descriptorStats.isSymbolicLink()) throw new Error("Protected bootstrap release descriptor must be a regular non-symlink file.");
  const descriptor = strictDescriptor(JSON.parse(await readFile(descriptorPath, "utf8")) as unknown);

  for (const file of descriptor.files) {
    const candidate = resolve(root, ...file.path.split("/"));
    if (!pathWithin(root, candidate)) throw new Error(`Protected bootstrap release file resolves outside source root: ${file.path}.`);
    const stats = await lstat(candidate);
    if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`Protected bootstrap release file must be a regular non-symlink file: ${file.path}.`);
    const digest = createHash("sha256").update(await readFile(candidate)).digest("hex");
    if (digest !== file.sha256) throw new Error(`Protected bootstrap release file digest mismatch: ${file.path}.`);
  }

  return { descriptorPath, descriptor };
}
