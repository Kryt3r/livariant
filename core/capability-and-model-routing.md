---
type: core-policy
status: accepted
domain: studio-runtime
language: en
owner: framework
---

# Capability & Model Routing

**Foundation:** FOUNDATION-04E

## Purpose

The runtime should select execution routes from required capabilities, governance constraints, and available environment rather than hardcoding provider or model names into Core policy.

> Route by capability first, provider second, model name last.

## Capability-first routing

The Core should reason in capabilities such as:

- deep reasoning,
- code generation,
- codebase navigation,
- security analysis,
- review reasoning,
- visual reasoning,
- image generation,
- web research,
- long-context processing,
- fast iteration,
- tool execution,
- terminal access,
- browser access.

Provider and model identity belong to adapters and runtime configuration.

Review independence is not a model capability. It is a property of the relationship and process between implementation and review and is resolved separately through the framework's I0/I1/I2 independence model.

## Model identity is runtime data

> Model identity is runtime configuration, not framework doctrine.

Model catalogs change too frequently to become durable Core knowledge. Adapters may update available models, capabilities, limits, cost characteristics, latency, and availability without requiring Core policy changes.

The framework should remain functional when new models appear or existing models disappear.

## Capability requirements

A work unit may derive capability requirements from:

- assigned role,
- task classification,
- risk,
- expected context size,
- required output,
- required tools,
- independence constraints,
- latency constraints,
- cost constraints,
- reliability requirements.

The goal is not to route every task to the strongest available model. It is to select the best valid fit for the workload and current constraints.

## Routing dimensions

Relevant routing dimensions may include:

- reasoning depth,
- context requirement,
- execution capability,
- modality,
- required review relationship / independence,
- latency sensitivity,
- cost sensitivity,
- reliability requirement.

Capability sets may combine several dimensions, while independence remains a routing constraint rather than an intrinsic model property.

## No globally best model

> There is no globally best model — only better fits for a particular workload and constraint set.

Model selection should be evidence-driven rather than brand-driven. Universal statements that one provider or model family is always superior for a class of work should not become Core doctrine.

## Proactive switching

The runtime may recommend or perform a model or tool switch when another available route materially improves capability fit, required independence, quality, or efficiency.

> A model switch should occur only when the expected benefit materially justifies the interruption.

Minor theoretical advantages should not cause constant model switching.

## Hard capability gaps versus optimization opportunities

A **hard capability gap** exists when the current route cannot satisfy a required capability or governance condition.

An **optimization opportunity** exists when the current route can complete the work, but another valid route is expected to perform materially better.

Hard gaps may require redispatch, another adapter, another tool, human involvement, escalation, or blocking depending on governance.

Optimization opportunities normally produce recommendations or automatic switches only when policy allows.

## Routing policy and user control

Runtime policy may support behaviors such as:

- automatic routing within approved budgets,
- recommended routing that requires user confirmation,
- manual routing controlled by the user.

The framework must not silently consume materially more expensive execution resources merely because they are available.

Project or adapter policy may express preferences for quality, cost, latency, or other constraints.

## Governance precedence

Governance, safety, review, and independence requirements cannot be silently weakened to reduce cost or latency.

If no available route satisfies a mandatory requirement, the runtime must degrade transparently and follow applicable escalation or stop conditions.

## Independence routing

Routing must respect the review independence model.

An isolated pass is not equivalent to an independent reviewer. Where I2 independence is required, the runtime must use a genuinely independent eligible route, model, provider, human reviewer, or other permitted reviewer according to project policy.

Prompt variation alone does not create independence.

Conceptually:

```text
Reviewer capabilities
+
Reviewer identity / context relation to implementer
+
Required process separation
=
I0 / I1 / I2
```

A model or adapter must not advertise `independent_review` as an intrinsic capability and thereby satisfy I2 by label alone.

## Diversity where consequence justifies it

For sufficiently critical work, using different model families, providers, or deterministic tooling across implementation and review may reduce correlated blind spots.

Diversity is a risk-control option, not a universal requirement.

## Deterministic evidence first

> Route factual verification to deterministic evidence whenever practical.

When a claim can be established more reliably through tests, builds, schema inspection, static analysis, package tooling, official documentation, or another deterministic mechanism, that evidence should be preferred over model speculation.

Tool routing and model routing are therefore part of the same capability-resolution problem.

## Capability composition

A work unit may require a combination of capabilities. For example, security review may require code navigation, security reasoning, terminal access, and optionally current documentation. Design work may require visual reasoning, design critique, product context, and image generation.

The router should select a route capable of satisfying the meaningful set rather than optimizing isolated capabilities independently.

## Capability confidence

Adapters and future tooling should distinguish between capability claims and observed performance where practical. Evidence may be:

- declared,
- observed,
- benchmarked,
- project-proven.

Project-local routing intelligence should not overgeneralize from isolated successes or failures.

## Temporal routing intelligence

> Routing intelligence is temporal knowledge.

Model behavior, versions, limits, pricing, and tool support may change. Performance observations should therefore remain scoped to relevant model or adapter versions and should be allowed to expire, be superseded, or require revalidation.

## Transparent fallback

When the ideal route is unavailable, the runtime should:

```text
Ideal Route
↓
Fallback Candidate
↓
Risk / Governance Re-evaluation
↓
Proceed / Escalate / Block
```

A fallback must never be represented as satisfying a requirement that it does not actually satisfy.

## Routing explanation

When a material switch, escalation, or manual intervention is recommended, explain the capability or independence reason rather than merely naming a model.

The user should understand what the next work unit needs and why the current route is insufficient or suboptimal.

## Adapter responsibility

Adapters should expose current environment knowledge such as:

- available models,
- capabilities,
- context constraints,
- modalities,
- tool support,
- routing policies,
- known constraints,
- current availability,
- and, where useful, relative cost or latency.

The Core provides required capabilities, quality depth, governance, and independence constraints. The adapter maps those requirements to concrete available execution routes.

## Routing stability

The runtime should avoid route flapping. A switch should require a material advantage over the current valid route rather than a marginal scoring difference.

Repeated execution failure may trigger capability re-evaluation and redispatch instead of repeated attempts through an unsuitable route.

## Conceptual routing flow

```text
Work Unit
↓
Role Requirements
↓
Capability Requirements
↓
Governance + Independence Constraints
↓
Available Adapter Capabilities
↓
Candidate Routes
↓
Capability Fit
↓
Independence Fit
↓
Quality / Cost / Latency Fit
↓
Selected Route
↓
Execute
↓
Observe Result
↓
Optional Routing Intelligence Update
```

## Core principles

> **Route by capability first, provider second, model name last.**

> **Model identity is runtime configuration, not framework doctrine.**

> **Review independence is a process property, not a model capability.**

> **There is no globally best model — only better fits for a particular workload and constraint set.**

> **Model switching should occur only when the expected benefit materially justifies the interruption.**

> **Hard capability gaps and optimization opportunities must remain distinguishable.**

> **Governance and independence requirements cannot be silently weakened by cost optimization.**

> **Deterministic evidence should be preferred over model speculation where practical.**

> **Model selection should be evidence-driven, not brand-driven.**

> **Routing intelligence is temporal knowledge and must be allowed to expire or be revalidated.**

> **The runtime should degrade transparently when ideal capabilities are unavailable.**
