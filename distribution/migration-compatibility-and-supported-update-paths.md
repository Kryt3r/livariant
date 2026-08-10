---
type: framework-lifecycle-policy
status: accepted
domain: distribution
language: en
owner: framework
foundation: FOUNDATION-10D
---

# Migration Compatibility & Supported Update Paths

Framework migrations are explicit, directional compatibility contracts. They must preserve project-owned knowledge, declare their effects, validate expected source state, and stop when ambiguity makes safe continuation uncertain.

> **Migrations are structured state transitions, not file replacement.**

## Migration Contract

Each migration must identify at least:

- a stable migration identifier,
- supported source version or version range,
- target framework version or state,
- relevant Project Brain schema source and target where applicable,
- migration effects,
- preconditions,
- postconditions,
- verification requirements,
- known breaking changes or manual actions.

Illustrative metadata:

```yaml
id: migrate-0.2-to-0.3
from: ">=0.2.0 <0.3.0"
to: "0.3.0"
```

The exact storage format may evolve, but the semantic contract is required.

## Release Version and Schema Version Are Separate

Framework release identity and Project Brain schema identity are separate dimensions.

A framework release may change without requiring a Project Brain schema migration. Conversely, a framework release may require a schema transition.

Example:

```text
Framework: 0.3.0 -> 0.4.0
Project Brain schema: 2 -> 3
```

The framework must not invent schema migrations merely because a release version changed.

## Migration Effect Classes

Migrations should declare the durable surfaces they may affect.

Useful baseline classes include:

- `framework-only` — changes framework-owned release artifacts,
- `project-brain` — transforms canonical Project Brain structure or metadata,
- `projection` — regenerates or updates derived integration surfaces,
- `project-impacting` — requires changes to project-owned artifacts or behavior.

These classes do not replace scope-specific impact analysis or authority.

A `project-impacting` migration must not silently write project-owned state merely because the framework technically can do so.

## Compatibility Outcomes

Compatibility is not binary.

A migration or update assessment should be able to resolve states such as:

- `compatible`,
- `compatible_with_migration`,
- `compatible_with_manual_action`,
- `unsupported_source`,
- `blocked_by_conflict`,
- `unknown`.

`unknown` is a valid result and must not be converted into optimistic execution.

## Migration Chains

Supported migration paths may be composed from sequential migration steps.

For example:

```text
0.2 -> 0.3
0.3 -> 0.4
0.4 -> 0.6
0.6 -> 0.7
```

An updater may compose these steps only when the complete path is explicit, supported, and non-ambiguous.

Missing steps, conflicting paths, or uncertain local state must stop execution rather than trigger heuristic repair.

## Migration Execution Identity & Replay Safety

A stable migration identifier is also an execution identity. Material migration execution must preserve enough durable evidence to distinguish a migration step that has not started, is in progress, has completed and passed its postconditions, has failed, or requires reconciliation.

For composed migration chains, progress must be attributable to individual migration identifiers rather than only to the overall target release.

The framework must not blindly re-run a migration merely because an update process restarted. Before executing or resuming a step it must inspect the durable source state and migration evidence and determine whether the step is:

- not yet applied,
- safely resumable,
- already successfully applied,
- rolled back,
- partially applied and requiring recovery,
- or unknown.

A successfully completed migration step whose postconditions still hold must not be applied again unless that migration contract explicitly defines safe repeat execution.

Migration implementations should be idempotent where practical. When a transformation cannot be safely idempotent, its contract must define sufficient checkpoint, completion evidence, and recovery semantics to prevent accidental duplicate application.

A partially applied step must not be treated as either the old source state or the new target state without evidence. Ambiguous partial state enters recovery or reconciliation.

> **Interruption must not turn resume into duplicate mutation.**

## Preconditions

A migration must define enough preconditions to establish that its assumptions match the actual source state.

Relevant checks may include:

- expected framework version or version range,
- expected Project Brain schema,
- required files or metadata,
- expected ownership state,
- absence or presence of known conflicts,
- required technical capabilities,
- required governance authority,
- prior migration-step completion or non-completion where relevant.

A state that only approximately resembles the expected source must not be silently coerced into it.

## Postconditions

Successful migration requires more than successful writes.

Postconditions should establish, where applicable:

- target framework version recorded correctly,
- target schema recorded correctly,
- resulting Project Brain remains valid and coherent,
- required framework-owned structures exist,
- projections are synchronized when required,
- protected project-owned state remains preserved,
- declared migration verification passes,
- the migration step can be durably recognized as complete for later recovery or resume.

## Structured Evolution Instead of Replacement

When a migration modifies a file that contains existing durable state, the migration should operate on the semantic structure it owns rather than replacing the whole file from a fresh template unless the whole file is explicitly framework-owned and replacement-safe.

For example, if a metadata file already contains project-owned fields and a new framework release adds a new framework metadata field, the migration should preserve the project-owned fields and transform only the authorized framework-owned structure.

The same principle applies to Project Brain state: schema evolution must transform or extend existing canonical knowledge rather than reinitialize it from a blank template.

## Supported Update Path Rule

All supported project-affecting framework updates must pass through the same canonical lifecycle and migration semantics.

Distribution mechanisms such as package managers, installers, release archives, or future registries may transport or update framework tooling, but they must not bypass:

- compatibility assessment,
- ownership boundaries,
- impact analysis,
- human or governance authority,
- recoverability requirements,
- migration contracts,
- post-update validation.

A package manager may update the framework runtime or CLI itself. It must not directly replace or migrate project-owned or Project Brain state outside the framework lifecycle.

> **Transport may vary; project-affecting update semantics may not.**

## Manual Replacement Is Unsupported

Manually copying a newer release over managed project state, replacing Project Brain files from a newer template, or directly overwriting generated integration state outside the supported lifecycle is unsupported.

This warning must be communicated clearly in installation and upgrade documentation and at practical update entry points.

The safe path should be easier and more obvious than the unsafe path.

If the framework later detects version, schema, manifest, projection, or ownership inconsistencies that suggest an out-of-band update, it should classify the condition as drift, conflict, or unknown installation state and route the user toward diagnosis or reconciliation rather than silently assuming migration succeeded.

## Failure Behavior

A migration must stop rather than guess when:

- source state is inconsistent with declared preconditions,
- project-owned and framework-owned state cannot be distinguished safely,
- required migration steps are missing,
- conflicting migration paths exist,
- authorization is insufficient,
- protected properties could be violated,
- migration-step replay status is ambiguous,
- postconditions cannot be established.

Failure narrows behavior toward containment and diagnosis. It does not authorize broader repair.

## Core Principles

> **Migrations are explicit, directional compatibility contracts with declared source state, target state, effects, preconditions, postconditions, and verification.**

> **Migration evolves existing state; it does not reinitialize or blindly replace project-owned knowledge.**

> **Migration execution must be attributable and replay-safe so interrupted updates cannot silently duplicate transformations.**

> **All supported update mechanisms must route project-affecting changes through the same canonical lifecycle.**

> **Ambiguity stops execution rather than triggering heuristic repair.**
