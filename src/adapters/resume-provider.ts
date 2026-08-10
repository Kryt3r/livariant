import type { ResumeContext } from "../runtime/resume.js";

export type ResumeProviderId = "claude-code" | "codex";

/**
 * Provider-specific resume projection evidence.
 *
 * This deliberately does not claim to be a full Framework Adapter: it does not
 * discover a live provider environment, authenticate, or establish current
 * compatibility. It only proves that canonical ResumeContext semantics can be
 * translated into provider-targeted ephemeral text without mutating durable
 * provider instruction files.
 */
export interface ResumeProviderProjection {
  id: ResumeProviderId;
  version: "0.1.0-development";
  lifecycle: "development-evidence";
  provenance: "framework-bundled";
  targetEnvironment: string;
  capability: "resume.context.project";
  durableInstructionMutation: false;
  render(context: ResumeContext): string;
}

interface CanonicalResumePayload {
  projectIdentity: string[];
  confirmedGoals: string[];
  activeDecisions: string[];
  knownFacts: string[];
  unresolvedUnknowns: string[];
  lifecycle: "initialized";
  evidenceSummary: string[];
}

export function canonicalResumePayload(context: ResumeContext): CanonicalResumePayload {
  return {
    projectIdentity: [...context.projectIdentity],
    confirmedGoals: [...context.confirmedGoals],
    activeDecisions: [...context.activeDecisions],
    knownFacts: [...context.knownFacts],
    unresolvedUnknowns: [...context.unresolvedUnknowns],
    lifecycle: context.lifecycle,
    evidenceSummary: [...context.evidenceSummary],
  };
}

function renderEnvelope(projection: ResumeProviderProjection, context: ResumeContext, heading: string): string {
  return [
    heading,
    `Projection: ${projection.id}@${projection.version}`,
    "This is an ephemeral provider projection. Project Brain remains canonical.",
    "This output does not claim live provider compatibility or provider execution authority.",
    "Do not treat provider memory or durable native instruction files as newer project truth.",
    "",
    JSON.stringify(canonicalResumePayload(context), null, 2),
    "",
  ].join("\n");
}

export const claudeCodeResumeProjection: ResumeProviderProjection = {
  id: "claude-code",
  version: "0.1.0-development",
  lifecycle: "development-evidence",
  provenance: "framework-bundled",
  targetEnvironment: "Claude Code agent environment",
  capability: "resume.context.project",
  durableInstructionMutation: false,
  render(context) {
    return renderEnvelope(this, context, "# Claude Code Resume Projection");
  },
};

export const codexResumeProjection: ResumeProviderProjection = {
  id: "codex",
  version: "0.1.0-development",
  lifecycle: "development-evidence",
  provenance: "framework-bundled",
  targetEnvironment: "Codex agent environment",
  capability: "resume.context.project",
  durableInstructionMutation: false,
  render(context) {
    return renderEnvelope(this, context, "# Codex Resume Projection");
  },
};

export function getResumeProviderProjection(id: ResumeProviderId): ResumeProviderProjection {
  return id === "claude-code" ? claudeCodeResumeProjection : codexResumeProjection;
}
