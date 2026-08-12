---
type: implementation-hardening-decision
status: accepted
phase: public-preview-hardening
scope: executable-baseline
language: en
owner: framework
updated: 2026-08-12
---

# Minimal Runtime & CLI Architecture

The first Public Preview executable baseline must remain intentionally small. Its purpose is to implement and prove existing Framework contracts, not to invent a second architecture beside them.

> **The executable Runtime implements Framework contracts; it does not become a competing source of Framework semantics. CLI commands are interfaces to Runtime capabilities, not owners of lifecycle or governance rules.**

## Implementation Baseline

The initial executable implementation uses TypeScript on Node.js as a pragmatic cross-platform delivery choice for the first `0.x` preview line.

This is an implementation decision, not a Framework semantic dependency. Project Brain knowledge, lifecycle metadata, migration contracts, and canonical policies must not depend on Node.js-specific identity.

A later implementation in another language or packaging model must not require semantic Project Brain migration merely because the Runtime implementation technology changes.

## Local Runtime Shape

The first baseline is a local process rather than a service-oriented platform.

Conceptually:

```text
CLI
 |
Runtime
 |
Lifecycle / Project Brain / Adapters
 |
Filesystem / Git / supported tool environments
```

The preview baseline does not require a hosted registry, cloud account, remote control plane, or microservice architecture for normal local use.

## Initial Module Boundaries

The first implementation should keep a small set of explicit internal boundaries:

```text
src/
  cli/
  runtime/
  project/
  project-brain/
  lifecycle/
  adapters/
  validation/
```

### `cli/`

Owns command parsing, presentation, interactive prompts where applicable, exit codes, and translation between user-facing invocation and Runtime API calls.

It must not own lifecycle or governance semantics.

### `runtime/`

Owns orchestration of Framework operations under existing authority, mutation-safety, context, and lifecycle contracts.

### `project/`

Owns deterministic project discovery and repository/environment inspection needed to orient Framework behavior.

### `project-brain/`

Owns semantic reading, validation, bootstrap persistence, and controlled modification of canonical Project Brain state through a storage boundary.

### `lifecycle/`

Owns installed-version state, update discovery inputs, migration planning/execution primitives, checkpoint/recovery evidence, and validation-before-activation behavior.

### `adapters/`

Owns concrete environment and provider translation while preserving the accepted Adapter boundary: capability does not become authority.

### `validation/`

Owns schema, invariant, postcondition, integrity, and diagnostic validation mechanisms shared by the executable baseline.

These module names are implementation-level organization and may evolve. Their ownership boundaries should remain aligned with canonical Framework contracts.

## Initial Semantic Command Surface

The Public Preview executable baseline keeps a small command surface, but it must cover the complete first-use and repeated-use path rather than only installation and lifecycle safety.

The supported commands are:

- `init`
- `status`
- `resume`
- `doctor`
- `goals`
- `knowledge`
- `decisions`
- `update`
- `recover`
- `version`

The accepted product CLI namespace is `livariant`. Product-facing invocation therefore uses commands such as:

```text
livariant init
livariant status
livariant resume
livariant goals
livariant knowledge
livariant decisions
livariant doctor
livariant update
livariant recover
livariant version
```

The semantic command surface remains independent from branding. A future product rename would change invocation identity, not lifecycle or Project Brain semantics.

### `init`

- performs discovery before generation,
- supports Fresh Project bootstrap,
- detects existing Project Brain state,
- must not silently overwrite or reinitialize an existing Project Brain.

### `status`

Provides read-only lifecycle and Project Brain status such as installed Framework version, Project Brain schema, channel, health, drift indicators, and incomplete/recovery state where applicable.

### `resume`

Builds relevant Resume context from canonical Project Brain and accepted durable project state. Human-readable Resume output includes confirmed goals, active decisions, known facts, unresolved unknowns, and project identity where available. It must not depend on hidden provider memory for correctness.

### `goals`

Provides read access to confirmed goals and a plan-first `add` operation for recording a new confirmed goal.

Mutation requires explicit `--apply` authorization. The Runtime validates Project Brain health, writes through the managed storage boundary, and verifies the persisted value before reporting success.

### `knowledge`

Provides read access to known facts and a plan-first `add` operation for recording confirmed project knowledge.

Mutation requires explicit `--apply` authorization. Confirmed project knowledge remains distinct from discovery evidence and unresolved unknowns even when all three are stored in the same canonical knowledge document.

### `decisions`

Provides read access to accepted decisions plus plan-first operations to add an accepted decision or supersede an active decision.

Decision supersession preserves the old decision as historical truth and creates a new active decision identity. A supersession may include a reason. Mutation requires explicit `--apply` authorization.

### `doctor`

Provides deeper diagnosis and classification of inconsistency, drift, corruption, interruption, or unsupported state.

`doctor` is diagnostic by default. Diagnosis does not imply repair authority.

### `update`

