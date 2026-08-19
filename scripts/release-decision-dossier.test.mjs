import test from "node:test";
import assert from "node:assert/strict";
import { evaluateReleaseDecision, renderReleaseDecisionMarkdown } from "./build-release-decision-dossier.mjs";
import { SELF_INTEGRITY_RELEASE_WORKFLOW_NAME, selectCanonicalReleaseRuns } from "./release-decision-evidence-selection.mjs";

const sha = "0123456789abcdef0123456789abcdef01234567";
const otherSha = "fedcba9876543210fedcba9876543210fedcba98";

function requiredEvidence(id, type, reference, extra = {}) {
  return { id, type, required: true, status: "PASS", sourceSha: sha, reference, summary: `${id} passed.`, ...extra };
}

function baseEvidence() {
  return {
    schemaVersion: 1,
    candidate: { version: "0.1.0-rc.4", sourceSha: sha, channel: "preview" },
    areas: {
      functionality: { required: true, status: "PASS", summary: "Functional verification passed." },
      security: { required: true, status: "PASS", summary: "Security verification passed." },
      selfIntegrity: { required: true, status: "PASS", summary: "Dedicated Self-Integrity acceptance passed." },
      ciPlatforms: { required: true, status: "PASS", summary: "Platform CI passed." },
      packaging: { required: true, status: "PASS", summary: "Packaging passed." },
      supplyChain: { required: true, status: "PASS", summary: "Supply-chain checks passed." },
      documentationTruth: { required: true, status: "PASS", summary: "Truth-surface checks passed." },
      contextTokenEfficiency: { required: true, status: "PASS", summary: "Exact-source deterministic token proxy evidence passed." },
    },
    blockers: [],
    residualRisks: [],
    technicalEvidence: [
      requiredEvidence("rc-source-validation", "workflow", "run:0"),
      requiredEvidence("hardening-ci", "ci", "run:1"),
      requiredEvidence("codeql", "security", "run:2"),
      requiredEvidence("self-integrity-release-acceptance", "github-actions-self-integrity-workflow", "run:3", { workflowName: SELF_INTEGRITY_RELEASE_WORKFLOW_NAME }),
      requiredEvidence("release-artifact-digest", "sha256", "artifact:abc"),
      requiredEvidence("release-sbom", "spdx", "sbom:def"),
      requiredEvidence("q07-context-token-evidence", "deterministic-token-proxy", "q07:ghi"),
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

test("missing dedicated Self-Integrity area fails closed even when Security passes", () => {
  const evidence = baseEvidence();
  delete evidence.areas.selfIntegrity;
  assert.throws(() => evaluateReleaseDecision(evidence), /Missing required decision area: selfIntegrity/u);
});

test("missing Q-07 context/token area fails closed before recommendation", () => {
  const evidence = baseEvidence();
  delete evidence.areas.contextTokenEfficiency;
  assert.throws(() => evaluateReleaseDecision(evidence), /Missing required decision area: contextTokenEfficiency/u);
});

test("missing dedicated Self-Integrity technical evidence cannot be substituted by Security PASS", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence = evidence.technicalEvidence.filter((item) => item.id !== "self-integrity-release-acceptance");
  assert.equal(evidence.areas.security.status, "PASS");
  assert.throws(() => evaluateReleaseDecision(evidence), /Missing canonical required technical evidence: self-integrity-release-acceptance/u);
});

test("missing Q-07 technical evidence cannot be omitted", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence = evidence.technicalEvidence.filter((item) => item.id !== "q07-context-token-evidence");
  assert.throws(() => evaluateReleaseDecision(evidence), /Missing canonical required technical evidence: q07-context-token-evidence/u);
});

test("Q-07 evidence must be exact-source bound", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence.find((item) => item.id === "q07-context-token-evidence").sourceSha = otherSha;
  assert.throws(() => evaluateReleaseDecision(evidence), /Q-07 context\/token evidence must be bound/u);
});

test("Self-Integrity evidence cannot be relabelled from another workflow type", () => {
  const evidence = baseEvidence();
  const item = evidence.technicalEvidence.find((entry) => entry.id === "self-integrity-release-acceptance");
  item.type = "github-code-scanning-actions-run";
  assert.throws(() => evaluateReleaseDecision(evidence), /dedicated workflow evidence type/u);
});

test("Self-Integrity evidence must name the dedicated workflow", () => {
  const evidence = baseEvidence();
  const item = evidence.technicalEvidence.find((entry) => entry.id === "self-integrity-release-acceptance");
  item.workflowName = "CodeQL";
  assert.throws(() => evaluateReleaseDecision(evidence), /dedicated Self-Integrity Release Acceptance workflow/u);
});

