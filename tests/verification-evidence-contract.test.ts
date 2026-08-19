import assert from "node:assert/strict";
import test from "node:test";
import {
  createVerificationEvidenceRecord,
  validateVerificationEvidenceRecord,
  verificationEvidenceIdentity,
} from "../src/verification/index.js";

test("E0 inspection evidence can support an acceptance criterion without accepting it", () => {
  const evidence = createVerificationEvidenceRecord({
    schemaVersion: 1,
    target: { kind: "acceptance-criterion", id: "AC-001" },
    evidenceClass: "E0",
    outcome: "supports",
    sourceReference: "inspection:diff-001",
    grantsAuthority: false,
  });

  assert.equal(evidence.target.kind, "acceptance-criterion");
  assert.equal(evidence.evidenceClass, "E0");
  assert.equal(evidence.outcome, "supports");
  assert.equal(evidence.grantsAuthority, false);
  assert.equal(evidence.evidenceId, verificationEvidenceIdentity(evidence));
});

test("E2 automated evidence can contradict an implementation claim", () => {
  const evidence = createVerificationEvidenceRecord({
    schemaVersion: 1,
    target: { kind: "implementation-claim", id: "CLAIM-42" },
    evidenceClass: "E2",
    outcome: "contradicts",
    sourceReference: "github-actions:Kryt3r/livariant#123456",
    grantsAuthority: false,
  });

  assert.equal(evidence.evidenceClass, "E2");
  assert.equal(evidence.outcome, "contradicts");
});

test("verification evidence identity is deterministic and target-sensitive", () => {
  const first = createVerificationEvidenceRecord({
    schemaVersion: 1,
    target: { kind: "implementation-claim", id: "CLAIM-001" },
    evidenceClass: "E3",
    outcome: "supports",
    sourceReference: "test:negative-path-1",
    grantsAuthority: false,
  });
  const same = createVerificationEvidenceRecord({
    schemaVersion: 1,
    target: { kind: "implementation-claim", id: "CLAIM-001" },
    evidenceClass: "E3",
    outcome: "supports",
    sourceReference: "test:negative-path-1",
    grantsAuthority: false,
  });
  const differentTarget = createVerificationEvidenceRecord({
    schemaVersion: 1,
    target: { kind: "implementation-claim", id: "CLAIM-002" },
    evidenceClass: "E3",
    outcome: "supports",
    sourceReference: "test:negative-path-1",
    grantsAuthority: false,
  });

  assert.equal(first.evidenceId, same.evidenceId);
  assert.notEqual(first.evidenceId, differentTarget.evidenceId);
});

test("generic evidence cannot self-declare acceptance, completion, currency, confidence or Authority", () => {
  const base = createVerificationEvidenceRecord({
    schemaVersion: 1,
    target: { kind: "acceptance-criterion", id: "AC-SEC-1" },
    evidenceClass: "E4",
    outcome: "supports",
    sourceReference: "review:independent-1",
    grantsAuthority: false,
  });

  assert.throws(() => validateVerificationEvidenceRecord({ ...base, accepted: true }), /unsupported field 'accepted'/);
  assert.throws(() => validateVerificationEvidenceRecord({ ...base, done: true }), /unsupported field 'done'/);
  assert.throws(() => validateVerificationEvidenceRecord({ ...base, canonical: true }), /unsupported field 'canonical'/);
  assert.throws(() => validateVerificationEvidenceRecord({ ...base, current: true }), /unsupported field 'current'/);
  assert.throws(() => validateVerificationEvidenceRecord({ ...base, confidence: "strong" }), /unsupported field 'confidence'/);
  assert.throws(() => validateVerificationEvidenceRecord({ ...base, grantsAuthority: true }), /must never grant Authority/);
});

test("all canonical E0 through E4 evidence classes remain distinct accepted labels", () => {
  for (const evidenceClass of ["E0", "E1", "E2", "E3", "E4"] as const) {
    const evidence = createVerificationEvidenceRecord({
      schemaVersion: 1,
      target: { kind: "acceptance-criterion", id: `AC-${evidenceClass}` },
      evidenceClass,
      outcome: "inconclusive",
      sourceReference: `verification:${evidenceClass}`,
      grantsAuthority: false,
    });
    assert.equal(evidence.evidenceClass, evidenceClass);
    assert.equal(evidence.outcome, "inconclusive");
  }
});

test("unsupported target kinds, outcomes and unstable references fail closed", () => {
  const valid = createVerificationEvidenceRecord({
    schemaVersion: 1,
    target: { kind: "implementation-claim", id: "CLAIM-009" },
    evidenceClass: "E1",
    outcome: "supports",
    sourceReference: "execution:manual-9",
    grantsAuthority: false,
  });

  assert.throws(
    () => validateVerificationEvidenceRecord({ ...valid, target: { kind: "task", id: "TASK-1" } }),
    /Unsupported verification target kind/,
  );
  assert.throws(
    () => validateVerificationEvidenceRecord({ ...valid, outcome: "passed" }),
    /Unsupported verification outcome/,
  );
  assert.throws(
    () => validateVerificationEvidenceRecord({ ...valid, sourceReference: "contains whitespace" }),
    /stable nonblank reference without whitespace/,
  );
});

test("forged deterministic evidence identity fails closed", () => {
  const valid = createVerificationEvidenceRecord({
    schemaVersion: 1,
    target: { kind: "acceptance-criterion", id: "AC-007" },
    evidenceClass: "E2",
    outcome: "supports",
    sourceReference: "test:integration-007",
    grantsAuthority: false,
  });

  assert.throws(
    () => validateVerificationEvidenceRecord({ ...valid, evidenceId: `verification-v1:${"0".repeat(64)}` }),
    /does not match the target, class, outcome, and source reference/,
  );
});
