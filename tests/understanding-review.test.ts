import assert from "node:assert/strict";
import test from "node:test";
import { buildUnderstandingReview } from "../src/project/understanding-review.js";
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

test("understanding review turns discovery into grouped evidence and bounded clarification questions", () => {
  const report = buildUnderstandingReview(discovery());

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.confirmed.length, 1);
  assert.equal(report.confirmed[0]?.provenance, "README.md");
  assert.equal(report.stronglyInferred.length, 1);
  assert.equal(report.stronglyInferred[0]?.value, "React");
  assert.equal(report.uncertain.length, 0);
  assert.equal(report.attention.length, 1);
  assert.deepEqual(report.questions.map((item) => item.id), [
    "unknown:project-purpose",
    "unknown:current-product-direction",
    "unknown:non-negotiable-project-rules",
  ]);
  assert.match(report.questions[0]?.prompt ?? "", /project for/i);
  assert.deepEqual(report.boundaries, {
    evidenceIsProjectTruth: false,
    candidateEvidenceIsProjectTruth: false,
    grantsAuthority: false,
    changesMade: 0,
  });
});

test("understanding review keeps user answers and corrections as candidate evidence only", () => {
  const report = buildUnderstandingReview(discovery(), {
    schemaVersion: 1,
    responses: [
      { questionId: "unknown:project-purpose", statement: "  A browser game with persistent progression.  " },
    ],
    corrections: [
      { target: "stack:React", statement: " React is only used by a tooling package, not by the product UI. " },
    ],
  });

  assert.deepEqual(report.candidateEvidence, [
    {
      kind: "response",
      target: "unknown:project-purpose",
      statement: "A browser game with persistent progression.",
      trust: "candidate-evidence",
    },
    {
      kind: "correction",
      target: "stack:React",
      statement: "React is only used by a tooling package, not by the product UI.",
      trust: "candidate-evidence",
    },
  ]);
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
