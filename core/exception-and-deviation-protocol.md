---
type: policy
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Exception & Deviation Protocol

A good framework does not eliminate exceptions. It prevents exceptions from becoming invisible, permanent, or confused with normal governance.

> **Exceptions are allowed. Invisible exceptions are not.**

> **Every exception must eventually disappear or become part of a new standard.**

> **An exception is a temporary state, not an alternative governance system.**

## Purpose

Living Software changes over time. External providers fail, APIs evolve, migrations create temporary hybrid states, experiments challenge established patterns, and incidents may require urgent action.

The framework therefore treats exceptions as a legitimate engineering mechanism rather than as process failure.

However, every exception creates obligations: it must be visible, scoped, risk-aware, reviewable, and temporary.

## Exception versus evolution

The framework distinguishes two fundamentally different situations.

### Exception

The current governance still makes sense, but a specific circumstance prevents or justifies temporary compliance.

This creates a deviation.

### Evolution

The existing governance no longer represents the best rule.

This requires a governance evolution proposal rather than a permanent deviation.

Do not use exceptions to avoid updating an outdated standard.

## Deviation record

A meaningful deviation should preserve at least:

- the rule or standard being deviated from,
- the reason the deviation is necessary,
- its scope,
- its risk,
- compensating safeguards,
- who approved it where approval is required,
- when or under what condition it must be reviewed,
- and how it is expected to end.

Deviation records should remain concise. Their purpose is durable accountability, not ceremony.

## Deviation types

### Emergency

Used when normal procedure would materially obstruct urgent restoration, containment, or safety work.

Examples include production outages and security incidents.

Emergency work may defer parts of the normal process temporarily, but the deviation and resulting state must be reconstructed and consolidated after stabilization.

### Technical Constraint

Used when a relevant external or technical limitation prevents the normal standard from being followed.

Examples include unavailable provider capabilities, incompatible APIs, or missing sandbox environments.

The record should identify a review trigger tied to the constraint changing.

### Transitional

Used for deliberately temporary architecture or process during a migration or staged transition.

A transitional deviation must identify the target end state.

### Experimental

Used to test a deliberately non-standard approach.

The experiment must define its scope, evaluation criteria, and exit condition.

An experiment must not silently become production policy.

## Sunset principle

Every deviation must have a path to termination.

A deviation may end in one of two legitimate ways:

1. **Resolve** — the exceptional condition ends and normal governance resumes.
2. **Promote through governance evolution** — evidence shows that the exception represents a better durable rule, so the governance itself is intentionally changed.

Indefinite deviations are governance drift.

## Review outcomes

An active deviation review may result in:

- **KEEP** — the deviation remains temporarily necessary and its review trigger is renewed,
- **MODIFY** — its scope, safeguards, or resolution path changes,
- **REMOVE** — normal governance resumes,
- **PROMOTE** — a governance evolution process is initiated.

KEEP must never mean "leave it forever".

## Relationship to governance levels

Deviation behavior follows the governance level of the affected rule.

- **G0** — no formal deviation required.
- **G1** — deviation is allowed when justified; local cases may use a task note, durable/systemic cases should use a deviation record.
- **G2** — deviation is allowed only when the specific requirement explicitly permits an exception path.
- **G3** — no task-level deviation is allowed. The governance itself must be changed before behavior that violates the constraint can become permitted.

## Approval and human responsibility

Agents may identify the need for a deviation, prepare the analysis, and draft the record.

Approval authority depends on the affected governance level, risk, reversibility, blast radius, and domain profile.

High-risk deviations may require explicit human approval even when the underlying rule allows exceptions.

## Deviation is not technical debt

A deviation is a governance concept: an intentional departure from an active rule.

Technical debt is an implementation or architecture compromise that creates future engineering cost.

A deviation may create technical debt, but the concepts are not interchangeable.

## Deviation is not failure

A deviation may exist because reality changed while governance remains temporarily constrained.

The existence of a deviation does not itself prove that the framework or project is unhealthy.

Unreviewed, permanent, or invisible deviations are the actual problem.

## Deviation chains

A deviation must not be justified solely by another deviation.

If multiple deviations interact, each must retain an explicit connection to the actual underlying condition, risk, or constraint.

This prevents exception chains from becoming self-referential alternative governance.

## Monitoring and attention

An active deviation increases the need for awareness.

The framework should make active deviations discoverable and, where appropriate, connect them to monitoring, review dates, release gates, or operational checks.

An exception does not automatically increase the intrinsic technical risk, but it increases the importance of verifying that its assumptions remain valid.

## Emergency reconstruction

During a true emergency, restoring safety or service may take priority over complete real-time process documentation.

After stabilization, the project must reconstruct relevant decisions, changes, risks, and temporary deviations while the evidence is still available.

Emergency urgency is not permission for permanent knowledge loss.

## Governance evolution

Governance is intentionally evolutionary.

When repeated deviations, new evidence, changed constraints, or accumulated project intelligence indicate that a rule no longer serves its purpose, the correct response is to evaluate and change the governance deliberately.

This may include:

- revising a rule,
- changing its governance level,
- narrowing or expanding its scope,
- replacing it,
- or deprecating it entirely.

Governance evolution should use the framework's decision system when the change is significant or difficult to reverse.

## Lifecycle

The normal deviation lifecycle is:

**Need → Deviation Proposal → Approval → Temporary Active → Monitoring → Review → Resolution → Closed**

Where evidence shows the rule itself should change:

**Review → Evolution Proposal → Governance Decision → New Standard → Deviation Closed**

## Knowledge consolidation

Closed deviations may create durable project intelligence.

Consolidate only what remains useful, such as:

- a newly discovered constraint,
- a reusable safeguard,
- a corrected assumption,
- a repeated failure mode,
- or evidence supporting governance evolution.

Do not preserve every expired deviation as active working context.

## Core principle

Living Software requires flexibility, but flexibility without memory becomes drift.

The framework therefore permits controlled exceptions while ensuring that temporary reality either returns to the standard or intentionally changes the standard.

This is how governance remains adaptive without becoming arbitrary.
