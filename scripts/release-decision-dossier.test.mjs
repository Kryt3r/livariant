import test from "node:test";
import assert from "node:assert/strict";
import { evaluateReleaseDecision, renderReleaseDecisionMarkdown } from "./build-release-decision-dossier.mjs";

const sha = "0123456789abcdef0123456789abcdef01234567";

function baseEvidence() {
  return {
    schemaVersion: 1,
    candidate: { version: "0.1.0-rc.3", sourceSha: sha, channel: "preview" },
    areas: {
      functionality: { required: true, status: "PASS", summary: "Functional verification passed." },
      security: { required: true, status: "PASS", summary: "Security verification passed." },
      ciPlatforms: { required: true, status: "PASS", summary: "Platform CI passed." },
      packaging: { required: true, status: "PASS", summary: "Packaging passed." },
      supplyChain: { required: true, status: "PASS", summary: "Supply-chain checks passed." },
      documentationTruth: { required: true, status: "PASS", summary: "Truth-surface checks passed." },
    },
    blockers: [],
    residualRisks: [],
    technicalEvidence: [
      { id: "hardening", type: "ci", required: true, status: "PASS", sourceSha: sha, reference: "run:1", summary: "Hardening passed." },
      { id: "codeql", type: "security", required: true, status: "PASS", sourceSha: sha, reference: "run:2", summary: "CodeQL passed." },
      { id: "dependency-review", type: "pr-gate", required: false, status: "NOT_APPLICABLE", reference: "pr-only", summary: "PR-scoped." },
    ],
  };
}

test("all required evidence passing produces GO without manufacturing authority", () => {
  const evaluated = evaluateReleaseDecision(baseEvidence());
  assert.equal(evaluated.recommendation, "GO");
  assert.deepEqual(evaluated.blockers, []);
  const markdown = renderReleaseDecisionMarkdown(evaluated);
  assert.match(markdown, /Overall recommendation: \*\*GO\*\*/u);
  assert.match(markdown, /does not authorize a release, tag, GitHub Release, package publication/u);
});

test("missing required area evidence fails closed to NO-GO", () => {
  const evidence = baseEvidence();
  evidence.areas.security.status = "UNKNOWN";
  evidence.areas.security.summary = "CodeQL result unavailable.";
  const evaluated = evaluateReleaseDecision(evidence);
  assert.equal(evaluated.recommendation, "NO-GO");
  assert.ok(evaluated.blockers.some((entry) => entry.includes("security")));
});

test("required technical evidence bound to another source fails closed", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence[0].sourceSha = "fedcba9876543210fedcba9876543210fedcba98";
  const evaluated = evaluateReleaseDecision(evidence);
  assert.equal(evaluated.recommendation, "NO-GO");
  assert.ok(evaluated.blockers.some((entry) => entry.includes("not bound to exact candidate source")));
});

test("warnings and residual risks produce GO WITH RISKS when required evidence passes", () => {
  const evidence = baseEvidence();
  evidence.areas.supplyChain.status = "WARN";
  evidence.areas.supplyChain.summary = "Optional provenance is not yet implemented.";
  evidence.residualRisks = ["Artifact provenance is not yet independently attested."];
  const evaluated = evaluateReleaseDecision(evidence);
  assert.equal(evaluated.recommendation, "GO WITH RISKS");
  assert.equal(evaluated.blockers.length, 0);
  assert.ok(evaluated.warnings.length > 0);
});

test("rendered dossier contains both decision and technical evidence layers", () => {
  const markdown = renderReleaseDecisionMarkdown(evaluateReleaseDecision(baseEvidence()));
  for (const requiredText of [
    "Layer 1 - Decision view",
    "What speaks FOR release?",
    "What speaks AGAINST release?",
    "What could still go wrong?",
    "Release blockers",
    "Layer 2 - Technical evidence",
    `Exact source: ${sha}`,
    "### hardening",
    "### codeql",
  ]) {
    assert.ok(markdown.includes(requiredText), `Missing rendered dossier section: ${requiredText}`);
  }
});
