---
type: framework-layer-policy
status: accepted
domain: adapters
language: en
owner: framework
foundation: FOUNDATION-08H
---

# Environment-Specific Execution & Handoff Mechanisms

Adapters translate Runtime-owned execution intent into concrete environment-specific execution or handoff mechanics without creating new ownership, authority, or competing task truth.

> **Environment handoffs transfer execution responsibility, not ownership or authority. Scope, constraints, evidence, and task identity must survive the boundary without creating a second source of runtime truth.**

## Handoff purpose

A handoff moves execution responsibility across an environment boundary when another tool, provider, agent runtime, CLI, IDE, or external execution surface is better suited to perform part of the work.

A handoff is not a new task with independent governance.

It remains part of the originating Runtime task unless the human owner deliberately creates a new task or decision scope.

## Minimum handoff context

A concrete execution or handoff should preserve, where relevant:

- canonical task identity,
- current objective,
- authorized scope,
- applicable Core, Pattern, Profile, and Project Brain context,
- accepted decisions and constraints,
- allowed effect boundaries,
- protected properties and known risks,
- existing evidence,
- unresolved blockers,
- expected output,
- completion or return condition.

Only materially relevant context should cross the boundary. Handoffs must preserve meaning without becoming full-context dumps.

## Authority preservation

Delegation does not create new authority.

Conceptually:

```text
originating authorized scope
→ delegated execution scope
→ environment-specific execution
```

The delegated scope must not exceed the originating authorized scope.

For example:

```text
Runtime task
→ inspect failing CI
→ repository read authority only

Execution environment
→ may inspect logs and repository state
→ may not silently modify files
```

If the receiving environment requires a broader effect to continue, that broader effect must return to normal Runtime authorization rather than being inferred from technical capability.

> **Delegated scope must remain less than or equal to originating authorized scope.**

## Canonical Runtime state

The framework maintains one canonical Runtime state per task.

Adapters and execution environments may maintain local execution metadata such as:

- provider job IDs,
- tool-call IDs,
- session IDs,
- temporary worktree or sandbox state,
- local progress markers,
- provider-specific retry tokens.

Such metadata supports execution but does not become competing task truth.

If local execution state conflicts with canonical Runtime state, the inconsistency must be reconciled explicitly rather than silently allowing two independent task histories to continue.

## Execution request

An environment-specific execution request should make clear:

- what concrete operation is requested,
- which scope is affected,
- which capability is expected,
- which effect class applies,
- what authority permits the operation,
- what must not be changed,
- and what result must be returned.

Adapters should translate this request into the narrowest environment-native mechanism that preserves the intended semantics.

## Execution result

After execution, the environment should return enough structured information for the Runtime to continue safely.

Relevant result information may include:

- operations actually performed,
- actual affected scope,
- files, resources, deployments, or external state changed,
- generated verification evidence,
- degradation or fallback used,
- new findings,
- unresolved risks,
- remaining blockers,
- provider-specific result identifiers,
- completion status,
- any difference between requested and actual effect.

The Runtime decides whether the task should continue, verify, escalate, retry, reconcile, or stop.

## Interrupted or ambiguous effects

If execution is interrupted after a potentially state-changing operation has been dispatched, the framework must not assume success or failure without evidence.

Example:

```text
deployment request sent
→ connection lost before response
→ deployment effect unknown
```

The correct state is:

```text
effect state: unknown until reconciled
```

Before retrying, the Runtime should inspect the target environment where practical to determine whether the operation already took effect.

This protects against duplicate:

- deployments,
- external writes,
- billing operations,
- repository mutations,
- message sends,
- destructive actions,
- or other non-idempotent effects.

A retry must not be treated as harmless merely because the previous response was lost.

## Idempotency and duplicate-effect awareness

Adapters should surface provider semantics relevant to duplicate execution where material.

For example:

- native idempotency keys,
- provider request IDs,
- already-applied operation detection,
- immutable deployment identifiers,
- commit SHAs,
- external event IDs.

The Adapter surfaces these mechanisms; the Runtime decides how they are used within task and authority semantics.

## Handoff degradation

If a receiving environment cannot preserve required scope, authority, evidence, or task identity, the handoff is degraded or invalid.

A technically available destination is not an acceptable handoff target when it would require silently weakening:

- authorization,
- verification,
- project mutation safety,
- security invariants,
- completion requirements,
- or context needed to preserve task meaning.

Fallback follows the normal degradation rules: execution mechanics may change, but requirements must not silently weaken.

## Human-owned project safety

Execution handoffs remain bound by the Core project mutation safety policy.

A receiving environment must not interpret a handoff as permission to broaden project modifications beyond the approved task scope.

Examples:

- a debugging handoff does not authorize opportunistic refactoring,
- a test-fix handoff does not authorize dependency upgrades unless required and authorized,
- an instruction-file handoff does not authorize overwriting human-owned project guidance,
- a deployment handoff does not authorize production changes when only preview scope was approved.

## No hidden orchestration layer

Adapters may expose environment-native sessions, jobs, agents, tasks, or workflows.

They must not turn those mechanisms into a second independent orchestration system that overrides Studio Runtime ownership.

Environment-native orchestration is an execution mechanism, not a new governance layer.

## Proportionality

Not every execution needs a formal large handoff package.

A small local tool call may require only:

- task identity,
- operation,
- scope,
- authority,
- result.

More complex cross-environment handoffs require richer context when the consequence of context loss is material.

The contract should remain as small as safety and correctness permit.

## Anti-Patterns

Avoid:

- granting broader authority because the receiving environment has stronger credentials,
- creating a second canonical task state inside an Adapter,
- dropping accepted constraints during provider translation,
- assuming an interrupted write failed and retrying blindly,
- silently weakening verification because the target environment cannot perform it,
- treating environment-local metadata as durable Project Brain truth,
- duplicating full project context when only a focused handoff is needed,
- building a universal distributed workflow engine inside the Adapter layer.

## Core Principles

> **Environment handoffs transfer execution responsibility, not ownership or authority.**

> **Delegated scope must not exceed originating authorized scope.**

> **One canonical Runtime state remains authoritative for the task.**

> **Ambiguous state-changing effects are reconciled before retry rather than guessed.**

> **Environment-native execution may implement orchestration mechanics, but Studio Runtime retains orchestration ownership.**
