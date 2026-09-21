import { invoke } from "@tauri-apps/api/core";

export interface DesktopProjectEntry {
  desktopProjectId: string;
  displayName: string;
  localRoot: string;
  projectId: string | null;
  stableProjectIdentity: string | null;
  state: "registered" | "detached";
  availability: "available" | "unavailable" | "detached";
}

export interface ActiveDesktopProject {
  desktopProjectId: string;
  generation: number;
}

export interface DesktopProjectRegistrySnapshot {
  schemaVersion: 1;
  projects: DesktopProjectEntry[];
  active: ActiveDesktopProject | null;
  legacyMigration: {
    state: "pending" | "not-needed" | "complete" | "recovery-required";
    sourceFingerprint?: string;
    detail?: string;
  };
  startupRecovery: string | null;
  boundaries: {
    registryIsProjectTruth: false;
    registryGrantsAuthority: false;
    activationGrantsAuthority: false;
    changesProjectOwnedFiles: false;
    deletesRepositories: false;
    deletesLocalCheckouts: false;
  };
}

interface DesktopProjectMutationResult {
  state: "activated" | "registered" | "existing" | "renamed" | "detached";
  created: boolean;
  snapshot: DesktopProjectRegistrySnapshot;
  boundaries: DesktopProjectRegistrySnapshot["boundaries"];
}

export interface DesktopProjectActivatedDetail {
  desktopProjectId: string;
  generation: number;
}

const ACTIVATED_EVENT = "livariant:desktop-project-activated";
const REGISTRY_EVENT = "livariant:desktop-project-registry-changed";

let registrySnapshot: DesktopProjectRegistrySnapshot | null = null;
let refreshInFlight: Promise<DesktopProjectRegistrySnapshot> | null = null;
let activationInFlight: Promise<DesktopProjectRegistrySnapshot> | null = null;

function isRegistrySnapshot(value: unknown): value is DesktopProjectRegistrySnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.projects)) return false;
  if (!candidate.boundaries || typeof candidate.boundaries !== "object") return false;
  const boundaries = candidate.boundaries as Record<string, unknown>;
  if (boundaries.registryIsProjectTruth !== false || boundaries.registryGrantsAuthority !== false || boundaries.activationGrantsAuthority !== false) {
    return false;
  }
  if (candidate.active !== null && candidate.active !== undefined) {
    if (typeof candidate.active !== "object") return false;
    const active = candidate.active as Record<string, unknown>;
    if (typeof active.desktopProjectId !== "string" || !active.desktopProjectId.trim()) return false;
    if (typeof active.generation !== "number" || !Number.isSafeInteger(active.generation) || active.generation < 0) return false;
  }
  return candidate.projects.every((project) => {
    if (!project || typeof project !== "object") return false;
    const row = project as Record<string, unknown>;
    return typeof row.desktopProjectId === "string"
      && !!row.desktopProjectId.trim()
      && typeof row.displayName === "string"
      && !!row.displayName.trim()
      && typeof row.localRoot === "string"
      && !!row.localRoot.trim()
      && (row.state === "registered" || row.state === "detached")
      && (row.availability === "available" || row.availability === "unavailable" || row.availability === "detached");
  });
}

function publishRegistry(snapshot: DesktopProjectRegistrySnapshot): void {
  registrySnapshot = snapshot;
  document.dispatchEvent(new CustomEvent(REGISTRY_EVENT, { detail: snapshot }));
}

function validateSnapshot(value: unknown): DesktopProjectRegistrySnapshot {
  if (!isRegistrySnapshot(value)) {
    throw new Error("The Desktop project registry returned an invalid snapshot.");
  }
  return value;
}

export function getDesktopProjectRegistrySnapshot(): DesktopProjectRegistrySnapshot | null {
  return registrySnapshot;
}

export function getActiveDesktopProject(): DesktopProjectEntry | null {
  const snapshot = registrySnapshot;
  const activeId = snapshot?.active?.desktopProjectId;
  if (!snapshot || !activeId) return null;
  return snapshot.projects.find((project) => project.desktopProjectId === activeId) ?? null;
}

