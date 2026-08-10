---
type: framework-layer-policy
status: accepted
domain: adapters
language: en
owner: framework
foundation: FOUNDATION-08C
---

# Model Registry & Temporal Provider Knowledge

Model and provider characteristics change frequently. Adapter knowledge about models must therefore be treated as temporal provider reality rather than permanent framework truth.

> Model registries describe current provider reality with explicit freshness; they inform routing but do not become permanent model rankings or policy.

## Purpose

An Adapter may expose a model registry for the provider or execution environment it integrates.

The registry exists to help the Runtime understand what models currently exist, what they can demonstrably do, and how trustworthy or fresh that information is.

It does not own task routing policy, global model quality rankings, or provider-independent governance.

## Model Identity

A registry entry should identify the concrete provider model as precisely as the provider exposes it.

Useful identity fields may include:

- provider,
- provider model identifier,
- aliases where necessary,
- lifecycle or availability state,
- region or account constraints where materially relevant.

Human-facing marketing names should not replace the provider's actual model identity when execution depends on exact identifiers.

## Capability Evidence

A registry may describe current evidence for capabilities such as:

- text generation,
- reasoning,
- vision or multimodal input,
- audio input/output where supported,
- tool or function calling,
- structured output,
- context limits,
- output limits,
- streaming,
- embeddings or reranking where relevant,
- provider-specific execution constraints.

Capability claims must distinguish evidence from assumptions.

A model must not be treated as supporting a capability merely because another model in the same family supports it or because an older version did.

## Freshness Semantics

Provider knowledge should expose a freshness state sufficient for proportional Runtime decisions.

At minimum:

- `verified` — the information was checked against a sufficiently current authoritative or directly observed source,
- `stale` — the information may still be useful but is older than the expected change rate for the property,
- `unknown` — the property is not reliably established.

Where useful, the Adapter may additionally expose:

- last verification time,
- evidence source,
- expected volatility,
- confidence or verification notes.

Freshness is property-sensitive. A stable identity fact may tolerate older evidence than a rapidly changing availability, quota, pricing, or tool-support claim.

## Routing Boundary

The following concerns must remain distinct:

```text
Model Identity
→ which concrete provider model exists

Model Capability Evidence
→ what it is currently known to support

Routing Preference
→ how suitable it appears for a task under current requirements

Runtime Selection
→ which model is actually selected and authorized for execution
```

The Adapter owns the provider translation and evidence surface.

The Runtime owns provider-independent selection and orchestration according to task requirements, applicable policy, availability, authority, cost/latency constraints where relevant, and current evidence.

## No Global Model Ranking

The framework must not encode a permanent universal ranking such as:

```text
Model A > Model B > Model C
```

Such rankings age quickly and collapse multiple task-specific dimensions into one false ordering.

Instead, routing should conceptually derive from:

```text
Task requirements
+ current capability evidence
+ availability
+ constraints
+ applicable authority
→ Runtime routing decision
```

A newly introduced model should therefore be adoptable through refreshed Adapter evidence rather than requiring Core, Pattern, or Profile policy changes merely because the provider lineup changed.

## Runtime Verification

When a decision materially depends on a volatile provider property, the Runtime should prefer current observation or authoritative provider evidence over static Adapter assumptions.

Examples:

- whether a model is currently selectable,
- whether tool calling is enabled for the present account/environment,
- whether a specific model supports a required modality,
- whether an environment-specific restriction currently applies.

Older evidence may remain sufficient for low-risk, low-volatility claims when the task does not depend on exact current provider behavior.

## Provider-Specific Constraints

Adapters may expose provider-specific model constraints, but those constraints remain descriptive translation rather than new framework governance.

Examples may include:

- model-region availability,
- account-tier restrictions,
- provider-specific tool compatibility,
- model-specific request limits,
- provider retirement/deprecation state.

The Adapter reports these constraints so the Runtime can reason correctly; it does not convert them into universal framework rules.

## Failure Behavior

When required model knowledge is stale or unknown, the system should not fabricate certainty.

Depending on consequence and task needs, the Runtime may:

- verify the property,
- select another sufficiently evidenced model,
- degrade gracefully,
- defer the affected action,
- or surface the uncertainty for human decision.

## Relationship to Capability Discovery

Model registry data is one specialized form of Adapter capability evidence.

It remains subject to the broader distinction between:

- declared support,
- currently observed availability,
- and authorized use.

A model can therefore be known to support a capability while still being unavailable or unauthorized in the current environment.

## Anti-Patterns

Avoid:

- hard-coding a permanent "best model",
- assuming family-level capabilities for every model variant,
- treating stale provider documentation as current runtime fact,
- letting an Adapter choose models by hidden policy,
- confusing model availability with authority to invoke it,
- embedding provider churn into Core or Profiles,
- silently fabricating missing provider capability information.

## Core Principle

> **Model registries describe current provider reality with explicit freshness; they inform routing but do not become permanent model rankings or policy.**
