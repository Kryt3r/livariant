import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";
import { onDesktopProjectActivated } from "./desktop-project-registry.js";
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
const sourceReviewFailureCopy = (kind: "inventory" | "cached" | "refresh"): string => {
  if (kind === "inventory") return text(
    "Review material could not be inventoried safely. Check the linked checkout and try again.",
    "Review-Material konnte nicht sicher inventarisiert werden. Prüfe den verknüpften Checkout und versuche es erneut.",
  );
  if (kind === "cached") return text(
    "The cached project-source view could not be loaded safely. Refresh the project sources to rebuild it.",
    "Die zwischengespeicherte Projektquellen-Ansicht konnte nicht sicher geladen werden. Aktualisiere die Projektquellen, um sie neu aufzubauen.",
  );
  return text(
    "Project sources could not be refreshed safely. Existing source state was not treated as current. Check the linked checkout and try again.",
    "Projektquellen konnten nicht sicher aktualisiert werden. Der bestehende Quellenstatus wurde nicht als aktuell behandelt. Prüfe den verknüpften Checkout und versuche es erneut.",
  );
};
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
let rendererProjectGeneration = 0;

const resetProjectScopedRendererState = () => {
  bridgeState = {
    state: "unavailable",
    presentation: null,
    detail: text("Project source data is loading for the active project.", "Projektquellen-Daten werden für das aktive Projekt geladen."),
  };
  selectionState = {
    state: "idle",
    candidates: [],
    selectedReviewPaths: [],
    attention: [],
    detail: text("Review material is loading for the active project.", "Review-Material wird für das aktive Projekt geladen."),
  };
};

onDesktopProjectActivated(() => {
  rendererProjectGeneration += 1;
  resetProjectScopedRendererState();
});

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

async function refreshReviewPathInventory(expectedGeneration = rendererProjectGeneration): Promise<void> {
  try {
    const result = await invoke<ReviewPathInventoryResult>("inventory_project_source_review_paths");
    if (expectedGeneration !== rendererProjectGeneration) return;
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
  } catch {
    if (expectedGeneration !== rendererProjectGeneration) return;
    selectionState = {
      state: "unavailable",
      candidates: [],
      selectedReviewPaths: [],
      attention: [],
      detail: sourceReviewFailureCopy("inventory"),
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
  const generation = rendererProjectGeneration;
  try {
    const result = await invoke<ProjectSourceReviewBridgeResult>("project_source_review_presentation");
    if (generation !== rendererProjectGeneration) return;
    applyPresentationResult(result);
  } catch {
    if (generation !== rendererProjectGeneration) return;
    bridgeState = {
      state: "unavailable",
      presentation: null,
      detail: sourceReviewFailureCopy("cached"),
    };
  }
}

export async function refreshProjectSourceReviewPresentation(): Promise<void> {
  const generation = rendererProjectGeneration;
  try {
    await observeProjectSources();
    if (generation !== rendererProjectGeneration) return;
    const result = await invoke<ProjectSourceReviewBridgeResult>("refresh_project_source_review_presentation_nonblocking");
    if (generation !== rendererProjectGeneration) return;
    if (applyPresentationResult(result)) {
      await refreshReviewPathInventory(generation);
      return;
    }
    selectionState = {
      state: "unavailable",
      candidates: [],
      selectedReviewPaths: [],
      attention: [],
      detail: bridgeState.detail,
    };
  } catch {
    if (generation !== rendererProjectGeneration) return;
    bridgeState = {
      state: "unavailable",
      presentation: null,
      detail: sourceReviewFailureCopy("refresh"),
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
  const generation = rendererProjectGeneration;
  const result = await invoke<ReviewStartResult>("start_project_source_review", {
    selection: { selectedReviewPaths },
  });
  if (result.state !== "started" || result.boundaries.selectionGrantsAuthority !== false || result.boundaries.performsSemanticApply !== false) {
    throw new Error(text("The host returned an invalid review-start result.", "Der Host hat ein ungültiges Ergebnis für den Review-Start geliefert."));
  }
  if (generation !== rendererProjectGeneration) return result;
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
