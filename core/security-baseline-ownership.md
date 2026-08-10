---
type: core-policy
status: accepted
domain: security
language: en
owner: framework
---

# Security Baseline Ownership

**Foundation:** FOUNDATION-05

## Purpose

FOUNDATION-05 contains multiple security documents with intentionally related concepts. This index defines canonical ownership so cross-references do not become competing sources of truth.

## Canonical ownership

- `security-philosophy-and-trust-model.md` — security philosophy, protected properties, trust assumptions, trust boundaries, and general security reasoning.
- `identity-authentication-and-authorization-model.md` — actor identity, authentication, authorization, delegation, impersonation, and privileged effect enforcement.
- `isolation-data-boundaries-and-multi-tenant-security.md` — isolation domains, scoped access, cross-domain transitions, derived stores, environment isolation, and isolation verification.
- `secrets-sensitive-data-and-privacy.md` — secret lifecycle, sensitive-data classification, minimization, retention, and disclosure boundaries.
- `dependency-supply-chain-and-external-trust-security.md` — dependency adoption, provenance, reproducibility, build and CI/CD trust, and external executable supply chain.
- `secure-defaults-failure-modes-and-abuse-resistance.md` — secure defaults, failure behavior, abuse resistance, resource exhaustion, and safe degradation.
- `security-review-evidence-and-threat-modeling.md` — security-review triggers, threat-model depth, security evidence, negative verification, finding severity, and review freshness.
- `incident-emergency-and-security-learning.md` — incident-state handling, containment, secure recovery, evidence preservation, and post-incident learning.

## Cross-Foundation ownership

FOUNDATION-05 integrates with but does not replace earlier Core ownership:

- `runtime-safety-authority-and-intervention.md` remains canonical for runtime authority classes, scoped approvals, intervention semantics, and emergency-authority delegation.
- `runtime-state-trace-and-recovery.md` remains canonical for runtime-state persistence, recovery state, side-effect uncertainty, and resume semantics.
- `runtime-learning-and-self-improvement.md` remains canonical for governed improvement-candidate adoption and self-improvement limits.
- `review-and-finding-resolution.md` remains canonical for the general review-independence model and finding-resolution semantics.

Security documents may specialize how those mechanisms apply to security-sensitive work but must not silently redefine their general semantics.

## Source-of-truth rule

When two documents mention the same concept, the document owning that concept above is authoritative for its detailed semantics. Other documents should reference or specialize it rather than establish a competing normative definition.
