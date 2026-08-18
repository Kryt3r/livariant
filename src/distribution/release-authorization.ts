import { consumeReleaseAuthorizationGuardianAuthority } from "../guardian/release-authorization-authority-transition.js";
import type { ReleaseIdentity } from "./release-integrity.js";

/**
 * Consequential release/install Authority boundary for a fresh Runtime.
 * The exact protected Guardian one-shot is consumed before Runtime package
 * materialization begins. Historical same-user release authorization is never
 * consulted as hard Authority.
 */
export async function assertReleaseAuthorized(projectPath: string, identity: ReleaseIdentity): Promise<void> {
  await consumeReleaseAuthorizationGuardianAuthority(identity, projectPath);
}
