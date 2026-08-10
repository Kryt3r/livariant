---
type: framework-layer-policy
status: accepted
domain: patterns
language: en
owner: framework
foundation: FOUNDATION-06A
---

# Reusable Patterns System

## Pattern Identity & Ownership Boundary

Patterns form the reusable intelligence layer between universal Core governance and project-specific implementation knowledge.

> Patterns are optional reusable intelligence, not implicit policy, project truth, or implementation mandates.

## What a pattern is

A pattern is a reusable package of product and architecture intelligence for a recurring problem space that appears across multiple projects or domains, but is not universal enough to belong in Core.

Typical examples include:

- authentication and OAuth,
- permissions and authorization models,
- notifications,
- messaging,
- payments,
- search,
- settings,
- dashboards,
- plugin systems.

A pattern may capture:

- the recurring problem it addresses,
- relevant forces and trade-offs,
- when it is applicable,
- when it is explicitly not applicable,
- important invariants,
- common architectural variants,
- characteristic risks and failure modes,
- decisions that must remain project-specific,
- typical verification concerns,
- reusable examples and evidence.

Patterns are not merely code recipes. Their purpose is to preserve reusable reasoning about a solution space.

## Layer ownership

The framework separates conceptual ownership as follows:

```text
Core
↓
universal rules, governance, reasoning and trust boundaries

Patterns
↓
optional reusable intelligence for recurring problem spaces

Profiles
↓
domain-specific specialization, invariants and quality/risk rules

Adapters
↓
translation into concrete tools, providers and execution environments

Project Brain
↓
project-specific decisions, intent, accepted state and durable knowledge
```

This layering describes conceptual ownership, not a universal authority ranking between every lower layer.

In particular, Patterns are not categorically authoritative over Profiles. A general reusable pattern must not override a valid domain-specific requirement merely because Patterns appear earlier in the conceptual stack.

## Core boundary

Core defines how the framework reasons and governs work.

Patterns provide reusable intelligence about recurring solution spaces.

A pattern may specialize or enrich reasoning within its problem space, but it may not:

- weaken or replace Core governance,
- redefine universal trust or authority rules,
- silently override framework-wide invariants,
- introduce hidden global policy.

If knowledge proves universal enough to govern the framework regardless of domain or problem space, it belongs in Core rather than Patterns.

## Patterns are not recipes

Patterns must not assume that one implementation is universally correct.

A healthy pattern describes a solution space, including alternatives, constraints and trade-offs, rather than presenting a single copy-paste blueprint as mandatory architecture.

For example, an authorization pattern may explain role-based, attribute-based and relationship-based approaches, their trade-offs and applicability. It must not claim that one of them is always correct for every project.

> Reusable intelligence should reduce repeated reasoning cost without replacing project reasoning.

## Optionality and activation

The mere existence of a pattern does not make it active project governance.

A pattern becomes relevant only when it is selected for current work based on its applicability and surrounding context.

Selection may depend on factors such as:

- the current problem matching the pattern's scope,
- applicability conditions being satisfied,
- anti-applicability conditions not being triggered,
- compatibility with applicable Core rules, Profiles and project decisions.

An available pattern that has not been selected remains discoverable intelligence, not active project truth.

## Pattern knowledge versus project truth

A pattern may describe valid architectural options, but a project's selection among those options becomes durable project knowledge only when the project adopts that choice through its normal decision and knowledge mechanisms.

Example:

```text
Permissions Pattern
→ presents RBAC as one valid approach

Project decision
→ adopts RBAC with hierarchical roles

Project Brain
→ records that project-specific accepted direction
```

The Project Brain is authoritative for the project's chosen direction. The pattern remains reusable source intelligence about the broader problem space.

A pattern therefore must not silently convert one of its examples or preferred variants into project truth.

## Pattern boundary with Profiles

Patterns and Profiles solve different problems.

A Pattern answers:

> How can this recurring problem class be approached well across multiple projects or domains?

A Profile answers:

> What does good, safe and domain-appropriate development require in this particular domain?

Example:

```text
Discord Profile
→ Discord-specific rules, risks and constraints

Permissions Pattern
→ reusable permission architecture intelligence
```

A Discord project may use the general Permissions Pattern while the Discord Profile contributes domain-specific requirements that influence selection, composition and verification.

Neither layer should silently impersonate the other.

## Ownership test

Knowledge belongs in Patterns when all of the following are broadly true:

- it addresses a recurring product or architecture problem,
- it is reusable across multiple projects or domains,
- it is not universally binding enough for Core,
- it is not specific enough to one domain for a Profile,
- it expresses reusable reasoning rather than one project's accepted choice,
- its use should remain optional and context-dependent.

If these conditions are not met, the knowledge should be placed in the layer that actually owns it.

## Core principles

> **Patterns are optional reusable intelligence, not implicit policy, project truth, or implementation mandates.**

> **Core defines how the framework reasons; Patterns provide reusable intelligence about recurring solution spaces.**