Exposes the canonical update lifecycle through explicit semantic stages such as discovery/check, planning, and authorized application.

Invoking `update` must not mean unconditional immediate mutation.

### `recover`

Inspects supported recovery state by default and applies a validated recovery plan only after separate explicit `--apply` authorization.

### `version`

Reports concrete executable/Framework release identity and relevant lifecycle metadata needed for diagnosis and reproducibility.

## Semantic Knowledge Mutation Rules

The first supported knowledge-editing surface is intentionally bounded. It does not attempt to implement every future natural-language or multi-area impact-analysis capability in one release.

For the Preview baseline:

- reads are non-mutating;
- a proposed goal, fact, decision, or decision supersession is shown before mutation;
- mutation requires `--apply`;
- canonical writes require a valid, healthy Project Brain;
- duplicate simple additions fail rather than silently rewriting existing truth;
- decision supersession preserves historical state;
- persistence uses framework-managed path checks and atomic replacement;
- post-write verification is required before success is reported.

Future guided natural-language editing can add richer impact analysis over the same Runtime boundary. It must not weaken these authority and verification rules.

## CLI / Runtime Separation

CLI handlers must remain thin translation layers.

Avoid embedding Framework behavior directly in command handlers.

Conceptually:

```text
CLI invocation
-> Runtime API operation
-> canonical lifecycle / Project Brain / Adapter implementation
```

This allows future interfaces such as an installer, GUI, IDE integration, Codex environment, Claude environment, or other product surfaces to invoke the same Runtime semantics.

## Project Brain Storage Boundary

Executable code must not scatter assumptions about the physical Project Brain file layout throughout the Runtime.

The Project Brain implementation should expose semantic storage operations behind a storage boundary, for example conceptually:

```text
ProjectBrainStore
  readProjectIdentity()
  readGoals()
  readDecisions()
  readFrameworkMetadata()
  writeAcceptedBootstrap(...)
  applyAuthorizedSemanticChange(...)
```

The concrete Markdown/YAML/file representation remains behind that boundary.

This preserves the accepted rule that semantic Project Brain structure matters more than any one physical file layout and makes schema migration practical without rewriting unrelated Runtime logic.

## Ownership Must Be Representable

The executable model must be able to distinguish at least:

- framework-owned state,
- project-owned state,
- mixed or projected integration state.

Where project-owned canonical knowledge and narrowly scoped framework-managed lifecycle metadata coexist, ownership must be representable below whole-file granularity where necessary.

The Runtime must never infer whole-file Framework ownership merely because a file contains some Framework-managed metadata.

## Deterministic Core Before Embedded AI

The first preview Runtime does not require an embedded autonomous LLM agent to provide lifecycle safety.

Deterministic mechanisms should first implement operations such as:

- discovery,
- evidence classification,
- canonical knowledge loading,
- schema and invariant validation,
- persistence,
- semantic knowledge mutation,
- migration primitives,
- recovery-state classification.

Supported coding agents and models may use these mechanisms through Adapters and product integrations.

This separation is intentional evidence for provider independence: basic ownership, knowledge persistence, lifecycle, update, migration, and recovery safety must not depend on one model's hidden reasoning or memory.

## Testability and Fixtures

Readiness scenarios must be reproducible against isolated temporary projects rather than relying only on manual demonstrations.

The implementation should support fixtures or generated test cases representing states such as:

```text
fresh-empty/
fresh-node/
existing-small/
existing-messy/
existing-with-brain/
corrupted-brain/
interrupted-update/
```

Exact fixture names and formats are implementation details. The important contract is that protected properties and lifecycle transitions can be tested repeatedly from known starting states.

Repeated-use acceptance must also prove that a user can initialize a project, add durable goals/knowledge/decisions, supersede a stale decision, and see the resulting canonical truth in Resume output.

## Scope Control

The minimal executable baseline is not permission to implement every planned future product feature.

New implementation work during hardening must remain classified as:

- necessary to prove a Public Preview gate,
- necessary to fix a blocker discovered by evidence,
- an explicitly accepted Preview limitation,
- or post-preview work.

The semantic knowledge-editing surface was added as a direct response to the H-04 Public Preview utility finding: the earlier executable baseline could initialize and read Project Brain state but did not expose the repeated-use path needed to record new durable project truth.

The executable hardening phase must not recreate Foundation expansion under a different name.

## Core Principles

> **The Runtime implements existing canonical Framework semantics rather than redefining them.**

> **The CLI is a replaceable interface over Runtime capabilities; the current product namespace is `livariant`.**

> **The first `0.x` baseline is local-first, deterministic-first, and deliberately small.**

> **Project Brain access uses semantic storage boundaries rather than scattered file-layout assumptions.**

> **Repeated-use product utility is a release property: users must be able to record and retrieve durable project truth, not only initialize storage.**

> **Ownership, interruption, migration, and validation semantics must be technically representable before the first readiness scenario can pass.**
