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
  removeOnboardingAdditionalRepository,
  selectOnboardingProject,
  setOnboardingAdditionalRepositoryLocalBinding,
  setOnboardingPrimaryRepository,
  setOnboardingPrimaryRepositoryLocalBinding,
  setOnboardingProviders,
  updateOnboardingAdditionalRepositoryDescription,
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
  | { type: "set-primary-local-binding"; localPath: string }
  | { type: "update-additional-repository-description"; identity: RepositoryIdentity; description: string }
  | { type: "set-additional-local-binding"; identity: RepositoryIdentity; localPath?: string }
  | { type: "remove-additional-repository"; identity: RepositoryIdentity }
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

  const project = requireObject(state.project, "onboardingState.project");
  const understanding = requireObject(state.understanding, "onboardingState.understanding");
  if (typeof understanding.projectRoot !== "string" || !Array.isArray(understanding.questions)) {
    throw new Error("Persisted first-run onboarding understanding state is invalid.");
  }

  const rawProviders = state.providers === undefined
    ? {}
    : requireObject(state.providers, "onboardingState.providers");
  if (rawProviders.configuredProviderIds !== undefined
      && (!Array.isArray(rawProviders.configuredProviderIds)
        || !rawProviders.configuredProviderIds.every((entry) => typeof entry === "string"))) {
    throw new Error("Persisted first-run onboarding provider ids are invalid.");
  }
  if (rawProviders.deferred !== undefined && typeof rawProviders.deferred !== "boolean") {
    throw new Error("Persisted first-run onboarding provider deferred state is invalid.");
  }
  const providers = {
    configuredProviderIds: (rawProviders.configuredProviderIds as string[] | undefined) ?? [],
    deferred: (rawProviders.deferred as boolean | undefined) ?? false,
  };

  const safeBoundaries = {
    unansweredQuestionGetsDefault: false as const,
    skippedQuestionBecomesKnown: false as const,
    onboardingEvidenceIsProjectTruth: false as const,
    repositoryDescriptionGrantsAuthority: false as const,
    grantsAuthority: false as const,
    mutationAuthorized: false as const,
    changesProjectOwnedFiles: false as const,
  };
  const rawBoundaries = state.boundaries === undefined
    ? {}
    : requireObject(state.boundaries, "onboardingState.boundaries");
  for (const key of Object.keys(safeBoundaries) as Array<keyof typeof safeBoundaries>) {
    if (key in rawBoundaries && rawBoundaries[key] !== false) {
      throw new Error(`Persisted first-run onboarding boundary ${key} must remain false.`);
    }
  }

  const currentStep = state.currentStep as FirstRunOnboardingStep;
  const completed = state.completed as boolean;
  const questions = understanding.questions as FirstRunOnboardingState["understanding"]["questions"];
  const openQuestionCount = questions.filter((question) => question?.state === "open").length;
  const skippedQuestionCount = questions.filter((question) => question?.state === "skipped").length;
  const hasProjectSelection = Boolean(project.projectId || project.localRoot);
  const hasSourceRegistry = Boolean(project.sourceRegistry);
  const reviewed = currentStep === "health" || currentStep === "complete";

  return {
    schemaVersion: 1,
    currentStep,
    completed,
    project: project as FirstRunOnboardingState["project"],
    understanding: {
      projectRoot: understanding.projectRoot as string,
      questions,
    },
    providers,
    health: {
      reviewed,
      readyForMainUi: completed || reviewed,
      openQuestionCount,
      skippedQuestionCount,
      hasProjectSelection,
      hasSourceRegistry,
    },
    boundaries: safeBoundaries,
  };
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
    case "set-primary-local-binding":
      if (typeof action.localPath !== "string" || !action.localPath.trim()) throw new Error("Primary local binding action requires localPath.");
      return { type: "set-primary-local-binding", localPath: action.localPath };
    case "update-additional-repository-description": {
      const identity = requireObject(action.identity, "firstRunAction.identity") as unknown as RepositoryIdentity;
      if (typeof action.description !== "string") throw new Error("Additional repository description action requires description.");
      return { type: "update-additional-repository-description", identity, description: action.description };
    }
    case "set-additional-local-binding": {
      const identity = requireObject(action.identity, "firstRunAction.identity") as unknown as RepositoryIdentity;
      return {
        type: "set-additional-local-binding",
        identity,
        ...(typeof action.localPath === "string" && action.localPath.trim() ? { localPath: action.localPath } : {}),
      };
    }
    case "remove-additional-repository": {
      const identity = requireObject(action.identity, "firstRunAction.identity") as unknown as RepositoryIdentity;
      return { type: "remove-additional-repository", identity };
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
    case "set-primary-local-binding":
      return setOnboardingPrimaryRepositoryLocalBinding(state, action.localPath);
    case "update-additional-repository-description":
      return updateOnboardingAdditionalRepositoryDescription(state, action.identity, action.description);
    case "set-additional-local-binding":
      return setOnboardingAdditionalRepositoryLocalBinding(state, action.identity, action.localPath);
    case "remove-additional-repository":
      return removeOnboardingAdditionalRepository(state, action.identity);
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

export async function runDesktopFirstRunLifecycleCli() {
  const statePath = process.env.LIVARIANT_FIRST_RUN_PROJECT_STATE_PATH?.trim();
  if (!statePath) throw new Error("LIVARIANT_FIRST_RUN_PROJECT_STATE_PATH is required.");
  const loaded = await persistedState(statePath);
  const actionPath = process.env.LIVARIANT_FIRST_RUN_ACTION_PATH?.trim();
  const state = actionPath
    ? transitionDesktopFirstRunState(loaded.state, JSON.parse(await readFile(actionPath, "utf8")))
    : loaded.state;
  process.stdout.write(`${JSON.stringify(desktopFirstRunLifecycleSnapshot(state, loaded.persisted || Boolean(actionPath)))}\n`);
}

