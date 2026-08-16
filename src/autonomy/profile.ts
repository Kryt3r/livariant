import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import { ProjectBrainStore } from "../project-brain/store.js";

export const AUTONOMY_PROFILE_SCHEMA_VERSION = 1;
export const DEFAULT_AUTONOMY_PROFILE: AutonomyProfile = "ask-important";
export const FAIL_CLOSED_AUTONOMY_PROFILE: AutonomyProfile = "ask-always";

export type AutonomyProfile =
  | "ask-always"
  | "ask-important"
  | "continue-without-confirmation";

export type AutonomyDecisionClass = "routine" | "important" | "authority-required";

export interface AutonomyPolicy {
  profile: AutonomyProfile;
  label: string;
  summary: string;
  warning?: string;
  confirmation: {
    routine: boolean;
    important: boolean;
    authorityRequired: true;
  };
  boundaries: {
    grantsAuthority: false;
    canBypassMutationAuthorization: false;
    canBypassRuntimeAuthority: false;
    canBypassReleaseAuthority: false;
  };
}

interface PersistedAutonomyProfile {
  schemaVersion: 1;
  kind: "livariant-autonomy-profile";
  stableProjectIdentity: string;
  profile: AutonomyProfile;
  updatedAt: string;
}

export interface AutonomyProfileState {
  schemaVersion: 1;
  stableProjectIdentity: string | null;
  profile: AutonomyProfile;
  persisted: boolean;
  source: "default" | "machine-local" | "fail-closed";
  reason?: string;
  policy: AutonomyPolicy;
}

export interface AutonomyStorageOptions {
  homeDir?: string;
  acknowledgeRisk?: boolean;
}

const PROFILE_VALUES = new Set<AutonomyProfile>([
  "ask-always",
  "ask-important",
  "continue-without-confirmation",
]);

function errno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

function pathIsWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep));
}

async function assertRealDirectory(path: string, label: string): Promise<boolean> {
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    if (errno(error, "ENOENT")) return false;
    throw error;
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`${label} must be a real directory and must not be a symbolic link.`);
  return true;
}

async function ensureRealDirectory(path: string, label: string): Promise<void> {
  if (!await assertRealDirectory(path, label)) await mkdir(path, { recursive: false });
  if (!await assertRealDirectory(path, label)) throw new Error(`${label} could not be established.`);
}

function profileBase(homeDir: string): string {
  return resolve(homeDir, ".livariant", "preferences", "autonomy");
}

async function resolveStableProjectIdentity(projectRoot: string): Promise<string | null> {
  const store = new ProjectBrainStore(projectRoot);
  const inspection = await store.inspect();
  if (inspection.health !== "valid") return null;
  const metadata = await store.readMetadata();
  if (metadata.projectBrain.schemaVersion !== 2 || !isStableProjectIdentity(metadata.projectBrain.projectId)) return null;
  return metadata.projectBrain.projectId;
}

async function safeProjectProfileRoot(
  projectRoot: string,
  projectId: string,
  create: boolean,
  options: AutonomyStorageOptions,
): Promise<string | null> {
  if (!isStableProjectIdentity(projectId)) throw new Error("Autonomy profile requires a valid stable project identity.");
  const home = resolve(options.homeDir ?? userInfo().homedir);
  const base = profileBase(home);

  if (create) {
    const livariantRoot = resolve(home, ".livariant");
    const preferencesRoot = resolve(livariantRoot, "preferences");
    if (!await assertRealDirectory(livariantRoot, "Machine-local Livariant root")) await mkdir(livariantRoot, { recursive: false });
    await ensureRealDirectory(preferencesRoot, "Machine-local preferences root");
    await ensureRealDirectory(base, "Machine-local autonomy root");
  } else if (!await assertRealDirectory(base, "Machine-local autonomy root")) {
    return null;
  }

  const [physicalHome, physicalBase, physicalProject] = await Promise.all([
    realpath(home),
    realpath(base),
    realpath(projectRoot),
  ]);
  if (!pathIsWithin(physicalHome, physicalBase)) throw new Error("Machine-local autonomy root resolves outside the operating-system user home.");
  if (pathIsWithin(physicalBase, physicalProject) || pathIsWithin(physicalProject, physicalBase)) {
    throw new Error("Machine-local autonomy state must not overlap the current project directory.");
  }

  const projectPreferenceRoot = resolve(physicalBase, projectId);
  if (!pathIsWithin(physicalBase, projectPreferenceRoot)) throw new Error("Machine-local autonomy project path is unsafe.");
  if (create) await ensureRealDirectory(projectPreferenceRoot, "Machine-local autonomy project root");
  else if (!await assertRealDirectory(projectPreferenceRoot, "Machine-local autonomy project root")) return null;
  return realpath(projectPreferenceRoot);
}

