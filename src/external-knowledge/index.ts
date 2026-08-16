import { createHash } from "node:crypto";
import { LocalDirectoryExternalKnowledgeAdapter } from "./local-directory-adapter.js";
import type { ExternalKnowledgeEvidenceBundle, ExternalKnowledgeSourceKind } from "./types.js";

export type { ExternalKnowledgeAdapter } from "./adapter.js";
export type {
  ExternalKnowledgeEvidence,
  ExternalKnowledgeEvidenceBundle,
  ExternalKnowledgeProvenance,
  ExternalKnowledgeSkippedMaterial,
  ExternalKnowledgeSourceDescriptor,
  ExternalKnowledgeSourceKind,
} from "./types.js";

const adapters = new Map<ExternalKnowledgeSourceKind, LocalDirectoryExternalKnowledgeAdapter>([
  ["local-directory", new LocalDirectoryExternalKnowledgeAdapter()],
]);

export function parseExternalKnowledgeSourceKind(value: string): ExternalKnowledgeSourceKind {
  if (value === "local-directory") return value;
  throw new Error(`Unsupported external knowledge source type: ${value}`);
}

export async function inspectExternalKnowledgeSource(
  kind: ExternalKnowledgeSourceKind,
  location: string,
): Promise<ExternalKnowledgeEvidenceBundle> {
  const adapter = adapters.get(kind);
  if (!adapter) throw new Error(`No read-only adapter is registered for external knowledge source type: ${kind}`);
  return validateExternalKnowledgeEvidenceBundle(await adapter.inspect(location));
}

export function validateExternalKnowledgeEvidenceBundle(bundle: ExternalKnowledgeEvidenceBundle): ExternalKnowledgeEvidenceBundle {
  if (!bundle || bundle.schemaVersion !== 1) throw new Error("Unsupported external knowledge evidence schemaVersion.");
  if (bundle.source.schemaVersion !== 1) throw new Error("Unsupported external knowledge source schemaVersion.");
  if (bundle.source.trust !== "external-evidence" || bundle.source.readOnly !== true || bundle.source.grantsAuthority !== false) {
    throw new Error("External knowledge source trust boundary is invalid.");
  }
  if (!/^external-source-v1:[a-f0-9]{64}$/u.test(bundle.source.sourceId)) {
    throw new Error("External knowledge source id is invalid.");
  }
  if (
    bundle.boundaries.evidenceIsProjectTruth !== false ||
    bundle.boundaries.grantsAuthority !== false ||
    bundle.boundaries.sourceMutated !== false ||
    bundle.boundaries.projectMutated !== false ||
    bundle.boundaries.changesMade !== 0
  ) {
    throw new Error("External knowledge evidence boundary declaration is invalid.");
  }

  const seen = new Set<string>();
  for (const item of bundle.evidence) {
    if (item.trust !== "external-evidence") throw new Error("External knowledge evidence trust classification is invalid.");
    if (!/^external-evidence-v1:[a-f0-9]{64}$/u.test(item.evidenceId)) throw new Error("External knowledge evidence id is invalid.");
    if (seen.has(item.evidenceId)) throw new Error(`Duplicate external knowledge evidence id: ${item.evidenceId}`);
    seen.add(item.evidenceId);
    if (item.provenance.sourceId !== bundle.source.sourceId || item.provenance.sourceKind !== bundle.source.kind) {
      throw new Error(`External knowledge provenance source mismatch: ${item.evidenceId}`);
    }
    if (!item.provenance.materialPath || item.provenance.materialPath.startsWith("/") || item.provenance.materialPath.includes("../")) {
      throw new Error(`External knowledge provenance material path is invalid: ${item.evidenceId}`);
    }
    const contentSha256 = createHash("sha256").update(Buffer.from(item.content, "utf8")).digest("hex");
    if (contentSha256 !== item.provenance.contentSha256) {
      throw new Error(`External knowledge evidence content digest mismatch: ${item.evidenceId}`);
    }
  }
  return bundle;
}
