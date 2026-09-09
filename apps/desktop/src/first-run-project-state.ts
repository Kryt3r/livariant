import { invoke } from "@tauri-apps/api/core";

export interface PersistFirstRunProjectStateInput {
  schemaVersion: 1;
  /** Serialized canonical FirstRunOnboardingState. Validation/projection stays in bundled Core. */
  onboardingState: unknown;
  selectedReviewPaths?: string[];
  decisions?: Array<{
    evidenceId: string;
    materialDigest: string;
    decision: "accept-as-candidate" | "reject" | "defer";
  }>;
}

export interface PersistFirstRunProjectStateResult {
  state: "persisted";
  detail: string;
  boundaries: {
    requestPathIsFixed: true;
    projectionUsesBundledCore: true;
    onboardingStateIsProjectTruth: false;
    projectionGrantsAuthority: false;
    projectionCreatesObservedEvidence: false;
    changesProjectOwnedFiles: false;
    performsSemanticApply: false;
  };
}

export function persistFirstRunProjectState(
  input: PersistFirstRunProjectStateInput,
): Promise<PersistFirstRunProjectStateResult> {
  return invoke<PersistFirstRunProjectStateResult>("persist_first_run_project_state", { input });
}
