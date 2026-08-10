import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat } from "node:fs/promises";

export type ReleaseChannel = "stable" | "preview" | "development";

export interface ReleaseArtifactDescriptor {
  id: string;
  sha256: string;
}

export interface ReleaseIdentity {
  version: string;
  channel: ReleaseChannel;
  sourceId: string;
  artifactId: string;
  artifactSha256: string;
}

export interface LocalReleaseArtifact {
  sourceId: string;
  releaseVersion: string;
  artifactId: string;
  path: string;
}

export interface VerifiedReleaseArtifact extends LocalReleaseArtifact {
  verified: true;
  sha256: string;
}

export function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

export async function sha256File(path: string): Promise<string> {
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error("Release artifact must be a regular file and must not be a symbolic link.");
  }

  return await new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export async function verifyReleaseArtifact(
  identity: ReleaseIdentity,
  artifact: LocalReleaseArtifact,
  trustedSourceIds: ReadonlySet<string>,
): Promise<VerifiedReleaseArtifact> {
  if (!trustedSourceIds.has(identity.sourceId)) {
    throw new Error(`Release source is not trusted for supported application: ${identity.sourceId}`);
  }
  if (artifact.sourceId !== identity.sourceId) throw new Error("Release artifact source does not match the planned release source.");
  if (artifact.releaseVersion !== identity.version) throw new Error("Release artifact version does not match the planned release identity.");
  if (artifact.artifactId !== identity.artifactId) throw new Error("Release artifact identity does not match the planned release artifact.");
  if (!isSha256(identity.artifactSha256)) throw new Error("Planned release artifact is missing a valid SHA-256 digest.");

  const actual = await sha256File(artifact.path);
  if (actual.toLowerCase() !== identity.artifactSha256.toLowerCase()) {
    throw new Error("Release artifact integrity verification failed.");
  }

  return { ...artifact, verified: true, sha256: actual };
}
