import { resolve } from "node:path";
import {
  assertProtectedGuardianBootstrapSource,
  productionGuardianBootstrapSourceRoot,
} from "./bootstrap-source.js";
import {
  inspectProductionGuardianRoot,
  productionGuardianRoot,
  type GuardianInspectionState,
  type GuardianPlatform,
} from "./trust-root.js";

export type ProtectedBootstrapSourceState = "ready" | "missing" | "unsafe" | "unsupported-platform";
export type GuardianMachineReadinessState =
  | "ready"
  | "protected-source-required"
  | "guardian-bootstrap-required"
  | "unsafe"
  | "unsupported-platform";

export interface ProtectedBootstrapSourceInspection {
  state: ProtectedBootstrapSourceState;
  platform: NodeJS.Platform;
  root: string | null;
  reason: string;
  changesMade: 0;
}

export interface GuardianMachineReadiness {
  schemaVersion: 1;
  state: GuardianMachineReadinessState;
  platform: NodeJS.Platform;
  protectedSource: ProtectedBootstrapSourceInspection;
  guardian: {
    state: GuardianInspectionState;
    root: string | null;
    ready: boolean;
    reason: string;
  };
  lifecycleAuthorizationReady: boolean;
  grantsAuthority: false;
  changesMade: 0;
}

function supportedGuardianPlatform(platform: NodeJS.Platform): platform is GuardianPlatform {
  return platform === "win32" || platform === "linux";
}

function expectedProtectedBootstrapPaths(root: string): { helper: string; bootstrap: string } {
  return {
    helper: resolve(root, "dist", "src", "guardian", "protected-helper.js"),
    bootstrap: resolve(root, "dist", "src", "guardian", "bootstrap.js"),
  };
}

function sourceFailureState(message: string): Exclude<ProtectedBootstrapSourceState, "ready" | "unsupported-platform"> {
  return /not provisioned/i.test(message) || /ENOENT/i.test(message) ? "missing" : "unsafe";
}

export async function inspectProtectedGuardianBootstrapSource(
  platform: NodeJS.Platform = process.platform,
  nodeExecutable: string = process.execPath,
): Promise<ProtectedBootstrapSourceInspection> {
  if (!supportedGuardianPlatform(platform)) {
    return {
      state: "unsupported-platform",
      platform,
      root: null,
      reason: "Protected Guardian bootstrap v1 currently supports Windows and Linux only.",
      changesMade: 0,
    };
  }

  const root = productionGuardianBootstrapSourceRoot(platform);
  const expected = expectedProtectedBootstrapPaths(root);
  try {
    await assertProtectedGuardianBootstrapSource(platform, expected.helper, expected.bootstrap, nodeExecutable);
    return {
      state: "ready",
      platform,
      root,
      reason: "Protected Guardian bootstrap source and interpreter chain satisfy the current protection checks.",
      changesMade: 0,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Protected Guardian bootstrap source inspection failed.";
    return {
      state: sourceFailureState(reason),
      platform,
      root,
      reason,
      changesMade: 0,
    };
  }
}

export async function inspectGuardianMachineReadiness(
  projectRoot: string = process.cwd(),
  platform: NodeJS.Platform = process.platform,
  nodeExecutable: string = process.execPath,
): Promise<GuardianMachineReadiness> {
  const protectedSource = await inspectProtectedGuardianBootstrapSource(platform, nodeExecutable);

  if (!supportedGuardianPlatform(platform)) {
    return {
      schemaVersion: 1,
      state: "unsupported-platform",
      platform,
      protectedSource,
      guardian: {
        state: "unsupported-platform",
        root: null,
        ready: false,
        reason: "Guardian production root is unavailable for this platform.",
      },
      lifecycleAuthorizationReady: false,
      grantsAuthority: false,
      changesMade: 0,
    };
  }

  const guardian = await inspectProductionGuardianRoot(projectRoot, { platform });
  const guardianSummary = {
    state: guardian.state,
    root: guardian.root ?? productionGuardianRoot(platform),
    ready: guardian.guardianReady,
    reason: guardian.reason,
  };

  let state: GuardianMachineReadinessState;
  if (protectedSource.state === "unsafe" || guardian.state === "unsafe") {
    state = "unsafe";
  } else if (protectedSource.state !== "ready") {
    state = "protected-source-required";
  } else if (!guardian.guardianReady) {
    state = "guardian-bootstrap-required";
  } else {
    state = "ready";
  }

  return {
    schemaVersion: 1,
    state,
    platform,
    protectedSource,
    guardian: guardianSummary,
    lifecycleAuthorizationReady: state === "ready",
    grantsAuthority: false,
    changesMade: 0,
  };
}
