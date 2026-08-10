export type OwnershipClass = "framework-owned" | "project-owned" | "mixed-or-projected";

export type ProjectBrainHealth =
  | "not-found"
  | "valid"
  | "partial-or-damaged"
  | "unsupported-or-ambiguous";

export interface ProjectBrainPresence {
  present: boolean;
  path: string;
}

export interface ProjectBrainInspection {
  health: ProjectBrainHealth;
  path: string;
  missingFiles: string[];
  reason?: string;
}

export interface ProjectBrainMetadata {
  framework: {
    version: string;
    channel: string;
  };
  projectBrain: {
    schemaVersion: number;
  };
}

export interface BootstrapKnowledge {
  projectName?: string;
  evidence: string[];
  unknowns: string[];
}
