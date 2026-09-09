import { invoke } from "@tauri-apps/api/core";
import {
  renderProjectSourceReviewUnavailable,
  renderProjectSourceReviewView,
  type DesktopSourceReviewPresentation,
} from "./project-source-review-view.js";

interface ProjectSourceReviewBridgeResult {
  state: "ready" | "unavailable";
  presentation: DesktopSourceReviewPresentation | null;
  detail: string;
}

let bridgeState: ProjectSourceReviewBridgeResult = {
  state: "unavailable",
  presentation: null,
  detail: "Project Source Center runtime data has not been requested yet.",
};

const isPresentation = (value: unknown): value is DesktopSourceReviewPresentation => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.projectId !== "string" || !candidate.projectId.trim()) return false;
  if (!Array.isArray(candidate.sources)) return false;
  if (!candidate.summary || typeof candidate.summary !== "object") return false;
  return true;
};

export async function refreshProjectSourceReviewPresentation(): Promise<void> {
  try {
    const result = await invoke<ProjectSourceReviewBridgeResult>("refresh_project_source_review_presentation");
    if (result.state === "ready" && result.presentation && isPresentation(result.presentation)) {
      bridgeState = result;
      return;
    }
    bridgeState = {
      state: "unavailable",
      presentation: null,
      detail: result.detail || "Project Source Center runtime presentation is unavailable.",
    };
  } catch (error: unknown) {
    bridgeState = {
      state: "unavailable",
      presentation: null,
      detail: `Project Source Center refresh failed closed: ${String(error)}`,
    };
  }
}

export function renderProjectSourceReviewBridgeView(): string {
  if (bridgeState.state !== "ready" || !bridgeState.presentation) {
    return renderProjectSourceReviewUnavailable(bridgeState.detail);
  }
  return renderProjectSourceReviewView(bridgeState.presentation);
}
