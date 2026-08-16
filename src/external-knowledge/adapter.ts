import type { ExternalKnowledgeEvidenceBundle, ExternalKnowledgeSourceKind } from "./types.js";

export interface ExternalKnowledgeAdapter {
  readonly kind: ExternalKnowledgeSourceKind;
  inspect(location: string): Promise<ExternalKnowledgeEvidenceBundle>;
}
