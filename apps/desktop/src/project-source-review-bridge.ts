import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";
import {
  renderProjectSourceReviewUnavailable,
  renderProjectSourceReviewView,
  type DesktopReviewSelectionState,
  type DesktopSourceReviewPresentation,
} from "./project-source-review-view.js";

export interface ProjectSourceReviewRepositoryIdentityInput {
  provider: "github" | "git";
  repositoryId: string;
  displayName: string;
  remoteUrl?: string;
}

export interface ProjectSourceReviewConfigurationInput {
  schemaVersion: 1;
  projectId: string;
  primary: { identity: ProjectSourceReviewRepositoryIdentityInput; localPath: string };
  additional?: Array<{ identity: ProjectSourceReviewRepositoryIdentityInput; description: string; localPath?: string }>;
  selectedReviewPaths?: string[];
  decisions?: Array<{ evidenceId: string; materialDigest: string; decision: "accept-as-candidate" | "reject" | "defer" }>;
}

interface ProjectSourceReviewConfigurationResult {
  state: "configured";
  detail: string;
  boundaries: {
    outputPathIsFixed: true;
    configurationGrantsAuthority: false;
    configurationIsProjectTruth: false;
    configurationCreatesObservedEvidence: false;
    changesProjectOwnedFiles: false;
    performsSemanticApply: false;
  };
}

interface ProjectSourceObservationResult {
  state: "observed";
  detail: string;
  boundaries: {
    inputPathIsFixed: true;
    rendererSuppliesCommand: false;
    observationIsProjectTruth: false;
    observationGrantsAuthority: false;
    changesProjectOwnedFiles: false;
    performsSemanticApply: false;
  };
}

interface ProjectSourceReviewBridgeResult {
  state: "ready" | "unavailable";
  presentation: DesktopSourceReviewPresentation | null;
  detail: string;
}

interface ReviewPathInventoryResult {
  schemaVersion: 1;
  state: "ready";
  projectId: string;
  candidates: Array<{
    path: string;
    kind: string;
    scope: string;
    trust: "evidence-only";
  }>;
  selectedReviewPaths: string[];
  attention: Array<{ code: string; message: string; provenance: string[] }>;
  boundaries: {
    evidenceIsProjectTruth: false;
    contentsInterpreted: false;
    grantsAuthority: false;
    changesMade: 0;
  };
}

interface ReviewStartResult {
  state: "started";
  selectedCount: number;
  detail: string;
  boundaries: {
    selectionIsProjectTruth: false;
    selectionGrantsAuthority: false;
    changesProjectOwnedFiles: false;
    performsSemanticApply: false;
    usesFreshBoundedInventory: true;
  };
}

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
let bridgeState: ProjectSourceReviewBridgeResult = {
  state: "unavailable",
  presentation: null,
  detail: text("Project source data has not been requested yet.", "Projektquellen-Daten wurden noch nicht abgerufen."),
};
let selectionState: DesktopReviewSelectionState = {
  state: "idle",
  candidates: [],
  selectedReviewPaths: [],
  attention: [],
  detail: text("Review material has not been inventoried yet.", "Review-Material wurde noch nicht inventarisiert."),
};

const isPresentation = (value: unknown): value is DesktopSourceReviewPresentation => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.projectId !== "string" || !candidate.projectId.trim()) return false;
  if (!Array.isArray(candidate.sources)) return false;
  if (!candidate.summary || typeof candidate.summary !== "object") return false;
  return true;
};

const isReviewInventory = (value: unknown): value is ReviewPathInventoryResult => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== 1 || candidate.state !== "ready") return false;
  if (!Array.isArray(candidate.candidates) || !Array.isArray(candidate.selectedReviewPaths) || !Array.isArray(candidate.attention)) return false;
  return candidate.candidates.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.path === "string" && !!row.path.trim()
      && typeof row.kind === "string" && !!row.kind.trim()
      && typeof row.scope === "string" && !!row.scope.trim()
      && row.trust === "evidence-only";
  });
};

