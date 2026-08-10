---
type: framework-layer-policy
status: accepted
domain: adapters
language: en
owner: framework
foundation: FOUNDATION-08E
---

# Native Instruction Files & Environment Translation

Native instruction files are environment-specific projections of canonical framework and project knowledge. They optimize delivery for a concrete agent environment without becoming a competing source of truth.

> **Native instruction files are environment-specific projections of canonical framework and project knowledge; they optimize delivery without becoming a competing source of truth.**

## Projection Model

Conceptually:

```text
Core / Patterns / Profiles / Project Brain
→ canonical framework and project knowledge

Adapter
→ selects and translates environment-relevant semantics

Native instruction surface
→ CLAUDE.md, AGENTS.md, environment-specific instructions or equivalent
```

An Adapter may optimize wording, structure, ordering, compression, and environment-specific syntax, but it must preserve the meaning and authority of the underlying canonical sources.

## Supported Native Surfaces

An Adapter may describe:

- which native instruction files or surfaces the target environment supports,
- file naming and location rules,
- precedence or scope behavior,
- size or context constraints,
- supported include/import mechanisms,
- managed-section conventions where safe,
- and environment-specific compatibility concerns.

Provider or environment conventions remain Adapter knowledge rather than universal Core truth.

## Existing Files Are Preserved by Default

If a target instruction file already exists, the Adapter must not assume it may replace or regenerate it.

Existing `CLAUDE.md`, `AGENTS.md`, or equivalent files are treated as existing project artifacts and are presumed human- or project-owned unless explicit evidence says otherwise.

The preferred flow is:

```text
Existing instruction artifact detected
→ read and understand existing content
→ identify ownership, overlap, conflicts and unique project knowledge
→ propose an integration strategy
→ remain within authorized change scope
→ mutate only when permitted
→ verify that existing meaning was not unintentionally lost
```

A framework install or activation must not silently overwrite an existing instruction file.

## Integration Outcomes

Depending on environment support and project intent, a pre-existing native instruction file may be:

- preserved unchanged,
- adopted as human-owned project instruction content,
- augmented with a clearly bounded framework-managed section,
- merged with a generated projection while preserving human-owned semantics,
- used as evidence to migrate durable project knowledge into the Project Brain before generating a new projection,
- or deliberately left unmanaged.

The Adapter must not force one integration strategy when multiple safe options exist.

## Ownership Modes

Instruction content should distinguish ownership where relevant:

- `human-owned` — authored or controlled by the project/human; framework must not silently rewrite it,
- `framework-generated` — fully generated projection where the file or artifact has explicitly been assigned to framework management,
- `managed-section` — a clearly bounded framework-owned region inside an otherwise human-owned file.

Ownership must be understandable and recoverable. Ambiguous ownership should default toward preservation rather than replacement.

## Managed Sections

A managed section is acceptable only when the target format can support a stable and understandable boundary.

A managed section should:

- use clear markers where the file format permits them,
- avoid swallowing surrounding human content,
- be regenerated only from canonical sources,
- preserve unrelated human-owned sections byte-for-byte where practical,
- and fail safely if markers are corrupted, duplicated, or ambiguous.

If safe bounded editing cannot be established, the Adapter should prefer a proposed/manual merge or separate generated artifact rather than risky replacement.

## Importing Existing Project Knowledge

Existing native instruction files may contain valuable durable project knowledge.

The framework may analyze that content and propose moving relevant durable knowledge into the canonical Project Brain, but importing knowledge is not equivalent to deleting or rewriting the source file.

Potential imports should preserve:

- human intent,
- project-specific constraints,
- architecture decisions,
- workflow conventions,
- known risks,
- and other non-obvious durable context.

Conflicts with existing canonical knowledge must be surfaced rather than silently resolved.

## Relevance and Compression

Native instruction files should contain the smallest useful environment-specific projection rather than a dump of the entire framework.

Durable native project instructions should select information according to:

