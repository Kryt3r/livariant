import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const AREA_KEYS = [
  "functionality",
  "security",
  "selfIntegrity",
  "ciPlatforms",
  "packaging",
  "supplyChain",
  "documentationTruth",
];

export const REQUIRED_TECHNICAL_EVIDENCE_IDS = [
  "rc-source-validation",
  "hardening-ci",
  "codeql",
  "self-integrity-release-acceptance",
  "release-artifact-digest",
  "release-sbom",
];

export const SELF_INTEGRITY_EVIDENCE_TYPE = "github-actions-self-integrity-workflow";
export const SELF_INTEGRITY_WORKFLOW_NAME = "Self-Integrity Release Acceptance";

const VALID_STATUSES = new Set(["PASS", "WARN", "FAIL", "UNKNOWN", "NOT_APPLICABLE"]);
const VALID_RECOMMENDATIONS = new Set(["GO", "GO WITH RISKS", "NO-GO"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry.trim() !== "") : [];
}

export function validateReleaseDecisionEvidence(input) {
  assert(input && typeof input === "object", "Evidence input must be an object.");
  assert(input.schemaVersion === 1, "Unsupported release decision evidence schemaVersion.");
  assert(input.candidate && typeof input.candidate === "object", "Missing candidate identity.");
  assert(typeof input.candidate.version === "string" && input.candidate.version.length > 0, "Missing candidate version.");
  assert(/^[0-9a-f]{40}$/u.test(input.candidate.sourceSha ?? ""), "Candidate sourceSha must be a full 40-character git SHA.");
  assert(typeof input.candidate.channel === "string" && input.candidate.channel.length > 0, "Missing candidate channel.");
  assert(input.areas && typeof input.areas === "object", "Missing decision areas.");

  for (const key of AREA_KEYS) {
    const area = input.areas[key];
    assert(area && typeof area === "object", `Missing required decision area: ${key}`);
    assert(area.required === true, `Canonical decision area ${key} cannot be demoted from required.`);
    assert(VALID_STATUSES.has(area.status), `Decision area ${key} has invalid status: ${String(area.status)}`);
    assert(typeof area.summary === "string" && area.summary.length > 0, `Decision area ${key} must include a summary.`);
  }

  assert(Array.isArray(input.technicalEvidence), "technicalEvidence must be an array.");
  const evidenceById = new Map();
  for (const item of input.technicalEvidence) {
    assert(item && typeof item === "object", "Technical evidence entries must be objects.");
    assert(typeof item.id === "string" && item.id.length > 0, "Technical evidence entry requires id.");
    assert(!evidenceById.has(item.id), `Duplicate technical evidence id: ${item.id}`);
    evidenceById.set(item.id, item);
    assert(typeof item.type === "string" && item.type.length > 0, `Technical evidence ${item.id} requires type.`);
    assert(typeof item.required === "boolean", `Technical evidence ${item.id} must declare required.`);
    assert(VALID_STATUSES.has(item.status), `Technical evidence ${item.id} has invalid status: ${String(item.status)}`);
    assert(typeof item.summary === "string" && item.summary.length > 0, `Technical evidence ${item.id} requires summary.`);
    if (item.sourceSha !== undefined) {
      assert(/^[0-9a-f]{40}$/u.test(item.sourceSha), `Technical evidence ${item.id} has invalid sourceSha.`);
    }
  }

  for (const id of REQUIRED_TECHNICAL_EVIDENCE_IDS) {
    const item = evidenceById.get(id);
    assert(item, `Missing canonical required technical evidence: ${id}`);
    assert(item.required === true, `Canonical technical evidence ${id} cannot be demoted from required.`);
  }

  const selfIntegrity = evidenceById.get("self-integrity-release-acceptance");
  assert(selfIntegrity.type === SELF_INTEGRITY_EVIDENCE_TYPE, "Self-Integrity evidence must use the dedicated workflow evidence type.");
  assert(selfIntegrity.workflowName === SELF_INTEGRITY_WORKFLOW_NAME, "Self-Integrity evidence must come from the dedicated Self-Integrity Release Acceptance workflow.");
  assert(selfIntegrity.sourceSha === input.candidate.sourceSha, "Self-Integrity evidence must be bound to the exact candidate source SHA.");

  return input;
}

export function evaluateReleaseDecision(input) {
  const evidence = validateReleaseDecisionEvidence(input);
  const blockers = [...normalizeList(evidence.blockers)];
  const warnings = [];
  const candidateSha = evidence.candidate.sourceSha;

  for (const key of AREA_KEYS) {
    const area = evidence.areas[key];
    if (["FAIL", "UNKNOWN", "NOT_APPLICABLE"].includes(area.status)) {
      blockers.push(`${key}: required area is ${area.status}. ${area.summary}`);
    } else if (area.status === "WARN") {
      warnings.push(`${key}: ${area.status}. ${area.summary}`);
    }
  }

  for (const item of evidence.technicalEvidence) {
    if (item.required && item.sourceSha !== candidateSha) {
      blockers.push(`${item.id}: required evidence is not bound to exact candidate source ${candidateSha}.`);
    }
    if (item.required && ["FAIL", "UNKNOWN", "NOT_APPLICABLE"].includes(item.status)) {
      blockers.push(`${item.id}: required technical evidence is ${item.status}. ${item.summary}`);
    } else if (item.status === "WARN" || (!item.required && ["FAIL", "UNKNOWN"].includes(item.status))) {
      warnings.push(`${item.id}: ${item.status}. ${item.summary}`);
    }
  }

  const residualRisks = normalizeList(evidence.residualRisks);
  let recommendation = "GO";
  if (blockers.length > 0) recommendation = "NO-GO";
  else if (warnings.length > 0 || residualRisks.length > 0) recommendation = "GO WITH RISKS";

  assert(VALID_RECOMMENDATIONS.has(recommendation), "Internal recommendation error.");

  return {
    ...evidence,
    recommendation,
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    residualRisks,
  };
}

