import { invoke } from "@tauri-apps/api/core";
import type { FirstRunOnboardingState } from "../../../src/project/first-run-onboarding.js";
import type { ProjectSourceReviewDecisionConfiguration } from "../../../src/project/first-run-source-review-configuration.js";

export interface PersistFirstRunProjectStateInput {
  schemaVersion: 1;
  onboardingState: FirstRunOnboardingState;
  selectedReviewPaths?: string[];
  decisions?: ProjectSourceReviewDecisionConfiguration[];
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
