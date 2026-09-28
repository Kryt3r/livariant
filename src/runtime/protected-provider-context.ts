import { FRAMEWORK_VERSION } from "../lifecycle/state.js";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import { buildProtectedProjectContextSnapshot } from "./protected-context.js";
import { providerContextPacketId } from "./provider-context-hash.js";
import { validateProviderContextTask } from "./provider-context-task.js";
import type {
  ProviderContextBase,
  ProviderContextPacket,
  ProviderContextProjection,
  ProviderContextProvider,
} from "./provider-context-types.js";
import type { ProviderContextBuildOptions } from "./provider-context-build.js";

function projection(): ProviderContextProjection {
  return {
    derived: true,
    providerContext: true,
    automaticInjection: false,
    returnedCopiesTrusted: false,
    mutationAuthorization: false,
    applySupported: false,
    authorizationEligible: false,
  };
}

export async function buildProtectedProviderContext(
  provider: ProviderContextProvider,
  task: string,
  projectPath: string = process.cwd(),
  options: ProviderContextBuildOptions = {},
): Promise<ProviderContextPacket> {
  if (provider !== "claude-code" && provider !== "codex" && provider !== "gemini" && provider !== "custom") throw new Error("Unsupported provider context target.");
  validateProviderContextTask(task);
  if (options.providerSessionId !== undefined && !isStableProjectIdentity(options.providerSessionId)) {
    throw new Error("Provider session id must be a canonical UUID.");
  }
  if (options.providerThreadId !== undefined) {
    const threadId = options.providerThreadId.trim();
    if (threadId.length === 0 || threadId.length > 240 || /[\u0000-\u001f\u007f]/.test(threadId)) {
      throw new Error("Provider thread id is invalid.");
    }
  }

  const snapshot = await buildProtectedProjectContextSnapshot(projectPath, options);
  const base: ProviderContextBase = {
    schemaVersion: 1,
    packetVersion: 1,
    generatedAt: new Date().toISOString(),
    frameworkVersion: FRAMEWORK_VERSION,
    provider,
    projectLocator: snapshot.projectLocator,
    stableProjectIdentity: snapshot.stableProjectIdentity,
    providerSession: options.providerSessionId
      ? {
          id: options.providerSessionId,
          source: "mcp-session",
          ...(options.providerThreadId ? { providerThreadId: options.providerThreadId.trim() } : {}),
        }
      : null,
    projection: projection(),
    mutationAuthorization: false,
    applySupported: false,
    authorizationEligible: false,
    changesMade: 0,
  };

  if (snapshot.safetyState === "blocked") {
    return {
      ...base,
      state: "blocked",
      packetId: null,
      baseline: snapshot.baseline,
      safetyState: "blocked",
      evidence: null,
      task: null,
      findings: snapshot.findings,
    };
  }

  return {
    ...base,
    state: "ready",
    packetId: providerContextPacketId(
      provider,
      snapshot.baseline.digest,
      task,
      options.providerSessionId,
      options.providerThreadId?.trim(),
    ),
    baseline: snapshot.baseline,
    safetyState: "clear",
    evidence: snapshot.context,
    task: { value: task, authorityClass: "session-ephemeral" },
    findings: [],
  };
}
