export type ProviderCapabilityId =
  | "live-project-context"
  | "live-session-correlation"
  | "retrospective-session-attribution"
  | "provider-owned-usage-telemetry";

export type ProviderCapabilityState =
  | "supported"
  | "mcp-session-only"
  | "supported-opt-in"
  | "provider-capable-not-integrated"
  | "not-integrated"
  | "bridge-dependent";

export interface ProviderCapability {
  state: ProviderCapabilityState;
  evidence: "livariant-runtime" | "provider-mcp" | "provider-runtime" | "provider-hooks" | "custom-bridge";
  detail: string;
}

export interface ProviderCapabilityMatrix {
  provider: "codex" | "claude" | "gemini" | "custom";
  capabilities: Record<ProviderCapabilityId, ProviderCapability>;
}

const matrix: Record<ProviderCapabilityMatrix["provider"], ProviderCapabilityMatrix> = {
  codex: {
    provider: "codex",
    capabilities: {
      "live-project-context": {
        state: "supported",
        evidence: "livariant-runtime",
        detail: "Livariant MCP Provider Context is project-bound and independent of Desktop selection.",
      },
      "live-session-correlation": {
        state: "supported",
        evidence: "provider-runtime",
        detail: "Livariant binds MCP issuance to Codex provider-native thread metadata when Codex supplies _meta.threadId.",
      },
      "retrospective-session-attribution": {
        state: "supported",
        evidence: "provider-runtime",
        detail: "Persisted Codex thread/session metadata can be reconciled to registered projects by provider-owned cwd.",
      },
      "provider-owned-usage-telemetry": {
        state: "supported",
        evidence: "provider-runtime",
        detail: "Observed usage comes from Codex App Server thread/tokenUsage/updated notifications.",
      },
    },
  },
  claude: {
    provider: "claude",
    capabilities: {
      "live-project-context": {
        state: "supported",
        evidence: "provider-mcp",
        detail: "Claude Code supports project-local MCP and Livariant Provider Context/Return.",
      },
      "live-session-correlation": {
        state: "mcp-session-only",
        evidence: "livariant-runtime",
        detail: "Livariant isolates each running MCP session, but no Claude-native session id is currently bound into MCP tool calls.",
      },
      "retrospective-session-attribution": {
        state: "supported-opt-in",
        evidence: "provider-runtime",
        detail: "Claude hook evidence can be captured without Desktop running and later reconciled to registered projects by cwd when the user explicitly configures the Livariant hook command.",
      },
      "provider-owned-usage-telemetry": {
        state: "not-integrated",
        evidence: "provider-runtime",
        detail: "The current Livariant Claude connection has no qualified provider-owned token telemetry ingestion path.",
      },
    },
  },
  gemini: {
    provider: "gemini",
    capabilities: {
      "live-project-context": {
        state: "supported",
        evidence: "provider-mcp",
        detail: "Gemini CLI supports project-scoped MCP and Livariant now accepts Gemini Provider Context/Return.",
      },
      "live-session-correlation": {
        state: "mcp-session-only",
        evidence: "livariant-runtime",
        detail: "Livariant isolates each running MCP session; Gemini hook session_id/cwd metadata is not implicitly installed or consumed.",
      },
      "retrospective-session-attribution": {
        state: "supported-opt-in",
        evidence: "provider-hooks",
        detail: "Gemini hook evidence can be captured without Desktop running and later reconciled to registered projects by cwd when the user explicitly configures the Livariant hook command.",
      },
      "provider-owned-usage-telemetry": {
        state: "provider-capable-not-integrated",
        evidence: "provider-hooks",
        detail: "Gemini AfterModel hooks expose provider-owned usage metadata, but Livariant has not qualified that Diagnostics ingestion path yet.",
      },
    },
  },
  custom: {
    provider: "custom",
    capabilities: {
      "live-project-context": {
        state: "bridge-dependent",
        evidence: "custom-bridge",
        detail: "A successful custom executable probe confirms readiness only; Provider Context support must be declared and implemented by the bridge.",
      },
      "live-session-correlation": {
        state: "bridge-dependent",
        evidence: "custom-bridge",
        detail: "Session identity depends on metadata exposed by the custom bridge.",
      },
      "retrospective-session-attribution": {
        state: "bridge-dependent",
        evidence: "custom-bridge",
        detail: "Historical session attribution is unavailable unless the custom bridge exposes stable session/project evidence.",
      },
      "provider-owned-usage-telemetry": {
        state: "bridge-dependent",
        evidence: "custom-bridge",
        detail: "Usage telemetry is unavailable unless the custom bridge exposes qualified provider-owned evidence.",
      },
    },
  },
};

export function providerCapabilityMatrix(provider: ProviderCapabilityMatrix["provider"]): ProviderCapabilityMatrix {
  return {
    provider,
    capabilities: Object.fromEntries(
      Object.entries(matrix[provider].capabilities).map(([id, capability]) => [id, { ...capability }]),
    ) as ProviderCapabilityMatrix["capabilities"],
  };
}
