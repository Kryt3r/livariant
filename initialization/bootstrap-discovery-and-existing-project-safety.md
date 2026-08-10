---
type: framework-layer-policy
status: accepted
domain: initialization
language: en
owner: framework
foundation: FOUNDATION-09A
---

# Bootstrap Discovery & Existing-Project Safety

Initialization begins with discovery, not generation.

> **Initialization begins with discovery, not generation. Existing projects are inspected read-only first so the framework can distinguish known reality, inference, uncertainty, and human intent before creating or changing project state.**

## Purpose

The initialization layer exists to make the Project Brain Framework usable on both new and existing projects without treating installation as permission to rewrite project state.

Before creating Project Brain artifacts, activating Profiles, generating native instructions, or proposing structural changes, the framework must first understand enough of the current project to initialize safely.

The goal is not exhaustive repository understanding. The goal is sufficient, evidence-based understanding to avoid destructive assumptions and to present useful initialization choices to the human owner.

## Read-Only Bootstrap Principle

For existing projects, the default first phase of initialization is read-only.

Bootstrap Discovery may inspect relevant repository and environment state, but it must not silently:

- create Project Brain files,
- modify source code,
- rewrite documentation,
- update dependencies,
- activate durable project decisions,
- replace native instruction files,
- refactor project structure,
- or otherwise mutate durable project state.

Any later write remains governed by `core/project-mutation-safety-and-change-authority.md` and the applicable Runtime authority model.

## Project-State Detection

Bootstrap Discovery should first determine the broad state of the target workspace.

Relevant states include:

- empty or effectively new project,
- existing project without Project Brain state,
- existing project with partial Project Brain state,
- existing project with already initialized framework state,
- ambiguous or mixed workspace requiring further inspection.

This classification guides initialization depth but does not itself grant authority to change anything.

## Repository Discovery

For an existing project, discovery may inspect evidence such as:

- repository structure,
- source directories,
- manifests and package metadata,
- build configuration,
- test configuration,
- deployment configuration,
- database or infrastructure files,
- documentation,
- architecture notes or ADRs,
- existing Project Brain artifacts,
- native agent instructions such as `CLAUDE.md`, `AGENTS.md`, or equivalents,
- version-control metadata relevant to project state,
- and environment integration metadata exposed through conformant Adapters.

Discovery should prioritize high-signal sources instead of crawling every file by default.

## Technical Stack Discovery

The framework may infer technical stack facts from concrete evidence.

Examples include:

- programming languages,
- frameworks,
- package managers,
- build systems,
- test systems,
- databases,
- hosting or deployment targets,
- infrastructure tooling,
- relevant runtime environments,
- major platform integrations.

Technical detection should preserve the distinction between evidence and project intent.

For example:

```text
Evidence:
package.json contains next

Conclusion:
Next.js is part of the current implementation stack
```

is materially stronger than:

```text
Evidence:
Next.js dependency exists

Conclusion:
this product is a SaaS platform
```

The latter is a product/domain inference and requires additional evidence or human confirmation.

## Existing Project Knowledge Discovery

Bootstrap Discovery should identify durable project knowledge that may already exist outside the Project Brain.

Useful sources may include:

- README files,
- ADRs,
- product or architecture documents,
- issue templates or contribution guidance,
- native agent instruction files,
- deployment/runbooks,
- security documentation,
- design documentation,
- test conventions,
- naming or workflow conventions.

Existing documentation is evidence, not automatically canonical Project Brain truth.

Conflicts between sources should remain visible and be resolved through later initialization or human interaction rather than silently flattened.

## Evidence Confidence

Discovery results should distinguish confidence and provenance rather than presenting every inference as fact.

Recommended baseline states:

- `confirmed` — directly supported by authoritative or strongly concrete evidence,
- `strongly_inferred` — multiple or high-quality signals support the conclusion but it has not been explicitly declared,
- `uncertain` — evidence exists but is incomplete, conflicting, or weak,
- `unknown` — reliable evidence is not available.

Confidence is contextual. A dependency manifest can confirm a framework is installed while still being insufficient to confirm that the project actively depends on it in production.

