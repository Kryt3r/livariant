import { FRAMEWORK_VERSION } from "../lifecycle/state.js";
import { buildProjectContextSnapshot, type ProjectContextSnapshotBuildOptions } from "./context-snapshot.js";
import { providerContextPacketId } from "./provider-context-hash.js";
import { validateProviderContextTask } from "./provider-context-task.js";
import type { ProviderContextBase, ProviderContextPacket, ProviderContextProjection, ProviderContextProvider } from "./provider-context-types.js";

export interface ProviderContextBuildOptions extends ProjectContextSnapshotBuildOptions {}

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

export async function buildProviderContext(
  provider: ProviderContextProvider,
  task: string,
  projectPath: string = process.cwd(),
  options: ProviderContextBuildOptions = {},
): Promise<ProviderContextPacket> {
  if (provider !== "claude-code" && provider !== "codex") throw new Error("Unsupported provider context target.");
  validateProviderContextTask(task);

  const snapshot = await buildProjectContextSnapshot(projectPath, options);
  const base: ProviderContextBase = {
    schemaVersion: 1,
    packetVersion: 1,
    generatedAt: new Date().toISOString(),
    frameworkVersion: FRAMEWORK_VERSION,
    provider,
    projectLocator: snapshot.projectLocator,
    stableProjectIdentity: null,
    projection: projection(),
    mutationAuthorization: false,
    applySupported: false,
    authorizationEligible: false,
    changesMade: 0,
  };

  if (snapshot.safetyState === "blocked") {
    return { ...base, state: "blocked", packetId: null, baseline: snapshot.baseline, safetyState: "blocked", evidence: null, task: null, findings: snapshot.findings };
  }

  return {
    ...base,
    state: "ready",
    packetId: providerContextPacketId(provider, snapshot.baseline.digest, task),
    baseline: snapshot.baseline,
    safetyState: "clear",
    evidence: snapshot.context,
    task: { value: task, authorityClass: "session-ephemeral" },
    findings: [],
  };
}
