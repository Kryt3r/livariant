import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { relative, resolve, sep } from "node:path";
import type { ReleaseIdentity } from "./release-integrity.js";

const AUTH_SCHEMA = 1 as const;
const PACKAGE_NAME = "livariant" as const;
const AUTH_KIND = "release-authorization" as const;

interface ReleaseAuthorizationRecord extends ReleaseIdentity {
  schema: typeof AUTH_SCHEMA;
  packageName: typeof PACKAGE_NAME;
  kind: typeof AUTH_KIND;
}

function pathIsWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith(sep));
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

function normalize(identity: ReleaseIdentity): ReleaseAuthorizationRecord {
  if (!/^[a-f0-9]{64}$/i.test(identity.artifactSha256)) throw new Error("Release authorization requires a valid SHA-256 digest.");
  if (!["stable", "preview", "development"].includes(identity.channel)) throw new Error("Release authorization channel is invalid.");
  if (!identity.version.trim() || !identity.sourceId.trim() || !identity.artifactId.trim()) throw new Error("Release authorization identity is incomplete.");
  return {
    schema: AUTH_SCHEMA,
    packageName: PACKAGE_NAME,
    kind: AUTH_KIND,
    version: identity.version,
    channel: identity.channel,
    sourceId: identity.sourceId,
    artifactId: identity.artifactId,
    artifactSha256: identity.artifactSha256.toLowerCase(),
  };
}

function authorizationPath(root: string, identity: ReleaseIdentity): string {
  const normalized = normalize(identity);
  const key = createHash("sha256").update([
    normalized.version,
    normalized.channel,
    normalized.sourceId,
    normalized.artifactId,
    normalized.artifactSha256,
  ].join("\0")).digest("hex");
  return resolve(root, `${key}.json`);
}

function sameRecord(left: ReleaseAuthorizationRecord, right: ReleaseAuthorizationRecord): boolean {
  return left.schema === right.schema && left.packageName === right.packageName && left.kind === right.kind &&
    left.version === right.version && left.channel === right.channel && left.sourceId === right.sourceId &&
    left.artifactId === right.artifactId && left.artifactSha256 === right.artifactSha256;
}

function parseRecord(value: unknown): ReleaseAuthorizationRecord {
  const record = value as Partial<ReleaseAuthorizationRecord>;
  if (record.schema !== AUTH_SCHEMA || record.packageName !== PACKAGE_NAME || record.kind !== AUTH_KIND ||
      typeof record.version !== "string" || !["stable", "preview", "development"].includes(String(record.channel)) ||
      typeof record.sourceId !== "string" || typeof record.artifactId !== "string" ||
      !/^[a-f0-9]{64}$/i.test(record.artifactSha256 ?? "")) {
    throw new Error("Machine-local Livariant release authorization has an invalid shape.");
  }
  return normalize(record as ReleaseIdentity);
}

export async function recordReleaseAuthorization(projectPath: string, identity: ReleaseIdentity): Promise<void> {
  const root = await safeAuthorizationBase(projectPath);
  const expected = normalize(identity);
  const path = authorizationPath(root, expected);
  try {
    await writeFile(path, `${JSON.stringify(expected, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    return;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST")) throw error;
  }
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("Machine-local Livariant release authorization is unsafe.");
  const existing = parseRecord(JSON.parse(await readFile(path, "utf8")) as unknown);
  if (!sameRecord(existing, expected)) throw new Error("Machine-local Livariant release authorization conflicts with the requested identity.");
}

export async function assertReleaseAuthorized(projectPath: string, identity: ReleaseIdentity): Promise<void> {
  const root = await safeAuthorizationBase(projectPath);
  const expected = normalize(identity);
  const path = authorizationPath(root, expected);
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("Runtime release is not independently authorized on this machine. Run 'livariant authorize-runtime ... --apply' with the exact release identity before update.");
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("Machine-local Livariant release authorization is unsafe.");
  const observed = parseRecord(JSON.parse(await readFile(path, "utf8")) as unknown);
  if (!sameRecord(observed, expected)) throw new Error("Runtime release does not match its machine-local authorization.");
}
