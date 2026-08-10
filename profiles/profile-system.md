---
type: framework-layer-policy
status: accepted
domain: profiles
language: en
owner: framework
foundation: FOUNDATION-07A
---

# Domain Profiles System

## Profile Identity & Ownership Boundary

Profiles provide reusable domain-specific development intelligence for a defined product, platform, or system class.

> Profiles specialize the framework for a domain; they do not replace Core, Patterns, or project-specific reasoning.

## What a Profile is

A Profile captures requirements and reusable reasoning that are specific enough to a domain to be inappropriate for universal Core, yet broad enough to apply across multiple projects within that domain.

Example Profile families may include:

- Discord Platform,
- Web Application,
- Game Development,
- Mobile Application,
- SaaS,
- API / Backend.

A Profile may contribute, where materially relevant:

- domain-specific invariants,
- recurring domain risks and failure modes,
- domain-specific quality gates,
- additional review or verification requirements,
- specialist roles and dispatch signals,
- workflow extensions,
- domain-specific architecture constraints,
- guidance that influences Pattern discovery, selection, composition, or verification.

## Layer ownership

Conceptually:

```text
Core
↓
universal governance, reasoning, trust, security and quality properties

Patterns
↓
optional reusable intelligence for recurring solution spaces

Profiles
↓
domain-specific specialization, constraints and quality/risk intelligence

Adapters
↓
translation into concrete providers, tools and execution environments

Project Brain
↓
project-specific decisions, intent and accepted state
```

This ordering is conceptual ownership rather than a blanket authority ranking.

A Profile does not automatically override a Pattern merely because it is more specific, and a Pattern does not automatically override a Profile because it appears earlier in the layer model.

Conflicts must be resolved according to the ownership of the disputed rule, applicable governance, scope, authority, freshness and evidence.

## Core boundary

Profiles may specialize universal Core properties for a domain, but may not silently redefine or weaken Core governance.

For example, Core may require authoritative authorization and evidence proportionate to consequence. A Discord Profile may add Discord-specific authorization or interaction constraints, but it does not own the universal security property itself.

If a rule proves universally applicable regardless of domain, it belongs in Core rather than in a Profile.

## Pattern boundary

Patterns answer:

> How can this recurring problem class be approached well across multiple projects or domains?

Profiles answer:

> What does good, safe, and domain-appropriate development require in this domain?

A Profile may constrain, prefer, reject, or add verification around a Pattern where domain realities justify it, but it must not absorb generic Pattern knowledge merely because that knowledge is frequently used in the domain.

Example:

```text
Discord Profile
→ Discord-specific permission boundaries, interaction rules and platform constraints

Permissions Pattern
→ reusable authorization-model reasoning such as RBAC, ABAC or relationship-based approaches
```

The Profile may influence which authorization approach is suitable without becoming the owner of generic authorization-pattern knowledge.

## Project Brain boundary

Profiles do not establish project truth merely by being active.

A Profile may expose domain constraints, recommended practices and required quality properties, but concrete project choices remain project decisions unless the rule is an actual mandatory domain invariant.

Examples of project-owned choices include:

- which supported architecture variant is selected,
- which provider or library is used,
- how the project structures modules or services,
- which optional domain capabilities are implemented,
- product-specific trade-offs.

Those choices become durable through normal Project Brain decision and knowledge mechanisms.

## Profiles are not architecture templates

Activating a Profile must not force one canonical application architecture for every project in the domain.

A healthy Profile defines the domain's meaningful constraints, risks, standards and specialization points while preserving legitimate project-level variation.

For example, activating a Discord Profile does not imply that every Discord project should use the same framework, command architecture, persistence model, hosting platform, or permission implementation.

> Domain specialization should constrain where reality requires it, not manufacture uniformity where multiple valid designs exist.

## Stronger domain constraints

A Profile may legitimately impose stronger requirements than a generic Pattern when the domain introduces real constraints, platform rules, operational risks or quality expectations that the Pattern does not own.

This does not create a universal `Profile > Pattern` hierarchy.

The deciding question is which layer owns the specific disputed property and which applicable constraints are authoritative in the current context.

## Ownership test

Knowledge belongs in a Profile when it is broadly true that:

- it is reusable across multiple projects within a recognizable domain,
- it depends materially on domain-specific platform, product or system characteristics,
- it is not universal enough for Core,
- it is not merely generic recurring solution-space intelligence better owned by a Pattern,
- it should influence domain-appropriate development quality or risk handling,
- it is not merely one project's accepted choice.

If these conditions do not hold, the knowledge should remain in the layer that actually owns it.

## Core principles

> **Profiles specialize the framework for a domain; they do not replace Core, Patterns, or project-specific reasoning.**

> **Profiles may strengthen domain requirements where the domain genuinely requires it, but do not gain blanket priority over Patterns.**

> **Profiles must not duplicate universal Core properties or absorb generic Pattern knowledge.**

> **Activating a Profile does not turn domain guidance into a mandatory project architecture template.**

> **Concrete project choices remain owned by the Project Brain unless the Profile exposes a genuine mandatory domain invariant.**
