import { invoke } from "@tauri-apps/api/core";
import { getLanguage } from "./i18n/runtime.js";
import {
  renderProjectSourceReviewUnavailable,
  renderProjectSourceReviewView,
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

const text = (en: string, de: string) => getLanguage() === "de" ? de : en;
let bridgeState: ProjectSourceReviewBridgeResult = {
  state: "unavailable",
  presentation: null,
  detail: text("Project source data has not been requested yet.", "Projektquellen-Daten wurden noch nicht abgerufen."),
};

const isPresentation = (value: unknown): value is DesktopSourceReviewPresentation => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.projectId !== "string" || !candidate.projectId.trim()) return false;
  if (!Array.isArray(candidate.sources)) return false;
  if (!candidate.summary || typeof candidate.summary !== "object") return false;
  return true;
};

export async function configureProjectSourceReview(configuration: ProjectSourceReviewConfigurationInput): Promise<ProjectSourceReviewConfigurationResult> {
  return invoke<ProjectSourceReviewConfigurationResult>("configure_project_source_review", { configuration });
}

export async function observeProjectSources(): Promise<ProjectSourceObservationResult> {
  return invoke<ProjectSourceObservationResult>("observe_project_sources");
}

export async function refreshProjectSourceReviewPresentation(): Promise<void> {
  try {
    await observeProjectSources();
    const result = await invoke<ProjectSourceReviewBridgeResult>("refresh_project_source_review_presentation");
    if (result.state === "ready" && result.presentation && isPresentation(result.presentation)) {
      bridgeState = result;
      return;
    }
    bridgeState = {
      state: "unavailable",
      presentation: null,
      detail: result.detail || text("Project source presentation is unavailable.", "Die Darstellung der Projektquellen ist nicht verfügbar."),
    };
  } catch (error: unknown) {
    bridgeState = {
      state: "unavailable",
      presentation: null,
      detail: `${text("Project source observation could not be refreshed safely", "Die Projektquellen-Beobachtung konnte nicht sicher aktualisiert werden")}: ${String(error)}`,
    };
  }
}

export function getCurrentProjectSourceReviewPresentation(): DesktopSourceReviewPresentation | null {
  return bridgeState.state === "ready" ? bridgeState.presentation : null;
}

export function renderProjectSourceReviewBridgeView(): string {
  if (bridgeState.state !== "ready" || !bridgeState.presentation) return renderProjectSourceReviewUnavailable(bridgeState.detail);
  return renderProjectSourceReviewView(bridgeState.presentation);
}
