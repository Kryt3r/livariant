import { FRAMEWORK_VERSION } from "../lifecycle/state.js";
import { buildProtectedProjectContextSnapshot } from "./protected-context.js";
import { inspectDesktopProjectCoordination } from "./desktop-project-coordination.js";
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
  if (provider !== "claude-code" && provider !== "codex") throw new Error("Unsupported provider context target.");
  validateProviderContextTask(task);

  const coordination = await inspectDesktopProjectCoordination(projectPath, options.desktopRegistryPath);
  if (coordination.state === "invalid") {
    throw new Error(`Livariant Desktop project coordination is invalid: ${coordination.message}`);
  }
  if (coordination.state === "mismatched") {
    throw new Error("Livariant Desktop currently has a different project active. Switch Livariant to this project before requesting Provider Context.");
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
    desktopActivation: coordination.state === "matched"
      ? { desktopProjectId: coordination.desktopProjectId, activationId: coordination.activationId }
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
      coordination.state === "matched" ? coordination.activationId : undefined,
    ),
    baseline: snapshot.baseline,
    safetyState: "clear",
    evidence: snapshot.context,
    task: { value: task, authorityClass: "session-ephemeral" },
    findings: [],
  };
}
