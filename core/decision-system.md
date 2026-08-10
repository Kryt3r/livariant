---
type: standard
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Decision System & ADR Thresholds

## Principle

Not every decision needs an ADR, but every important decision needs a discoverable rationale trail.

The strength of decision documentation should scale with reversibility cost, risk, scope, and long-term impact.

> Important decisions must not only be recorded. They must be explainable and discoverable.

> The harder a decision is to reverse, the stronger its decision record must be.

## Decision classes

### D0 — Operational

Local, easily reversible implementation choices without meaningful alternatives.

Examples:
- naming a local variable,
- choosing a small internal helper structure,
- a trivial formatting or copy decision.

Default handling:
- no durable decision record required.

### D1 — Significant

More than one plausible approach exists, but the choice is locally scoped and relatively easy to reverse.

Default handling:
- concise Decision Note when future rediscovery cost is non-trivial.

### D2 — Architectural

Affects system boundaries, data models, public or internal contracts, security assumptions, or long-term maintainability.

Examples:
- selecting a database ownership model,
- introducing a new service boundary,
- changing a public API contract,
- introducing a new authentication or authorization boundary,
- selecting a long-term persistence strategy.

Default handling:
- ADR required,
- explicit alternatives,
- consequences and risks,
- human confirmation for material architecture boundaries.

### D3 — Strategic / Hard to Reverse

Large product, platform, infrastructure, data, governance, or vendor decisions with high switching cost or irreversible consequences.

Examples:
- committing to a major platform or vendor dependency,
- destructive data migration strategy,
- fundamental product or repository restructuring,
- governance changes that affect future work,
- changes to core trust boundaries.

Default handling:
- ADR required,
- explicit human decision,
- adversarial review,
- strong verification and rollback/recovery thinking.

## Deriving the decision class

Do not assign a decision class arbitrarily.

Evaluate at minimum:
- reversibility cost,
- blast radius,
- security/trust-boundary impact,
- data-contract impact,
- public API or integration-contract impact,
- vendor lock-in,
- long-term maintenance cost,
- effect on invariants,
- effect on multiple systems or teams,
- uncertainty.

If several criteria point to different levels, use the stricter level when the potential consequences justify it.

## ADR threshold

An ADR is normally required when one or more of the following are materially true:

- the decision is expensive or difficult to reverse,
- the decision changes a major system boundary,
- the decision introduces or changes a trust boundary,
- the decision changes a durable data model or ownership model,
- the decision changes a public API or versioned integration contract,
- the decision creates meaningful vendor lock-in,
- the decision changes a core invariant,
- the decision deliberately deviates from a major architectural standard,
- several real alternatives exist and future maintainers would need to understand why one was chosen.

## ADR content

A complete ADR should include:

1. Context
2. Decision
3. Alternatives considered
4. Rationale
5. Consequences
6. Risks
7. Assumptions
8. Revisit triggers
9. Status
10. Supersedes / Superseded by, when applicable

The value of an ADR is not merely recording what was chosen. It preserves why alternatives were rejected and under which assumptions the choice was reasonable.

## Revisit triggers

Where useful, ADRs should define conditions that justify reopening the decision.

Examples:
- a cost threshold is exceeded,
- a provider removes a required capability,
- traffic or data volume reaches a new scale,
- a security assumption becomes invalid,
- a dependency becomes unsupported,
- a previously unavailable alternative becomes viable.

Revisit triggers turn ADRs into living decision records rather than static historical notes.

## Decision authority

Default authority model:

- D0 → agent may decide within existing standards.
- D1 → agent may usually decide unless a Profile gate requires human approval.
- D2 → agent analyzes and recommends; human confirmation is required for material architecture boundaries.
- D3 → human decides; agent analyzes, challenges, documents, and verifies.

Profiles may impose stricter approval rules for domain-specific high-risk areas.

## Relationship to deviations

A decision may reveal that an active standard cannot or should not be followed for a specific circumstance.

This document determines the decision class and authority implications of that choice. The canonical definition, lifecycle, approval behavior, sunset rules, and evolution path for deviations are defined exclusively by the **Exception & Deviation Protocol**.

Do not duplicate deviation semantics in decision records. Reference the canonical protocol and record only the decision-specific rationale that future maintainers need.

## Decision reopening

Past decisions are not immutable.

A decision may be reopened when:
- new evidence appears,
- original assumptions are no longer true,
- cost or risk changes materially,
- a revisit trigger fires,
- a materially better alternative becomes available.

Do not rewrite history by overwriting an accepted ADR.

Instead:
1. preserve the original record,
2. create a new decision,
3. mark the old record as superseded,
4. reference both directions.

## Decision flow

```text
Question arises
      ↓
Identify real alternatives
      ↓
Derive decision class
      ↓
Evaluate risk / reversibility / scope
      ↓
Obtain required human authority
      ↓
Decision Note / ADR
      ↓
If a standard deviation is involved:
apply the Exception & Deviation Protocol
      ↓
Implementation
      ↓
Verification
      ↓
Revisit / supersede when justified
```

## Decision quality

Decision documentation is useful only when it preserves information that future work would otherwise need to rediscover.

Do not create ADRs for trivial implementation details merely to increase documentation volume.
