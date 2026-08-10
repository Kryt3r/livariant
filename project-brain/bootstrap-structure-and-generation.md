---
type: framework-layer-policy
status: accepted
domain: project-brain
language: en
owner: framework
foundation: FOUNDATION-09E
---

# Project Brain Bootstrap Structure & Generation

Project Brain bootstrap creates the smallest durable canonical knowledge structure that can safely orient future work. It records established project truth and explicit unknowns without converting conventions, guesses, or recommendations into project facts.

> **Project Brain bootstrap creates the smallest durable canonical knowledge structure that can safely orient future work. It records established project truth and explicit unknowns without converting conventions, guesses, or recommendations into project facts.**

## Purpose

Bootstrap turns accepted initialization knowledge into a persistent Project Brain.

Its goal is not to model every possible project fact up front. Its goal is to establish enough canonical structure that future agents and humans can resume work with reliable project identity, current intent, relevant constraints, and visible uncertainty.

## Minimum Semantic Areas

A bootstrap should be capable of representing at least the following knowledge areas:

### Project Identity

May include:

- project name,
- short description,
- declared project type or types,
- relevant active Profiles,
- stable subsystem identity where materially relevant.

### Vision & Product Intent

May include:

- what is being built,
- who it is for,
- what problem or outcome matters,
- important product intent already established by the human or authoritative project knowledge.

### Current Goals

May include:

- current focus,
- near-term goals,
- active milestones or next meaningful outcomes.

Current goals are project knowledge, not universal framework policy.

### Technical Context

May include:

- confirmed stack and languages,
- major systems and integrations,
- known runtime or deployment environments,
- repository or subsystem boundaries,
- other technical context required for safe orientation.

### Decisions

May include accepted product, architecture, security, workflow, or implementation decisions that materially shape future work.

Bootstrap should record only decisions supported by sufficient authority or accepted project evidence.

### Constraints & Protected Properties

May include project-specific constraints, must-preserve behaviors, protected properties, or boundaries that future work must not silently violate.

These do not replace Core security or governance rules. They specialize project-specific reality.

### Known Unknowns

Relevant missing knowledge should be explicit rather than filled with plausible defaults.

Examples:

- tenancy intent unknown,
- deployment target unknown,
- role model partially known,
- product audience unresolved.

Unknowns are valid Project Brain state.

### Knowledge Provenance & Confidence

Where interpretation depends on certainty or source authority, Project Brain knowledge should retain enough provenance or confidence information to distinguish:

- human declaration,
- authoritative project documentation,
- repository evidence,
- runtime observation,
- inference,
- unresolved conflict.

Not every trivial fact requires verbose provenance metadata.

### Framework Metadata

Bootstrap should retain the minimum metadata needed to identify and maintain the Project Brain, such as:

- Project Brain schema or format version,
- relevant framework compatibility metadata,
- active Profile references,
- selected Pattern references where already accepted,
- applicable Adapter or environment references where durable and useful.

Distribution and migration mechanics remain primarily FOUNDATION-10 concerns.

## Small Physical Structure, Rich Semantic Structure

Semantic completeness does not require one file per knowledge category.

A small project might begin with a compact structure such as:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.yml
```

This is illustrative, not a mandatory immutable layout.

A larger project may later split knowledge into additional files or scoped areas when scale, ownership, or retrieval quality justifies it.

The framework should avoid generating large empty directory trees merely to mirror every conceptual category.

> **The semantic contract matters more than the number of files.**

## Generation Inputs

Bootstrap generation may use:

- confirmed human input,
- sufficiently authoritative repository evidence,
- accepted Project-Type declarations,
- accepted Profile activation results,
- selected Pattern decisions already established by normal Pattern semantics,
- explicit known unknowns,
- durable project knowledge discovered during initialization.

It must not silently promote generic conventions, recommendations, likely defaults, or provider-specific assumptions into project truth.

For example:

```text
Detected: Next.js
```

may establish technical context when evidence is strong.

It must not automatically establish:

```text
Architecture decision: use server actions everywhere
Product identity: SaaS
Deployment target: Vercel
```

unless those claims have separate sufficient evidence or human confirmation.

## Bootstrap Preview

Before creating or materially changing persistent Project Brain state, the human should be able to understand the intended mutation at a level proportional to impact.

For a normal first bootstrap, the preview may summarize:

```text
Will create:
- Project Brain project identity
- current goals
- decisions store
- knowledge / unknowns
- framework metadata

Will modify existing project files:
- none

Knowledge sources:
- README.md
- package metadata
- confirmed human answers

Retained unknowns:
- tenancy model
- deployment target
```

The exact UI is not defined here. The semantic requirement is that initialization remain transparent and scope-bound under Core project-mutation safety rules.

## Existing Project Brain Detection

`pb init` must not treat an existing Project Brain as if the project were uninitialized.

If an existing Project Brain is detected, the framework should determine whether the appropriate next action is instead:

- resume existing work,
- inspect health or drift,
- reconcile project knowledge,
- migrate or update framework metadata,
- repair a damaged bootstrap,
- or explicitly reinitialize only when the human deliberately requests and authorizes it.

Normal initialization must not silently replace an existing canonical Project Brain.

## Bootstrap and Existing Project Files

Project Brain creation should be scoped so that creating canonical knowledge does not imply permission to rewrite unrelated repository artifacts.

Native agent instruction integration, for example, is a separate Adapter-mediated mutation governed by existing instruction-file and project-mutation policies.

A bootstrap may propose such integration, but it must not hide it inside Project Brain creation.

## Determinism and Repeatability

Given the same accepted initialization inputs, applicable framework semantics, and Project Brain schema, bootstrap generation should be semantically stable.

Wording or formatting may evolve, but generation must not introduce new project assumptions simply because a different model performed the bootstrap.

This supports provider independence and reduces initialization drift.

## Minimal Useful Completion

Bootstrap is complete when the resulting Project Brain can safely orient future work with enough information to answer, at least at a useful initial level:

- what project this is,
- what the project is currently trying to achieve,
- what important facts and decisions are already established,
- what constraints or protected properties matter,
- what technical context is known,
- what remains materially unknown,
- which reusable domain or solution intelligence is active where relevant.

It does not need to encode every future architecture decision or operational detail.

## Progressive Enrichment

Bootstrap is the first accepted Project Brain state, not the final one.

Later work may enrich or refine it through FOUNDATION-09 progressive initialization semantics.

A sparse but truthful Project Brain is preferable to a detailed Project Brain filled with guessed intent.

## Anti-Patterns

Avoid:

- generating dozens of empty files because conceptual categories exist,
- treating a generated template as project truth,
- converting common stack conventions into accepted architecture decisions,
- inventing values to make the Project Brain appear complete,
- modifying existing `CLAUDE.md`, `AGENTS.md`, code, configuration, or architecture merely because bootstrap is running,
- overwriting an existing Project Brain on repeated `pb init`,
- requiring perfect project knowledge before allowing initialization,
- hiding unknowns instead of representing them explicitly,
- allowing different providers to create materially different project assumptions from the same accepted inputs.

## Core Principles

> **Project Brain bootstrap creates the smallest durable canonical knowledge structure that can safely orient future work.**

> **Established project truth and explicit unknowns are stored; conventions, guesses, and recommendations are not silently promoted into facts.**

> **Semantic structure is required; excessive file structure is not.**

> **Existing Project Brain state is preserved by default rather than silently reinitialized.**

> **Bootstrap is a starting point for progressive project understanding, not a claim of complete knowledge.**