function parsePersistedProfile(value: unknown): PersistedAutonomyProfile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Autonomy profile state is invalid.");
  const record = value as Record<string, unknown>;
  const allowed = new Set(["schemaVersion", "kind", "stableProjectIdentity", "profile", "updatedAt"]);
  for (const key of Object.keys(record)) if (!allowed.has(key)) throw new Error("Autonomy profile state contains an unsupported field.");
  for (const key of allowed) if (!(key in record)) throw new Error(`Autonomy profile state is missing required field: ${key}.`);
  if (record.schemaVersion !== 1 || record.kind !== "livariant-autonomy-profile") throw new Error("Autonomy profile state schema is invalid.");
  if (!isStableProjectIdentity(record.stableProjectIdentity)) throw new Error("Autonomy profile project identity is invalid.");
  if (!isAutonomyProfile(record.profile)) throw new Error("Autonomy profile value is invalid.");
  if (typeof record.updatedAt !== "string" || Number.isNaN(Date.parse(record.updatedAt))) throw new Error("Autonomy profile timestamp is invalid.");
  return {
    schemaVersion: 1,
    kind: "livariant-autonomy-profile",
    stableProjectIdentity: record.stableProjectIdentity,
    profile: record.profile,
    updatedAt: record.updatedAt,
  };
}

export function isAutonomyProfile(value: unknown): value is AutonomyProfile {
  return typeof value === "string" && PROFILE_VALUES.has(value as AutonomyProfile);
}

export function autonomyPolicy(profile: AutonomyProfile): AutonomyPolicy {
  if (!isAutonomyProfile(profile)) throw new Error("Autonomy profile value is invalid.");
  if (profile === "ask-always") {
    return {
      profile,
      label: "Always ask",
      summary: "Stop before routine and important discretionary next steps.",
      confirmation: { routine: true, important: true, authorityRequired: true },
      boundaries: {
        grantsAuthority: false,
        canBypassMutationAuthorization: false,
        canBypassRuntimeAuthority: false,
        canBypassReleaseAuthority: false,
      },
    };
  }
  if (profile === "ask-important") {
    return {
      profile,
      label: "Ask on important decisions",
      summary: "Continue through routine read-only work, but stop before important or consequential discretionary steps.",
      confirmation: { routine: false, important: true, authorityRequired: true },
      boundaries: {
        grantsAuthority: false,
        canBypassMutationAuthorization: false,
        canBypassRuntimeAuthority: false,
        canBypassReleaseAuthority: false,
      },
    };
  }
  return {
    profile,
    label: "Continue without confirmation",
    summary: "Continue through routine and important discretionary workflow decisions when no hard Livariant authority is required.",
    warning: "Higher autonomy can let an agent make consequential workflow choices without asking you first. Use only if you accept that risk. Hard Livariant authority boundaries still remain mandatory.",
    confirmation: { routine: false, important: false, authorityRequired: true },
    boundaries: {
      grantsAuthority: false,
      canBypassMutationAuthorization: false,
      canBypassRuntimeAuthority: false,
      canBypassReleaseAuthority: false,
    },
  };
}

export function requiresConfirmation(profile: AutonomyProfile, decisionClass: AutonomyDecisionClass): boolean {
  const policy = autonomyPolicy(profile);
  if (decisionClass === "authority-required") return true;
  return decisionClass === "routine" ? policy.confirmation.routine : policy.confirmation.important;
}

