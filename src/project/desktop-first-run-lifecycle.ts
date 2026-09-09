import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { buildBootstrapDiscovery } from "./bootstrap-discovery.js";
import { discoverProject } from "./discovery.js";
import {
  addOnboardingAdditionalRepository,
  answerOnboardingQuestion,
  completeFirstRunOnboarding,
  createFirstRunOnboardingState,
  moveFirstRunOnboardingTo,
  selectOnboardingProject,
  setOnboardingPrimaryRepository,
  setOnboardingProviders,
  setOnboardingUnderstandingReview,
  skipOnboardingQuestion,
  type FirstRunOnboardingState,
  type FirstRunOnboardingStep,
} from "./first-run-onboarding.js";
import { projectSourceReviewConfigurationFromFirstRun } from "./first-run-source-review-configuration.js";
import type { RepositoryIdentity } from "./source-registry.js";
import { buildUnderstandingReview, type UnderstandingReviewReport } from "./understanding-review.js";

export type DesktopFirstRunLifecycleAction =
  | { type: "move"; step: FirstRunOnboardingStep }
  | { type: "select-project"; projectId?: string; localRoot?: string }
  | { type: "answer-question"; questionId: string; response: string }
  | { type: "skip-question"; questionId: string }
  | {
      type: "set-primary-repository";
      identity: RepositoryIdentity;
      localPath?: string;
    }
  | {
      type: "add-additional-repository";
      identity: RepositoryIdentity;
      description: string;
      localPath?: string;
    }
  | { type: "set-providers"; providerIds: string[]; deferred?: boolean }
  | { type: "complete" };

