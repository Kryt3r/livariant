---
type: framework-layer-policy
status: accepted
domain: adapters
language: en
owner: framework
foundation: FOUNDATION-08G
---

# Adapter Conformance & Compatibility Checks

Adapter quality has two separate dimensions: preservation of framework semantics and practical compatibility with a concrete environment.

> **Adapter conformance proves preservation of framework semantics; compatibility proves that a specific adapter version can operate safely in the current environment.**

## Conformance

Conformance asks whether an Adapter preserves the framework's established ownership, authority, safety, degradation, and translation semantics.

An Adapter is conformant only if it preserves applicable invariants such as:

- capability does not become authority,
- competence, model identity, or tool identity do not become authority,
- provider-specific behavior does not silently redefine Core, Pattern, Profile, Runtime, or Project Brain ownership,
- native instruction projections do not become competing sources of truth,
- human-owned project artifacts are preserved according to project-mutation safety rules,
- degradation and missing evidence remain explicit,
- fallback does not silently weaken requirement meaning,
- fallback does not increase effect or scope without renewed authority,
- environment discovery does not silently become durable project truth,
- execution failures do not create hidden escalation or secondary orchestration inside the Adapter.

Conformance is therefore about semantic preservation, not feature completeness.

An Adapter may support only a small subset of possible capabilities and still conform if it reports those boundaries accurately and preserves framework rules.

## Conformance Scenarios

Adapters should provide a small set of focused conformance scenarios where practical.

These scenarios should test meaningful invariants rather than merely confirming that an API endpoint responds.

Examples include:

### Capability and authority separation

Given:
- repository write is technically available,
- current authority is read-only.

Expected:
- the Adapter reports write capability,
- the Runtime does not authorize write execution,
- no write operation is performed.

### Human-owned instruction preservation

Given:
- a project already contains a human-owned `CLAUDE.md` or `AGENTS.md`.

Expected:
- the Adapter inspects and classifies the existing artifact,
- it does not replace the file by default,
- proposed integration remains visible and scope-bound,
- any write follows applicable change authority.

### Fallback effect safety

Given:
- preview deployment is unavailable,
- production deployment is technically available.

Expected:
- production deployment is not treated as an equivalent fallback,
- higher-effect execution requires separate authorization.

### Temporal model knowledge

Given:
- model capability information is stale or unknown.

Expected:
- the Adapter does not report historical metadata as verified current reality,
- the Runtime receives the actual freshness state.

### Degraded verification

Given:
- an expected independent verification path is unavailable.

Expected:
- any non-equivalent fallback remains explicit,
- missing verification is not silently converted into completion.

## Compatibility

Compatibility asks whether a particular Adapter version can operate safely with the concrete framework and environment state currently present.

Relevant compatibility dimensions may include:

- Adapter version,
- Framework version or contract version,
- provider or environment version,
- detected native capability surface,
- instruction-file format or precedence behavior,
- authentication mode,
- API or SDK compatibility,
- model/tool availability,
- known provider deprecations,
- known incompatible combinations,
- required environment features.

Compatibility results should distinguish at least:

- `compatible` — expected Adapter behavior is supported,
- `compatible_with_degradation` — safe operation is possible but one or more capabilities are reduced,
- `incompatible` — safe or semantically correct operation cannot be guaranteed,
- `unknown` — available evidence is insufficient to determine compatibility reliably.

## Conformance Is Not Compatibility

A conformant Adapter may still be unusable in a specific environment.

For example:

```text
Adapter
→ correctly preserves capability/authority separation
→ therefore conformant

Current environment
→ provider removed required API surface
→ therefore incompatible
```

Likewise, an Adapter may technically work against a provider while still violating framework semantics. Successful API execution does not prove conformance.

## Compatibility Is Contextual

Compatibility must not be modeled as a timeless global property.

A combination that works today may become degraded or incompatible after:

- provider API changes,
- authentication changes,
- native instruction precedence changes,
- tool removal,
- model retirement,
- account or region restrictions,
- framework contract evolution.

Compatibility evidence therefore requires appropriate freshness and provenance.

## Conformance Baseline

The conformance contract should remain intentionally small.

Every Adapter should prove preservation of the framework invariants that matter to its behavior. It should not be forced to implement irrelevant capabilities or a large universal certification suite.

Prefer:

```text
few hard invariants
+
focused scenarios for material provider behavior
```

over:

```text
large provider-neutral checklist
+
ceremony with little failure-prevention value
```

This keeps official, community, and future provider Adapters realistically implementable while preserving the framework properties users must be able to trust.

## Community and Third-Party Adapters

Community or externally maintained Adapters may claim conformance only against an identified Adapter Contract / framework baseline and supporting evidence.

Provenance and conformance are separate properties.

An official Adapter is not automatically conformant forever, and a community Adapter is not automatically non-conformant.

Provider popularity or successful installation is not evidence of semantic conformance.

## Drift and Revalidation

Revalidation should be triggered proportionately when evidence suggests that assumptions may have changed.

Useful triggers include:

- framework contract changes,
- material Adapter updates,
- provider API or tool changes,
- changed authentication behavior,
- native instruction semantics changing,
- capability discovery no longer matching observed execution,
- reported incidents or repeated failures,
- stale compatibility evidence for a fast-changing integration.

Revalidation should target affected surfaces rather than rerunning an unnecessarily exhaustive suite after every minor change.

## Failure Behavior

If conformance is materially uncertain, the Adapter must not silently assume compliance.

If compatibility is `unknown` or `incompatible`, the Runtime should avoid relying on affected capabilities until the gap is resolved or a safe degraded path is chosen.

Where a capability is usable only with degradation, that degradation must flow into normal runtime planning, authority, and verification semantics.

## Anti-Patterns

Avoid:

- treating successful provider calls as proof of framework conformance,
- treating conformance as proof that every current environment is supported,
- static compatibility claims with no freshness model,
- giant certification suites unrelated to meaningful failure modes,
- official provenance being treated as permanent correctness,
- community provenance being treated as automatic distrust,
- compatibility fallback that silently violates authority, mutation safety, or verification requirements,
- forcing every Adapter to implement capabilities it does not need merely to satisfy a checklist.

## Core Principles

> **Adapter conformance proves preservation of framework semantics; compatibility proves that a specific adapter version can operate safely in the current environment.**

> **Conformance and compatibility are independent claims and require different evidence.**

> **Compatibility is contextual and time-sensitive.**

> **A small set of hard invariants and targeted scenarios is preferable to certification bureaucracy.**

> **Unknown compatibility or conformance must remain visible rather than being interpreted optimistically.**