export async function readAutonomyProfile(
  projectRoot: string = process.cwd(),
  options: AutonomyStorageOptions = {},
): Promise<AutonomyProfileState> {
  const projectId = await resolveStableProjectIdentity(projectRoot);
  if (!projectId) {
    return {
      schemaVersion: 1,
      stableProjectIdentity: null,
      profile: DEFAULT_AUTONOMY_PROFILE,
      persisted: false,
      source: "default",
      reason: "A persistent autonomy profile requires an initialized valid Project Brain with a stable project identity.",
      policy: autonomyPolicy(DEFAULT_AUTONOMY_PROFILE),
    };
  }

  let root: string | null;
  try {
    root = await safeProjectProfileRoot(projectRoot, projectId, false, options);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Machine-local autonomy state is unsafe.";
    return {
      schemaVersion: 1,
      stableProjectIdentity: projectId,
      profile: FAIL_CLOSED_AUTONOMY_PROFILE,
      persisted: false,
      source: "fail-closed",
      reason,
      policy: autonomyPolicy(FAIL_CLOSED_AUTONOMY_PROFILE),
    };
  }
  if (!root) {
    return {
      schemaVersion: 1,
      stableProjectIdentity: projectId,
      profile: DEFAULT_AUTONOMY_PROFILE,
      persisted: false,
      source: "default",
      policy: autonomyPolicy(DEFAULT_AUTONOMY_PROFILE),
    };
  }

  const profilePath = resolve(root, "profile.json");
  if (!pathIsWithin(root, profilePath)) throw new Error("Machine-local autonomy profile path is unsafe.");
  let stats;
  try {
    stats = await lstat(profilePath);
  } catch (error) {
    if (errno(error, "ENOENT")) {
      return {
        schemaVersion: 1,
        stableProjectIdentity: projectId,
        profile: DEFAULT_AUTONOMY_PROFILE,
        persisted: false,
        source: "default",
        policy: autonomyPolicy(DEFAULT_AUTONOMY_PROFILE),
      };
    }
    throw error;
  }

  if (!stats.isFile() || stats.isSymbolicLink()) {
    return {
      schemaVersion: 1,
      stableProjectIdentity: projectId,
      profile: FAIL_CLOSED_AUTONOMY_PROFILE,
      persisted: false,
      source: "fail-closed",
      reason: "Machine-local autonomy profile must be a regular non-symbolic-link file.",
      policy: autonomyPolicy(FAIL_CLOSED_AUTONOMY_PROFILE),
    };
  }

  try {
    const parsed = parsePersistedProfile(JSON.parse(await readFile(profilePath, "utf8")) as unknown);
    if (parsed.stableProjectIdentity !== projectId) throw new Error("Machine-local autonomy profile does not match the current stable project identity.");
    return {
      schemaVersion: 1,
      stableProjectIdentity: projectId,
      profile: parsed.profile,
      persisted: true,
      source: "machine-local",
      policy: autonomyPolicy(parsed.profile),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Machine-local autonomy profile is invalid.";
    return {
      schemaVersion: 1,
      stableProjectIdentity: projectId,
      profile: FAIL_CLOSED_AUTONOMY_PROFILE,
      persisted: false,
      source: "fail-closed",
      reason,
      policy: autonomyPolicy(FAIL_CLOSED_AUTONOMY_PROFILE),
    };
  }
}

export async function writeAutonomyProfile(
  profile: AutonomyProfile,
  projectRoot: string = process.cwd(),
  options: AutonomyStorageOptions = {},
): Promise<AutonomyProfileState> {
  if (!isAutonomyProfile(profile)) throw new Error("Autonomy profile value is invalid.");
  if (profile === "continue-without-confirmation" && options.acknowledgeRisk !== true) {
    throw new Error("Persisting continue-without-confirmation requires explicit risk acknowledgement at the autonomy storage boundary.");
  }
  const projectId = await resolveStableProjectIdentity(projectRoot);
  if (!projectId) throw new Error("Cannot persist autonomy profile until this project has a valid initialized Project Brain with a stable project identity.");
  const root = await safeProjectProfileRoot(projectRoot, projectId, true, options);
  if (!root) throw new Error("Machine-local autonomy root could not be established.");
  const profilePath = resolve(root, "profile.json");
  const tempPath = resolve(root, `.profile.tmp-${randomUUID()}.json`);
  if (!pathIsWithin(root, profilePath) || !pathIsWithin(root, tempPath)) throw new Error("Machine-local autonomy profile path is unsafe.");

  const record: PersistedAutonomyProfile = {
    schemaVersion: 1,
    kind: "livariant-autonomy-profile",
    stableProjectIdentity: projectId,
    profile,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(tempPath, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    await rename(tempPath, profilePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }

  return {
    schemaVersion: 1,
    stableProjectIdentity: projectId,
    profile,
    persisted: true,
    source: "machine-local",
    policy: autonomyPolicy(profile),
  };
}