test("Self-Integrity evidence for another source fails closed before recommendation", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence.find((item) => item.id === "self-integrity-release-acceptance").sourceSha = otherSha;
  assert.throws(() => evaluateReleaseDecision(evidence), /exact candidate source SHA/u);
});

test("unknown dedicated Self-Integrity result produces NO-GO", () => {
  const evidence = baseEvidence();
  evidence.areas.selfIntegrity.status = "UNKNOWN";
  evidence.areas.selfIntegrity.summary = "Dedicated evidence unavailable.";
  evidence.technicalEvidence.find((item) => item.id === "self-integrity-release-acceptance").status = "UNKNOWN";
  const evaluated = evaluateReleaseDecision(evidence);
  assert.equal(evaluated.recommendation, "NO-GO");
  assert.ok(evaluated.blockers.some((entry) => entry.includes("selfIntegrity")));
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
  evidence.areas.selfIntegrity.required = false;
  assert.throws(() => evaluateReleaseDecision(evidence), /cannot be demoted from required/u);
});

test("canonical technical evidence cannot be omitted", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence = evidence.technicalEvidence.filter((item) => item.id !== "codeql");
  assert.throws(() => evaluateReleaseDecision(evidence), /Missing canonical required technical evidence: codeql/u);
});

test("canonical technical evidence cannot be demoted to optional", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence.find((item) => item.id === "self-integrity-release-acceptance").required = false;
  assert.throws(() => evaluateReleaseDecision(evidence), /cannot be demoted from required/u);
});

test("required technical evidence bound to another source fails closed", () => {
  const evidence = baseEvidence();
  evidence.technicalEvidence.find((item) => item.id === "hardening-ci").sourceSha = otherSha;
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

test("canonical selector accepts exact-main manual Hardening fallback but rejects PR or wrong-source Self-Integrity evidence", () => {
  const runs = [
    { id: 1, name: "Hardening CI", head_sha: sha, head_branch: "main", event: "workflow_dispatch", status: "completed", conclusion: "success", created_at: "2026-08-16T10:00:00Z", path: ".github/workflows/ci.yml" },
    { id: 2, name: "Hardening CI", head_sha: sha, head_branch: "feature", event: "pull_request", status: "completed", conclusion: "success", created_at: "2026-08-16T11:00:00Z", path: ".github/workflows/ci.yml" },
    { id: 3, name: "Push on main", head_sha: sha, head_branch: "main", event: "dynamic", status: "completed", conclusion: "success", created_at: "2026-08-16T10:05:00Z", path: "dynamic/github-code-scanning/codeql" },
    { id: 4, name: SELF_INTEGRITY_RELEASE_WORKFLOW_NAME, head_sha: sha, head_branch: "feature", event: "pull_request", status: "completed", conclusion: "success", created_at: "2026-08-16T11:05:00Z", path: ".github/workflows/self-integrity-release-acceptance.yml" },
    { id: 5, name: SELF_INTEGRITY_RELEASE_WORKFLOW_NAME, head_sha: otherSha, head_branch: "main", event: "push", status: "completed", conclusion: "success", created_at: "2026-08-16T11:10:00Z", path: ".github/workflows/self-integrity-release-acceptance.yml" },
    { id: 6, name: SELF_INTEGRITY_RELEASE_WORKFLOW_NAME, head_sha: sha, head_branch: "main", event: "push", status: "completed", conclusion: "success", created_at: "2026-08-16T10:10:00Z", path: ".github/workflows/self-integrity-release-acceptance.yml" },
  ];
  const selected = selectCanonicalReleaseRuns(runs, sha);
  assert.equal(selected.hardeningRun.id, 1);
  assert.equal(selected.codeqlRun.id, 3);
  assert.equal(selected.selfIntegrityRun.id, 6);
});

test("rendered dossier exposes Self-Integrity and Q-07 decision/evidence layers", () => {
  const markdown = renderReleaseDecisionMarkdown(evaluateReleaseDecision(baseEvidence()));
  for (const requiredText of [
    "Layer 1 - Decision view",
    "Self-Integrity / AI-Failure Containment",
    "Context / token efficiency evidence",
    "Layer 2 - Technical evidence",
    `Exact source: ${sha}`,
    "### self-integrity-release-acceptance",
    "### q07-context-token-evidence",
    `Workflow: ${SELF_INTEGRITY_RELEASE_WORKFLOW_NAME}`,
  ]) {
    assert.ok(markdown.includes(requiredText), `Missing rendered dossier section: ${requiredText}`);
  }
});
