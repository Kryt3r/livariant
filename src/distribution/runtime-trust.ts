import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
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
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith(sep));
}

function trustRoot(): string {
  const override = process.env.LIVARIANT_TRUST_ROOT;
  if (!override) return resolve(homedir(), ".livariant", "trust", "runtimes");
  if (!isAbsolute(override)) {
    throw new Error("LIVARIANT_TRUST_ROOT must be an absolute machine-local path.");
  }
  const root = resolve(override);
  if (pathIsWithin(process.cwd(), root)) {
    throw new Error("LIVARIANT_TRUST_ROOT must be outside the current project directory.");
  }
  return root;
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

function recordPath(identity: RuntimeTrustIdentity): string {
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
  return resolve(trustRoot(), `${key}.json`);
}

async function ensureTrustRoot(): Promise<string> {
  const root = trustRoot();
  await mkdir(root, { recursive: true });
  const stats = await lstat(root);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error("Machine-local Livariant Runtime trust root must be a real directory.");
  }
  return root;
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

export async function recordRuntimeTrust(identity: RuntimeTrustIdentity): Promise<void> {
  await ensureTrustRoot();
  const expected = normalized(identity);
  const path = recordPath(expected);
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

export async function assertRuntimeTrusted(identity: RuntimeTrustIdentity): Promise<void> {
  const expected = normalized(identity);
  const path = recordPath(expected);
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
