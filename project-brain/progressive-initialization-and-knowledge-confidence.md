---
type: framework-layer-policy
status: accepted
domain: project-brain
language: en
owner: framework
foundation: FOUNDATION-09D
---

# Progressive Initialization & Unknown / Partial Knowledge

A Project Brain is allowed to begin incomplete. Initialization establishes a useful, truthful starting point; it does not require the framework to understand every important property of a project before real work can begin.

> **The Project Brain may begin incomplete and become more precise through real work. New evidence informs project knowledge, but observation and repetition do not become durable project truth without sufficient authority and confidence.**

## Orthogonal Knowledge Dimensions

Knowledge quality must not be collapsed into one universal status field.

The framework should distinguish at least three separate dimensions when the distinction matters:

### Knowledge Coverage

Coverage describes how much of the relevant subject is established.

Useful baseline states include:

- `known` — the materially relevant subject is sufficiently established for the current project context,
- `partially_known` — some materially relevant aspects are established while others remain unresolved,
- `unknown` — reliable knowledge is not currently available for the materially relevant subject.

### Evidence Confidence

Confidence describes how strongly the available evidence supports a particular claim.

Discovery may use states such as:

- `confirmed`,
- `strongly_inferred`,
- `uncertain`.

These confidence states are compatible with the Bootstrap Discovery model in FOUNDATION-09A. Confidence is not the same as coverage: a narrow fact may be strongly confirmed while the broader subject remains only partially known.

### Resolution State

Resolution describes whether materially relevant evidence or accepted knowledge is internally coherent.

Useful states include:

- `resolved` — no material unresolved contradiction is known for the subject,
- `conflicted` — meaningful evidence sources or accepted knowledge disagree and the disagreement still matters,
- `superseded` where a previous durable decision or fact remains historically relevant but is no longer active project truth.

Not every stored fact needs all three dimensions explicitly encoded. The conceptual separation exists so implementations do not mistake completeness for certainty, certainty for authority, or conflict for lack of knowledge.

Examples:

```text
Coverage: partially_known
Confidence: confirmed for the known facts
Resolution: resolved
```

and:

```text
Coverage: known
Confidence: high / confirmed
Resolution: conflicted
```

are both valid states.

Unknown knowledge is valid project knowledge. The framework must not fabricate precision merely to fill a schema or complete initialization.

## Provenance of Knowledge

Where provenance matters to interpretation or future reconciliation, project knowledge should preserve the kind of evidence that supports it.

Useful provenance classes may include:

- human declaration,
- accepted project decision,
- repository evidence,
- existing project documentation,
- runtime or environment observation,
- external system evidence,
- inference derived from one or more sources.

The framework should preserve enough provenance to distinguish authoritative intent from observed implementation reality and from model inference.

## Progressive Initialization

Initialization continues during real work when a material knowledge gap becomes relevant.

Conceptually:

```text
initial Project Brain
→ useful but potentially incomplete
→ real task exposes relevant knowledge gap
→ inspect available evidence
→ ask only what materially affects the task when necessary
→ establish or refine project knowledge
→ continue work
```

Progressive initialization should prefer relevance over completeness.

The framework does not need to interview the human about every unknown area. It should deepen project knowledge when doing so materially improves current or future correctness, safety, architecture quality, or continuity.

## Task-Driven Knowledge Questions

A knowledge gap is a strong candidate for clarification when it materially affects:

- a current architecture or product decision,
- security or authorization behavior,
- protected project invariants,
- data or migration behavior,
- user-visible behavior,
- irreversible or high-impact work,
- repeated ambiguity that has already caused mistakes or rework,
- or durable knowledge likely to be reused across many tasks.

The framework should avoid interrupting the human for low-value facts merely because they could be stored.

For example:

```text
Task: change authentication behavior
Known: Supabase Auth exists
Unknown: intended role model, tenant ownership semantics, account recovery rules

→ these gaps materially affect the requested task
→ targeted clarification is justified
```

By contrast, an incidental local implementation detail that does not affect project intent or future work may remain ordinary evidence rather than becoming a Project Brain question.

## Observation Is Not Intent

The framework must distinguish implementation reality from desired project intent.

Examples:

```text
Observed: only one tenant currently exists
```

does not establish:

```text
Project intent: single-tenant system
```

Likewise:

```text
Observed: code currently uses architecture X
```

does not necessarily mean:

```text
Accepted project decision: architecture X is preferred and must be preserved
```

Existing implementation may be intentional, accidental, transitional, legacy, incomplete, or incorrect.

Observation therefore informs project reasoning but does not automatically become normative project truth.

## Knowledge Promotion

Knowledge may become more authoritative as evidence improves, but promotion must remain evidence-based.

A useful conceptual progression is:

