---
type: standard
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Definition of Done and Verification

> **Completion is a claim. Verification turns it into evidence.**

The strength of required evidence must follow the risk and consequence of failure.

A task is not complete merely because code has been written. It is complete only when the intended outcome is demonstrated, relevant risks have been addressed, critical existing behavior remains protected, and durable new knowledge has been consolidated when appropriate.

## Effective Definition of Done

The effective Definition of Done is composed from three layers:

1. **Core DoD** — universal completion requirements.
2. **Profile DoD** — domain-specific requirements.
3. **Task-specific DoD** — explicit acceptance conditions for the task at hand.

No single universal checklist should be forced onto every task. The process must remain proportional to impact.

## Completion dimensions

A relevant task may need to satisfy the following dimensions.

### 1. Intent

The implemented result must solve the agreed problem.

Check that:
- acceptance criteria are met,
- scope has not silently changed,
- substitutes or partial solutions are not presented as full completion,
- known deviations are explicit.

### 2. Correctness

The change must function technically as intended.

Suitable evidence may include:
- automated tests,
- integration tests,
- manual reproduction,
- builds,
- type checks,
- linting,
- API verification,
- database verification.

A successful build proves buildability, not behavioral correctness.

### 3. Regression Safety

Existing behavior that should remain stable must be checked where relevant.

For example, an authorization fix should verify not only the newly allowed path, but also that:
- forbidden paths remain forbidden,
- unrelated roles still behave correctly,
- tenant boundaries remain intact.

### 4. Security and Risk

The risks identified during task classification must have matching verification evidence.

Security-sensitive work must not conclude with vague statements such as “security reviewed”. Verification should target concrete risk paths, such as:
- unauthorized access,
- cross-tenant access,
- privilege escalation,
- invalid input,
- tampered signatures,
- replay or duplicate processing where relevant.

### 5. Operability

A change that affects production behavior must be safely operable.

Consider where relevant:
- logging,
- observability,
- health checks,
- deployment procedure,
- rollback or recovery,
- migration recovery,
- environment variables,
- monitoring needs.

Software must not only work; it must be operable.

### 6. Maintainability

The change should preserve or improve maintainability without introducing unjustified complexity.

Check for:
- unnecessary duplication,
- hidden coupling,
- unjustified dependencies,
- unclear naming,
- architectural boundary violations,
- speculative abstractions.

Complexity must earn its existence.

### 7. Knowledge Consolidation

Every completed task must explicitly determine whether durable project knowledge was created.

If no durable knowledge was created, no documentation is required.

If durable knowledge was created, consolidate it into the appropriate canonical source.

Examples include:
- architecture decisions,
- newly discovered failure modes,
- intentionally rejected alternatives,
- security assumptions,
- operational knowledge,
- design decisions,
- corrected prior assumptions.

Knowledge consolidation is part of engineering work, not optional cleanup.

## Evidence classes

Verification evidence is classified by increasing strength.

### E0 — Inspection

Direct review without executing the system.

Examples:
- diff inspection,
- copy review,
- configuration inspection.

Suitable mainly for low-risk work.

### E1 — Execution

The system or relevant path is actually executed.

Examples:
- build execution,
- command execution,
- manual route test,
- manual UI test.

### E2 — Automated Verification

Reproducible automated checks.

Examples:
- unit tests,
- integration tests,
- type checks,
- static analysis,
- schema tests.

### E3 — Adversarial Verification

Verification deliberately targets failure and abuse paths.

Examples:
- unauthorized requests,
- invalid payloads,
- cross-tenant access attempts,
- tampered webhook signatures,
- replay attempts,
- error-path testing,
- race-condition checks where relevant.

### E4 — Independent Verification

A perspective independent from the implementation performs review or verification.

Examples:
- another agent,
- another model family,
- a security reviewer,
- human review,
- a dedicated QA pass.

E4 does not replace execution, automation, or adversarial testing where those are required.

## Risk-based minimum evidence

The risk model defines the minimum expected verification strength.

### R0

At least E0 where verification is needed.

### R1

E0 plus E1 where meaningful.

### R2

E1 plus E2, with relevant negative-path verification.

### R3

E2 plus E3 plus E4 wherever technically feasible and relevant.

Profiles may strengthen these minimums.

## Negative verification

Positive paths prove capability.
Negative paths prove boundaries.

For relevant tasks, explicitly test what must *not* happen.

Examples:
- a payment feature must not activate premium on an invalid signature,
- a tenant user must not mutate another tenant's configuration,
- a failed authorization check must not cause persistent state changes,
- duplicate external events must not be processed twice if idempotency is required.

## Test quality

Test count is not evidence quality.

A small number of tests that directly protect the task's meaningful risks is more valuable than a large number of superficial tests.

## Verification Debt

If full verification cannot legitimately be completed, the missing evidence must remain visible.

Example:

```text
Verification status: PARTIAL
Missing evidence: staging integration test unavailable
Risk: R2
Required follow-up: complete before production release
```

This creates **Verification Debt**.

Verification Debt must never be silently converted into completion.

Unresolved critical security or data-integrity risk may not be marked `DONE_WITH_DEBT`.

## Task states

Recommended task lifecycle states:

- `PLANNED`
- `IMPLEMENTING`
- `IMPLEMENTED`
- `VERIFYING`
- `BLOCKED`
- `VERIFIED`
- `DONE`
- `DONE_WITH_DEBT`

`DONE_WITH_DEBT` requires an explicit, documented debt item and is not valid when critical unresolved risk remains.

## Acceptance Criteria vs. Verification Evidence

Acceptance Criteria define **what must be true**.

Verification Evidence defines **how we demonstrate that it is true**.

Example:

Acceptance Criterion:
> A user scoped to Guild A cannot modify Guild B.

Verification Evidence:
> An integration test using User A against Guild B returns 403 and produces no persistent state change.

Do not conflate the requirement with its proof.

## Invariants

An invariant is a property that must remain true across changes.

Examples:
- a tenant-scoped user must never read or mutate another tenant's private configuration,
- a failed authorization check must never produce a persistent state change,
- an invalid billing event must never grant entitlement.

Invariants are durable system knowledge.

Tasks that touch an invariant must include regression evidence that the invariant still holds.

## Completion report

T2/T3 work should produce a concise completion report when appropriate.

Example:

```text
Completion Report

Task: ...
Classification: T2 / R2 / TENANT / MEDIUM

Acceptance:
✓ A
✓ B
✓ C

Verification:
✓ build
✓ unit tests
✓ integration test
✓ negative permission test

Review:
✓ independent backend review

Known limitations:
None

Knowledge consolidation:
✓ architecture note updated

Verification debt:
None

Status:
VERIFIED → DONE
```

The purpose is not ceremony. It is to make the evidence for completion discoverable.

## Anti-gaming rule

An agent must never silently weaken or rewrite acceptance criteria in order to declare a task complete.

If a criterion cannot be met, the task remains incomplete unless a human owner explicitly approves a scope change.

## Core rules

> **Done is an evidenced state, not a statement.**

> **Verification strength follows the potential consequence of failure.**

> **A task is not fully complete until relevant durable knowledge has been consolidated or it has been deliberately established that no such knowledge was created.**

> **Happy paths prove capability. Negative paths prove boundaries.**
