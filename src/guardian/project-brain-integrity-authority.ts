import { isAbsolute, resolve } from "node:path";
import { isStableProjectIdentity } from "../project-brain/identity.js";
import { buildGuardianAuthorityRequest, type GuardianAuthorityRequest } from "./authority-client.js";

export interface ProjectBrainIntegrityGuardianMaterial {
  stableProjectIdentity: string;
  physicalProjectRoot: string;
  physicalProjectBrainRoot: string;
  integritySchemaVersion: 1;
  baseline: {
    algorithm: "sha256";
    domain: "livariant:project-brain-integrity-material:v1";
    digest: string;
    schemaVersion: 2;
  };
}

export interface ProjectBrainIntegrityGuardianRequest {
  materialSha256: string;
  request: GuardianAuthorityRequest;
}

function normalizedPhysicalPath(value: string, label: string): string {
  if (!value || !isAbsolute(value)) throw new Error(`${label} must be an absolute physical path.`);
  const normalized = resolve(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function buildProjectBrainIntegrityGuardianRequest(
  input: ProjectBrainIntegrityGuardianMaterial,
): ProjectBrainIntegrityGuardianRequest {
  if (!isStableProjectIdentity(input.stableProjectIdentity)) {
    throw new Error("Project Brain Integrity Guardian Authority requires a valid stable project identity.");
  }
  if (input.integritySchemaVersion !== 1) {
    throw new Error("Project Brain Integrity Guardian Authority integrity schema version is unsupported.");
  }
  if (input.baseline.algorithm !== "sha256"
    || input.baseline.domain !== "livariant:project-brain-integrity-material:v1"
    || input.baseline.schemaVersion !== 2
    || !/^[a-f0-9]{64}$/u.test(input.baseline.digest)) {
    throw new Error("Project Brain Integrity Guardian Authority baseline is invalid.");
  }

  const physicalProjectRoot = normalizedPhysicalPath(input.physicalProjectRoot, "Physical project root");
  const physicalProjectBrainRoot = normalizedPhysicalPath(input.physicalProjectBrainRoot, "Physical Project Brain root");
  if (physicalProjectBrainRoot === physicalProjectRoot) {
    throw new Error("Physical Project Brain root must be distinct from the physical project root.");
  }

  return buildGuardianAuthorityRequest({
    consumer: "project-brain-integrity",
    mode: "persistent",
    materialFields: [
      { label: "stable-project-identity", value: input.stableProjectIdentity.toLowerCase() },
      { label: "physical-project-root", value: physicalProjectRoot },
      { label: "physical-project-brain-root", value: physicalProjectBrainRoot },
      { label: "integrity-schema-version", value: String(input.integritySchemaVersion) },
      { label: "baseline-schema-version", value: String(input.baseline.schemaVersion) },
      { label: "baseline-domain", value: input.baseline.domain },
      { label: "baseline-algorithm", value: input.baseline.algorithm },
      { label: "baseline-sha256", value: input.baseline.digest },
    ],
  });
}
