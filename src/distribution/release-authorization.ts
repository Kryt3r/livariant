import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { ReleaseIdentity } from "./release-integrity.js";

const AUTH_SCHEMA = 1 as const;
const PACKAGE_NAME = "livariant" as const;
const AUTH_KIND = "artifact-digest-authorization" as const;

interface ArtifactAuthorizationRecord {
  schema: typeof AUTH_SCHEMA;
  packageName: typeof PACKAGE_NAME;
  kind: typeof AUTH_KIND;
  artifactSha256: string;
}

function pathIsWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!isAbsolute(rel) && !rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith(sep));
}

function authorizationBase(): string {
  return resolve(userInfo().homedir, ".livariant", "trust", "release-authorizations");
}

async function safeAuthorizationBase(projectPath: string): Promise<string> {
  const home = userInfo().homedir;
  const base = authorizationBase();
  await mkdir(base, { recursive: true });
  const [physicalHome, physicalBase, physicalProject] = await Promise.all([
    realpath(home),
    realpath(base),
    realpath(projectPath),
  ]);
  if (!pathIsWithin(physicalHome, physicalBase)) {
    throw new Error("Machine-local Livariant release authorization directory resolves outside the operating-system user home.");
  }
  if (pathIsWithin(physicalBase, physicalProject)) {
    throw new Error("Livariant project directories must not reside inside the machine-local release authorization directory.");
  }
  if (pathIsWithin(physicalProject, physicalBase) || pathIsWithin(physicalBase, physicalProject)) {
    throw new Error("Machine-local Livariant release authorization must not overlap the current project directory.");
  }
  const stats = await lstat(physicalBase);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error("Machine-local Livariant release authorization root must be a real directory.");
  }
  return physicalBase;
}

function normalizeDigest(value: string): string {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("Release authorization requires a valid SHA-256 digest.");
  return value.toLowerCase();
}

function authorizationPath(root: string, digest: string): string {
  return resolve(root, `${normalizeDigest(digest)}.json`);
}

function parseRecord(value: unknown): ArtifactAuthorizationRecord {
  const record = value as Partial<ArtifactAuthorizationRecord>;
  if (record.schema !== AUTH_SCHEMA || record.packageName !== PACKAGE_NAME || record.kind !== AUTH_KIND || !/^[a-f0-9]{64}$/i.test(record.artifactSha256 ?? "")) {
    throw new Error("Machine-local Livariant release authorization has an invalid shape.");
  }
  return { schema: AUTH_SCHEMA, packageName: PACKAGE_NAME, kind: AUTH_KIND, artifactSha256: record.artifactSha256!.toLowerCase() };
}

export async function recordArtifactAuthorization(projectPath: string, artifactSha256: string): Promise<void> {
  const root = await safeAuthorizationBase(projectPath);
  const digest = normalizeDigest(artifactSha256);
  const expected: ArtifactAuthorizationRecord = { schema: AUTH_SCHEMA, packageName: PACKAGE_NAME, kind: AUTH_KIND, artifactSha256: digest };
  const path = authorizationPath(root, digest);
  try {
    await writeFile(path, `${JSON.stringify(expected, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    return;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST")) throw error;
  }
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("Machine-local Livariant release authorization is unsafe.");
  const existing = parseRecord(JSON.parse(await readFile(path, "utf8")) as unknown);
  if (existing.artifactSha256 !== digest) throw new Error("Machine-local Livariant release authorization conflicts with the requested artifact digest.");
}

export async function recordReleaseAuthorization(projectPath: string, identity: ReleaseIdentity): Promise<void> {
  await recordArtifactAuthorization(projectPath, identity.artifactSha256);
}

export async function assertReleaseAuthorized(projectPath: string, identity: ReleaseIdentity): Promise<void> {
  const root = await safeAuthorizationBase(projectPath);
  const digest = normalizeDigest(identity.artifactSha256);
  const path = authorizationPath(root, digest);
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("Runtime artifact bytes are not independently authorized on this machine. Run 'livariant authorize-runtime ... --apply' with the exact SHA-256 digest before update.");
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("Machine-local Livariant release authorization is unsafe.");
  const observed = parseRecord(JSON.parse(await readFile(path, "utf8")) as unknown);
  if (observed.artifactSha256 !== digest) throw new Error("Runtime artifact does not match its machine-local authorization.");
}
