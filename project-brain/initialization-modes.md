---
type: framework-layer-policy
status: accepted
domain: project-brain
language: en
owner: framework
foundation: FOUNDATION-09C
---

# Initialization Modes

The Project Brain Framework supports multiple initialization modes so users can choose how much project knowledge is established up front without changing the framework's safety, truthfulness, or ownership rules.

> **Initialization modes control how much project knowledge is established up front, not how safely or truthfully the framework behaves. Every mode preserves discovery, uncertainty, human ownership, and progressive refinement.**

## Shared Baseline

All initialization modes share the same mandatory baseline:

1. Bootstrap Discovery runs first for existing projects.
2. Existing project state is inspected before persistent project mutations are proposed.
3. Known facts remain distinguishable from inference, uncertainty, and unknowns.
4. Existing project artifacts are preserved by default.
5. Project Brain creation remains within an explicit authorized scope.
6. Profile activation, Adapter integration, and native instruction-file changes remain separate decisions governed by their own contracts.

A faster mode is never a lower-safety mode.

## Guided Initialization

Guided initialization is designed for users who want to establish a stronger initial Project Brain with explicit human input.

The Framework should combine discovery evidence with adaptive questioning instead of asking a fixed questionnaire.

Conceptually:

```text
Bootstrap Discovery
→ reuse confirmed project evidence
→ identify material knowledge gaps
→ ask only high-value questions
→ structure answers as project knowledge
→ preview resulting Project Brain
→ authorize persistent creation
```

Guided initialization may establish areas such as:

- product or project purpose,
- intended users or stakeholders,
- current goals,
- project type declarations,
- important constraints,
- existing architectural or product decisions,
- protected properties,
- known risks,
- intentionally unknown or deferred areas.

The Framework should not ask the human to restate facts that the repository already establishes reliably.

Guided initialization is adaptive rather than exhaustive. The goal is the smallest set of questions that materially improves the initial Project Brain.

## Quick Initialization

Quick initialization maximizes use of existing evidence and asks only for the most consequential missing human decisions.

For example:

```text
Detected:
- Next.js
- Supabase
- Discord integration

Need from human:
- primary product identity
- current goal
- critical constraints that must be preserved
```

The resulting Project Brain may be intentionally sparse.

Quick mode should prefer:

- confirmed repository evidence,
- authoritative existing documentation,
- previously declared project identity,
- a small number of high-value questions,
- explicit unknowns instead of guessed defaults.

Quick initialization is expected to be suitable as a common default because it gets the Framework operational quickly without pretending to know more than the available evidence supports.

## Start Empty

`Start Empty` means that the Framework creates only the minimum Project Brain structure needed to operate while leaving optional project knowledge unknown or absent.

It does **not** mean that an existing repository is ignored.

For an existing project, Bootstrap Discovery still runs and may establish observed facts such as:

```text
Observed stack: known
Product vision: unknown
Architecture intent: unknown
Current goals: unknown
```

The Framework must preserve this distinction rather than inventing project intent to make the Project Brain appear complete.

Start Empty is especially useful when:

- the project is still exploratory,
- the user wants to begin working immediately,
- product decisions are intentionally unresolved,
- the Framework is being introduced gradually into an existing project.

## Mode Changes

Initialization mode is a starting-depth choice, not a permanent project mode.

A project initialized with `Start Empty` may later enter guided enrichment.

A project initialized with `Quick` may deepen one knowledge area without repeating initialization.

A project initialized with `Guided` may still contain unknown or intentionally deferred knowledge.

The Project Brain therefore evolves progressively rather than depending on a one-time setup interview.

## Progressive Enrichment

Initialization should establish the smallest useful durable baseline and allow project knowledge to deepen during real work.

Useful later enrichment triggers may include:

- a decision becoming necessary,
- repeated uncertainty affecting work,
- newly discovered project evidence,
- a newly relevant Profile,
- an architectural change,
- a user explicitly adding or correcting project knowledge.

The detailed rules for progressive initialization and partial knowledge are defined separately in FOUNDATION-09.

## Preview Before Persistent Creation

Before creating Project Brain artifacts in an existing project, the Framework should provide a concise preview proportional to impact.

A preview may show:

```text
Project Brain initialization will create:
- project identity
- known technical context
- current goals
- declared unknowns
- active Profile references
- framework metadata

Existing project files modified:
none

Native agent integration:
not yet / proposed separately
```

The preview should make clear:

- what will be created,
- what existing artifacts will be changed, if any,
- which information is confirmed versus inferred,
- which meaningful areas remain unknown,
- whether additional integration is being proposed separately.

This follows the Core project mutation safety rules.

## Existing Native Instructions

Initialization must not silently replace or restructure existing `CLAUDE.md`, `AGENTS.md`, or equivalent project instructions.

Native agent integration remains an Adapter-backed follow-up operation unless the user has explicitly authorized it as part of the current initialization scope.

Project Brain initialization and provider-native instruction integration are therefore separate operations even when presented through one human-facing flow.

## Truthfulness Across Modes

No initialization mode may manufacture completeness.

If evidence is insufficient, the state remains uncertain or unknown.

For example:

```text
Wrong:
Start Empty + Stripe dependency
→ assume SaaS billing model

Correct:
Stripe dependency observed
→ payment-related capability exists
→ product/business meaning remains unknown unless established elsewhere
```

Likewise, Quick mode must not convert plausible inference into durable project truth merely to avoid asking the user a question.

## Safety Across Modes

All modes preserve the same safety properties:

- discovery before mutation,
- no silent project restructuring,
- capability is not authority,
- existing project artifacts are preserved by default,
- material Project Brain creation remains explainable,
- uncertain knowledge remains uncertain,
- unresolved conflicts remain visible,
- generated project knowledge remains traceable to its source or declaration where appropriate.

## Interaction Design Principle

The initialization experience should minimize friction without hiding important decisions.

Avoid:

- fixed 30- or 40-question setup wizards,
- requiring users to understand the framework's internal Markdown structure,
- asking questions already answered reliably by repository evidence,
- treating every project as if it needs enterprise-scale setup,
- forcing project type, architecture, or product identity prematurely,
- generating a large Project Brain merely to make initialization look complete.

Prefer:

```text
discovery first
→ smallest useful initialization
→ start real work
→ enrich when new knowledge matters
```

## Core Principles

> **Initialization modes control depth, not truthfulness or safety.**

> **Discovery remains mandatory for existing projects regardless of mode.**

> **The Framework should ask humans only for knowledge that materially improves the Project Brain and cannot already be established reliably.**

> **Unknown project knowledge is a valid state and must not be replaced with guessed defaults.**

> **Initialization creates a durable starting point; project understanding continues to evolve during real work.**