const applyPresentationResult = (result: ProjectSourceReviewBridgeResult) => {
  if (result.state === "ready" && result.presentation && isPresentation(result.presentation)) {
    bridgeState = result;
    return true;
  }
  bridgeState = {
    state: "unavailable",
    presentation: null,
    detail: result.detail || text("Project source presentation is unavailable.", "Die Darstellung der Projektquellen ist nicht verfügbar."),
  };
  return false;
};

async function refreshReviewPathInventory(): Promise<void> {
  try {
    const result = await invoke<ReviewPathInventoryResult>("inventory_project_source_review_paths");
    if (!isReviewInventory(result)) {
      throw new Error(text("The host returned an invalid review-path inventory.", "Der Host hat eine ungültige Review-Pfad-Inventarisierung geliefert."));
    }
    selectionState = {
      state: "ready",
      candidates: result.candidates,
      selectedReviewPaths: result.selectedReviewPaths,
      attention: result.attention,
      detail: text("Reviewable material was inventoried from the linked primary checkout.", "Prüfbares Material wurde aus dem verknüpften Haupt-Checkout inventarisiert."),
    };
  } catch (error: unknown) {
    selectionState = {
      state: "unavailable",
      candidates: [],
      selectedReviewPaths: [],
      attention: [],
      detail: `${text("Review material could not be inventoried safely", "Review-Material konnte nicht sicher inventarisiert werden")}: ${String(error)}`,
    };
  }
}

export async function configureProjectSourceReview(configuration: ProjectSourceReviewConfigurationInput): Promise<ProjectSourceReviewConfigurationResult> {
  return invoke<ProjectSourceReviewConfigurationResult>("configure_project_source_review", { configuration });
}

export async function observeProjectSources(): Promise<ProjectSourceObservationResult> {
  return invoke<ProjectSourceObservationResult>("observe_project_sources");
}

export async function loadProjectSourceReviewPresentation(): Promise<void> {
  try {
    const result = await invoke<ProjectSourceReviewBridgeResult>("project_source_review_presentation");
    applyPresentationResult(result);
  } catch (error: unknown) {
    bridgeState = {
      state: "unavailable",
      presentation: null,
      detail: `${text("Cached project source presentation could not be loaded safely", "Die zwischengespeicherte Projektquellen-Darstellung konnte nicht sicher geladen werden")}: ${String(error)}`,
    };
  }
}

export async function refreshProjectSourceReviewPresentation(): Promise<void> {
  try {
    await observeProjectSources();
    const result = await invoke<ProjectSourceReviewBridgeResult>("refresh_project_source_review_presentation_nonblocking");
    if (applyPresentationResult(result)) {
      await refreshReviewPathInventory();
      return;
    }
    selectionState = {
      state: "unavailable",
      candidates: [],
      selectedReviewPaths: [],
      attention: [],
      detail: bridgeState.detail,
    };
  } catch (error: unknown) {
    bridgeState = {
      state: "unavailable",
      presentation: null,
      detail: `${text("Project source observation could not be refreshed safely", "Die Projektquellen-Beobachtung konnte nicht sicher aktualisiert werden")}: ${String(error)}`,
    };
    selectionState = {
      state: "unavailable",
      candidates: [],
      selectedReviewPaths: [],
      attention: [],
      detail: bridgeState.detail,
    };
  }
}

export async function startProjectSourceReview(selectedReviewPaths: string[]): Promise<ReviewStartResult> {
  const result = await invoke<ReviewStartResult>("start_project_source_review", {
    selection: { selectedReviewPaths },
  });
  if (result.state !== "started" || result.boundaries.selectionGrantsAuthority !== false || result.boundaries.performsSemanticApply !== false) {
    throw new Error(text("The host returned an invalid review-start result.", "Der Host hat ein ungültiges Ergebnis für den Review-Start geliefert."));
  }
  await refreshProjectSourceReviewPresentation();
  return result;
}

export function getCurrentProjectSourceReviewPresentation(): DesktopSourceReviewPresentation | null {
  return bridgeState.state === "ready" ? bridgeState.presentation : null;
}

export function renderProjectSourceReviewBridgeView(): string {
  if (bridgeState.state !== "ready" || !bridgeState.presentation) return renderProjectSourceReviewUnavailable(bridgeState.detail);
  return renderProjectSourceReviewView(bridgeState.presentation, selectionState);
}