> **Reusable intelligence should reduce repeated reasoning cost without replacing project reasoning.**

> **A selected project choice becomes project truth through project decision and knowledge mechanisms, not merely because a Pattern contains it.**

> **Patterns and Profiles have distinct ownership boundaries and must not silently override or impersonate one another.**

## Pattern Contract

The Pattern Contract defines the minimum semantic content required for a reusable Pattern to be trustworthy and actionable without forcing every Pattern into unnecessary ceremony.

### Identity

Each Pattern must have a stable identity sufficient for reference and evolution, including:

- a stable name or identifier,
- a concise description,
- a version,
- and a lifecycle status.

### Problem Space

A Pattern must define the recurring problem it addresses and the outcome, capability, or architectural concern it is intended to support.

The scope must be precise enough to distinguish the Pattern from neighboring concerns.

### Applicability

A Pattern must explain when it is relevant and which meaningful conditions or prerequisites should normally be present before it is selected.

Applicability is contextual rather than automatic.

### Anti-Applicability

A Pattern must also explain when it should not be used.

Anti-applicability rules should identify situations where an apparently reasonable application would add harmful complexity, create unacceptable trade-offs, conflict with stronger constraints, or solve the wrong problem.

> A reusable recommendation is incomplete if it explains only when to use it and not when to avoid it.

### Forces & Trade-offs

A Pattern should expose the competing forces that materially shape the solution space.

Relevant forces may include, where applicable:

- complexity,
- cost,
- scalability,
- security,
- usability,
- maintainability,
- operability,
- portability,
- reliability,
- or reversibility.

Patterns should include only forces that materially affect the problem rather than filling generic checklists.

### Solution Space

A Pattern must describe the meaningful solution space rather than prescribe one universal implementation.

Depending on the problem, this may include:

- common architectural variants,
- meaningful differences between variants,
- selection criteria,
- conditional recommendations,
- reasonable defaults,
- and the limits of those defaults.

A Pattern may recommend strongly where evidence warrants it. Artificial neutrality is not required.

Strong recommendations must remain conditional on applicability, known trade-offs, and project-specific constraints.

### Pattern Invariants

A Pattern may define properties that must remain true when the Pattern is selected.

These invariants apply within the activated Pattern context and may not silently redefine Core governance.

### Failure Modes

A Pattern must capture important plausible failure modes, anti-patterns, and common misconceptions where they materially help prevent repeated mistakes.

Failure-mode knowledge is first-class reusable intelligence, not optional decoration.

### Composition Surface

A Pattern should identify relevant interaction surfaces with other recurring concerns or Pattern types where those interactions materially affect design or implementation.

This may include likely dependencies, shared resources, trust boundaries, ordering concerns, or known collision points.

The Pattern Contract exposes the composition surface; system-level composition and conflict handling are defined separately.

### Decision Surface

A Pattern must make clear which meaningful choices remain project decisions.

Reusable intelligence must not silently convert candidate approaches, vendors, architectures, policies, or product trade-offs into project truth.

### Verification Guidance

A Pattern should define typical verification concerns where useful, such as:

- functional tests,
- integration tests,
- abuse or adversarial cases,
- failure-path tests,
- security checks,
- performance checks,
- or operational validation.

Verification guidance must remain proportional to the Pattern and should not create ceremony without concrete value.

### Examples & Evidence

Patterns may use examples to explain the solution space, but examples are illustrative rather than automatically normative.

Where strong recommendations depend on external evidence, established practice, production experience, standards, or research, the Pattern should preserve enough provenance for the recommendation to be evaluated and updated later.

### Lifecycle Status

The baseline lifecycle states are:

```text
draft
↓
accepted
↓
deprecated
↓
retired
```

- `draft` means the Pattern is not yet accepted as framework reusable knowledge.
- `accepted` means it is approved for normal selection when applicable.
- `deprecated` means new use should generally be avoided unless there is a specific reason, while existing projects may still need compatibility or migration guidance.
- `retired` means the Pattern is no longer considered an active reusable Pattern and should only remain available where historical continuity requires it.

The baseline does not introduce a separate `experimental` lifecycle state. If future evidence shows a real semantic need distinct from `draft`, it may be added deliberately rather than preemptively.

### Proportionality

The Pattern Contract is semantic rather than bureaucratic.

A Pattern is not required to contain code samples, diagrams, ADRs, specific technologies, a fixed number of variants, generic pros-and-cons tables, or long theoretical background unless those elements materially improve the Pattern.

Small Patterns may remain small.

### Contract principle

> **Every Pattern must expose enough structured intelligence to determine what problem it addresses, when it applies, when it does not, what constraints matter, what solution space exists, and what project decisions remain unresolved.**

## Pattern Discovery & Selection

Pattern discovery and Pattern selection are deliberately separate operations.

Discovery identifies potentially useful reusable intelligence. Selection activates a Pattern for a defined scope only after its relevance and compatibility have been evaluated.

> Pattern discovery identifies potentially useful intelligence; Pattern selection deliberately activates only the smallest materially relevant and compatible set.

