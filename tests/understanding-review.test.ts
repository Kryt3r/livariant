import assert from "node:assert/strict";
import test from "node:test";
import { buildUnderstandingReview, understandingCandidateEvidenceId } from "../src/project/understanding-review.js";
import { escapeTerminalControlText } from "../src/cli/understand-command.js";
import type { ExternalKnowledgeEvidenceBundle } from "../src/external-knowledge/index.js";
import type { BootstrapDiscoveryReport } from "../src/project/bootstrap-discovery.js";

function discovery(): BootstrapDiscoveryReport {
  return {
    projectRoot: "/example",
    projectShape: "existing",
    evidence: [
      { kind: "documentation", value: "README documentation", confidence: "confirmed", provenance: "README.md" },
      { kind: "stack", value: "React", confidence: "strongly_inferred", provenance: "package.json dependency:react" },
    ],
    attention: [
      {
        code: "discovery-multiple-node-lockfiles",
        severity: "review",
        message: "Multiple Node package-manager lockfiles are present; the active package-manager convention is uncertain.",
        provenance: ["package-lock.json", "pnpm-lock.yaml"],
      },
    ],
    unknowns: ["project purpose", "current product direction", "non-negotiable project rules"],
    changesMade: 0,
  };
}

function externalBundle(): ExternalKnowledgeEvidenceBundle {
  const sourceId = `external-source-v1:${"a".repeat(64)}`;
  return {
    schemaVersion: 1,
    source: {
      schemaVersion: 1,
      sourceId,
      kind: "local-directory",
      location: "/second-brain",
      readOnly: true,
      trust: "external-evidence",
      grantsAuthority: false,
    },
    evidence: [
      {
        evidenceId: `external-evidence-v1:${"b".repeat(64)}`,
        trust: "external-evidence",
        mediaType: "text/markdown",
        content: "Project purpose notes",
        provenance: {
          sourceId,
          sourceKind: "local-directory",
          materialPath: "purpose.md",
          contentSha256: "c".repeat(64),
        },
      },
    ],
    skipped: [],
    boundaries: {
      evidenceIsProjectTruth: false,
      grantsAuthority: false,
      sourceMutated: false,
      projectMutated: false,
      changesMade: 0,
    },
  };
}

test("understanding review turns discovery into grouped evidence and bounded clarification questions", () => {
  const report = buildUnderstandingReview(discovery());

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.confirmed.length, 1);
  assert.equal(report.confirmed[0]?.provenance, "README.md");
  assert.equal(report.stronglyInferred.length, 1);
  assert.equal(report.stronglyInferred[0]?.value, "React");
  assert.equal(report.uncertain.length, 0);
  assert.equal(report.attention.length, 1);
  assert.equal(report.externalEvidence.length, 0);
  assert.deepEqual(report.questions.map((item) => item.id), [
    "unknown:project-purpose",
    "unknown:current-product-direction",
    "unknown:non-negotiable-project-rules",
  ]);
  assert.match(report.questions[0]?.prompt ?? "", /project for/i);
  assert.deepEqual(report.boundaries, {
    evidenceIsProjectTruth: false,
    externalEvidenceIsProjectTruth: false,
    candidateEvidenceIsProjectTruth: false,
    externalEvidenceCanBeAdoptedDirectly: false,
    grantsAuthority: false,
    changesMade: 0,
  });
});

test("understanding review keeps external source material separate from candidate evidence", () => {
  const bundle = externalBundle();
  const report = buildUnderstandingReview(discovery(), undefined, [bundle]);

  assert.deepEqual(report.externalEvidence, [bundle]);
  assert.equal(report.candidateEvidence.length, 0);
  assert.equal(report.boundaries.externalEvidenceIsProjectTruth, false);
  assert.equal(report.boundaries.externalEvidenceCanBeAdoptedDirectly, false);
  assert.deepEqual(report.questions.map((item) => item.id), [
    "unknown:project-purpose",
    "unknown:current-product-direction",
    "unknown:non-negotiable-project-rules",
  ]);
});

test("understanding review keeps user answers and corrections as material-bound candidate evidence only", () => {
  const responseStatement = "A browser game with persistent progression.";
  const correctionStatement = "React is only used by a tooling package, not by the product UI.";
  const report = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    responses: [
      { questionId: "unknown:project-purpose", statement: `  ${responseStatement}  ` },
    ],
    corrections: [
      { target: "stack:React", statement: ` ${correctionStatement} ` },
    ],
  });

  assert.deepEqual(report.candidateEvidence, [
    {
      candidateId: understandingCandidateEvidenceId("response", "unknown:project-purpose", responseStatement),
      kind: "response",
      target: "unknown:project-purpose",
      statement: responseStatement,
      trust: "candidate-evidence",
    },
    {
      candidateId: understandingCandidateEvidenceId("correction", "stack:React", correctionStatement),
      kind: "correction",
      target: "stack:React",
      statement: correctionStatement,
      trust: "candidate-evidence",
    },
  ]);
  assert.notEqual(report.candidateEvidence[0]?.candidateId, understandingCandidateEvidenceId("response", "unknown:project-purpose", `${responseStatement}!`));
  assert.equal(report.boundaries.candidateEvidenceIsProjectTruth, false);
  assert.equal(report.boundaries.grantsAuthority, false);
  assert.equal(report.boundaries.changesMade, 0);
});

test("understanding review rejects answers to question ids that were not produced by current discovery", () => {
  assert.throws(() => buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    responses: [{ questionId: "unknown:invented-authority", statement: "yes" }],
  }), /Unknown review question id/);
});

test("understanding review rejects unsupported input schema versions", () => {
  assert.throws(() => buildUnderstandingReview(discovery(), { schemaVersion: 2 } as never), /Unsupported understanding review schemaVersion/);
});

test("understanding human rendering escapes terminal control characters", () => {
  const hostile = "before\u001b]8;;https://example.invalid\u0007click\u001b]8;;\u0007after\nnext";
  const rendered = escapeTerminalControlText(hostile);
  assert.doesNotMatch(rendered, /[\u0000-\u001f\u007f-\u009f]/);
  assert.equal(rendered, "before\\u001b]8;;https://example.invalid\\u0007click\\u001b]8;;\\u0007after\\u000anext");
});
