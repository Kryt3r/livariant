import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";

const TRUST_SCHEMA = 1 as const;
const PACKAGE_NAME = "livariant" as const;

export class UntrustedRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UntrustedRuntimeError";
  }
}

export interface RuntimeTrustIdentity {
  version: string;
  channel: "stable" | "preview" | "development";
  sourceId: string;
  artifactId: string;
  artifactSha256: string;
  packageTreeSha256: string;
}

interface RuntimeTrustRecord extends RuntimeTrustIdentity {
  schema: typeof TRUST_SCHEMA;
  packageName: typeof PACKAGE_NAME;
}

function pathIsWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!isAbsolute(rel) && !rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith(sep));
}

function machineTrustBase(): string {
  return resolve(userInfo().homedir, ".livariant", "trust", "runtimes");
}

function rejectsWindowsAliasPath(path: string): boolean {
  if (process.platform !== "win32") return false;
  return /^(?:\\\\[?.]\\|\/\/[?.]\/|\\\\[^\\]+\\)/.test(path);
}

function configuredTrustRoot(): string {
  const base = machineTrustBase();
  const override = process.env.LIVARIANT_TRUST_ROOT;
  if (!override) return base;
  if (!isAbsolute(override)) throw new Error("LIVARIANT_TRUST_ROOT must be an absolute machine-local path.");
  if (rejectsWindowsAliasPath(override)) {
    throw new Error("LIVARIANT_TRUST_ROOT must not use Windows namespace, device, or UNC path aliases.");
  }
  const root = resolve(override);
  if (!pathIsWithin(base, root)) {
    throw new Error("LIVARIANT_TRUST_ROOT must stay within the machine-local Livariant trust directory.");
  }
  return root;
}

async function validatePhysicalTrustRoot(projectPath: string, root: string): Promise<string> {
  const base = machineTrustBase();
  await mkdir(base, { recursive: true });
  await mkdir(root, { recursive: true });

  const [physicalHome, physicalBase, physicalRoot, physicalProject] = await Promise.all([
    realpath(userInfo().homedir),
    realpath(base),
    realpath(root),
    realpath(projectPath),
  ]);

  if (!pathIsWithin(physicalHome, physicalBase)) {
    throw new Error("Machine-local Livariant trust directory resolves outside the operating-system user home.");
  }
  if (!pathIsWithin(physicalBase, physicalRoot)) {
    throw new Error("LIVARIANT_TRUST_ROOT resolves outside the machine-local Livariant trust directory.");
  }
  if (pathIsWithin(physicalBase, physicalProject)) {
    throw new Error("Livariant project directories must not reside inside the machine-local Runtime trust directory.");
  }
  if (pathIsWithin(physicalProject, physicalRoot) || pathIsWithin(physicalRoot, physicalProject)) {
    throw new Error("Machine-local Livariant Runtime trust must not overlap the current project directory.");
  }

  const stats = await lstat(physicalRoot);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error("Machine-local Livariant Runtime trust root must be a real directory.");
  }
  return physicalRoot;
}

function normalized(identity: RuntimeTrustIdentity): RuntimeTrustRecord {
  return {
    schema: TRUST_SCHEMA,
    packageName: PACKAGE_NAME,
    version: identity.version,
    channel: identity.channel,
    sourceId: identity.sourceId,
    artifactId: identity.artifactId,
    artifactSha256: identity.artifactSha256.toLowerCase(),
    packageTreeSha256: identity.packageTreeSha256.toLowerCase(),
  };
}

function recordPath(root: string, identity: RuntimeTrustIdentity): string {
  const record = normalized(identity);
  if (!/^[a-f0-9]{64}$/i.test(record.artifactSha256) || !/^[a-f0-9]{64}$/i.test(record.packageTreeSha256)) {
    throw new Error("Runtime trust identity has an invalid digest.");
  }
  const key = createHash("sha256").update([
    record.version,
    record.channel,
    record.sourceId,
    record.artifactId,
    record.artifactSha256,
    record.packageTreeSha256,
  ].join("\0")).digest("hex");
  return resolve(root, `${key}.json`);
}

async function safeTrustRoot(projectPath: string): Promise<string> {
  return validatePhysicalTrustRoot(projectPath, configuredTrustRoot());
}

function sameRecord(left: RuntimeTrustRecord, right: RuntimeTrustRecord): boolean {
  return left.schema === right.schema &&
    left.packageName === right.packageName &&
    left.version === right.version &&
    left.channel === right.channel &&
    left.sourceId === right.sourceId &&
    left.artifactId === right.artifactId &&
    left.artifactSha256 === right.artifactSha256 &&
    left.packageTreeSha256 === right.packageTreeSha256;
}

function parseRecord(value: unknown): RuntimeTrustRecord {
  const record = value as Partial<RuntimeTrustRecord>;
  if (
    record.schema !== TRUST_SCHEMA ||
    record.packageName !== PACKAGE_NAME ||
    typeof record.version !== "string" ||
    !["stable", "preview", "development"].includes(String(record.channel)) ||
    typeof record.sourceId !== "string" ||
    typeof record.artifactId !== "string" ||
    !/^[a-f0-9]{64}$/i.test(record.artifactSha256 ?? "") ||
    !/^[a-f0-9]{64}$/i.test(record.packageTreeSha256 ?? "")
  ) {
    throw new Error("Machine-local Livariant Runtime trust evidence has an invalid shape.");
  }
  return normalized(record as RuntimeTrustIdentity);
}

export async function recordRuntimeTrust(projectPath: string, identity: RuntimeTrustIdentity): Promise<void> {
  const root = await safeTrustRoot(projectPath);
  const expected = normalized(identity);
  const path = recordPath(root, expected);
  try {
    await writeFile(path, `${JSON.stringify(expected, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    return;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EEXIST")) throw error;
  }

  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("Machine-local Livariant Runtime trust evidence is unsafe.");
  const existing = parseRecord(JSON.parse(await readFile(path, "utf8")) as unknown);
  if (!sameRecord(existing, expected)) {
    throw new Error("Machine-local Livariant Runtime trust evidence conflicts with the verified release identity.");
  }
}

export async function assertRuntimeTrusted(projectPath: string, identity: RuntimeTrustIdentity): Promise<void> {
  const root = await safeTrustRoot(projectPath);
  const expected = normalized(identity);
  const path = recordPath(root, expected);
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new UntrustedRuntimeError("Installed Runtime is not trusted on this machine; project-local evidence cannot authorize execution.");
    }
    throw error;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error("Machine-local Livariant Runtime trust evidence is unsafe.");

  let observed: RuntimeTrustRecord;
  try {
    observed = parseRecord(JSON.parse(await readFile(path, "utf8")) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Machine-local Livariant Runtime trust evidence is invalid JSON.");
    throw error;
  }
  if (!sameRecord(observed, expected)) {
    throw new Error("Installed Runtime does not match machine-local trusted release evidence.");
  }
}
