---
type: core-policy
status: accepted
domain: studio-runtime
language: en
owner: framework
---

# Runtime Learning & Self-Improvement

**Foundation:** FOUNDATION-04H

## Purpose

The Studio should improve through real operation without becoming self-authorizing. Runtime experience may produce evidence, patterns, and improvement proposals, but operational observations do not silently become governance.

> The runtime may learn from operation, but it must not silently rewrite its own governance.

## Learning path

Runtime learning should follow a governed progression:

```text
Observation
↓
Repeated Evidence
↓
Pattern Candidate
↓
Improvement Proposal
↓
Review / Human Decision where required
↓
Adoption
↓
Measure Outcome
```

> Learning may generate proposals; governance decides what becomes authoritative.

## Operational evidence

Useful learning signals may include repeated:

- role redispatch,
- task-risk reclassification,
- incomplete context packets,
- late findings,
- workflow rework,
- repeated human questions,
- model-routing successes or failures,
- unnecessary coordination overhead,
- missing profile rules,
- evidence invalidation patterns.

A single event should normally remain an observation rather than become a durable rule.

## Learning scopes

Learning should be scoped according to demonstrated applicability:

- **Task-local** — relevant only to current execution.
- **Project-local** — useful for the current project.
- **Profile-level** — plausibly reusable within a domain.
- **Framework-level** — supported as broadly applicable Core behavior.

> Knowledge scope should expand only when evidence supports broader applicability.

Promotion to a broader scope requires deliberate evaluation rather than automatic propagation.

## Rework and late findings

Repeated rework is process evidence. The Studio should ask why a problem was discovered late rather than merely repeat implementation faster.

Potential causes include:

- incorrect task classification,
- missing role activation,
- poor review timing,
- insufficient context,
- unsuitable capability routing,
- missing invariant,
- weak acceptance criteria.

Repeated late findings should therefore generate process-improvement candidates where appropriate.

## Repeated questions

Repeatedly asking the human for already established information is evidence of missing, inaccessible, stale, or poorly routed project intelligence.

> Repeated questions are evidence of missing or inaccessible project intelligence.

The preferred response is to repair knowledge capture or retrieval rather than normalize repeated interruption.

## Dispatch learning

Repeated manual activation of the same expertise under similar conditions may become a resolver-rule candidate. Adoption requires evidence that the additional role materially improved outcomes and that the proposed scope is appropriate.

## Workflow learning

Repeated successful execution graphs may become reusable workflow patterns. Repeated failure patterns may indicate that an existing workflow should be reordered, decomposed, or retired.

Reusable patterns should remain proportional and must not turn common workflows into mandatory bureaucracy where their assumptions do not hold.

## Context learning

If specialists repeatedly request the same missing information, the corresponding context-packet template or routing rule should be evaluated for improvement.

The objective is to deliver sufficient context earlier without expanding all packets indiscriminately.

## Model-routing learning

Project operation may produce evidence about how available models or capability routes perform for particular workloads. Such observations should remain version-aware, confidence-aware, and temporal.

> Model learning must decay when the model itself changes.

Routing intelligence should be revalidated when model versions, adapters, capabilities, or relevant environment conditions change materially.

## Preference learning

The Studio may learn collaboration preferences such as desired autonomy, presentation depth, or repeatedly accepted and rejected interaction patterns.

Preferences remain distinct from governance, invariants, and factual project state. Their scope and confidence should remain explicit where consequential.

## Metrics and Goodhart protection

Operational metrics may reveal friction, including rework frequency, late-finding rate, retry patterns, repeated questions, blocker duration, dispatch overhead, or evidence invalidation.

These signals are diagnostic rather than optimization targets.

> Metrics should reveal friction, not become proxy goals.

The Studio must not optimize a metric by degrading the underlying objective. Fewer questions must not encourage guessing; fewer findings must not encourage weaker review; less rework must not encourage avoiding necessary changes.

## Improvement candidates

A material improvement candidate should be representable with information such as:

- observation,
- repeated pattern,
- supporting evidence,
- proposed change,
- intended scope,
- confidence,
- expected benefit,
- governance impact.

Candidates may target efficiency, quality, safety, UX, knowledge architecture, routing, or other framework behavior.

Similar candidates should be consolidated when they plausibly share one root cause.

## Automatic adoption boundaries

The higher the governance impact of a change, the lower the permitted automatic adoption.

Low-impact, reversible runtime optimizations may be eligible for controlled automatic application. Changes affecting governance, authority, security invariants, mandatory profile behavior, or high-impact decision rules require governed adoption and must not be silently self-applied.

## Self-modification safety

Framework improvement is itself framework work and therefore remains subject to applicable classification, review, verification, authority, and human gates.

> Framework self-improvement is still framework-governed work.

No runtime component may weaken the rules that constrain its own authority to modify governance.

## False-pattern protection

Repeated observations do not automatically prove a causal pattern. Evaluation should consider, where relevant:

- sample size,
- diversity of contexts,
- counterexamples,
- common root causes,
- version changes,
- external environmental changes.

Negative evidence matters. A rule that repeatedly dispatches expertise without meaningful contribution may itself be overfitted.

## Effectiveness review

Adopted learned rules should remain reviewable. After sufficient use, the Studio should be able to ask whether the change actually improved its intended outcome or merely introduced overhead.

Possible outcomes include:

- `KEEP`
- `TUNE`
- `REMOVE`
- `PROMOTE`
- `DEMOTE`

Learned behavior is therefore reversible and evolutionary rather than permanent by default.

## Project versus framework learning

Project-specific knowledge should remain project-local unless deliberately promoted. A rule that is valuable for one product does not automatically belong in a profile or the Core.

Profile and framework promotion should require broader evidence and normal governance review.

## Privacy and telemetry

Project-local learning should remain local by default. The framework must not require uploading proprietary project content, secrets, security findings, or other sensitive runtime information for self-improvement.

Any future shared telemetry should be explicitly opt-in, minimized, and designed to avoid sensitive project content.

Community contributions may deliberately promote useful patterns through normal contribution, review, and framework-governance processes.

## Learning log

The Studio does not need to preserve every raw runtime event permanently. Material improvement candidates may instead be consolidated into a compact learning log containing the problem, evidence, proposal, scope, and disposition.

## Learning loop

```text
Runtime Operation
↓
Signals / Friction / Success
↓
Observation
↓
Pattern Detection
↓
Improvement Candidate
↓
Evidence Review
↓
Scope Resolution
↓
Proposal
↓
Governed Adoption
↓
Measure Effect
↓
Keep / Tune / Remove
```

The objective is evidence-driven evolution without uncontrolled self-authorization.

## Core principles

> **The runtime may learn from operation, but it must not silently rewrite its own governance.**

> **Operational observations are evidence, not automatically rules.**

> **Learning may generate proposals; governance decides what becomes authoritative.**

> **Knowledge scope should expand only when evidence supports broader applicability.**

> **Repeated rework should trigger process diagnosis, not merely faster repetition.**

> **Repeated questions are evidence of missing or inaccessible project intelligence.**

> **Metrics should reveal friction, not become proxy goals.**

> **Framework self-improvement is still framework-governed work.**

> **Learned rules must remain reviewable, reversible, and subject to effectiveness checks.**

> **Project-local learning should remain local unless deliberately promoted.**

> **Model-routing learning is temporal and must be revalidated as models change.**

> **The Studio should improve through evidence without becoming self-authorizing.**
