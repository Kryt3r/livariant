import { FRAMEWORK_VERSION, PROJECT_BRAIN_SCHEMA_VERSION, UPDATE_CHANNEL } from "../lifecycle/state.js";
import { discoverProject } from "../project/discovery.js";
import { ProjectBrainStore, type BootstrapOptions } from "../project-brain/store.js";
import type { ProjectBrainHealth, ProjectBrainMetadata } from "../project-brain/types.js";

export type InitializationProjectState =
  | "empty"
  | "existing-project-without-brain"
  | "existing-project-with-brain"
  | "partial-or-damaged-brain"
  | "unsupported-or-ambiguous";

export type InitializationAction = "initialize" | "blocked-existing" | "blocked-diagnosis";

export interface InitializationPlan {
  projectRoot: string;
  projectState: InitializationProjectState;
  projectBrainHealth: ProjectBrainHealth;
  evidence: string[];
  filesToCreate: string[];
  projectFilesToModify: string[];
  unknowns: string[];
  action: InitializationAction;
  confirmedProjectName?: string;
  reason?: string;
}

export interface InitializeResult {
  plan: InitializationPlan;
  projectBrainPath: string;
}

export interface InitializeOptions extends BootstrapOptions {
  authorized: boolean;
}

export async function inspectInitialization(projectPath: string = process.cwd()): Promise<InitializationPlan> {
  const project = discoverProject(projectPath);
  const store = new ProjectBrainStore(project.root);
  const brain = await store.inspect();

  const evidence = [...project.signals];
  if (project.packageName) {
    evidence.push(`package-name:${project.packageName}`);
  }

  const base = {
    projectRoot: project.root,
    projectBrainHealth: brain.health,
    evidence,
    filesToCreate: [
      ".project-brain/project.md",
      ".project-brain/goals.md",
      ".project-brain/decisions.md",
      ".project-brain/knowledge.md",
      ".project-brain/metadata.json",
    ],
    projectFilesToModify: [] as string[],
    unknowns: ["project goals", "accepted architecture decisions", "deployment target"],
    confirmedProjectName: project.packageName,
  };

  switch (brain.health) {
    case "valid":
      return {
        ...base,
        projectState: "existing-project-with-brain",
        filesToCreate: [],
        action: "blocked-existing",
        reason: "A valid Project Brain already exists. Fresh initialization is not applicable.",
      };
    case "partial-or-damaged":
      return {
        ...base,
        projectState: "partial-or-damaged-brain",
        filesToCreate: [],
        action: "blocked-diagnosis",
        reason: brain.reason ?? "Project Brain state requires diagnosis before mutation.",
      };
    case "unsupported-or-ambiguous":
      return {
        ...base,
        projectState: "unsupported-or-ambiguous",
        filesToCreate: [],
        action: "blocked-diagnosis",
        reason: brain.reason ?? "Project Brain state is ambiguous and must not be guessed through.",
      };
    case "not-found":
      return {
        ...base,
        projectState: project.shape === "empty" ? "empty" : "existing-project-without-brain",
        action: "initialize",
      };
  }
}

export async function initializeProject(
  projectPath: string = process.cwd(),
  options: InitializeOptions,
): Promise<InitializeResult> {
  if (!options.authorized) throw new Error("Initialization application requires explicit authorization.");

  const plan = await inspectInitialization(projectPath);
  if (plan.action === "blocked-diagnosis") {
    throw new Error(`Initialization blocked; diagnosis required: ${plan.reason ?? "Project Brain state must be diagnosed before mutation."}`);
  }
  if (plan.action !== "initialize") {
    throw new Error(plan.reason ?? "Fresh initialization is blocked for the current project state.");
  }

  const metadata: ProjectBrainMetadata = {
    framework: {
      version: FRAMEWORK_VERSION,
      channel: UPDATE_CHANNEL,
    },
    projectBrain: {
      schemaVersion: PROJECT_BRAIN_SCHEMA_VERSION,
    },
  };

  const { authorized: _authorized, ...bootstrapOptions } = options;
  const store = new ProjectBrainStore(plan.projectRoot);
  const projectBrainPath = await store.bootstrap(
    metadata,
    {
      projectName: plan.confirmedProjectName,
      evidence: plan.evidence,
      unknowns: plan.unknowns,
    },
    bootstrapOptions,
  );

  return { plan, projectBrainPath };
}
