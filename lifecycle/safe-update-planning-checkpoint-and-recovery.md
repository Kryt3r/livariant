---
type: framework-layer-policy
status: accepted
domain: lifecycle
language: en
owner: framework
foundation: FOUNDATION-10E
---

# Safe Update Planning, Checkpoint & Recovery Lifecycle

Framework updates are material mutations when they change durable framework, Project Brain, projection, project-owned, or external state. An update becomes active only after a bounded plan, sufficient recoverability, successful mutation, and post-update validation.

> **An update is planned and made recoverable before material mutation begins. A target version is not active merely because some files have already changed.**

## Update Planning Before Mutation

After update discovery and compatibility resolution, the framework must construct a bounded update plan before applying material changes.

The plan should identify, proportionately:

- current installed framework version,
- intended target version and channel,
- required migration path,
- framework-owned artifacts that will change,
- Project Brain schema or knowledge-state effects,
- generated or projected integrations that will change,
- project-owned artifacts or external state that may be affected,
- manual actions or unresolved decisions,
- material compatibility or breaking-change implications,
- checkpoint and rollback requirements,
- validation expectations.

A useful plan may look conceptually like:

```text
Current: 0.2.4-preview.2
Target: 0.3.0-preview.1

Planned effects:
- replace framework-owned runtime artifacts
- migrate Project Brain schema 2 -> 3
- regenerate one provider projection
- preserve project-owned files

Manual action: none
Checkpoint: required
```

Planning does not itself grant mutation authority.

## Authority and Scope

The update lifecycle inherits Core project-mutation safety and Runtime authority semantics.

An authorized update scope may cover the necessary migration steps required for the selected target version when those effects were made understandable before execution.

It does not authorize unrelated cleanup, refactoring, dependency modernization, project redesign, production deployment, or other opportunistic changes.

If the migration plan reveals project-impacting changes beyond the understood update scope, the framework must surface them before execution and obtain the required authority.

## Recoverable Baseline

Before migration-heavy, breaking, destructive, project-impacting, externally stateful, or otherwise high-risk updates, the framework must establish or confirm an appropriate recoverable baseline where technically practical.

A checkpoint is a known recoverable starting state, not merely a generic backup label.

Depending on the environment, checkpoint evidence may include:

- a version-control commit,
- a dedicated branch,
- a file or directory snapshot,
- a Project Brain backup,
- an external datastore snapshot or export,
- infrastructure state capture,
- another environment-appropriate recovery mechanism,
- or a combination of these.

The mechanism must match the actual state affected by the update.

## Proportional Checkpoint Requirements

Not every framework-only patch requires heavyweight backup ceremony.

A checkpoint should be required when an update materially includes one or more of the following:

- Project Brain schema migration,
- transformation of durable project knowledge,
- project-owned file changes,
- external data transformation,
- complex projection rewrites where user-owned content may coexist,
- multi-step migration chains,
- documented breaking changes,
- difficult or partially irreversible operations,
- security-sensitive or broadly cross-cutting mutations.

Low-risk framework-owned replacement may use lighter recovery guarantees when the affected artifacts are reproducible and no project-owned state is at risk.

## Rollback Coverage Is Explicit

The existence of some backup must not be presented as full rollback coverage.

The update plan should make clear which affected surfaces are recoverable and by what mechanism.

For example:

```text
Rollback coverage:
- framework-owned files: reversible
- Project Brain: reversible from checkpoint
- generated projections: regenerable
- external database: requires provider snapshot restore
```

If complete rollback is unavailable, that limitation must be visible before the update is authorized and applied when material to the decision.

Rollback capability limits damage from a failed authorized update; it does not justify risky or unauthorized mutation.

## Canonical Update Phases

A material update should conceptually follow this lifecycle:

```text
Inspect current state
-> resolve target release
-> assess compatibility
-> construct migration plan
-> assess impact and authority
-> establish recoverable baseline
-> verify migration preconditions
-> apply the bounded update
-> validate migration postconditions and protected properties
-> commit the resulting active version state
```

