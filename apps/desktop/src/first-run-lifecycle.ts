import { invoke } from "@tauri-apps/api/core";

export type FirstRunLifecycleStatus = "required" | "in-progress" | "complete";

export type FirstRunLifecycleAction =
  | { type: "move"; step: "welcome" | "project" | "understanding" | "sources" | "providers" | "health" | "complete" }
  | { type: "select-project"; projectId?: string; localRoot?: string }
  | { type: "answer-question"; questionId: string; response: string }
  | { type: "skip-question"; questionId: string }
  | {
      type: "set-primary-repository";
      identity: { provider: "github" | "git"; repositoryId: string; displayName: string; remoteUrl?: string };
      localPath?: string;
    }
  | {
      type: "add-additional-repository";
      identity: { provider: "github" | "git"; repositoryId: string; displayName: string; remoteUrl?: string };
      description: string;
      localPath?: string;
    }
  | { type: "set-providers"; providerIds: string[]; deferred?: boolean }
  | { type: "complete" };

export interface FirstRunLifecycleSnapshot {
  schemaVersion: 1;
  status: FirstRunLifecycleStatus;
  onboardingState: unknown;
  sourceReviewReady: boolean;
  boundaries: {
    lifecycleUsesCanonicalFirstRunState: true;
    rendererMutatesCanonicalStateDirectly: false;
    persistedStateIsProjectTruth: false;
    lifecycleGrantsAuthority: false;
    lifecycleCreatesObservedEvidence: false;
    changesProjectOwnedFiles: false;
    performsSemanticApply: false;
  };
}

export function loadFirstRunLifecycle(): Promise<FirstRunLifecycleSnapshot> {
  return invoke<FirstRunLifecycleSnapshot>("first_run_onboarding_state");
}

export function transitionFirstRunLifecycle(action: FirstRunLifecycleAction): Promise<FirstRunLifecycleSnapshot> {
  return invoke<FirstRunLifecycleSnapshot>("transition_first_run_onboarding", { action });
}
