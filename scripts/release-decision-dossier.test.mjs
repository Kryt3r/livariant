import test from "node:test";
import assert from "node:assert/strict";
import { evaluateReleaseDecision, renderReleaseDecisionMarkdown } from "./build-release-decision-dossier.mjs";
import { selectCanonicalReleaseRuns } from "./release-decision-evidence-selection.mjs";

const sha = "0123456789abcdef0123456789abcdef01234567";

function requiredEvidence(id, type, reference) {
  return { id, type, required: true, status: "PASS", sourceSha: sha, reference, summary: `${id} passed.` };
}

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
      requiredEvidence("rc-source-validation", "workflow", "run:0"),
      requiredEvidence("hardening-ci", "ci", "run:1"),
      requiredEvidence("codeql", "security", "run:2"),
      requiredEvidence("release-artifact-digest", "sha256", "artifact:abc"),
      requiredEvidence("release-sbom", "spdx", "sbom:def"),
      { id: "dependency-review", type: "pr-gate", required: false, status: "NOT_APPLICABLE", reference: "pr-only", summary: "PR-scoped." },
    ],
  };
}

test("all canonical required evidence passing produces GO without manufacturing authority", () => {
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

test("canonical decision areas cannot be demoted from required", () => {
  const evidence = baseEvidence();
  evidence.areas.security.required = false;
  assert.throws(() => evaluateReleaseDecision(evidence), /cannot be demoted from required/u);
});

test("canonical technical evidence cannot be omitted", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence = evidence.technicalEvidence.filter((item) => item.id !== "codeql");
  assert.throws(() => evaluateReleaseDecision(evidence), /Missing canonical required technical evidence: codeql/u);
});

test("canonical technical evidence cannot be demoted to optional", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence.find((item) => item.id === "hardening-ci").required = false;
  assert.throws(() => evaluateReleaseDecision(evidence), /cannot be demoted from required/u);
});

test("required technical evidence bound to another source fails closed", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence.find((item) => item.id === "hardening-ci").sourceSha = "fedcba9876543210fedcba9876543210fedcba98";
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

test("duplicate technical evidence identities are rejected", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence.push({ ...evidence.technicalEvidence[0] });
  assert.throws(() => evaluateReleaseDecision(evidence), /Duplicate technical evidence id/u);
});

test("canonical selector rejects newer PR hardening evidence for the same SHA", () => {
  const runs = [
    { id: 1, name: "Hardening CI", head_sha: sha, head_branch: "main", event: "push", status: "completed", conclusion: "success", created_at: "2026-08-16T10:00:00Z", path: ".github/workflows/ci.yml" },
    { id: 2, name: "Hardening CI", head_sha: sha, head_branch: "feature", event: "pull_request", status: "completed", conclusion: "success", created_at: "2026-08-16T11:00:00Z", path: ".github/workflows/ci.yml" },
    { id: 3, name: "Push on main", head_sha: sha, head_branch: "main", event: "dynamic", status: "completed", conclusion: "success", created_at: "2026-08-16T10:05:00Z", path: "dynamic/github-code-scanning/codeql" },
    { id: 4, name: "PR #59", head_sha: sha, head_branch: "refs/pull/59/head", event: "dynamic", status: "completed", conclusion: "success", created_at: "2026-08-16T11:05:00Z", path: "dynamic/github-code-scanning/codeql" },
  ];
  const selected = selectCanonicalReleaseRuns(runs, sha);
  assert.equal(selected.hardeningRun.id, 1);
  assert.equal(selected.codeqlRun.id, 3);
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
    "### hardening-ci",
    "### codeql",
  ]) {
    assert.ok(markdown.includes(requiredText), `Missing rendered dossier section: ${requiredText}`);
  }
});
