import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  SELF_INTEGRITY_RELEASE_WORKFLOW_NAME,
  selectCanonicalReleaseRuns,
} from "./release-decision-evidence-selection.mjs";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function githubApi(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "livariant-release-decision-dossier",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

const token = requiredEnv("GITHUB_TOKEN");
const repository = requiredEnv("GITHUB_REPOSITORY");
const sourceSha = requiredEnv("GITHUB_SHA");
const workflowRunId = requiredEnv("GITHUB_RUN_ID");
const metadataPath = resolve(process.argv[2] ?? "rc-bundle/RC-BUILD-METADATA.json");
const outputPath = resolve(process.argv[3] ?? "release-decision-evidence.json");
const q07Path = resolve(dirname(metadataPath), "Q07-TOKEN-EVIDENCE.json");

if (!/^[0-9a-f]{40}$/u.test(sourceSha)) throw new Error("GITHUB_SHA is not a full git SHA.");

const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
if (metadata.sourceSha !== sourceSha) throw new Error("RC metadata sourceSha does not match exact workflow source SHA.");
if (!metadata.version || !metadata.channel || !metadata.artifact || !metadata.sha256) throw new Error("RC metadata is incomplete.");
if (!metadata.sbom?.sha256 || metadata.sbom?.format !== "SPDX-2.3") throw new Error("RC SBOM metadata is incomplete or unexpected.");

const q07 = JSON.parse(await readFile(q07Path, "utf8"));
if (q07.schemaVersion !== 1) throw new Error("Unsupported Q-07 token evidence schemaVersion.");
if (q07.sourceSha !== sourceSha) throw new Error("Q-07 token evidence is not bound to exact workflow source SHA.");
if (q07.methodology?.exactProviderBillingTokens !== false) throw new Error("Q-07 evidence must explicitly reject exact provider billing-token interpretation.");
if (q07.reliabilityAssertions?.contextWithoutMutationAuthority !== true) throw new Error("Q-07 evidence lost MCP mutation-Authority boundary.");
if (q07.reliabilityAssertions?.verificationStatesPreserved !== true) throw new Error("Q-07 evidence lost Verification Trace assessment state preservation.");
if (q07.reliabilityAssertions?.verificationSourceReferencesPreserved !== true) throw new Error("Q-07 evidence lost Verification Trace source-reference preservation.");

const runsResponse = await githubApi(`/repos/${repository}/actions/runs?head_sha=${sourceSha}&per_page=100`, token);
const runs = Array.isArray(runsResponse.workflow_runs) ? runsResponse.workflow_runs : [];
const { hardeningRun, codeqlRun, selfIntegrityRun } = selectCanonicalReleaseRuns(runs, sourceSha);

const hardeningPassed = hardeningRun?.conclusion === "success";
const codeqlPassed = codeqlRun?.conclusion === "success";
const selfIntegrityPassed = selfIntegrityRun?.conclusion === "success";
const runReference = `github-actions:${repository}#${workflowRunId}`;

const evidence = {
  schemaVersion: 1,
  candidate: {
    version: metadata.version,
    sourceSha,
    channel: metadata.channel,
  },
  areas: {
    functionality: {
      required: true,
      status: "PASS",
      summary: "The RC workflow rebuilt the source and completed the executable hardening test suite on the exact candidate.",
    },
    security: {
      required: true,
      status: codeqlPassed ? "PASS" : "UNKNOWN",
      summary: codeqlPassed
        ? `CodeQL completed successfully on canonical main at exact source ${sourceSha}; deterministic hardening tests also passed in the RC workflow.`
        : `No successful completed CodeQL Actions run on canonical main was found for exact source ${sourceSha}.`,
    },
    selfIntegrity: {
      required: true,
      status: selfIntegrityPassed ? "PASS" : "UNKNOWN",
      summary: selfIntegrityPassed
        ? `Dedicated ${SELF_INTEGRITY_RELEASE_WORKFLOW_NAME} completed successfully on canonical main at exact source ${sourceSha}.`
        : `No successful completed dedicated ${SELF_INTEGRITY_RELEASE_WORKFLOW_NAME} push run on canonical main was found for exact source ${sourceSha}.`,
    },
    ciPlatforms: {
      required: true,
      status: hardeningPassed ? "PASS" : "UNKNOWN",
      summary: hardeningPassed
        ? `Canonical-main Hardening CI completed successfully at exact source ${sourceSha}, including its configured Ubuntu/Windows matrix. Event: ${hardeningRun.event}.`
        : `No successful completed canonical-main Hardening CI push/manual-dispatch run was found for exact source ${sourceSha}.`,
    },
    packaging: {
      required: true,
      status: "PASS",
      summary: `The exact RC artifact ${metadata.artifact} was built, digest-bound, package-smoke tested, and release-bundle verified.`,
    },
    supplyChain: {
      required: true,
      status: "PASS",
      summary: "Artifact SHA-256 and SPDX 2.3 release SBOM SHA-256 were independently verified for the exact candidate; root devDependencies are excluded from release SBOM evidence.",
    },
    documentationTruth: {
      required: true,
      status: "PASS",
      summary: "Public documentation truth-surface validation passed in the exact-source RC workflow.",
    },
    contextTokenEfficiency: {
      required: true,
      status: "PASS",
      summary: `Exact-source deterministic context/token proxy evidence was generated for MCP context and Verification Trace surfaces. MCP explicit-text proxy: ${q07.measurements.mcpExplicitTextTokenProxy}; Verification Trace compact proxy: ${q07.measurements.verificationCompactTokenProxy}. These are reproducible proxy values, not provider-billed token counts.`,
    },
  },
  blockers: [],
  residualRisks: [
    "Artifact provenance/attestation is not yet implemented, so the current dossier verifies source-bound build evidence and digests but not an independently verifiable build attestation.",
    "Independent AI-assisted release audits are not yet part of dossier v1; the dedicated Self-Integrity release acceptance is deterministic regression evidence and does not replace independent human or AI review where separately required.",
    "Q-07 uses a deterministic UTF-8 byte/token proxy rather than exact Claude/Codex billing tokenizers; provider-specific billed token counts and real-agent tool-selection efficiency remain separate Stable-level qualification work.",
  ],
  technicalEvidence: [
    {
      id: "rc-source-validation",
      type: "github-actions-workflow",
      required: true,
      status: "PASS",
      sourceSha,
      reference: runReference,
      summary: "Current manual RC workflow reached dossier generation only after public-doc, build, hardening, package, release-bundle, and Q-07 evidence verification succeeded.",
    },
    {
      id: "hardening-ci",
      type: "github-actions-workflow",
      required: true,
      status: hardeningPassed ? "PASS" : "UNKNOWN",
      sourceSha,
      reference: hardeningRun ? `github-actions:${repository}#${hardeningRun.id}` : undefined,
      summary: hardeningPassed ? `Exact-source canonical-main Hardening CI succeeded via ${hardeningRun.event}.` : "Exact-source successful canonical-main Hardening CI evidence was not found.",
    },
    {
      id: "codeql",
      type: "github-code-scanning-actions-run",
      required: true,
      status: codeqlPassed ? "PASS" : "UNKNOWN",
      sourceSha,
      reference: codeqlRun ? `github-actions:${repository}#${codeqlRun.id}` : undefined,
      summary: codeqlPassed ? "Exact-source CodeQL Actions run on canonical main succeeded." : "Exact-source successful CodeQL Actions evidence on canonical main was not found.",
    },
    {
      id: "self-integrity-release-acceptance",
      type: "github-actions-self-integrity-workflow",
      workflowName: SELF_INTEGRITY_RELEASE_WORKFLOW_NAME,
      required: true,
      status: selfIntegrityPassed ? "PASS" : "UNKNOWN",
      sourceSha,
      reference: selfIntegrityRun ? `github-actions:${repository}#${selfIntegrityRun.id}` : undefined,
      summary: selfIntegrityPassed
        ? "Dedicated exact-source Self-Integrity / AI-Failure Containment release acceptance succeeded on canonical main."
        : "Dedicated exact-source Self-Integrity / AI-Failure Containment release acceptance on canonical main was not found or did not succeed.",
    },
    {
      id: "release-artifact-digest",
      type: "sha256",
      required: true,
      status: "PASS",
      sourceSha,
      reference: `${metadata.artifact}:${metadata.sha256}`,
      summary: "Release artifact bytes are bound to the verified SHA-256 recorded by RC metadata and release manifest checks.",
    },
    {
      id: "release-sbom",
      type: "spdx-sbom-sha256",
      required: true,
      status: "PASS",
      sourceSha,
      reference: `${metadata.sbom.file}:${metadata.sbom.sha256}`,
      summary: "Exact-source SPDX 2.3 release SBOM is digest-recorded and excludes root build-only devDependencies.",
    },
    {
      id: "q07-context-token-evidence",
      type: "deterministic-token-proxy",
      required: true,
      status: "PASS",
      sourceSha,
      reference: `Q07-TOKEN-EVIDENCE.json:${q07.measurements.mcpExplicitTextTokenProxy}/${q07.measurements.verificationCompactTokenProxy}`,
      summary: "Exact-source Q-07 evidence measures representative MCP context and Verification Trace payloads using the repository's deterministic ceil(UTF-8 bytes/4) proxy while preserving required reliability states and explicitly disclaiming provider billing-token equivalence.",
    },
    {
      id: "dependency-review",
      type: "pull-request-gate",
      required: false,
      status: "NOT_APPLICABLE",
      reference: "PR-scoped evidence; not rerun or rebound to canonical main by dossier v1",
      summary: "Dependency Review remains enforced before merge on pull requests and is intentionally not represented as exact-main-SHA evidence.",
    },
  ],
};

await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ sourceSha, hardeningRunId: hardeningRun?.id ?? null, hardeningConclusion: hardeningRun?.conclusion ?? null, hardeningEvent: hardeningRun?.event ?? null, codeqlRunId: codeqlRun?.id ?? null, codeqlConclusion: codeqlRun?.conclusion ?? null, selfIntegrityRunId: selfIntegrityRun?.id ?? null, selfIntegrityConclusion: selfIntegrityRun?.conclusion ?? null, q07Path, outputPath })}\n`);
