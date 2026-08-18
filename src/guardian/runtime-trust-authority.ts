import { isAbsolute, resolve } from "node:path";
import { buildGuardianAuthorityRequest, type GuardianAuthorityRequest } from "./authority-client.js";

export interface RuntimeTrustGuardianMaterial {
  runtimeTrustSchemaVersion: 1;
  packageName: "livariant";
  version: string;
  channel: "stable" | "preview" | "development";
  sourceId: string;
  artifactId: string;
  artifactSha256: string;
  packageTreeSha256: string;
  physicalProjectRoot: string;
  physicalInstallRoot: string;
  physicalPackageRoot: string;
  physicalCliPath: string;
}

export interface RuntimeTrustGuardianRequest {
  materialSha256: string;
  request: GuardianAuthorityRequest;
}

function normalizedPhysicalPath(value: string, label: string): string {
  if (!value || !isAbsolute(value)) throw new Error(`${label} must be an absolute physical path.`);
  const normalized = resolve(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
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

export function buildRuntimeTrustGuardianRequest(
  input: RuntimeTrustGuardianMaterial,
): RuntimeTrustGuardianRequest {
  if (input.runtimeTrustSchemaVersion !== 1) throw new Error("Runtime Trust Guardian schema version is unsupported.");
  if (input.packageName !== "livariant") throw new Error("Runtime Trust Guardian package identity is unsupported.");
  if (!["stable", "preview", "development"].includes(input.channel)) throw new Error("Runtime Trust Guardian channel is unsupported.");

  return buildGuardianAuthorityRequest({
    consumer: "runtime-trust",
    mode: "persistent",
    materialFields: [
      { label: "runtime-trust-schema-version", value: String(input.runtimeTrustSchemaVersion) },
      { label: "package-name", value: input.packageName },
      { label: "version", value: safeIdentityValue(input.version, "Runtime version") },
      { label: "channel", value: input.channel },
      { label: "source-id", value: safeIdentityValue(input.sourceId, "Runtime source id") },
      { label: "artifact-id", value: safeIdentityValue(input.artifactId, "Runtime artifact id") },
      { label: "artifact-sha256", value: normalizedDigest(input.artifactSha256, "Runtime artifact digest") },
      { label: "package-tree-sha256", value: normalizedDigest(input.packageTreeSha256, "Runtime package-tree digest") },
      { label: "physical-project-root", value: normalizedPhysicalPath(input.physicalProjectRoot, "Physical project root") },
      { label: "physical-install-root", value: normalizedPhysicalPath(input.physicalInstallRoot, "Physical Runtime install root") },
      { label: "physical-package-root", value: normalizedPhysicalPath(input.physicalPackageRoot, "Physical Runtime package root") },
      { label: "physical-cli-path", value: normalizedPhysicalPath(input.physicalCliPath, "Physical Runtime CLI path") },
    ],
  });
}
