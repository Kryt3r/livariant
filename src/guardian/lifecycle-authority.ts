import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  buildGuardianAuthorityRequest,
  type GuardianAuthorityRequest,
} from "./authority-client.js";

export type LifecycleMutationOperation =
  | "initialize"
  | "normal-update"
  | "migration-update"
  | "recovery";

export interface LifecycleGuardianAuthorityMaterial {
  operation: LifecycleMutationOperation;
  physicalProjectRoot: string;
  materialSha256: string;
  request: GuardianAuthorityRequest;
}

function normalizedPhysicalProjectRoot(value: string): string {
  if (!value) throw new Error("Lifecycle Guardian Authority requires the physical project root.");
  return process.platform === "win32" ? resolve(value).toLowerCase() : resolve(value);
}

export function lifecycleMaterialSha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function buildLifecycleGuardianAuthorityRequest(input: {
  operation: LifecycleMutationOperation;
  physicalProjectRoot: string;
  materialFields: readonly { label: string; value: string }[];
}): LifecycleGuardianAuthorityMaterial {
  const physicalProjectRoot = normalizedPhysicalProjectRoot(input.physicalProjectRoot);
  const { request, materialSha256 } = buildGuardianAuthorityRequest({
    consumer: "lifecycle-mutation",
    mode: "one-shot",
    materialFields: [
      { label: "physical-project-root", value: physicalProjectRoot },
      { label: "lifecycle-operation", value: input.operation },
      ...input.materialFields,
    ],
  });
  return {
    operation: input.operation,
    physicalProjectRoot,
    materialSha256,
    request,
  };
}
