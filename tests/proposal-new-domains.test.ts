import assert from "node:assert/strict";
import test from "node:test";
import { parseSemanticProposalCandidate } from "../src/runtime/index.js";

test("proposal parser accepts the two new add domains", () => {
  const goal = parseSemanticProposalCandidate({ schemaVersion: 1, domain: "project-goal", changeKind: "add", proposedStatement: "Ship offline snapshots", rationale: "Goal review", origin: "project-evidence" });
  const knowledge = parseSemanticProposalCandidate({ schemaVersion: 1, domain: "project-knowledge", changeKind: "add", proposedStatement: "Artifacts use GitHub Releases", rationale: "Fact review", origin: "project-evidence" });
  assert.equal(goal.domain, "project-goal");
  assert.equal(knowledge.domain, "project-knowledge");
});