### Discovery is not selection

A discovered Pattern is a candidate, not active project policy or architecture.

Discovery must not by itself:

- activate Pattern invariants,
- establish project truth,
- force architectural choices,
- or expand task scope.

Selection requires a deliberate applicability and compatibility evaluation.

### Problem-oriented discovery

Discovery should primarily reason from the problem space, required capabilities, and affected architecture rather than from keyword association alone.

For example:

```text
Task requires payment collection
→ Payments Pattern candidate

Task introduces user roles
→ Permissions Pattern candidate

Task adds third-party sign-in
→ Authentication / OAuth Pattern candidate
```

Technology names may strengthen discovery signals, but must not be the sole basis for selecting architecture intelligence.

> Pattern matching must never become architecture by keyword association.

### Discovery sources

Candidate Patterns may be discovered from relevant signals including:

- explicit human or project references,
- task intent,
- required capabilities,
- affected systems,
- current project architecture,
- active Profiles,
- already selected Patterns,
- known risks or failure modes,
- accepted Project Brain decisions and constraints.

A selected Pattern may reveal another potentially relevant Pattern through its composition surface, but that relationship creates only a new discovery candidate, not automatic activation.

### Minimum relevant candidate set

Discovery should identify the smallest set of Patterns that may materially improve reasoning for the current work.

It should not attempt to enumerate every theoretically related Pattern.

This preserves the Core principle of minimum sufficient context and prevents the Patterns layer from becoming another context dump.

> Discover the smallest materially relevant Pattern set, not every theoretically related Pattern.

### Selection gate

Before a candidate Pattern is selected, the runtime should evaluate, proportionally to the task:

```text
Does the problem match the Pattern scope?
↓
Are meaningful applicability conditions satisfied?
↓
Is an anti-applicability condition triggered?
↓
Is the Pattern compatible with applicable Core governance?
↓
Is it compatible with active Profiles?
↓
Is it compatible with accepted project decisions and constraints?
↓
Would loading and applying it materially improve this task?
```

Only then should the Pattern become active for the relevant scope.

A Pattern may be technically applicable yet still not be worth activating when its additional reasoning would add more overhead than value.

### Selection outcomes

Candidate evaluation may result in:

- `selected` — the Pattern is materially relevant and active for the defined scope,
- `rejected` — the Pattern was considered and should not be applied in the current context,
- `deferred` — the Pattern may become relevant later, but the present task does not yet require the decision or intelligence.

`deferred` exists to prevent premature architecture and unnecessary commitment.

### Rejection knowledge

Pattern rejection does not automatically require durable documentation.

A rejection should be preserved as task or project knowledge when its rationale is materially valuable, for example when it:

- is non-obvious,
- is likely to be reconsidered repeatedly,
- represents a meaningful architectural decision,
- or prevents a known recurring failure mode.

Example:

```text
Plugin System Pattern discovered
→ rejected

Reason:
No current extension boundary or foreseeable extensibility need exists.
A plugin architecture would create speculative abstraction.
```

### Selection scope

Pattern selection is scope-bound.

A selected Pattern may apply to:

- the current task,
- a feature,
- a subsystem,
- or the project as a whole when intentionally adopted at that level.

Local selection must not silently become global project policy.

### Human-directed selection

A human may explicitly request that a Pattern be used or considered.

Such a request is a strong selection signal, but it does not remove applicability checks or constructive dissent.

If the requested Pattern materially conflicts with Core governance, active Profile requirements, accepted project constraints, or clear anti-applicability conditions, the system should explain the concern and escalate the decision according to existing authority rules rather than apply the Pattern blindly.

Valid human authority remains respected within applicable governance boundaries.

### No mandatory Pattern command ceremony

The framework should be capable of discovering and selecting relevant Patterns during ordinary work without requiring users to know Pattern identifiers or issue explicit Pattern commands.

Future human-interface commands may support inspection, explicit selection, rejection, or debugging, but those interfaces must not be prerequisites for intelligent Pattern use.

### Conceptual discovery and selection flow

```text
Task / Project Context
↓
Problem & Capability Recognition
↓
Candidate Pattern Discovery
↓
Minimum Relevant Candidate Set
↓
Applicability / Anti-Applicability Evaluation
↓
Core + Profile + Project Compatibility
↓
Material Value Check
↓
selected | rejected | deferred
↓
Load selected Pattern intelligence
↓
Apply only within selected scope
```

### Discovery and selection principles

> **Pattern discovery identifies potentially useful intelligence; Pattern selection deliberately activates only the smallest materially relevant and compatible set.**

> **Discovery does not establish project truth or activate Pattern policy.**

> **Pattern matching must never become architecture by keyword association.**

> **Discover the smallest materially relevant Pattern set, not every theoretically related Pattern.**

> **Pattern selection is scope-bound and local selection must not silently become global policy.**

> **Human-directed Pattern use remains subject to applicable governance and constructive dissent rather than blind execution.**
