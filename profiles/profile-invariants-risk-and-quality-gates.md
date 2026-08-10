---
type: framework-layer-policy
status: accepted
domain: profiles
language: en
owner: framework
foundation: FOUNDATION-07D
---

# Profile Invariants, Risk Triggers & Quality Gates

Profiles may add domain-specific constraints, review triggers, and completion evidence where the domain creates risks that are not universal enough to belong in Core.

> Profile gates exist to control domain-specific risk, not to add ceremony to every task performed in that domain.

## Domain-specific invariants

A Profile may define invariants that must hold within the Profile's active scope when the domain itself justifies them.

Profile invariants must be genuinely domain-specific. Universal safety, authority, verification, or governance requirements remain owned by Core and should be referenced rather than duplicated.

A Profile may specialize a Core property into a concrete domain requirement where the domain adds meaningful semantics.

Example:

```text
Core
→ privileged effects require authoritative authorization

SaaS Profile
→ tenant membership must be established from authoritative tenant state before tenant-scoped access is granted
```

The Profile adds domain-specific meaning without claiming ownership of the underlying universal security property.

## Risk triggers

A Profile may define conditions that increase task risk or require additional domain expertise, review, verification, or human attention.

A useful risk trigger identifies:

- the domain condition,
- the affected scope,
- the material risk created,
- and the additional response that becomes relevant.

Risk triggers should be specific enough to avoid activating for unrelated work merely because the Profile is active somewhere in the project.

## Quality gates

A Profile may define quality gates where completion of certain work requires additional domain-specific evidence.

A gate should describe:

```text
Trigger
→ affected scope
→ required evidence / review / verification
```

Example:

```text
Task changes tenant data access
→ SaaS isolation gate applies
→ verify representative cross-tenant denial paths

Task changes static marketing copy
→ SaaS isolation gate does not apply
```

Quality gates should activate from material domain risk, not from broad project labels.

## Proportional activation

The presence of an active Profile does not mean every Profile rule applies to every task.

Profile invariants, risk triggers, and quality gates must remain scope-aware and proportional to the affected subsystem, behavior, trust boundary, data path, workflow, or product capability.

Low-risk work should not inherit high-risk review ceremony solely because it occurs inside a project that uses the Profile.

## Relationship to Patterns

Profiles may influence Pattern discovery, selection, composition, or verification when the domain creates additional constraints.

A Profile may make a Pattern variant unsuitable, require stricter verification, or introduce additional invariants around Pattern use.

This does not create a universal `Profile > Pattern` priority hierarchy. Conflicts remain resolved according to actual ownership, scope, authority, and evidence.

## Relationship to Core

Profiles must not copy universal Core rules and relabel them as domain policy.

Where a Profile depends on a Core property, it should inherit or reference that property and only define the additional domain-specific constraint.

This avoids governance drift, duplicate sources of truth, and contradictory copies of universal requirements.

## Examples

### Discord Platform

A Discord Profile may require that interaction-handling work accounts for platform-specific acknowledgement and timing constraints when those constraints affect correctness or user-visible behavior.

### Game Development

A Game Development Profile may require performance evidence for changes that materially affect frame-critical paths, asset loading, or runtime budgets.

### SaaS

A SaaS Profile may activate isolation-specific review and negative testing when work changes tenant-scoped data access or ownership semantics.

These examples illustrate domain specialization; they are not universal Profile requirements.

## Anti-ceremony rule

A Profile gate should not exist merely because a practice is fashionable, conventional, or generally desirable.

A meaningful Profile gate must be traceable to a concrete domain-specific risk, quality property, platform constraint, or failure mode.

If the requirement would make sense unchanged in nearly every software domain, it probably belongs in Core rather than a Profile.

## Principles

> **Profile invariants add domain-specific constraints without duplicating universal Core ownership.**

> **Profile risk triggers activate additional attention only when the relevant domain risk is actually present.**

> **Profile gates exist to control domain-specific risk, not to add ceremony to every task performed in that domain.**

> **The presence of a Profile does not make all of its gates globally active across the project.**

> **A Profile may specialize how a Pattern is used without creating a universal Profile-over-Pattern priority rule.**
