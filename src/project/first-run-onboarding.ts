import type { UnderstandingReviewReport } from "./understanding-review.js";
import {
  addAdditionalProjectRepository,
  createProjectSourceRegistry,
  type AdditionalProjectRepository,
  type PrimaryProjectRepository,
  type ProjectSourceRegistry,
} from "./source-registry.js";

export type FirstRunOnboardingStep =
  | "welcome"
  | "project"
  | "understanding"
  | "sources"
  | "providers"
  | "health"
  | "complete";

export type OnboardingQuestionState = "open" | "answered" | "skipped";

export interface OnboardingQuestion {
  id: string;
  topic: string;
  prompt: string;
  reason: string;
  state: OnboardingQuestionState;
  response?: string;
}

export interface FirstRunOnboardingState {
  schemaVersion: 1;
  currentStep: FirstRunOnboardingStep;
  completed: boolean;
  project: {
    projectId?: string;
    localRoot?: string;
    sourceRegistry?: ProjectSourceRegistry;
  };
  understanding: {
    projectRoot: string;
    questions: readonly OnboardingQuestion[];
  };
  providers: {
    configuredProviderIds: readonly string[];
    deferred: boolean;
  };
  health: {
    reviewed: boolean;
    readyForMainUi: boolean;
    openQuestionCount: number;
    skippedQuestionCount: number;
    hasProjectSelection: boolean;
    hasSourceRegistry: boolean;
  };
  boundaries: {
    unansweredQuestionGetsDefault: false;
    skippedQuestionBecomesKnown: false;
    onboardingEvidenceIsProjectTruth: false;
    repositoryDescriptionGrantsAuthority: false;
    grantsAuthority: false;
    mutationAuthorized: false;
    changesProjectOwnedFiles: false;
  };
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function health(state: Omit<FirstRunOnboardingState, "health">): FirstRunOnboardingState["health"] {
  const openQuestionCount = state.understanding.questions.filter((question) => question.state === "open").length;
  const skippedQuestionCount = state.understanding.questions.filter((question) => question.state === "skipped").length;
  const hasProjectSelection = Boolean(state.project.projectId || state.project.localRoot);
  const hasSourceRegistry = Boolean(state.project.sourceRegistry);
  const reviewed = state.currentStep === "health" || state.currentStep === "complete";
  return {
    reviewed,
    readyForMainUi: state.completed || reviewed,
    openQuestionCount,
    skippedQuestionCount,
    hasProjectSelection,
    hasSourceRegistry,
  };
}

function withHealth(state: Omit<FirstRunOnboardingState, "health">): FirstRunOnboardingState {
  return { ...state, health: health(state) };
}

function boundaries(): FirstRunOnboardingState["boundaries"] {
  return {
    unansweredQuestionGetsDefault: false,
    skippedQuestionBecomesKnown: false,
    onboardingEvidenceIsProjectTruth: false,
    repositoryDescriptionGrantsAuthority: false,
    grantsAuthority: false,
    mutationAuthorized: false,
    changesProjectOwnedFiles: false,
  };
}

export function createFirstRunOnboardingState(review: UnderstandingReviewReport): FirstRunOnboardingState {
  return withHealth({
    schemaVersion: 1,
    currentStep: "welcome",
    completed: false,
    project: {},
    understanding: {
      projectRoot: review.projectRoot,
      questions: review.questions.map((question) => ({ ...question, state: "open" as const })),
    },
    providers: {
      configuredProviderIds: [],
      deferred: false,
    },
    boundaries: boundaries(),
  });
}

export function moveFirstRunOnboardingTo(
  state: FirstRunOnboardingState,
  step: FirstRunOnboardingStep,
): FirstRunOnboardingState {
  return withHealth({ ...state, currentStep: step, completed: step === "complete" ? true : state.completed });
}

export function selectOnboardingProject(
  state: FirstRunOnboardingState,
  input: { projectId?: string; localRoot?: string },
): FirstRunOnboardingState {
  return withHealth({
    ...state,
    project: {
      ...state.project,
      ...(normalizeOptional(input.projectId) ? { projectId: normalizeOptional(input.projectId) } : {}),
      ...(normalizeOptional(input.localRoot) ? { localRoot: normalizeOptional(input.localRoot) } : {}),
    },
  });
}

export function answerOnboardingQuestion(
  state: FirstRunOnboardingState,
  questionId: string,
  response: string,
): FirstRunOnboardingState {
  const normalized = response.trim();
  if (!normalized) throw new Error("Onboarding question response must not be empty.");
  let found = false;
  const questions = state.understanding.questions.map((question) => {
    if (question.id !== questionId) return question;
    found = true;
    return { ...question, state: "answered" as const, response: normalized };
  });
  if (!found) throw new Error(`Unknown onboarding question id: ${questionId}`);
  return withHealth({ ...state, understanding: { ...state.understanding, questions } });
}

export function skipOnboardingQuestion(
  state: FirstRunOnboardingState,
  questionId: string,
): FirstRunOnboardingState {
  let found = false;
  const questions = state.understanding.questions.map((question) => {
    if (question.id !== questionId) return question;
    found = true;
    return { id: question.id, topic: question.topic, prompt: question.prompt, reason: question.reason, state: "skipped" as const };
  });
  if (!found) throw new Error(`Unknown onboarding question id: ${questionId}`);
  return withHealth({ ...state, understanding: { ...state.understanding, questions } });
}

export function setOnboardingPrimaryRepository(
  state: FirstRunOnboardingState,
  primary: Omit<PrimaryProjectRepository, "kind">,
): FirstRunOnboardingState {
  const projectId = normalizeOptional(state.project.projectId);
  if (!projectId) throw new Error("A projectId is required before configuring project repositories.");
  const sourceRegistry = createProjectSourceRegistry(projectId, primary);
  return withHealth({ ...state, project: { ...state.project, sourceRegistry } });
}

export function addOnboardingAdditionalRepository(
  state: FirstRunOnboardingState,
  repository: Omit<AdditionalProjectRepository, "kind">,
): FirstRunOnboardingState {
  if (!state.project.sourceRegistry) throw new Error("Configure the primary repository before adding additional repositories.");
  const sourceRegistry = addAdditionalProjectRepository(state.project.sourceRegistry, repository).registry;
  return withHealth({ ...state, project: { ...state.project, sourceRegistry } });
}

export function setOnboardingProviders(
  state: FirstRunOnboardingState,
  providerIds: readonly string[],
  options: { deferred?: boolean } = {},
): FirstRunOnboardingState {
  const normalized = [...new Set(providerIds.map((providerId) => providerId.trim()).filter(Boolean))];
  return withHealth({
    ...state,
    providers: {
      configuredProviderIds: normalized,
      deferred: options.deferred === true,
    },
  });
}

export function completeFirstRunOnboarding(state: FirstRunOnboardingState): FirstRunOnboardingState {
  return withHealth({ ...state, currentStep: "complete", completed: true });
}
