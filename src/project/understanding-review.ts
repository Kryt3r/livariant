import { createHash } from "node:crypto";
import type { BootstrapDiscoveryAttention, BootstrapDiscoveryEvidence, BootstrapDiscoveryReport, DiscoveryConfidence } from "./bootstrap-discovery.js";

export const UNDERSTANDING_REVIEW_SCHEMA_VERSION = 1 as const;
const CANDIDATE_EVIDENCE_ID_DOMAIN = "livariant:understanding-candidate-evidence:v1";

export interface UnderstandingReviewQuestion {
  id: string;
  topic: string;
  prompt: string;
  reason: string;
}

export interface UnderstandingReviewCandidateResponse {
  questionId: string;
  statement: string;
}

export interface UnderstandingReviewCandidateCorrection {
  target: string;
  statement: string;
}

export interface UnderstandingReviewInput {
  schemaVersion: 1;
  responses?: UnderstandingReviewCandidateResponse[];
  corrections?: UnderstandingReviewCandidateCorrection[];
}

export interface UnderstandingReviewCandidateEvidence {
  candidateId: string;
  kind: "response" | "correction";
  target: string;
  statement: string;
  trust: "candidate-evidence";
}

export interface UnderstandingReviewReport {
  schemaVersion: 1;
  projectRoot: string;
  projectShape: BootstrapDiscoveryReport["projectShape"];
  confirmed: BootstrapDiscoveryEvidence[];
  stronglyInferred: BootstrapDiscoveryEvidence[];
  uncertain: BootstrapDiscoveryEvidence[];
  attention: BootstrapDiscoveryAttention[];
  questions: UnderstandingReviewQuestion[];
  candidateEvidence: UnderstandingReviewCandidateEvidence[];
  boundaries: {
    evidenceIsProjectTruth: false;
    candidateEvidenceIsProjectTruth: false;
    grantsAuthority: false;
    changesMade: 0;
  };
}

const QUESTION_PROMPTS: Record<string, string> = {
  "project purpose": "What is this project for, in 1-3 sentences?",
  "project goals": "What are the most important current project goals?",
  "preferred technical direction": "Is there a preferred technical direction or stack that should guide future work?",
  "current product direction": "What is the current product direction or next meaningful outcome?",
  "non-negotiable project rules": "Which project rules or constraints must not be violated?",
};

function questionId(topic: string): string {
  return `unknown:${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function buildQuestions(unknowns: string[]): UnderstandingReviewQuestion[] {
  return unknowns.map((topic) => ({
    id: questionId(topic),
    topic,
    prompt: QUESTION_PROMPTS[topic] ?? `Please clarify: ${topic}.`,
    reason: `Bootstrap Discovery still marks ${topic} as unknown.`,
  }));
}

function groupEvidence(evidence: BootstrapDiscoveryEvidence[], confidence: DiscoveryConfidence): BootstrapDiscoveryEvidence[] {
  return evidence.filter((item) => item.confidence === confidence);
}

export function understandingCandidateEvidenceId(
  kind: "response" | "correction",
  target: string,
  statement: string,
): string {
  const hash = createHash("sha256");
  for (const value of [CANDIDATE_EVIDENCE_ID_DOMAIN, kind, target, statement, "candidate-evidence"]) {
    const bytes = Buffer.from(value, "utf8");
    hash.update(Buffer.from(String(bytes.length), "utf8"));
    hash.update(Buffer.from(":"));
    hash.update(bytes);
    hash.update(Buffer.from("|"));
  }
  return `candidate-evidence-v1:${hash.digest("hex")}`;
}

function candidateEvidence(
  kind: "response" | "correction",
  target: string,
  statement: string,
): UnderstandingReviewCandidateEvidence {
  return {
    candidateId: understandingCandidateEvidenceId(kind, target, statement),
    kind,
    target,
    statement,
    trust: "candidate-evidence",
  };
}

function normalizeCandidateEvidence(input: UnderstandingReviewInput | undefined, questions: UnderstandingReviewQuestion[]): UnderstandingReviewCandidateEvidence[] {
  if (!input) return [];
  const questionIds = new Set(questions.map((item) => item.id));
  const result: UnderstandingReviewCandidateEvidence[] = [];

  for (const response of input.responses ?? []) {
    if (!questionIds.has(response.questionId)) {
      throw new Error(`Unknown review question id: ${response.questionId}`);
    }
    const statement = response.statement.trim();
    if (statement.length === 0) throw new Error(`Review response for ${response.questionId} must not be empty.`);
    result.push(candidateEvidence("response", response.questionId, statement));
  }

  for (const correction of input.corrections ?? []) {
    const target = correction.target.trim();
    const statement = correction.statement.trim();
    if (target.length === 0 || statement.length === 0) throw new Error("Review corrections require non-empty target and statement.");
    result.push(candidateEvidence("correction", target, statement));
  }

  return result;
}

export function buildUnderstandingReview(discovery: BootstrapDiscoveryReport, input?: UnderstandingReviewInput): UnderstandingReviewReport {
  if (input && input.schemaVersion !== UNDERSTANDING_REVIEW_SCHEMA_VERSION) {
    throw new Error(`Unsupported understanding review schemaVersion: ${String(input.schemaVersion)}`);
  }

  const questions = buildQuestions(discovery.unknowns);
  return {
    schemaVersion: UNDERSTANDING_REVIEW_SCHEMA_VERSION,
    projectRoot: discovery.projectRoot,
    projectShape: discovery.projectShape,
    confirmed: groupEvidence(discovery.evidence, "confirmed"),
    stronglyInferred: groupEvidence(discovery.evidence, "strongly_inferred"),
    uncertain: groupEvidence(discovery.evidence, "uncertain"),
    attention: discovery.attention,
    questions,
    candidateEvidence: normalizeCandidateEvidence(input, questions),
    boundaries: {
      evidenceIsProjectTruth: false,
      candidateEvidenceIsProjectTruth: false,
      grantsAuthority: false,
      changesMade: 0,
    },
  };
}