export async function refreshDesktopProjectRegistrySnapshot(): Promise<DesktopProjectRegistrySnapshot> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const result = validateSnapshot(await invoke<DesktopProjectRegistrySnapshot>("desktop_project_registry_snapshot"));
    publishRegistry(result);
    return result;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function activateDesktopProject(desktopProjectId: string): Promise<DesktopProjectRegistrySnapshot> {
  if (!desktopProjectId.trim()) throw new Error("Desktop project identity is required.");
  if (activationInFlight) return activationInFlight;

  activationInFlight = (async () => {
    const result = await invoke<DesktopProjectMutationResult>("desktop_project_activate", {
      desktopProjectId,
    });
    if (result.state !== "activated") {
      throw new Error("The Desktop project host did not confirm activation.");
    }
    const snapshot = validateSnapshot(result.snapshot);
    const active = snapshot.active;
    if (!active || active.desktopProjectId !== desktopProjectId) {
      throw new Error("The Desktop project host returned an inconsistent active-project snapshot.");
    }

    publishRegistry(snapshot);
    document.dispatchEvent(new CustomEvent<DesktopProjectActivatedDetail>(ACTIVATED_EVENT, {
      detail: {
        desktopProjectId: active.desktopProjectId,
        generation: active.generation,
      },
    }));
    return snapshot;
  })();

  try {
    return await activationInFlight;
  } finally {
    activationInFlight = null;
  }
}


export async function registerDesktopProject(localRoot: string, displayName?: string): Promise<DesktopProjectRegistrySnapshot> {
  const root = localRoot.trim();
  if (!root) throw new Error("Project local root is required.");
  const result = await invoke<DesktopProjectMutationResult>("desktop_project_register", {
    input: {
      localRoot: root,
      ...(displayName?.trim() ? { displayName: displayName.trim() } : {}),
      projectId: null,
    },
  });
  const snapshot = validateSnapshot(result.snapshot);
  publishRegistry(snapshot);
  return snapshot;
}

export async function renameDesktopProject(desktopProjectId: string, displayName: string): Promise<DesktopProjectRegistrySnapshot> {
  if (!desktopProjectId.trim()) throw new Error("Desktop project identity is required.");
  if (!displayName.trim()) throw new Error("Project display name is required.");
  const result = await invoke<DesktopProjectMutationResult>("desktop_project_rename", {
    desktopProjectId,
    displayName: displayName.trim(),
  });
  if (result.state !== "renamed") throw new Error("The Desktop project host did not confirm rename.");
  const snapshot = validateSnapshot(result.snapshot);
  publishRegistry(snapshot);
  return snapshot;
}

export async function detachDesktopProject(desktopProjectId: string): Promise<DesktopProjectRegistrySnapshot> {
  if (!desktopProjectId.trim()) throw new Error("Desktop project identity is required.");
  const result = await invoke<DesktopProjectMutationResult>("desktop_project_detach", { desktopProjectId });
  if (result.state !== "detached") throw new Error("The Desktop project host did not confirm removal.");
  const snapshot = validateSnapshot(result.snapshot);
  publishRegistry(snapshot);
  return snapshot;
}

export async function pickDesktopProjectFolder(): Promise<string | null> {
  const selected = await invoke<string | null>("pick_first_run_folder");
  return typeof selected === "string" && selected.trim() ? selected.trim() : null;
}

export function onDesktopProjectActivated(listener: (detail: DesktopProjectActivatedDetail) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<DesktopProjectActivatedDetail>).detail);
  document.addEventListener(ACTIVATED_EVENT, handler);
  return () => document.removeEventListener(ACTIVATED_EVENT, handler);
}

export function onDesktopProjectRegistryChanged(listener: (snapshot: DesktopProjectRegistrySnapshot) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<DesktopProjectRegistrySnapshot>).detail);
  document.addEventListener(REGISTRY_EVENT, handler);
  return () => document.removeEventListener(REGISTRY_EVENT, handler);
}