The implementation may optimize trivial low-risk cases, but it must not remove the semantic boundaries between inspection, planning, authorization, mutation, and validation.

## Explicit Lifecycle State

A framework update may require durable or recoverable lifecycle evidence so interruption is distinguishable from successful completion.

Useful semantic states include:

- `planned`,
- `checkpointed`,
- `applying`,
- `validating`,
- `complete`,
- `failed`,
- `interrupted`,
- `recovery_required`.

The exact physical representation is an implementation concern, but material update progress must not be inferred solely from the presence of some new files or a partially changed version marker.

Transient task Runtime state remains conceptually separate from durable Project Brain truth. Update-recovery metadata may persist only to the extent needed to recover a durable lifecycle operation and must not become a generic persistent task-state store.

## Interrupted Updates

Process termination, machine failure, provider interruption, agent handoff, or other disruption during an update must not cause the next session to assume successful completion.

On re-entry, the framework should inspect available lifecycle evidence and determine whether the installation is:

- safely at the previous active version,
- successfully complete but not yet finalized,
- partially mutated and recoverable,
- inconsistent and in need of diagnosis,
- or otherwise unknown.

When safe status cannot be established, the framework enters an explicit recovery or diagnostic state rather than proceeding heuristically.

`doctor` or equivalent diagnostic semantics may help classify the state, but diagnosis remains separate from repair authorization.

## Failure Containment

A failed update narrows behavior toward containment and reassessment.

The framework should:

1. stop additional unplanned mutations,
2. preserve evidence of the failure boundary,
3. inspect which update steps completed,
4. restore the prior known-safe state when rollback is safe and sufficiently covered,
5. otherwise enter an explicit recovery-required state,
6. explain any remaining manual or human-authorized action.

The framework must not respond to failure with an uncontrolled repair cascade.

> **A failed migration is not authority to broaden the update into an improvised repair project.**

## Validation Before Activation

The target framework version must not be committed as the active successful installation merely because artifacts for that version have begun to appear.

Conceptually:

```text
target_version != active_version
```

until required migration and validation postconditions have succeeded.

Validation should provide proportionate evidence that:

- required framework-owned artifacts are present and coherent,
- the expected Project Brain schema and metadata are valid,
- relevant Project Brain knowledge remains coherent,
- generated projections are consistent where required,
- project-owned protected properties were preserved,
- migration-specific postconditions hold,
- material regressions or compatibility blockers have not been introduced.

Only then is the target release finalized as the active installed version.

## Recovery and Version Truth

Version metadata must reflect established installation truth rather than optimistic intent.

A partially migrated installation must not claim ordinary healthy status for the target version.

Where useful, lifecycle metadata may retain both:

- the last known active version,
- and the intended or partially applied target version.

This supports recovery without collapsing desired state into completed state.

## External State

When an update affects external mutable state, such as a database, deployment configuration, hosted service, or provider-owned resource, the update plan must account for that state explicitly.

Repository rollback alone is insufficient evidence of recoverability when external mutations remain active.

Adapters may expose provider-specific snapshot, restore, transactional, staging, or validation capabilities, but they do not redefine the framework's authority or recoverability requirements.

## Anti-Patterns

Avoid:

- applying migrations before constructing a bounded plan,
- treating any backup as proof of full rollback coverage,
- setting the target version active before post-update validation succeeds,
- assuming a process restart means the previous update completed,
- inferring completion from a subset of changed files,
- using random repair attempts after migration failure,
- rolling back repository files while ignoring mutated external state,
- creating heavyweight backup ceremony for trivial reproducible framework-only patches,
- using update-recovery metadata as a second generic Runtime state store.

## Core Principles

> **An update becomes active only after planning, sufficient recoverability, bounded mutation, and successful validation.**

> **Checkpoint and rollback mechanisms must cover the state actually placed at risk.**

> **Interrupted and failed updates remain explicit recoverable states rather than masquerading as successful installations.**

> **Version metadata records established installation truth, not optimistic target intent.**

> **Failure triggers containment and reassessment, not an uncontrolled repair spiral.**
