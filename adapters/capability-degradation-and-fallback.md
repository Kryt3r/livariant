---
type: framework-layer-policy
status: accepted
domain: adapters
language: en
owner: framework
foundation: FOUNDATION-08F
---

# Capability Degradation & Fallback

Adapters must surface when a capability, provider, model, or tool is impaired, unavailable, or uncertain. Fallback may change execution mechanics, but it must not silently weaken the requirement being satisfied.

> **Fallback may change how a requirement is satisfied, but it must not silently weaken what the requirement means. When equivalence cannot be preserved, the remaining gap stays explicit.**

## Degradation States

Adapters should represent materially relevant capability state using a small shared vocabulary:

- `available` — the capability is presently usable as expected,
- `degraded` — the capability exists but is materially constrained or less reliable,
- `unavailable` — the capability cannot presently be used,
- `unknown` — current capability state cannot be established reliably.

A degraded state should include enough structured detail to explain the impairment where it matters, such as:

- reduced reliability,
- reduced quality,
- missing tool access,
- smaller context or payload limits,
- unavailable write paths,
- incomplete verification,
- provider outage,
- elevated latency,
- partial modality support,
- or account / region / environment restrictions.

Adapters report the state. The Runtime decides the response.

## Requirement Preservation

A fallback is valid only when it preserves the semantic requirement that triggered the capability need.

Example:

```text
Requirement:
independent review

Primary path:
second model/provider performs review

Equivalent fallback:
human reviewer or another independent provider

Invalid fallback:
implementation agent reviews its own work and marks the independent-review gate satisfied
```

The execution path may change. The meaning of the gate, invariant, acceptance criterion, or verification requirement must not be rewritten merely because the preferred capability is unavailable.

## Fallback Classes

Fallback candidates should be reasoned about using at least these semantic classes:

### Equivalent Fallback

A different execution path satisfies the same requirement with materially equivalent authority, independence, quality, evidence, and protected properties.

Equivalent fallback may proceed when normal Runtime authority permits it.

### Reduced-Capability Fallback

The alternative can provide useful partial progress but cannot fully satisfy the original requirement.

The Runtime may use it only when the remaining gap is explicitly represented, for example as:

- Verification Debt,
- unresolved capability debt,
- blocked completion condition,
- partial result,
- or a required human follow-up.

Reduced fallback must never be reported as equivalent completion.

### No Safe Fallback

No available alternative can satisfy the requirement without violating authority, quality, security, correctness, independence, or another protected property.

The affected work must stop, remain incomplete, or be escalated according to existing governance.

## Fallback Must Not Increase Effect

A fallback must not silently move to a more consequential execution effect.

Invalid examples include:

```text
preview deployment unavailable
→ deploy production instead
```

```text
feature branch write unavailable
→ write directly to main
```

```text
scoped token unavailable
→ use broader privileged credentials automatically
```

If an alternative requires a higher-effect operation, broader scope, stronger credential, more destructive action, or increased security sensitivity, new Runtime authorization is required.

Technical necessity does not create additional authority.

## Runtime Response Options

When degradation is material, the Runtime may choose among safe responses such as:

- route to another compatible tool,
- route to another provider,
- select another model with sufficiently evidenced capabilities,
- change task decomposition,
- use an equivalent manual or human path,
- perform partial non-destructive progress while preserving explicit debt,
- wait for a required capability only when the execution environment legitimately supports that workflow,
- or stop and report that safe completion is currently impossible.

The Adapter may expose fallback candidates and compatibility metadata, but it must not become a hidden orchestrator that chooses broader authority or weaker completion semantics.

## Verification and Independence

Verification requirements deserve special protection during fallback.

A fallback must preserve required properties such as:

- independence from the implementation perspective,
- execution rather than inspection where execution is required,
- negative-path evidence where a boundary must be proved,
- domain-specific specialist competence where materially required,
- or environment-specific verification where portability assumptions are unsafe.

A cheaper or more available action is not equivalent merely because it produces a reassuring result.

## Interaction with Verification Debt

If an original verification requirement cannot be met and no equivalent fallback exists, the missing evidence must remain visible under the Core Definition of Done and Verification rules.

Capability degradation does not authorize adapters or agents to reinterpret `PARTIAL` evidence as `VERIFIED`.

Critical unresolved safety, security, authorization, or data-integrity risk must remain blocking even when a provider outage makes full verification inconvenient.

## User Transparency

Not every retry, transient error, or internal reroute needs to interrupt the human.

The human should be informed when degradation materially changes:

- the achievable result,
- verification strength,
- review independence,
- execution environment,
- risk level,
- authority required,
- expected reliability,
- or completion status.

Examples that should remain visible include:

- a required test could not be executed,
- independent review was unavailable and no equivalent substitute existed,
- only a materially weaker model or capability was usable,
- deployment verification was incomplete,
- a requested write path could not be safely used,
- or completion depends on a later manual step.

Transparency should explain the practical consequence, not merely expose provider internals.

## Failure Containment

Degradation handling must remain compatible with the Core project-mutation safety policy.

A failed or degraded capability must not trigger uncontrolled repair cascades, increasingly broad edits, or destructive fallback behavior.

When an attempted fallback produces unexpected project risk, the Runtime should contain the failure, reassess scope and authority, and preserve a recoverable project state where practical.

## Freshness

Fallback decisions that depend on provider, model, or tool capabilities must use evidence fresh enough for the consequence of the decision.

Stale registry data may suggest fallback candidates, but should not be treated as proof that a high-impact alternative is presently executable or equivalent.

Observed capability state should take precedence over old declared capability metadata for current execution decisions.

## Anti-Patterns

Avoid:

- calling a weaker action equivalent because it is available,
- dropping verification gates during provider outages,
- allowing self-review to replace required independence,
- escalating from lower-effect to higher-effect operations without new authority,
- hiding capability or verification debt behind `DONE`,
- treating stale provider metadata as current execution truth,
- letting Adapters choose orchestration policy,
- retrying through increasingly destructive alternatives,
- or overwhelming users with irrelevant transient provider noise while hiding material degradation.

## Core Principles

> **Fallback may change the execution path, but not silently weaken the requirement.**

> **Equivalent fallback preserves the material properties of the original requirement; reduced fallback leaves explicit debt.**

> **Fallback never grants broader authority or a higher-effect operation by itself.**

> **When no safe equivalent exists, incomplete work remains incomplete.**

> **Material degradation that affects trust, quality, risk, or completion must remain visible to the human.**
