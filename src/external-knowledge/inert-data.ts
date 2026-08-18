import { createHash } from "node:crypto";
import type {
  ExternalKnowledgeEvidenceBundle,
  ExternalKnowledgeSourceKind,
} from "./types.js";

export const EXTERNAL_INERT_DATA_SCHEMA_VERSION = 1 as const;

export interface InertExternalKnowledgeProvenance {
  sourceId: string;
  sourceKind: ExternalKnowledgeSourceKind;
  materialPathEncoding: "base64";
  materialPathBase64: string;
  contentSha256: string;
}

export interface InertExternalKnowledgeEvidence {
  schemaVersion: 1;
  evidenceId: string;
  classification: "untrusted-external-data";
  instructionSemantics: "none";
  projectTruth: false;
  grantsAuthority: false;
  mediaType: "text/markdown" | "text/plain";
  encoding: "base64";
  payloadBase64: string;
  provenance: InertExternalKnowledgeProvenance;
}

export interface InertExternalKnowledgeSkippedMaterial {
  materialPathEncoding: "base64";
  materialPathBase64: string;
  reason: "unsupported-type" | "symlink" | "oversized" | "binary" | "file-limit" | "total-size-limit";
}

export interface InertExternalKnowledgeEvidenceBundle {
  schemaVersion: 1;
  source: {
    sourceId: string;
    kind: ExternalKnowledgeSourceKind;
    classification: "untrusted-external-data";
    instructionSemantics: "none";
    readOnly: true;
    grantsAuthority: false;
  };
  evidence: InertExternalKnowledgeEvidence[];
  skipped: InertExternalKnowledgeSkippedMaterial[];
  boundaries: {
    externalDataIsInstructions: false;
    evidenceIsProjectTruth: false;
    grantsAuthority: false;
    sourceMutated: false;
    projectMutated: false;
    changesMade: 0;
  };
}

function canonicalBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function assertCanonicalBase64(value: string, label: string): Buffer {
  if (typeof value !== "string" || value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) {
    throw new Error(`${label} is not canonical base64.`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) throw new Error(`${label} is not canonical base64.`);
  return bytes;
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function toInertExternalKnowledgeEvidenceBundle(bundle: ExternalKnowledgeEvidenceBundle): InertExternalKnowledgeEvidenceBundle {
  return {
    schemaVersion: EXTERNAL_INERT_DATA_SCHEMA_VERSION,
    source: {
      sourceId: bundle.source.sourceId,
      kind: bundle.source.kind,
      classification: "untrusted-external-data",
      instructionSemantics: "none",
      readOnly: true,
      grantsAuthority: false,
    },
    evidence: bundle.evidence.map((item) => {
      const payload = Buffer.from(item.content, "utf8");
      if (sha256(payload) !== item.provenance.contentSha256) {
        throw new Error(`External evidence content digest mismatch before inert serialization: ${item.evidenceId}`);
      }
      return {
        schemaVersion: EXTERNAL_INERT_DATA_SCHEMA_VERSION,
        evidenceId: item.evidenceId,
        classification: "untrusted-external-data",
        instructionSemantics: "none",
        projectTruth: false,
        grantsAuthority: false,
        mediaType: item.mediaType,
        encoding: "base64",
        payloadBase64: payload.toString("base64"),
        provenance: {
          sourceId: item.provenance.sourceId,
          sourceKind: item.provenance.sourceKind,
          materialPathEncoding: "base64",
          materialPathBase64: canonicalBase64(item.provenance.materialPath),
          contentSha256: item.provenance.contentSha256,
        },
      };
    }),
    skipped: bundle.skipped.map((item) => ({
      materialPathEncoding: "base64",
      materialPathBase64: canonicalBase64(item.materialPath),
      reason: item.reason,
    })),
    boundaries: {
      externalDataIsInstructions: false,
      evidenceIsProjectTruth: false,
      grantsAuthority: false,
      sourceMutated: false,
      projectMutated: false,
      changesMade: 0,
    },
  };
}

export function validateInertExternalKnowledgeEvidenceBundle(bundle: InertExternalKnowledgeEvidenceBundle): InertExternalKnowledgeEvidenceBundle {
  if (bundle.schemaVersion !== EXTERNAL_INERT_DATA_SCHEMA_VERSION) throw new Error("Unsupported inert external evidence schemaVersion.");
  if (bundle.source.classification !== "untrusted-external-data" || bundle.source.instructionSemantics !== "none" || bundle.source.readOnly !== true || bundle.source.grantsAuthority !== false) {
    throw new Error("Inert external source boundary is invalid.");
  }
  if (bundle.boundaries.externalDataIsInstructions !== false || bundle.boundaries.evidenceIsProjectTruth !== false || bundle.boundaries.grantsAuthority !== false || bundle.boundaries.sourceMutated !== false || bundle.boundaries.projectMutated !== false || bundle.boundaries.changesMade !== 0) {
    throw new Error("Inert external evidence boundary declaration is invalid.");
  }
  for (const item of bundle.evidence) {
    if (item.schemaVersion !== EXTERNAL_INERT_DATA_SCHEMA_VERSION || item.classification !== "untrusted-external-data" || item.instructionSemantics !== "none" || item.projectTruth !== false || item.grantsAuthority !== false || item.encoding !== "base64") {
      throw new Error(`Inert external evidence classification is invalid: ${item.evidenceId}`);
    }
    const payload = assertCanonicalBase64(item.payloadBase64, `Inert external evidence payload ${item.evidenceId}`);
    assertCanonicalBase64(item.provenance.materialPathBase64, `Inert external evidence material path ${item.evidenceId}`);
    if (!/^[a-f0-9]{64}$/u.test(item.provenance.contentSha256) || sha256(payload) !== item.provenance.contentSha256) {
      throw new Error(`Inert external evidence digest mismatch: ${item.evidenceId}`);
    }
  }
  for (const item of bundle.skipped) assertCanonicalBase64(item.materialPathBase64, "Inert skipped material path");
  return bundle;
}

export function decodeInertExternalPayload(item: InertExternalKnowledgeEvidence): string {
  const validated = validateInertExternalKnowledgeEvidenceBundle({
    schemaVersion: 1,
    source: {
      sourceId: item.provenance.sourceId,
      kind: item.provenance.sourceKind,
      classification: "untrusted-external-data",
      instructionSemantics: "none",
      readOnly: true,
      grantsAuthority: false,
    },
    evidence: [item],
    skipped: [],
    boundaries: {
      externalDataIsInstructions: false,
      evidenceIsProjectTruth: false,
      grantsAuthority: false,
      sourceMutated: false,
      projectMutated: false,
      changesMade: 0,
    },
  });
  return Buffer.from(validated.evidence[0]!.payloadBase64, "base64").toString("utf8");
}

export function decodeInertMaterialPath(item: InertExternalKnowledgeEvidence): string {
  assertCanonicalBase64(item.provenance.materialPathBase64, `Inert external evidence material path ${item.evidenceId}`);
  return Buffer.from(item.provenance.materialPathBase64, "base64").toString("utf8");
}
