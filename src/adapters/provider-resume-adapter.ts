import type { ResumeContext } from "../runtime/resume.js";
import {
  getResumeProviderProjection,
  type ResumeProviderId,
} from "./resume-provider.js";

export type AdapterLifecycle = "preview-supported";
export type AdapterCompatibility = "compatible" | "unknown" | "incompatible";
export type CapabilityState = "available" | "unknown" | "unavailable";

export interface ProviderEnvironmentEvidence {
  provider: ResumeProviderId;
  detection: "explicit-framework-selection" | "not-detected";
  observedAt: string;
  selectedValue?: string;
}

export interface ResumeAdapterInspection {
  adapterId: string;
  adapterVersion: string;
  lifecycle: AdapterLifecycle;
  provenance: "framework-bundled";
  targetEnvironment: string;
  declaredCapabilities: readonly ["resume.context.project"];
  observedCapabilities: {
    "resume.context.project": CapabilityState;
  };
  compatibility: AdapterCompatibility;
  evidence: ProviderEnvironmentEvidence;
  durableInstructionMutation: false;
  executionAuthorityGranted: false;
}

export interface PreviewResumeAdapter {
  id: ResumeProviderId;
  adapterId: string;
  version: "0.1.0-preview";
  lifecycle: AdapterLifecycle;
  provenance: "framework-bundled";
  targetEnvironment: string;
  declaredCapabilities: readonly ["resume.context.project"];
  durableInstructionMutation: false;
  executionAuthorityGranted: false;
  inspect(environment?: NodeJS.ProcessEnv): ResumeAdapterInspection;
  render(context: ResumeContext, environment?: NodeJS.ProcessEnv): string;
}

const PROVIDER_SELECTION_ENV = "LIVARIANT_PROVIDER_ENV";

function inspectAdapter(adapter: PreviewResumeAdapter, environment: NodeJS.ProcessEnv): ResumeAdapterInspection {
  const selected = environment[PROVIDER_SELECTION_ENV];
  const detected = selected === adapter.id;
  const conflictingSelection = selected !== undefined && selected.length > 0 && !detected;

  return {
    adapterId: adapter.adapterId,
    adapterVersion: adapter.version,
    lifecycle: adapter.lifecycle,
    provenance: adapter.provenance,
    targetEnvironment: adapter.targetEnvironment,
    declaredCapabilities: adapter.declaredCapabilities,
    observedCapabilities: {
      "resume.context.project": detected ? "available" : conflictingSelection ? "unavailable" : "unknown",
    },
    compatibility: detected ? "compatible" : conflictingSelection ? "incompatible" : "unknown",
    evidence: {
      provider: adapter.id,
      detection: detected ? "explicit-framework-selection" : "not-detected",
      observedAt: new Date().toISOString(),
      selectedValue: selected,
    },
    durableInstructionMutation: false,
    executionAuthorityGranted: false,
  };
}

function createAdapter(
  id: ResumeProviderId,
  adapterId: string,
  targetEnvironment: string,
): PreviewResumeAdapter {
  return {
    id,
    adapterId,
    version: "0.1.0-preview",
    lifecycle: "preview-supported",
    provenance: "framework-bundled",
    targetEnvironment,
    declaredCapabilities: ["resume.context.project"],
    durableInstructionMutation: false,
    executionAuthorityGranted: false,
    inspect(environment = process.env) {
      return inspectAdapter(this, environment);
    },
    render(context, environment = process.env) {
      const inspection = this.inspect(environment);
      if (inspection.compatibility !== "compatible" || inspection.observedCapabilities["resume.context.project"] !== "available") {
        throw new Error(
          `${this.adapterId} cannot provide Preview resume handoff without current provider-environment evidence. ` +
          `Select '${this.id}' explicitly through ${PROVIDER_SELECTION_ENV}.`,
        );
      }
      return [
        `Adapter: ${this.adapterId}@${this.version}`,
        `Compatibility: ${inspection.compatibility}`,
        `Environment evidence: ${inspection.evidence.detection}`,
        "Capability: resume.context.project = available",
        "Execution authority granted: false",
        "Durable instruction mutation: false",
        "",
        getResumeProviderProjection(this.id).render(context),
      ].join("\n");
    },
  };
}

export const claudeCodePreviewResumeAdapter = createAdapter(
  "claude-code",
  "livariant.claude-code.resume",
  "Claude Code agent environment",
);

export const codexPreviewResumeAdapter = createAdapter(
  "codex",
  "livariant.codex.resume",
  "Codex agent environment",
);

export function getPreviewResumeAdapter(id: ResumeProviderId): PreviewResumeAdapter {
  return id === "claude-code" ? claudeCodePreviewResumeAdapter : codexPreviewResumeAdapter;
}