```text
observation
→ evidence
→ supported inference
→ confirmed or otherwise sufficiently authoritative project knowledge
```

The exact path is contextual. Not every fact needs every stage.

Examples of stronger support may include:

- explicit human confirmation,
- accepted project decisions,
- multiple independent and current evidence sources,
- direct authoritative configuration or runtime state for a technical fact,
- clear project documentation that is current and consistent with reality.

Repeated model output alone is not stronger evidence.

> **Repetition does not promote an assumption into project truth.**

Five agents repeating the same unsupported inference do not make the inference authoritative.

Confidence, authority, and coverage remain distinct. High-confidence observation may establish a current technical fact without granting authority to redefine product intent or governance.

## Conflicting Knowledge

Conflicts must remain visible until they are sufficiently resolved.

Example:

```text
README: PostgreSQL
legacy ADR: Firebase
current runtime: Supabase / PostgreSQL
```

The framework should not resolve this merely by choosing whichever source was read last.

Instead it should consider:

- source authority,
- freshness,
- whether a source is explicitly superseded,
- whether the question concerns current implementation or intended architecture,
- accepted project decisions,
- and whether human clarification is necessary.

A conflict is a resolution state, not evidence that the entire subject is unknown. The framework may know the competing claims with high confidence while still lacking an authoritative resolution between them.

A resolved conflict should preserve the resulting authoritative knowledge and, where useful, enough history to avoid reintroducing superseded assumptions.

## Current Reality and Project Intent

Different questions may legitimately use different evidence authority.

For example:

- current deployed database technology may be established by runtime/configuration evidence,
- desired future database architecture may require a project decision,
- product positioning may require human or accepted product knowledge,
- a build tool may be directly established from repository configuration.

The framework should therefore avoid one universal evidence hierarchy for every knowledge category.

Authority belongs to the source appropriate to the disputed fact.

## Progressive Refinement Without Setup Lock-In

Initialization mode does not restrict future knowledge depth.

A project initialized with `Start Empty` may later become richly described through progressive work.

A project initialized with `Quick` may later use guided refinement for a specific area.

A `Guided` initialization may still contain unknowns that are deliberately deferred.

The Project Brain should evolve according to project reality rather than preserving the completeness level chosen during initial setup.

## Human Interaction Economy

The framework should optimize for useful continuity without turning ordinary development into continuous knowledge administration.

Avoid patterns such as:

```text
I discovered a minor implementation detail.
Should I save this to the Project Brain?
```

for every observation.

Prefer:

```text
Material ambiguity detected
→ resolve only when needed
→ preserve the durable result when it has ongoing project value
```

Human questions should be proportional to decision impact and information value.

## Relationship to Runtime Learning

Progressive initialization does not give Runtime learning authority to rewrite project truth autonomously.

Runtime experience may:

- discover new evidence,
- detect stale or conflicting knowledge,
- identify missing project context,
- propose refinements,
- surface recurring uncertainty.

It may not silently convert its own observations or repeated conclusions into accepted governance, architecture intent, or human-owned project decisions.

## Relationship to Existing-Project Discovery

Bootstrap Discovery establishes the first evidence set for an existing project.

Progressive initialization continues that reasoning model after bootstrap:

```text
Bootstrap Discovery
→ initial evidence and known unknowns

Progressive Initialization
→ task-driven refinement over project lifetime
```

The same preservation and mutation-safety principles continue to apply.

## Anti-Patterns

Avoid:

- requiring complete project knowledge before useful work can begin,
- filling unknown fields with plausible assumptions,
- collapsing coverage, confidence, conflict, and authority into one ambiguous status value,
- treating current implementation as automatic design intent,
- promoting repeated agent assumptions into durable truth,
- resolving conflicts by choosing the newest or most recently read source without ownership reasoning,
- forcing the human to approve storage of every minor observation,
- turning the Project Brain into an exhaustive event log or knowledge graph without demonstrated value,
- preserving initialization-mode limitations after richer knowledge becomes available,
- silently rewriting accepted project knowledge because a runtime observation differs.

## Core Principles

> **Incomplete project knowledge is valid and must remain explicit rather than being replaced with fabricated certainty.**

> **Knowledge coverage, evidence confidence, resolution state, and authority are separate concepts and must not be collapsed into one universal status.**

> **Progressive initialization deepens project knowledge when real work makes that knowledge relevant.**

> **Observed implementation reality is evidence, not automatic proof of desired project intent.**

> **Repetition is not authority. Durable project truth requires sufficient evidence and the appropriate owning source.**

> **Conflicts remain visible until resolved through authority, freshness, context, and evidence rather than convenience.**

> **Human attention should be spent on material ambiguity, not routine knowledge bookkeeping.**