- environment relevance,
- stable project scope and conventions,
- authority semantics that remain valid across sessions,
- risk and protected properties,
- and context-budget constraints.

Compression may simplify presentation but must not weaken or reinterpret binding semantics.

### Durable instructions must not become Runtime state

Persistent project instruction artifacts such as repository-level `CLAUDE.md` or `AGENTS.md` must not be used to store transient task, session, handoff, or temporary authorization state merely because that information is relevant to the current execution.

Examples of state that should remain in the canonical Runtime / handoff surface rather than durable project instructions include:

- the current task identity,
- one-session read-only or write authorization,
- temporary effect ceilings,
- current execution progress,
- temporary blockers,
- provider job or session identifiers,
- task-local acceptance state.

Otherwise a completed or abandoned task could leave stale instructions that influence future sessions and create a competing source of runtime truth.

If an environment supports an explicitly ephemeral or task-scoped instruction surface, the Adapter may project transient execution context there, provided its lifecycle and authority remain bound to the canonical Runtime state.

> **Durable instruction files project durable knowledge; transient execution state stays transient.**

## Drift Handling

Native instruction drift occurs when a generated or managed projection no longer represents applicable canonical framework or project knowledge.

Drift handling should follow:

```text
Drift detected
→ identify authoritative canonical source
→ classify whether drift is framework-managed or human-owned
→ explain material difference where needed
→ repair only within authorized ownership and change scope
```

Human edits to a human-owned file are not automatically "drift" to be erased.

If a human changes framework-managed content manually, the framework should detect the divergence and resolve ownership/intent rather than silently overwrite the edit on the next run.

## Change Preview and Transparency

For existing projects, creating, replacing, merging, or materially restructuring a native instruction file is a project mutation and is governed by `core/project-mutation-safety-and-change-authority.md`.

Before a material mutation, the framework should make the intended operation understandable, including where relevant:

- whether a new file will be created,
- whether an existing file will be edited,
- which sections are framework-managed,
- what existing content will remain,
- what content is being imported or translated,
- and whether any conflicts require human choice.

A previously authorized bounded task may cover a clearly implied instruction-file change, but Adapter convenience never grants unrelated rewrite authority.

## Failure Safety

If safe integration cannot be established, the Adapter must not guess by overwriting.

Examples of unsafe conditions include:

- ambiguous managed-section boundaries,
- conflicting duplicate instruction files with unclear precedence,
- unknown ownership of significant existing content,
- translation that would discard meaningful instructions,
- or an environment rule that cannot be represented without changing project semantics.

In those cases, preserve existing artifacts and surface the limitation or proposed change.

## Source-of-Truth Boundary

Native instruction files may be operationally important to an environment, but they do not outrank canonical framework or accepted Project Brain knowledge merely because an agent reads them first.

If a native projection conflicts with its canonical source:

- the conflict must be surfaced,
- current project reality must still be inspected where relevant,
- the authoritative layer remains authoritative,
- and the projection should be repaired rather than silently redefining project truth.

## Anti-Patterns

Avoid:

- overwriting an existing `CLAUDE.md` or `AGENTS.md` during framework setup,
- treating all pre-existing instruction content as obsolete,
- copying the full framework into every native instruction file,
- persisting current task/session/temporary authority state into durable project instructions,
- allowing generated projections to become independent governance,
- erasing human edits because they differ from a template,
- merging instruction files without preserving unique project knowledge,
- ambiguous managed-section ownership,
- using environment precedence rules to override framework authority,
- silently changing native instructions outside the authorized project mutation scope.

## Core Principles

> **Native instruction files are projections, not competing sources of truth.**

> **Existing project instruction artifacts are preserved by default.**

> **Human-owned content must never be silently overwritten by framework generation.**

> **Durable instruction files project durable knowledge; transient execution state stays transient.**

> **Adapters may compress and translate semantics for an environment, but must not weaken or reinterpret them.**

> **Instruction-file mutations follow the same transparent, scope-bound change-authority rules as any other existing-project mutation.**
