---
type: framework-layer-policy
status: accepted
domain: patterns
language: en
owner: framework
foundation: FOUNDATION-06D
---

# Pattern Composition & Conflict Handling

Patterns compose through explicit interaction surfaces rather than blind accumulation.

> Patterns compose through their interaction surfaces; they do not gain correctness through accumulation.

## Composition context

When multiple Patterns are selected for the same work, their relevant composition surfaces must be evaluated together. Shared identities, resources, trust boundaries, data flows, ordering constraints, and decision surfaces may create material interactions even when each Pattern is individually applicable.

## Relationship types

The baseline relationship types are intentionally small:

- `independent` — no material interaction in the current context,
- `compatible` — interaction exists but recommendations can coexist without meaningful tension,
- `dependent` — one Pattern relies on or materially influences decisions exposed by another,
- `conflicting` — the selected Patterns create incompatible assumptions, constraints, invariants, or solution directions in the current context.

These relationships are contextual. The framework must not maintain a universal static compatibility matrix that assumes the same relationship across all projects.

Compatibility depends on the selected Patterns, their chosen variants, scope, active Profiles, accepted project decisions, and current constraints.

## Conflict classes

Material differences should be classified before resolution. Useful conflict classes include:

- **recommendation tension** — Patterns prefer different approaches but more than one remains valid,
- **constraint conflict** — requirements or invariants cannot all be satisfied simultaneously,
- **scope collision** — multiple Patterns appear to claim the same project decision or responsibility,
- **authority conflict** — Pattern guidance conflicts with applicable Core governance, Profile requirements, accepted project knowledge, or valid human authority.

Not every difference requires escalation. The purpose of classification is to identify the actual disputed claim and its owner.

## Conflict resolution

Pattern conflicts must reuse the framework's existing authority and context-resolution model rather than invent a separate Pattern priority hierarchy.

Conceptually:

```text
Conflict detected
↓
Identify exact conflicting claims
↓
Resolve applicable Core governance
↓
Resolve active Profile requirements
↓
Resolve accepted project decisions and valid human intent
↓
Compare Pattern applicability and scope
↓
Compare evidence and trade-offs
↓
Resolve deterministically when possible
or
↓
Escalate the unresolved project decision
```

A Pattern never wins merely because it belongs to the Patterns layer.

> A Pattern conflict must be resolved at the level that owns the disputed decision, not by inventing a universal Pattern priority.

## Effective constraints

Selected Pattern invariants contribute to the effective constraints for their active scope together with applicable Core, Profile, and project constraints.

This is not a blind set union. Contradictions must remain visible and be resolved rather than silently dropping one requirement.

## Project-owned composition decisions

When Pattern composition requires a concrete architectural or product choice, that choice belongs to the Project Brain through the project's normal decision and knowledge mechanisms.

Patterns provide reusable reasoning about the interacting problem spaces; they do not own the project's final composition.

## Dependency handling

A Pattern dependency or interaction may trigger discovery of another Pattern, but must not automatically select it.

```text
Pattern A exposes dependency on concern B
→ discover / evaluate Pattern B
→ select only if the normal selection gate is satisfied
```

This prevents recursive Pattern activation and context explosion.

## Proportionality

Formal conflict analysis is unnecessary when Pattern interactions are obvious, low-risk, and compatible.

Stronger composition analysis becomes appropriate when Patterns share critical resources, overlap trust boundaries, collide on invariants or decision ownership, or create material product, architecture, security, or operational risk.

## Composite Patterns

Repeated co-occurrence of Patterns does not by itself justify creating a new composite Pattern.

A composite Pattern is warranted only when the combination contains stable, reusable intelligence that is materially more than the sum of its components.

> Repeated composition does not justify a composite Pattern unless the combination itself contains stable reusable intelligence beyond its parts.

## Composition principles

> **Patterns compose through their interaction surfaces; they do not gain correctness through accumulation.**

> **Pattern relationships are contextual rather than globally fixed.**

> **Pattern dependencies trigger discovery, not automatic selection.**

> **Conflicting constraints must remain visible until resolved.**

> **Project-specific composition decisions belong to the Project Brain.**

> **A Pattern conflict must be resolved at the level that owns the disputed decision, not by inventing a universal Pattern priority.**
