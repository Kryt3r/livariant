import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

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

function latestRun(runs, predicate) {
  return runs
    .filter(predicate)
    .sort((left, right) => Date.parse(right.created_at ?? 0) - Date.parse(left.created_at ?? 0))[0];
}

const token = requiredEnv("GITHUB_TOKEN");
const repository = requiredEnv("GITHUB_REPOSITORY");
const sourceSha = requiredEnv("GITHUB_SHA");
const workflowRunId = requiredEnv("GITHUB_RUN_ID");
const metadataPath = resolve(process.argv[2] ?? "rc-bundle/RC-BUILD-METADATA.json");
const outputPath = resolve(process.argv[3] ?? "release-decision-evidence.json");

if (!/^[0-9a-f]{40}$/u.test(sourceSha)) throw new Error("GITHUB_SHA is not a full git SHA.");

const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
if (metadata.sourceSha !== sourceSha) throw new Error("RC metadata sourceSha does not match exact workflow source SHA.");
if (!metadata.version || !metadata.channel || !metadata.artifact || !metadata.sha256) throw new Error("RC metadata is incomplete.");
if (!metadata.sbom?.sha256 || metadata.sbom?.format !== "SPDX-2.3") throw new Error("RC SBOM metadata is incomplete or unexpected.");

const runsResponse = await githubApi(`/repos/${repository}/actions/runs?head_sha=${sourceSha}&per_page=100`, token);
const runs = Array.isArray(runsResponse.workflow_runs) ? runsResponse.workflow_runs : [];
const hardeningRun = latestRun(runs, (run) => run.name === "Hardening CI" && run.head_sha === sourceSha && run.status === "completed");
const codeqlRun = latestRun(runs, (run) => run.head_sha === sourceSha && run.status === "completed" && (String(run.path).includes("codeql") || String(run.name).toLowerCase().includes("codeql")));

const hardeningPassed = hardeningRun?.conclusion === "success";
const codeqlPassed = codeqlRun?.conclusion === "success";
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
        ? `CodeQL completed successfully on exact source ${sourceSha}; deterministic hardening tests also passed in the RC workflow.`
        : `No successful completed CodeQL Actions run was found for exact source ${sourceSha}.`,
    },
    ciPlatforms: {
      required: true,
      status: hardeningPassed ? "PASS" : "UNKNOWN",
      summary: hardeningPassed
        ? `Hardening CI completed successfully on exact source ${sourceSha}, including its configured Ubuntu/Windows matrix.`
        : `No successful completed Hardening CI run was found for exact source ${sourceSha}.`,
    },
    packaging: {
      required: true,
      status: "PASS",
      summary: `The exact RC artifact ${metadata.artifact} was built, digest-bound, package-smoke tested, and release-bundle verified.`,
    },
    supplyChain: {
      required: true,
      status: "PASS",
      summary: `Artifact SHA-256 and SPDX 2.3 release SBOM SHA-256 were independently verified for the exact candidate; root devDependencies are excluded from release SBOM evidence.`,
    },
    documentationTruth: {
      required: true,
      status: "PASS",
      summary: "Public documentation truth-surface validation passed in the exact-source RC workflow.",
    },
  },
  blockers: [],
  residualRisks: [],
  technicalEvidence: [
    {
      id: "rc-source-validation",
      type: "github-actions-workflow",
      required: true,
      status: "PASS",
      sourceSha,
      reference: runReference,
      summary: "Current manual RC workflow reached dossier generation only after public-doc, build, hardening, package, and release-bundle verification succeeded.",
    },
    {
      id: "hardening-ci",
      type: "github-actions-workflow",
      required: true,
      status: hardeningPassed ? "PASS" : "UNKNOWN",
      sourceSha,
      reference: hardeningRun ? `github-actions:${repository}#${hardeningRun.id}` : undefined,
      summary: hardeningPassed ? "Exact-source Hardening CI succeeded." : "Exact-source successful Hardening CI evidence was not found.",
    },
    {
      id: "codeql",
      type: "github-code-scanning-actions-run",
      required: true,
      status: codeqlPassed ? "PASS" : "UNKNOWN",
      sourceSha,
      reference: codeqlRun ? `github-actions:${repository}#${codeqlRun.id}` : undefined,
      summary: codeqlPassed ? "Exact-source CodeQL Actions run succeeded." : "Exact-source successful CodeQL Actions evidence was not found.",
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
      id: "dependency-review",
      type: "pull-request-gate",
      required: false,
      status: "NOT_APPLICABLE",
      reference: "PR-scoped evidence; not rerun on main-only RC workflow",
      summary: "Dependency Review is enforced before merge on pull requests and is intentionally not treated as exact-main-SHA evidence by dossier v1.",
    },
  ],
};

await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ sourceSha, hardeningRunId: hardeningRun?.id ?? null, hardeningConclusion: hardeningRun?.conclusion ?? null, codeqlRunId: codeqlRun?.id ?? null, codeqlConclusion: codeqlRun?.conclusion ?? null, outputPath })}\n`);