function statusGlyph(status) {
  if (status === "PASS") return "PASS";
  if (status === "WARN") return "WARN";
  if (status === "FAIL") return "FAIL";
  if (status === "UNKNOWN") return "UNKNOWN";
  return "N/A";
}

function bulletList(items, emptyText) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyText}`;
}

export function renderReleaseDecisionMarkdown(evaluated) {
  const areaLabels = {
    functionality: "Functionality",
    security: "Security",
    selfIntegrity: "Self-Integrity / AI-Failure Containment",
    ciPlatforms: "CI / supported platforms",
    packaging: "Installation / packaging",
    supplyChain: "Supply chain",
    documentationTruth: "Documentation / product truth",
  };

  const forRelease = AREA_KEYS
    .filter((key) => evaluated.areas[key].status === "PASS")
    .map((key) => `${areaLabels[key]}: ${evaluated.areas[key].summary}`);
  const againstRelease = [...evaluated.blockers, ...evaluated.warnings];

  const lines = [
    "# Livariant Release Decision Dossier",
    "",
    "## Layer 1 - Decision view",
    "",
    `Release candidate: ${evaluated.candidate.version}`,
    `Exact source: ${evaluated.candidate.sourceSha}`,
    `Channel: ${evaluated.candidate.channel}`,
    `Overall recommendation: **${evaluated.recommendation}**`,
    "",
    "### Status areas",
    "",
    ...AREA_KEYS.map((key) => `- **${areaLabels[key]}**: ${statusGlyph(evaluated.areas[key].status)} - ${evaluated.areas[key].summary}`),
    "",
    "### What speaks FOR release?",
    "",
    bulletList(forRelease, "No positive release evidence was established."),
    "",
    "### What speaks AGAINST release?",
    "",
    bulletList(againstRelease, "No blocking or warning evidence is currently recorded."),
    "",
    "### What could still go wrong?",
    "",
    bulletList(evaluated.residualRisks, "No explicit residual risks are recorded by this dossier input. Verification is still bounded by the listed evidence."),
    "",
    "### Release blockers",
    "",
    bulletList(evaluated.blockers, "No release blockers are currently recorded."),
    "",
    "### Recommendation",
    "",
    evaluated.recommendation === "NO-GO"
      ? "NO-GO because at least one required evidence surface is missing, failed, not candidate-bound, or explicitly blocked."
      : evaluated.recommendation === "GO WITH RISKS"
        ? "GO WITH RISKS because required evidence passes but warnings or explicit residual risks remain."
        : "GO because every canonical required evidence surface is present, exact-candidate-bound, and passing with no recorded blockers, warnings, or residual risks.",
    "",
    "> This recommendation is evidence only. It does not authorize a release, tag, GitHub Release, package publication, or any other publication action.",
    "",
    "## Layer 2 - Technical evidence",
    "",
    ...evaluated.technicalEvidence.flatMap((item) => [
      `### ${item.id}`,
      "",
      `- Type: ${item.type}`,
      `- Required: ${item.required ? "yes" : "no"}`,
      `- Status: ${item.status}`,
      `- Source SHA: ${item.sourceSha ?? "not candidate-bound / not applicable"}`,
      ...(item.workflowName ? [`- Workflow: ${item.workflowName}`] : []),
      `- Reference: ${item.reference ?? "not provided"}`,
      `- Summary: ${item.summary}`,
      "",
    ]),
  ];

  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--input" || token === "--output-dir") {
      parsed[token.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  if (!parsed.input) throw new Error("--input is required.");
  if (!parsed["output-dir"]) throw new Error("--output-dir is required.");
  return parsed;
}

export async function buildReleaseDecisionDossier({ inputPath, outputDir }) {
  const raw = JSON.parse(await readFile(resolve(inputPath), "utf8"));
  const evaluated = evaluateReleaseDecision(raw);
  await mkdir(resolve(outputDir), { recursive: true });
  const jsonPath = resolve(outputDir, "release-decision-dossier.json");
  const markdownPath = resolve(outputDir, "release-decision-dossier.md");
  await writeFile(jsonPath, `${JSON.stringify(evaluated, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, renderReleaseDecisionMarkdown(evaluated), "utf8");
  return { recommendation: evaluated.recommendation, jsonPath, markdownPath };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const result = await buildReleaseDecisionDossier({ inputPath: args.input, outputDir: args["output-dir"] });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
