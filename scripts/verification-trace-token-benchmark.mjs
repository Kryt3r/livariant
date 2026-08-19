import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import {
  assessVerificationTrace,
  createVerificationEvidenceRecord,
} from "../dist/src/verification/index.js";

const TOKEN_PROXY_METHOD = "ceil(utf8-bytes/4); deterministic proxy, not provider tokenizer output";

function bytes(value) {
  return Buffer.byteLength(value, "utf8");
}

function tokenProxy(value) {
  return Math.ceil(bytes(value) / 4);
}

function evidence(target, evidenceClass, outcome, sourceReference) {
  return createVerificationEvidenceRecord({
    schemaVersion: 1,
    target,
    evidenceClass,
    outcome,
    sourceReference,
    grantsAuthority: false,
  });
}

function createRepresentativeTrace() {
  return {
    schemaVersion: 1,
    targets: [
      {
        kind: "acceptance-criterion",
        id: "AC-AUTH-EMAIL",
        title: "Users can sign in with email and password",
        implementationClaims: [
          { claimId: "CLAIM-AUTH-EMAIL", statement: "Email/password login has been implemented." },
        ],
      },
      {
        kind: "acceptance-criterion",
        id: "AC-AUTH-RATE-LIMIT",
        title: "Repeated failed login attempts are rate limited",
        implementationClaims: [
          { claimId: "CLAIM-AUTH-RATE-LIMIT", statement: "Login rate limiting has been implemented." },
        ],
      },
      {
        kind: "acceptance-criterion",
        id: "AC-AUTH-RESET",
        title: "Password reset invalidates the used reset token",
        implementationClaims: [
          { claimId: "CLAIM-AUTH-RESET", statement: "Password reset is complete." },
        ],
      },
    ],
    evidence: [
      evidence(
        { kind: "implementation-claim", id: "CLAIM-AUTH-EMAIL" },
        "E2",
        "supports",
        "test:auth-email-login",
      ),
      evidence(
        { kind: "implementation-claim", id: "CLAIM-AUTH-RATE-LIMIT" },
        "E3",
        "contradicts",
        "test:auth-rate-limit-negative",
      ),
      evidence(
        { kind: "implementation-claim", id: "CLAIM-AUTH-RESET" },
        "E1",
        "inconclusive",
        "inspection:auth-reset-handler",
      ),
    ],
  };
}

function compactAssessment(assessment) {
  return {
    coverage: assessment.coverage,
    counts: assessment.counts,
    items: assessment.items.map((item) => ({
      id: item.target.id,
      assessment: item.assessment,
      sources: item.sourceReferences,
    })),
    grantsAuthority: false,
  };
}

export function runVerificationTraceTokenBenchmark() {
  const trace = createRepresentativeTrace();
  const assessment = assessVerificationTrace(trace);

  const rawTraceJson = JSON.stringify(trace);
  const fullAssessmentJson = JSON.stringify(assessment);
  const compactJson = JSON.stringify(compactAssessment(assessment));

  const requiredStates = new Map(assessment.items.map((item) => [item.target.id, item.assessment]));
  const compact = compactAssessment(assessment);
  const compactStates = new Map(compact.items.map((item) => [item.id, item.assessment]));

  const statePreserved = [...requiredStates.entries()].every(
    ([id, state]) => compactStates.get(id) === state,
  );
  const sourceCoveragePreserved = assessment.items.every((item) => {
    const compactItem = compact.items.find((candidate) => candidate.id === item.target.id);
    return compactItem !== undefined
      && JSON.stringify(compactItem.sources) === JSON.stringify(item.sourceReferences);
  });

  if (!statePreserved || !sourceCoveragePreserved) {
    throw new Error("Compact verification trace projection lost required assessment or source-reference information.");
  }

  const sourceSha = process.env.LIVARIANT_BENCHMARK_SOURCE_SHA ?? null;

  return {
    schemaVersion: 1,
    sourceIdentity: {
      sourceSha,
      exactSourceBound: sourceSha !== null,
    },
    workload: "requirement-implementation-verification-trace",
    methodology: {
      tokenProxy: TOKEN_PROXY_METHOD,
      serialization: "JSON.stringify compact JSON",
      note: "This benchmark measures one deterministic Livariant trace workload. It is not provider billing, a universal token-savings claim, or a comparison against another product.",
    },
    measurements: {
      rawTraceInput: {
        bytes: bytes(rawTraceJson),
        tokenProxy: tokenProxy(rawTraceJson),
      },
      fullAssessment: {
        bytes: bytes(fullAssessmentJson),
        tokenProxy: tokenProxy(fullAssessmentJson),
      },
      compactConsumerProjection: {
        bytes: bytes(compactJson),
        tokenProxy: tokenProxy(compactJson),
      },
    },
    compactProjectionReductionVsFullAssessment: {
      bytes: bytes(fullAssessmentJson) - bytes(compactJson),
      tokenProxy: tokenProxy(fullAssessmentJson) - tokenProxy(compactJson),
      ratio: Number((1 - bytes(compactJson) / bytes(fullAssessmentJson)).toFixed(4)),
    },
    reliabilityAssertions: {
      coverage: assessment.coverage,
      supported: assessment.counts.supported,
      contradicted: assessment.counts.contradicted,
      unproven: assessment.counts.unproven,
      assessmentStatesPreserved: statePreserved,
      sourceReferencesPreserved: sourceCoveragePreserved,
      grantsAuthority: assessment.grantsAuthority,
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(runVerificationTraceTokenBenchmark(), null, 2)}\n`);
}
