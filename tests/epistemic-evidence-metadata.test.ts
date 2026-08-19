import assert from "node:assert/strict";
import test from "node:test";
import { EPISTEMIC_EVIDENCE_SCHEMA_VERSION, validateEpistemicEvidenceMetadata } from "../src/epistemics/index.js";

test("epistemic foundation exposes a stable v1 module boundary", () => {
  assert.equal(EPISTEMIC_EVIDENCE_SCHEMA_VERSION, 1);
});

test("canonical project evidence can be confirmed only with explicit current binding and no Authority", () => {
  const metadata = validateEpistemicEvidenceMetadata({
    schemaVersion: 1,
    sourceClass: "canonical-project",
    epistemicState: "confirmed",
    currency: "current",
    binding: { kind: "project-baseline", id: "sha256:abc123" },
    sourceId: "project-brain",
    grantsAuthority: false,
  });

  assert.equal(metadata.sourceClass, "canonical-project");
  assert.equal(metadata.epistemicState, "confirmed");
  assert.equal(metadata.currency, "current");
  assert.equal(metadata.grantsAuthority, false);
});

test("unresolved project-owned material remains unknown rather than becoming confirmed truth", () => {
  const metadata = validateEpistemicEvidenceMetadata({
    schemaVersion: 1,
    sourceClass: "canonical-project",
    epistemicState: "unknown",
    currency: "current",
    binding: { kind: "project-baseline", id: "sha256:unknown-baseline" },
    grantsAuthority: false,
  });

  assert.equal(metadata.epistemicState, "unknown");
});

test("external evidence remains observed, material-bound and non-authoritative", () => {
  const metadata = validateEpistemicEvidenceMetadata({
    schemaVersion: 1,
    sourceClass: "external-evidence",
    epistemicState: "observed",
    currency: "current",
    binding: { kind: "content-digest", id: "sha256:external-material" },
    sourceId: "notes-directory",
    grantsAuthority: false,
  });

  assert.deepEqual(metadata.binding, { kind: "content-digest", id: "sha256:external-material" });
  assert.equal(metadata.grantsAuthority, false);
});

test("project finding observation can retain snapshot currency without becoming canonical truth", () => {
  const metadata = validateEpistemicEvidenceMetadata({
    schemaVersion: 1,
    sourceClass: "project-observation",
    epistemicState: "observed",
    currency: "current",
    binding: { kind: "source-snapshot", id: "findings-snapshot-v1:abc" },
    sourceId: "project-findings",
    grantsAuthority: false,
  });

  assert.equal(metadata.sourceClass, "project-observation");
  assert.equal(metadata.epistemicState, "observed");
});

test("AI inference cannot self-promote into confirmed evidence", () => {
  assert.throws(() => validateEpistemicEvidenceMetadata({
    schemaVersion: 1,
    sourceClass: "ai-inference",
    epistemicState: "confirmed",
    currency: "current",
    binding: { kind: "explicit-state", id: "provider-return-1" },
    grantsAuthority: false,
  }), /cannot become confirmed|Only human-confirmed or canonical-project/u);
});

test("current evidence cannot claim currency without an explicit binding", () => {
  assert.throws(() => validateEpistemicEvidenceMetadata({
    schemaVersion: 1,
    sourceClass: "external-evidence",
    epistemicState: "observed",
    currency: "current",
    grantsAuthority: false,
  }), /requires an explicit/u);
});

test("metadata can never grant Authority", () => {
  assert.throws(() => validateEpistemicEvidenceMetadata({
    schemaVersion: 1,
    sourceClass: "human-confirmed",
    epistemicState: "confirmed",
    currency: "current",
    binding: { kind: "explicit-state", id: "human-confirmation-1" },
    grantsAuthority: true,
  }), /cannot grant Authority/u);
});

test("historical state and currency cannot silently disagree", () => {
  assert.throws(() => validateEpistemicEvidenceMetadata({
    schemaVersion: 1,
    sourceClass: "historical-state",
    epistemicState: "historical",
    currency: "possibly-stale",
    grantsAuthority: false,
  }), /must agree/u);
});

test("derived evidence keeps explicit unique derivation references", () => {
  const metadata = validateEpistemicEvidenceMetadata({
    schemaVersion: 1,
    sourceClass: "ai-summary",
    epistemicState: "inferred",
    currency: "requires-revalidation",
    sourceId: "summary-provider",
    derivedFrom: ["evidence:1", "evidence:2"],
    grantsAuthority: false,
  });

  assert.deepEqual(metadata.derivedFrom, ["evidence:1", "evidence:2"]);
  assert.throws(() => validateEpistemicEvidenceMetadata({
    ...metadata,
    derivedFrom: ["evidence:1", "evidence:1"],
  }), /must be unique/u);
});