Where material decisions depend on uncertain information, the uncertainty must flow into the human interface or later discovery instead of being hidden.

## Existing Project Is Not a Defect

The presence of pre-existing architecture, conventions, dependencies, documentation, or unusual structure must not be treated as evidence that the project needs cleanup.

Discovery may identify:

- inconsistencies,
- possible technical debt,
- outdated dependencies,
- duplicated configuration,
- suspicious architecture,
- missing documentation,
- potential security concerns.

Those findings may become proposals or later tasks, but discovery alone does not authorize remediation.

> **Inspection is not implicit permission to refactor.**

## Scope and Proportionality

Bootstrap Discovery must remain proportional.

It should gather enough information to support safe initialization without turning `pb init` into a full architecture, security, or quality audit.

A useful default progression is:

```text
high-signal repository inspection
→ stack and structure discovery
→ existing knowledge discovery
→ project-type signals
→ uncertainty identification
→ human-facing initialization choices
```

Deeper analysis should be triggered only when:

- ambiguity materially blocks initialization,
- a high-risk project surface requires stronger evidence,
- the human requests deeper analysis,
- or Progressive Initialization later encounters relevant work.

## Discovery Output

Bootstrap Discovery should be able to produce a structured, non-canonical discovery result containing, where relevant:

- detected project state,
- confirmed stack facts,
- candidate project/domain types,
- existing knowledge sources,
- existing framework/native instruction artifacts,
- conflicts or ambiguity,
- confidence states,
- important unknowns,
- safety-relevant observations,
- and suggested next initialization questions or modes.

Example:

```text
Project state:
existing project / no Project Brain detected

Confirmed:
- Next.js
- TypeScript
- Supabase client dependency
- GitHub repository
- existing CLAUDE.md

Strongly inferred:
- web application

Uncertain:
- SaaS / multi-tenant product model
- production deployment target

Unknown:
- long-term product goals
- intended permission model

Mutation status:
none
```

This discovery result informs initialization. It does not itself become durable project truth until relevant information is accepted or confirmed through normal Project Brain mechanisms.

## Project Brain Boundary

Bootstrap Discovery observes current reality and gathers evidence.

It does not automatically promote every detected fact or inference into canonical Project Brain state.

Durable project knowledge should enter the Project Brain through explicit initialization, human confirmation where required, or established acceptance mechanisms.

This prevents transient environment details, stale documentation, accidental dependencies, and uncertain inference from becoming permanent project truth merely because they were detected during setup.

## Profile and Pattern Boundary

Discovery may produce Profile or Pattern candidates where evidence suggests relevance.

It must not silently activate them solely from labels, dependencies, or tool presence.

For example:

```text
Detected:
Discord SDK dependency

Allowed:
Discord Platform Profile candidate

Not allowed:
Discord Platform Profile automatically becomes active project truth
```

Profile and Pattern activation/selection remain governed by their existing contracts.

## Failure Behavior

If discovery cannot reliably establish important initialization facts, the framework should preserve the ambiguity.

It may:

- ask the human a focused question,
- continue with a lower-assumption initialization mode,
- defer the unknown to Progressive Initialization,
- or stop if proceeding would create material project risk.

It must not invent plausible answers merely to complete initialization.

## Anti-Patterns

Avoid:

- creating framework files before inspecting an existing project,
- treating repository write access as permission to initialize destructively,
- assuming project type from one dependency or keyword,
- running a full repository audit when a smaller discovery pass is sufficient,
- interpreting unusual project structure as automatic technical debt,
- rewriting existing docs or instructions during discovery,
- silently activating Profiles from detected technologies,
- promoting uncertain inference directly into canonical Project Brain state,
- hiding uncertainty to make initialization appear more complete.

## Core Principles

> **Initialization begins with discovery, not generation.**

> **Existing projects are inspected read-only before durable initialization changes are proposed or applied.**

> **Discovery distinguishes confirmed reality, inference, uncertainty, and unknowns instead of manufacturing certainty.**

> **Existing project structure is evidence to understand, not a defect to repair by default.**

> **Discovery gathers enough evidence for safe initialization; it is not a mandatory full-project audit.**
