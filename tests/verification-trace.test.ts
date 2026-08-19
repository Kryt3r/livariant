import assert from "node:assert/strict";
import test from "node:test";
import {
  assessVerificationTrace,
  createVerificationEvidenceRecord,
  validateVerificationTraceInput,
} from "../src/verification/index.js";

function evidence(
  target: { kind: "acceptance-criterion" | "implementation-claim"; id: string },
  outcome: "supports" | "contradicts" | "inconclusive",
  sourceReference: string,
) {
  return createVerificationEvidenceRecord({
    schemaVersion: 1,
    target,
    evidenceClass: "E2",
    outcome,
    sourceReference,
    grantsAuthority: false,
  });
}

test("agent-done demo exposes supported, contradicted and unproven targets", () => {
  const input = {
    schemaVersion: 1,
    targets: [
      {
        kind: "acceptance-criterion",
        id: "AC-LOGIN",
        title: "Email login works",
        implementationClaims: [{ claimId: "CLAIM-LOGIN", statement: "Email login implemented" }],
      },
      {
        kind: "acceptance-criterion",
        id: "AC-RATE-LIMIT",
        title: "Login attempts are rate limited",
        implementationClaims: [{ claimId: "CLAIM-RATE-LIMIT", statement: "Rate limiting implemented" }],
      },
      {
        kind: "acceptance-criterion",
        id: "AC-RESET",
        title: "Password reset is verified",
        implementationClaims: [{ claimId: "CLAIM-RESET", statement: "Password reset implemented" }],
      },
    ],
    evidence: [
      evidence({ kind: "acceptance-criterion", id: "AC-LOGIN" }, "supports", "test:login-happy-path"),
      evidence({ kind: "implementation-claim", id: "CLAIM-RATE-LIMIT" }, "contradicts", "test:rate-limit-negative"),
      evidence({ kind: "implementation-claim", id: "CLAIM-RESET" }, "inconclusive", "test:reset-partial"),
    ],
  } as const;

  const result = assessVerificationTrace(input);

  assert.equal(result.coverage, "attention-required");
  assert.deepEqual(result.counts, { supported: 1, contradicted: 1, unproven: 1 });
  assert.deepEqual(result.items.map((item) => [item.target.id, item.assessment]), [
    ["AC-LOGIN", "supported"],
    ["AC-RATE-LIMIT", "contradicted"],
    ["AC-RESET", "unproven"],
  ]);
  assert.equal(result.grantsAuthority, false);
});

test("implementation claim without evidence remains unproven", () => {
  const result = assessVerificationTrace({
    schemaVersion: 1,
    targets: [{
      kind: "requirement",
      id: "REQ-1",
      title: "Users can reset passwords",
      implementationClaims: [{ claimId: "CLAIM-1", statement: "Implemented" }],
    }],
    evidence: [],
  });

  assert.equal(result.items[0]?.assessment, "unproven");
  assert.match(result.items[0]?.reason ?? "", /claimed/);
  assert.equal(result.coverage, "attention-required");
});

test("contradictory evidence outranks supporting evidence", () => {
  const result = assessVerificationTrace({
    schemaVersion: 1,
    targets: [{
      kind: "acceptance-criterion",
      id: "AC-SEC",
      title: "Security behavior is correct",
      implementationClaims: [{ claimId: "CLAIM-SEC", statement: "Implemented securely" }],
    }],
    evidence: [
      evidence({ kind: "implementation-claim", id: "CLAIM-SEC" }, "supports", "test:positive"),
      evidence({ kind: "implementation-claim", id: "CLAIM-SEC" }, "contradicts", "test:negative"),
    ],
  });

  assert.equal(result.items[0]?.assessment, "contradicted");
});

test("all-supported means evidence coverage, not accepted completion", () => {
  const result = assessVerificationTrace({
    schemaVersion: 1,
    targets: [{
      kind: "acceptance-criterion",
      id: "AC-1",
      title: "Feature behaves as required",
      implementationClaims: [{ claimId: "CLAIM-1", statement: "Implemented" }],
    }],
    evidence: [evidence({ kind: "acceptance-criterion", id: "AC-1" }, "supports", "test:feature")],
  });

  assert.equal(result.coverage, "all-supported");
  assert.equal(result.grantsAuthority, false);
  assert.equal("accepted" in result, false);
  assert.equal("done" in result, false);
  assert.equal("canonical" in result, false);
});

test("trace assessment identity is deterministic across equivalent target ordering", () => {
  const first = assessVerificationTrace({
    schemaVersion: 1,
    targets: [
      { kind: "requirement", id: "REQ-B", title: "B", implementationClaims: [] },
      { kind: "requirement", id: "REQ-A", title: "A", implementationClaims: [] },
    ],
    evidence: [],
  });
  const second = assessVerificationTrace({
    schemaVersion: 1,
    targets: [
      { kind: "requirement", id: "REQ-A", title: "A", implementationClaims: [] },
      { kind: "requirement", id: "REQ-B", title: "B", implementationClaims: [] },
    ],
    evidence: [],
  });

  assert.equal(first.assessmentId, second.assessmentId);
});

test("evidence outside the explicit trace fails closed", () => {
  assert.throws(
    () => validateVerificationTraceInput({
      schemaVersion: 1,
      targets: [{ kind: "requirement", id: "REQ-1", title: "Known requirement", implementationClaims: [] }],
      evidence: [evidence({ kind: "implementation-claim", id: "CLAIM-OTHER" }, "supports", "test:other")],
    }),
    /does not reference a target or implementation claim in this trace/,
  );
});

test("trace input rejects authority/completion-shaped extra fields", () => {
  assert.throws(
    () => validateVerificationTraceInput({
      schemaVersion: 1,
      targets: [{
        kind: "requirement",
        id: "REQ-1",
        title: "Known requirement",
        implementationClaims: [],
        accepted: true,
      }],
      evidence: [],
    }),
    /unsupported field 'accepted'/,
  );
});
