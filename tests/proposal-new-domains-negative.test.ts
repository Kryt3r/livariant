import assert from "node:assert/strict";
import test from "node:test";
import { parseSemanticProposalCandidate } from "../src/runtime/index.js";

test("goal and knowledge reject supersede", () => {
  for (const domain of ["project-goal", "project-knowledge"] as const) {
    assert.throws(() => parseSemanticProposalCandidate({
      schemaVersion: 1,
      domain,
      changeKind: "supersede",
      proposedStatement: "Replacement",
      rationale: "Unsupported operation",
      origin: "project-evidence",
    }), /change kind is unsupported/i);
  }
});

test("goal and knowledge reject decision target identifiers", () => {
  for (const domain of ["project-goal", "project-knowledge"] as const) {
    assert.throws(() => parseSemanticProposalCandidate({
      schemaVersion: 1,
      domain,
      changeKind: "add",
      targetDecisionId: "D-001",
      proposedStatement: "New value",
      rationale: "Unsupported target",
      origin: "project-evidence",
    }), /unsupported field/i);
  }
});
