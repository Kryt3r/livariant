---
type: implementation-hardening-decision
status: accepted
phase: public-preview-hardening
scope: fresh-project-initialization
language: en
owner: framework
---

# Fresh Project Discovery & Safe Initialization

Fresh initialization converts verified read-only discovery into the smallest valid Project Brain through a planned, bounded, failure-safe mutation. Existing, partial, damaged, or ambiguous Project Brain state blocks fresh initialization rather than being overwritten or guessed through.

> **Initialization converts verified discovery into the smallest valid Project Brain through a planned, bounded, failure-safe mutation. Existing or ambiguous Project Brain state blocks fresh initialization rather than being overwritten or guessed through.**

## Inspect Before Mutation

Initialization always begins with read-only project and Project Brain discovery.

The executable baseline separates:

```text
discover project
→ inspect Project Brain health
→ build InitializationPlan
→ validate whether fresh initialization is applicable
→ explicitly authorize application
→ build candidate Project Brain
→ validate candidate
→ promote candidate
```

Discovery and planning do not themselves grant mutation authority.

## Initialization States

The first executable baseline distinguishes at least:

- `empty` — no Project Brain and no existing project content outside the framework brain path;
- `existing-project-without-brain` — project content exists but no Project Brain exists;
- `existing-project-with-brain` — a valid Project Brain already exists;
- `partial-or-damaged-brain` — the Project Brain path exists but required state is incomplete or invalid;
- `unsupported-or-ambiguous` — the Project Brain path cannot safely be interpreted as a supported Project Brain state.

These states must not collapse into a single presence boolean for initialization decisions.

## Read-Only Initialization Assessment

The Runtime exposes a read-only initialization assessment before bootstrap application.

The development CLI currently uses:

```text
init
```

to show the plan and:

```text
init --apply
```

to explicitly authorize the planned bootstrap.

This is a development hardening interface, not a permanent public UX decision. The semantic separation between inspection and mutation is the durable requirement.

The assessment identifies proportionately:

- project state;
- Project Brain health;
- verified discovery evidence;
- proposed action;
- Project Brain files to create;
- project-owned files to modify;
- relevant unknowns;
- blocking reason where initialization is unsafe.

## Initialization Plan

Fresh bootstrap writes must derive from an `InitializationPlan` produced from discovery evidence.

The current plan records:

- project root;
- initialization state;
- Project Brain health;
- deterministic evidence;
- exact Project Brain files proposed for creation;
- project-owned files proposed for modification;
- explicit unknowns;
- whether the action is `initialize`, `blocked-existing`, or `blocked-diagnosis`.

The Project Brain writer does not perform independent product inference outside this plan.

## Deterministic Evidence Only

The first bootstrap implementation records only deterministic evidence available from the project inspection.

Examples include:

- presence of `package.json`;
- an explicit package name contained in valid package metadata;
- presence of Git metadata;
- presence of TypeScript configuration.

These signals do not automatically establish product type, architecture, deployment target, business model, or human intent.

When project intent is not established, the Project Brain records the fact as unknown rather than inventing a plausible value.

## Minimal Project Brain

The first executable bootstrap creates exactly this minimal physical baseline:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

The layout is an implementation baseline, not a claim that semantic Project Brain structure is forever fixed to these files.

### Project-owned knowledge

`project.md`, `goals.md`, `decisions.md`, and `knowledge.md` contain project-owned canonical knowledge.

### Lifecycle metadata

`metadata.json` contains the minimum lifecycle identity required by the executable baseline, including separate:

- Framework release version;
- update channel;
- Project Brain schema version.

The current development baseline records:

```json
{
  "framework": {
    "version": "0.0.0-development",
    "channel": "development"
  },
  "projectBrain": {
    "schemaVersion": 1
  }
}
```

Framework-managed lifecycle fields do not imply whole-file or whole-Project-Brain Framework ownership.

## Existing Project Preservation

Initializing an existing project without a Project Brain may create the Project Brain only. It does not authorize edits to unrelated project files.

The initialization plan therefore makes `projectFilesToModify` explicit. The current minimal bootstrap requires this set to remain empty.

Existing project files are protected by Core mutation-safety rules and must remain unchanged unless a later explicit integration step is separately authorized.

## Existing Project Brain Protection

If a valid Project Brain already exists, fresh initialization is blocked.

The Runtime routes the user toward existing-state operations such as status, resume, or later diagnostics rather than treating repeated initialization as permission to regenerate canonical project knowledge.

If Project Brain state is partial, damaged, invalid, or ambiguous, fresh initialization is also blocked and routed toward diagnosis.

> **Damage is not permission to reinitialize.**

## Failure-Safe Bootstrap

The first executable bootstrap prepares a complete candidate in a temporary sibling directory:

```text
.project-brain.tmp-<unique-id>/
```

The candidate is populated and validated before promotion to:

```text
.project-brain/
```

If candidate generation or pre-promotion validation fails, temporary state is removed and the project must not be left with an apparently valid `.project-brain/` directory.

Immediately before promotion, Project Brain state is inspected again. If a Project Brain has appeared or state is no longer suitable for fresh initialization, promotion stops.

This mechanism reduces broken-initialization risk for the local single-operation baseline. More complex cross-process concurrency guarantees may be added only if real release evidence requires them.

## Status Semantics

Executable status now distinguishes:

- missing Project Brain → `uninitialized`;
- valid Project Brain → `initialized`;
- partial/damaged/ambiguous Project Brain → `recovery-required` / diagnosis state.

Presence alone does not imply health.

## Verification Contract

Hardening 1C requires executable tests for at least:

1. an empty directory produces a Fresh Project initialization plan without mutation;
2. initialization creates exactly the minimal Project Brain;
3. existing project files remain byte-identical;
4. repeated initialization does not overwrite an existing valid Project Brain;
5. partial or damaged Project Brain state blocks reinitialization and routes toward diagnosis;
6. a simulated interruption before promotion leaves no apparently valid Project Brain and no temporary bootstrap residue;
7. Framework version, channel, and Project Brain schema identity are recorded separately and correctly;
8. unknown project intent remains unknown instead of being replaced by invented architecture or product assumptions;
9. direct package-name evidence is recorded only when actually present in readable package metadata.

The test contract being present in the repository is not itself sufficient Public Preview evidence. The suite must be executed in a controlled environment and its result recorded before the Fresh Project gate may be treated as passed.

## Current Evidence Boundary

Hardening 1C establishes the implementation and executable test cases for Fresh Project initialization safety.

At this point, repository inspection can verify that the intended code paths and tests exist, but independent runtime execution evidence is still required. Public Preview readiness must not claim this gate as passed until the build and tests execute successfully in a reproducible environment.

## Core Principles

> **Initialization starts with discovery and planning, not file generation.**

> **Only verified evidence becomes initial project knowledge; unknown intent remains unknown.**

> **Existing, damaged, or ambiguous Project Brain state blocks fresh initialization rather than authorizing overwrite or repair.**

> **Project-owned files outside the Project Brain remain untouched by the minimal bootstrap.**

> **A bootstrap candidate is validated before it becomes the active Project Brain.**

> **Written tests are not equivalent to executed release evidence.**
