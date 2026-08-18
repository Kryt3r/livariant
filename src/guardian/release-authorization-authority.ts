import { buildGuardianAuthorityRequest, type GuardianAuthorityRequest } from "./authority-client.js";

export interface ReleaseAuthorizationGuardianMaterial {
  releaseAuthorizationSchemaVersion: 1;
  packageName: "livariant";
  version: string;
  channel: "stable" | "preview" | "development";
  sourceId: string;
  artifactId: string;
  artifactSha256: string;
}

export interface ReleaseAuthorizationGuardianRequest {
  materialSha256: string;
  request: GuardianAuthorityRequest;
}

function normalizedDigest(value: string, label: string): string {
  const digest = value.toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new Error(`${label} must be a SHA-256 digest.`);
  return digest;
}

function safeIdentityValue(value: string, label: string): string {
  if (!value || /[\r\n\u0000]/u.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

export function buildReleaseAuthorizationGuardianRequest(
  input: ReleaseAuthorizationGuardianMaterial,
): ReleaseAuthorizationGuardianRequest {
  if (input.releaseAuthorizationSchemaVersion !== 1) {
    throw new Error("Release Authorization Guardian schema version is unsupported.");
  }
  if (input.packageName !== "livariant") {
    throw new Error("Release Authorization Guardian package identity is unsupported.");
  }
  if (!["stable", "preview", "development"].includes(input.channel)) {
    throw new Error("Release Authorization Guardian channel is unsupported.");
  }

  return buildGuardianAuthorityRequest({
    consumer: "release-authorization",
    mode: "persistent",
    materialFields: [
      { label: "release-authorization-schema-version", value: String(input.releaseAuthorizationSchemaVersion) },
      { label: "package-name", value: input.packageName },
      { label: "version", value: safeIdentityValue(input.version, "Release version") },
      { label: "channel", value: input.channel },
      { label: "source-id", value: safeIdentityValue(input.sourceId, "Release source id") },
      { label: "artifact-id", value: safeIdentityValue(input.artifactId, "Release artifact id") },
      { label: "artifact-sha256", value: normalizedDigest(input.artifactSha256, "Release artifact digest") },
    ],
  });
}
