export {
  VERIFICATION_EVIDENCE_SCHEMA_VERSION,
  createVerificationEvidenceRecord,
  validateVerificationEvidenceRecord,
  validateVerificationTargetReference,
  verificationEvidenceIdentity,
  type VerificationEvidenceClass,
  type VerificationEvidenceRecord,
  type VerificationOutcome,
  type VerificationTargetKind,
  type VerificationTargetReference,
} from "./verification-evidence.js";

export {
  VERIFICATION_TRACE_SCHEMA_VERSION,
  assessVerificationTrace,
  validateVerificationTraceAssessment,
  validateVerificationTraceInput,
  type VerificationTraceAssessment,
  type VerificationTraceAssessmentState,
  type VerificationTraceImplementationClaim,
  type VerificationTraceInput,
  type VerificationTraceItemAssessment,
  type VerificationTraceTarget,
  type VerificationTraceTargetKind,
} from "./verification-trace.js";
