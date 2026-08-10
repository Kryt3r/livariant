---
type: framework-layer-policy
status: accepted
domain: profiles
language: en
owner: framework
foundation: FOUNDATION-07B
---

# Profile Contract & Activation

Profiles specialize framework behavior for a domain when that domain is actually relevant.

> Profiles are activated by demonstrated domain relevance, not by labels, technology names, or availability alone.

## Profile Contract

A reusable Profile should expose enough semantic structure to determine what domain it owns, when it applies, what additional constraints it contributes, and which decisions remain project-specific.

### Identity & Domain Scope

Each Profile must have a stable identity, version, lifecycle status, concise description, and a clearly bounded domain scope.

The scope should represent a meaningful product, platform, or system domain rather than merely a library, vendor, or implementation tool.

### Applicability

A Profile must explain the conditions under which its domain-specific intelligence is relevant.

Signals may include project type, platform behavior, product characteristics, runtime environment, architectural boundaries, or concrete task requirements.

### Anti-Applicability

A Profile must explain when it should not be activated, especially where a superficial technology or keyword match would create irrelevant governance or unnecessary overhead.

### Domain Invariants

A Profile may define domain-specific properties that must hold while the Profile is active.

These invariants specialize the framework for the domain but must not duplicate or weaken universal Core invariants.

### Risks & Failure Modes

A Profile should capture recurring domain-specific risks, implementation failures, operational hazards, and misleading assumptions where they materially improve project outcomes.

### Quality Gates

A Profile may add domain-specific review, verification, readiness, performance, reliability, security, UX, or operational gates where the domain genuinely requires stricter or different treatment.

Quality gates must remain proportional rather than becoming mandatory ceremony for every task within the domain.

### Roles & Dispatch Signals

A Profile may define specialist expertise and signals that justify activating that expertise for relevant work.

Profile roles extend the Studio's reusable domain capability; they do not create independent authority outside the existing runtime and decision model.

### Workflow Extensions

A Profile may extend or specialize normal workflows where the domain has material lifecycle, review, build, testing, release, operational, or platform-specific needs.

Profiles should not create alternate end-to-end process systems when Core workflows already suffice.

### Pattern Guidance

A Profile may identify Patterns that are frequently relevant, conditionally useful, risky, or commonly composed within its domain.

Such guidance supports discovery and selection but must not automatically activate Patterns.

### Decision Surface

A Profile must distinguish reusable domain requirements from concrete project choices.

Technology selection, architecture, product behavior, vendor choice, project policy, and other local decisions remain project-owned unless an applicable Core or Profile invariant actually constrains them.

### Verification Guidance

A Profile should identify domain-specific verification concerns that materially differ from generic Core verification.

### Version & Lifecycle

Profiles must be versioned and have a lifecycle sufficient for safe evolution and historical traceability. Detailed framework-wide release semantics remain owned by FOUNDATION-10.

## Activation Model

Profile activation is deliberate and scope-bound.

Potential activation signals may include:

- explicit project or human declaration,
- detected project or platform type,
- existing architecture or dependencies,
- runtime or deployment characteristics,
- concrete task requirements.

Automatic detection creates a **Profile Candidate**, not an automatically authoritative Profile.

Before activation, the runtime should evaluate whether:

- the domain genuinely matches the current project, subsystem, or task,
- applicability conditions are satisfied,
- anti-applicability conditions are absent,
- the Profile is compatible with applicable Core governance and accepted project knowledge,
- the Profile's provenance and trust state are sufficient for the effects it would introduce,
- activation would materially improve the work rather than merely add context.

## Trust and Authority During Activation

Profile provenance is not authority.

An `official`, `community`, local, imported, or otherwise externally supplied Profile may provide reusable intelligence, but its presence alone does not authorize it to impose privileged actions, rewrite project decisions, weaken Core constraints, or expand runtime capability.

Trust should be evaluated proportionately to the consequences of activation. A low-risk Profile used as advisory context may require little additional assurance; a Profile that introduces mandatory gates, security-sensitive invariants, execution guidance, or high-impact workflow changes requires stronger provenance and review.

Unknown, stale, tampered, or ambiguous Profile provenance should therefore reduce the effects the runtime is willing to accept automatically. Where confidence is insufficient, the Profile should remain a candidate, be treated as advisory context, or require explicit review rather than silently becoming authoritative domain governance.

This preserves the Core distinction between available capability or information and actual authority.

## Activation Outcomes

Candidate evaluation may result in:

- `active` — the Profile applies within the defined scope,
- `rejected` — it was considered and should not apply in the current context,
- `deferred` — it may become relevant later, but present work does not require activation.

## Activation Scope

A Profile may be active for:

- an entire project,
- a major product surface,
- a subsystem,
- or a specific task when the domain exists only locally.

Local Profile activation must not silently become global project governance.

Projects may legitimately have multiple active Profiles where multiple domains coexist.

Example:

```text
Project
→ Web Application Profile
→ SaaS Profile

Discord integration subsystem
→ additionally Discord Platform Profile
```

The interaction between multiple active Profiles is governed separately by Profile composition and conflict rules.

## Human-Directed Activation

A human may explicitly request a Profile, but explicit selection does not eliminate applicability checking or constructive dissent.

If the requested Profile is materially inappropriate, conflicts with stronger governance, has insufficient provenance for the authority it would exercise, or represents the wrong ownership layer, the system should explain the concern and resolve it through normal authority rules rather than activate it blindly.

## Technology Names Are Not Domains

A technology or vendor may be evidence of a domain, but it does not automatically justify a Profile.

Examples such as React, PostgreSQL, Supabase, or a specific cloud provider are generally better represented by Patterns, Adapters, or project knowledge unless evidence shows that they define a reusable domain with distinct lifecycle, risk, quality, and workflow semantics.

> A Profile should represent a reusable domain, not become a container for every technology-specific fact.

## Activation Principles

> **Profiles are activated by demonstrated domain relevance, not by labels, technology names, or availability alone.**

> **Automatic detection produces candidates; activation remains a deliberate applicability and trust decision.**

> **Profile provenance informs trust but does not create authority.**

> **Profile activation is scope-bound and may be project-wide or local.**

> **Profiles may specialize Core behavior, but they do not duplicate universal governance or silently convert domain guidance into project decisions.**
