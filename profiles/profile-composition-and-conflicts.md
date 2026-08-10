---
type: framework-layer-policy
status: accepted
domain: profiles
language: en
owner: framework
foundation: FOUNDATION-07C
---

# Multi-Profile Composition & Conflict Handling

Projects may legitimately span multiple domains. Profiles therefore compose by overlapping scope and owned constraints rather than through blind accumulation or a universal priority order.

> Multiple Profiles compose through shared scope and owned constraints, not through a universal Profile priority order.

## Multiple active Profiles

More than one Profile may be active for the same project when the project genuinely spans several domains.

Examples may include:

- Web Application + SaaS,
- Mobile App + API/Backend,
- SaaS + Discord Platform,
- Game Development + Backend Services.

Profile activation must remain justified by actual domain relevance rather than by catalog availability or superficial technology overlap.

## Scope-aware composition

Profile constraints, quality gates, specialist roles, review requirements, and workflow extensions should be composed only where their scopes materially overlap.

A Profile that governs one subsystem must not silently impose unrelated requirements on another subsystem merely because both belong to the same repository.

Composition should therefore reason about:

- project-wide scope,
- subsystem scope,
- feature scope,
- and task-local scope where appropriate.

## No universal Profile hierarchy

The framework must not define a static ordering such as:

```text
Discord Platform > SaaS > Web Application
```

Such an ordering would confuse domain specificity with authority.

When Profiles disagree, the relevant questions are:

- which Profile actually owns the disputed domain concern,
- which scope each claim applies to,
- which applicable Core governance or project decision constrains the result,
- and which evidence supports the competing requirements.

## Profile and Pattern interaction

A Profile may impose stricter domain-specific requirements than a generally applicable Pattern when the domain genuinely creates additional constraints.

That does not create a blanket rule that Profiles always outrank Patterns.

The disputed requirement must be resolved according to actual semantic ownership, scope, applicable authority, and evidence.

A Pattern continues to own reusable problem-space reasoning. A Profile owns domain-specific specialization. The Project Brain owns the concrete project choice produced by their interaction.

## Composition conflicts

Material conflicts may include:

- incompatible domain invariants,
- overlapping ownership claims,
- contradictory quality gates,
- conflicting workflow requirements,
- or incompatible assumptions about the same project boundary.

The conflict should be reduced to the exact claims in dispute before resolution.

## Conflict resolution flow

Profile conflict handling should reuse existing framework governance rather than invent a separate Profile priority system.

Conceptually:

```text
Conflict detected
↓
Identify exact conflicting claims
↓
Resolve applicable Core governance and hard invariants
↓
Resolve valid project decisions and authority
↓
Determine semantic ownership and active scope
↓
Evaluate domain evidence and constraints
↓
Resolve when deterministic
or
↓
Escalate the unresolved project decision
```

A Profile does not win merely because it appears narrower, more specialized, or later in the conceptual stack.

## Project-owned composition decisions

When combining Profiles requires a concrete product or architecture decision, that decision belongs to the project.

For example:

```text
SaaS Profile
→ requires meaningful tenant isolation

Discord Platform Profile
→ introduces guild-scoped platform context

Project decision
→ one Discord guild maps to one application tenant
```

The mapping is project truth only after the project adopts it. Neither Profile may silently encode that mapping as universal guidance.

## Proportionality

Formal multi-Profile conflict analysis is unnecessary when Profiles are independent or obviously compatible.

Stronger analysis is warranted when Profiles:

- affect the same trust boundary,
- constrain the same resource or data ownership model,
- impose overlapping invariants,
- trigger incompatible quality gates,
- or compete for ownership of the same project decision.

## Principles

> **Multiple Profiles compose through shared scope and owned constraints, not through a universal Profile priority order.**

> **Profile specificity does not automatically create authority.**

> **Domain-specific constraints may specialize reusable Pattern guidance only where the domain genuinely owns the additional requirement.**

> **Concrete cross-domain architecture and product choices remain Project Brain decisions.**

> **Conflicts must be resolved at the layer and scope that actually own the disputed concern.**
