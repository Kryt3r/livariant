import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";
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

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function strictKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = Object.keys(value);
  if (actual.length !== expected.length || expected.some((key) => !(key in value))) {
    throw new Error(`${label} contains unsupported or missing fields.`);
  }
}

function canonicalBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function assertCanonicalBase64(value: unknown, label: string): Buffer {
  if (typeof value !== "string" || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(value)) {
    throw new Error(`${label} is not canonical base64.`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) throw new Error(`${label} is not canonical base64.`);
  return bytes;
}

function decodeUtf8(bytes: Buffer, label: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} is not valid UTF-8.`);
  }
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function validSourceKind(value: unknown): value is ExternalKnowledgeSourceKind {
  return value === "local-directory";
}

function validMediaType(value: unknown): value is "text/markdown" | "text/plain" {
  return value === "text/markdown" || value === "text/plain";
}

function validSkippedReason(value: unknown): value is InertExternalKnowledgeSkippedMaterial["reason"] {
  return value === "unsupported-type" || value === "symlink" || value === "oversized" || value === "binary" || value === "file-limit" || value === "total-size-limit";
}

export function toInertExternalKnowledgeEvidenceBundle(bundle: ExternalKnowledgeEvidenceBundle): InertExternalKnowledgeEvidenceBundle {
  const result: InertExternalKnowledgeEvidenceBundle = {
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
  return validateInertExternalKnowledgeEvidenceBundle(result);
}

export function validateInertExternalKnowledgeEvidenceBundle(value: unknown): InertExternalKnowledgeEvidenceBundle {
  if (!plainObject(value)) throw new Error("Inert external evidence bundle is invalid.");
  strictKeys(value, ["schemaVersion", "source", "evidence", "skipped", "boundaries"], "Inert external evidence bundle");
  if (value.schemaVersion !== EXTERNAL_INERT_DATA_SCHEMA_VERSION) throw new Error("Unsupported inert external evidence schemaVersion.");

  if (!plainObject(value.source)) throw new Error("Inert external source is invalid.");
  strictKeys(value.source, ["sourceId", "kind", "classification", "instructionSemantics", "readOnly", "grantsAuthority"], "Inert external source");
  if (typeof value.source.sourceId !== "string" || !/^external-source-v1:[a-f0-9]{64}$/u.test(value.source.sourceId)) throw new Error("Inert external source id is invalid.");
  if (!validSourceKind(value.source.kind)) throw new Error("Inert external source kind is invalid.");
  if (value.source.classification !== "untrusted-external-data" || value.source.instructionSemantics !== "none" || value.source.readOnly !== true || value.source.grantsAuthority !== false) {
    throw new Error("Inert external source boundary is invalid.");
  }

  if (!Array.isArray(value.evidence) || !Array.isArray(value.skipped)) throw new Error("Inert external evidence arrays are invalid.");
  if (!plainObject(value.boundaries)) throw new Error("Inert external evidence boundaries are invalid.");
  strictKeys(value.boundaries, ["externalDataIsInstructions", "evidenceIsProjectTruth", "grantsAuthority", "sourceMutated", "projectMutated", "changesMade"], "Inert external evidence boundaries");
  if (value.boundaries.externalDataIsInstructions !== false || value.boundaries.evidenceIsProjectTruth !== false || value.boundaries.grantsAuthority !== false || value.boundaries.sourceMutated !== false || value.boundaries.projectMutated !== false || value.boundaries.changesMade !== 0) {
    throw new Error("Inert external evidence boundary declaration is invalid.");
  }

  const seen = new Set<string>();
  for (const entry of value.evidence) {
    if (!plainObject(entry)) throw new Error("Inert external evidence item is invalid.");
    strictKeys(entry, ["schemaVersion", "evidenceId", "classification", "instructionSemantics", "projectTruth", "grantsAuthority", "mediaType", "encoding", "payloadBase64", "provenance"], "Inert external evidence item");
    if (entry.schemaVersion !== EXTERNAL_INERT_DATA_SCHEMA_VERSION) throw new Error("Inert external evidence item schemaVersion is invalid.");
    if (typeof entry.evidenceId !== "string" || !/^external-evidence-v1:[a-f0-9]{64}$/u.test(entry.evidenceId)) throw new Error("Inert external evidence id is invalid.");
    if (seen.has(entry.evidenceId)) throw new Error(`Duplicate inert external evidence id: ${entry.evidenceId}`);
    seen.add(entry.evidenceId);
    if (entry.classification !== "untrusted-external-data" || entry.instructionSemantics !== "none" || entry.projectTruth !== false || entry.grantsAuthority !== false || entry.encoding !== "base64" || !validMediaType(entry.mediaType)) {
      throw new Error(`Inert external evidence classification is invalid: ${entry.evidenceId}`);
    }
    if (!plainObject(entry.provenance)) throw new Error(`Inert external evidence provenance is invalid: ${entry.evidenceId}`);
    strictKeys(entry.provenance, ["sourceId", "sourceKind", "materialPathEncoding", "materialPathBase64", "contentSha256"], "Inert external evidence provenance");
    if (entry.provenance.sourceId !== value.source.sourceId || entry.provenance.sourceKind !== value.source.kind || entry.provenance.materialPathEncoding !== "base64") {
      throw new Error(`Inert external evidence provenance source mismatch: ${entry.evidenceId}`);
    }
    const payload = assertCanonicalBase64(entry.payloadBase64, `Inert external evidence payload ${entry.evidenceId}`);
    const materialPathBytes = assertCanonicalBase64(entry.provenance.materialPathBase64, `Inert external evidence material path ${entry.evidenceId}`);
    const materialPath = decodeUtf8(materialPathBytes, `Inert external evidence material path ${entry.evidenceId}`);
    if (!materialPath || materialPath.startsWith("/") || materialPath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
      throw new Error(`Inert external evidence material path is invalid: ${entry.evidenceId}`);
    }
    decodeUtf8(payload, `Inert external evidence payload ${entry.evidenceId}`);
    if (typeof entry.provenance.contentSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(entry.provenance.contentSha256) || sha256(payload) !== entry.provenance.contentSha256) {
      throw new Error(`Inert external evidence digest mismatch: ${entry.evidenceId}`);
    }
  }

  for (const skipped of value.skipped) {
    if (!plainObject(skipped)) throw new Error("Inert skipped material item is invalid.");
    strictKeys(skipped, ["materialPathEncoding", "materialPathBase64", "reason"], "Inert skipped material item");
    if (skipped.materialPathEncoding !== "base64" || !validSkippedReason(skipped.reason)) throw new Error("Inert skipped material item is invalid.");
    const pathBytes = assertCanonicalBase64(skipped.materialPathBase64, "Inert skipped material path");
    const path = decodeUtf8(pathBytes, "Inert skipped material path");
    if (!path) throw new Error("Inert skipped material path is empty.");
  }

  return value as unknown as InertExternalKnowledgeEvidenceBundle;
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
  return decodeUtf8(Buffer.from(validated.evidence[0]!.payloadBase64, "base64"), `Inert external evidence payload ${item.evidenceId}`);
}

export function decodeInertMaterialPath(item: InertExternalKnowledgeEvidence): string {
  const bytes = assertCanonicalBase64(item.provenance.materialPathBase64, `Inert external evidence material path ${item.evidenceId}`);
  return decodeUtf8(bytes, `Inert external evidence material path ${item.evidenceId}`);
}