export interface DesktopFirstRunLifecycleSnapshot {
  schemaVersion: 1;
  status: "required" | "in-progress" | "complete";
  onboardingState: FirstRunOnboardingState;
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

function emptyUnderstandingReview(): UnderstandingReviewReport {
  return {
    schemaVersion: 1,
    projectRoot: "",
    projectShape: "empty",
    confirmed: [],
    stronglyInferred: [],
    uncertain: [],
    attention: [],
    questions: [],
    candidateEvidence: [],
    boundaries: {
      evidenceIsProjectTruth: false,
      candidateEvidenceIsProjectTruth: false,
      grantsAuthority: false,
      changesMade: 0,
    },
  };
}

export function createDesktopFirstRunInitialState(): FirstRunOnboardingState {
  return createFirstRunOnboardingState(emptyUnderstandingReview());
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be a JSON object.`);
  return value as Record<string, unknown>;
}

const STEPS = new Set<FirstRunOnboardingStep>([
  "welcome",
  "project",
  "understanding",
  "sources",
  "providers",
  "health",
  "complete",
]);

export function parsePersistedFirstRunOnboardingState(value: unknown): FirstRunOnboardingState {
  const state = requireObject(value, "onboardingState");
  if (state.schemaVersion !== 1) throw new Error("Persisted first-run onboarding schemaVersion must be 1.");
  if (typeof state.currentStep !== "string" || !STEPS.has(state.currentStep as FirstRunOnboardingStep)) {
    throw new Error("Persisted first-run onboarding currentStep is invalid.");
  }
  if (typeof state.completed !== "boolean") throw new Error("Persisted first-run onboarding completed must be boolean.");
  requireObject(state.project, "onboardingState.project");
  const understanding = requireObject(state.understanding, "onboardingState.understanding");
  if (typeof understanding.projectRoot !== "string" || !Array.isArray(understanding.questions)) {
    throw new Error("Persisted first-run onboarding understanding state is invalid.");
  }
  const providers = requireObject(state.providers, "onboardingState.providers");
  if (!Array.isArray(providers.configuredProviderIds) || typeof providers.deferred !== "boolean") {
    throw new Error("Persisted first-run onboarding provider state is invalid.");
  }
  requireObject(state.health, "onboardingState.health");
  const boundaries = requireObject(state.boundaries, "onboardingState.boundaries");
  for (const key of [
    "unansweredQuestionGetsDefault",
    "skippedQuestionBecomesKnown",
    "onboardingEvidenceIsProjectTruth",
    "repositoryDescriptionGrantsAuthority",
    "grantsAuthority",
    "mutationAuthorized",
    "changesProjectOwnedFiles",
  ]) {
    if (boundaries[key] !== false) throw new Error(`Persisted first-run onboarding boundary ${key} must remain false.`);
  }
  return state as unknown as FirstRunOnboardingState;
}

function parseAction(value: unknown): DesktopFirstRunLifecycleAction {
  const action = requireObject(value, "firstRunAction");
  if (typeof action.type !== "string") throw new Error("First-run lifecycle action type is required.");
  switch (action.type) {
    case "move":
      if (typeof action.step !== "string" || !STEPS.has(action.step as FirstRunOnboardingStep)) throw new Error("First-run move action step is invalid.");
      return { type: "move", step: action.step as FirstRunOnboardingStep };
    case "select-project":
      return {
        type: "select-project",
        ...(typeof action.projectId === "string" ? { projectId: action.projectId } : {}),
        ...(typeof action.localRoot === "string" ? { localRoot: action.localRoot } : {}),
      };
    case "answer-question":
      if (typeof action.questionId !== "string" || typeof action.response !== "string") throw new Error("First-run answer action requires questionId and response.");
      return { type: "answer-question", questionId: action.questionId, response: action.response };
    case "skip-question":
      if (typeof action.questionId !== "string") throw new Error("First-run skip action requires questionId.");
      return { type: "skip-question", questionId: action.questionId };
    case "set-primary-repository": {
      const identity = requireObject(action.identity, "firstRunAction.identity") as unknown as RepositoryIdentity;
      return {
        type: "set-primary-repository",
        identity,
        ...(typeof action.localPath === "string" ? { localPath: action.localPath } : {}),
      };
    }
    case "add-additional-repository": {
      const identity = requireObject(action.identity, "firstRunAction.identity") as unknown as RepositoryIdentity;
      if (typeof action.description !== "string") throw new Error("Additional repository action requires description.");
      return {
        type: "add-additional-repository",
        identity,
        description: action.description,
        ...(typeof action.localPath === "string" ? { localPath: action.localPath } : {}),
      };
    }
    case "set-providers":
      if (!Array.isArray(action.providerIds) || !action.providerIds.every((value) => typeof value === "string")) {
        throw new Error("Provider action requires a string providerIds array.");
      }
      return {
        type: "set-providers",
        providerIds: action.providerIds as string[],
        ...(typeof action.deferred === "boolean" ? { deferred: action.deferred } : {}),
      };
    case "complete":
      return { type: "complete" };
    default:
      throw new Error(`Unsupported first-run lifecycle action: ${String(action.type)}`);
  }
}

export function transitionDesktopFirstRunState(
  state: FirstRunOnboardingState,
  actionValue: unknown,
): FirstRunOnboardingState {
  const action = parseAction(actionValue);
  switch (action.type) {
    case "move":
      return moveFirstRunOnboardingTo(state, action.step);
    case "select-project": {
      let next = selectOnboardingProject(state, { projectId: action.projectId, localRoot: action.localRoot });
      const localRoot = action.localRoot?.trim();
      if (localRoot) {
        const review = buildUnderstandingReview(buildBootstrapDiscovery(discoverProject(localRoot)));
        next = setOnboardingUnderstandingReview(next, review);
      }
      return next;
    }
    case "answer-question":
      return answerOnboardingQuestion(state, action.questionId, action.response);
    case "skip-question":
      return skipOnboardingQuestion(state, action.questionId);
    case "set-primary-repository":
      return setOnboardingPrimaryRepository(state, {
        identity: action.identity,
        ...(action.localPath?.trim() ? { local: { localPath: action.localPath } } : {}),
      });
    case "add-additional-repository":
      return addOnboardingAdditionalRepository(state, {
        identity: action.identity,
        description: action.description,
        ...(action.localPath?.trim() ? { local: { localPath: action.localPath } } : {}),
      });
    case "set-providers":
      return setOnboardingProviders(state, action.providerIds, { deferred: action.deferred });
    case "complete":
      return completeFirstRunOnboarding(state);
  }
}

export function firstRunSourceReviewReady(state: FirstRunOnboardingState): boolean {
  try {
    projectSourceReviewConfigurationFromFirstRun(state);
    return true;
  } catch {
    return false;
  }
}

export function desktopFirstRunLifecycleSnapshot(
  state: FirstRunOnboardingState,
  persisted: boolean,
): DesktopFirstRunLifecycleSnapshot {
  return {
    schemaVersion: 1,
    status: state.completed ? "complete" : persisted ? "in-progress" : "required",
    onboardingState: state,
    sourceReviewReady: firstRunSourceReviewReady(state),
    boundaries: {
      lifecycleUsesCanonicalFirstRunState: true,
      rendererMutatesCanonicalStateDirectly: false,
      persistedStateIsProjectTruth: false,
      lifecycleGrantsAuthority: false,
      lifecycleCreatesObservedEvidence: false,
      changesProjectOwnedFiles: false,
      performsSemanticApply: false,
    },
  };
}

async function persistedState(path: string): Promise<{ state: FirstRunOnboardingState; persisted: boolean }> {
  if (!existsSync(path)) return { state: createDesktopFirstRunInitialState(), persisted: false };
  const wrapper = requireObject(JSON.parse(await readFile(path, "utf8")), "persistedFirstRunRequest");
  return { state: parsePersistedFirstRunOnboardingState(wrapper.onboardingState), persisted: true };
}

async function main() {
  const statePath = process.env.LIVARIANT_FIRST_RUN_PROJECT_STATE_PATH?.trim();
  if (!statePath) throw new Error("LIVARIANT_FIRST_RUN_PROJECT_STATE_PATH is required.");
  const loaded = await persistedState(statePath);
  const actionPath = process.env.LIVARIANT_FIRST_RUN_ACTION_PATH?.trim();
  const state = actionPath
    ? transitionDesktopFirstRunState(loaded.state, JSON.parse(await readFile(actionPath, "utf8")))
    : loaded.state;
  process.stdout.write(`${JSON.stringify(desktopFirstRunLifecycleSnapshot(state, loaded.persisted || Boolean(actionPath)))}\n`);
}

if (process.argv[1] && new URL(import.meta.url).pathname.replace(/^\/(.:\/)/, "$1") === process.argv[1].replace(/\\/g, "/")) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
