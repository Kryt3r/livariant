export const EXTERNAL_KNOWLEDGE_SCHEMA_VERSION = 1 as const;

export type ExternalKnowledgeSourceKind = "local-directory";

export interface ExternalKnowledgeSourceDescriptor {
  schemaVersion: 1;
  sourceId: string;
  kind: ExternalKnowledgeSourceKind;
  location: string;
  readOnly: true;
  trust: "external-evidence";
  grantsAuthority: false;
}

export interface ExternalKnowledgeProvenance {
  sourceId: string;
  sourceKind: ExternalKnowledgeSourceKind;
  materialPath: string;
  contentSha256: string;
}

export interface ExternalKnowledgeEvidence {
  evidenceId: string;
  trust: "external-evidence";
  mediaType: "text/markdown" | "text/plain";
  content: string;
  provenance: ExternalKnowledgeProvenance;
}

export interface ExternalKnowledgeSkippedMaterial {
  materialPath: string;
  reason: "unsupported-type" | "symlink" | "oversized" | "binary" | "file-limit" | "total-size-limit";
}

export interface ExternalKnowledgeEvidenceBundle {
  schemaVersion: 1;
  source: ExternalKnowledgeSourceDescriptor;
  evidence: ExternalKnowledgeEvidence[];
  skipped: ExternalKnowledgeSkippedMaterial[];
  boundaries: {
    evidenceIsProjectTruth: false;
    grantsAuthority: false;
    sourceMutated: false;
    projectMutated: false;
    changesMade: 0;
  };
}
