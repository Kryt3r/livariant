import {
  assertRuntimeTrustGuardianAuthority,
  issueRuntimeTrustGuardianAuthority,
} from "../guardian/runtime-trust-authority-transition.js";

export class UntrustedRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UntrustedRuntimeError";
  }
}

export interface RuntimeTrustIdentity {
  version: string;
  channel: "stable" | "preview" | "development";
  sourceId: string;
  artifactId: string;
  artifactSha256: string;
  packageTreeSha256: string;
}

export async function establishRuntimeTrust(
  projectPath: string,
  installRoot: string,
  identity: RuntimeTrustIdentity,
): Promise<void> {
  await issueRuntimeTrustGuardianAuthority(identity, installRoot, projectPath);
}

export async function assertRuntimeTrusted(
  projectPath: string,
  installRoot: string,
  identity: RuntimeTrustIdentity,
): Promise<void> {
  try {
    await assertRuntimeTrustGuardianAuthority(identity, installRoot, projectPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Protected Guardian Runtime trust verification failed.";
    if (/matching protected Guardian Runtime trust is missing/i.test(message)) {
      throw new UntrustedRuntimeError(
        "Installed Runtime is not trusted by the protected Guardian; same-user or project-local Runtime trust evidence cannot authorize execution.",
      );
    }
    throw error;
  }
}
