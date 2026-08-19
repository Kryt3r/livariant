import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { projectExternalKnowledgeEpistemicMetadata } from "../src/external-knowledge/index.js";
import type { ExternalKnowledgeEvidence } from "../src/external-knowledge/types.js";

function evidence(content: string): ExternalKnowledgeEvidence {
  const contentSha256 = createHash("sha256").update(Buffer.from(content, "utf8")).digest("hex");
  return {
    evidenceId: `external-evidence-v1:${"a".repeat(64)}`,
    trust: "external-evidence",
    mediaType: "text/markdown",
    content,
    provenance: {
      sourceId: `external-source-v1:${"b".repeat(64)}`,
      sourceKind: "local-directory",
      materialPath: "notes/example.md",
      contentSha256,
    },
  };
}

test("external evidence projects additively into current observed non-authoritative epistemic metadata", () => {
  const item = evidence("# External note\nObserved content.\n");
  const metadata = projectExternalKnowledgeEpistemicMetadata(item);

  assert.deepEqual(metadata, {
    schemaVersion: 1,
    sourceClass: "external-evidence",
    epistemicState: "observed",
    currency: "current",
    binding: {
      kind: "content-digest",
      id: `sha256:${item.provenance.contentSha256}`,
    },
    sourceId: item.provenance.sourceId,
    grantsAuthority: false,
  });

  assert.equal(item.trust, "external-evidence");
  assert.equal(item.provenance.materialPath, "notes/example.md");
});

test("epistemic projection tracks the exact external material digest without promoting it to Project Truth", () => {
  const before = evidence("before");
  const after = evidence("after");

  const beforeMetadata = projectExternalKnowledgeEpistemicMetadata(before);
  const afterMetadata = projectExternalKnowledgeEpistemicMetadata(after);

  assert.notEqual(beforeMetadata.binding?.id, afterMetadata.binding?.id);
  assert.equal(beforeMetadata.sourceClass, "external-evidence");
  assert.equal(beforeMetadata.epistemicState, "observed");
  assert.equal(beforeMetadata.grantsAuthority, false);
  assert.equal(afterMetadata.grantsAuthority, false);
});
