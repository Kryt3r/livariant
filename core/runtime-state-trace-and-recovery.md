---
type: core-policy
status: accepted
domain: studio-runtime
language: en
owner: framework
---

# Runtime State, Trace & Recovery

**Foundation:** FOUNDATION-04F

## Purpose

Long-running work must survive session loss, model changes, agent changes, interruptions, crashes, and environmental drift without requiring reconstruction from conversation history.

> Runtime state must be resumable without reconstructing the entire conversation.

## Runtime state versus project knowledge

Project knowledge describes durable truths, decisions, constraints, and learning about the project. Runtime state describes the current execution state of active work.

Conversation history may provide useful evidence, but it is an interaction record rather than a reliable runtime database.

## Canonical task state

A relevant task should have one canonical current runtime state integrated by the Director. It may include, as appropriate:

- task identity and current intent,
- branch or other state anchor,
- classification,
- execution graph,
- work-unit status and ownership,
- open findings and decisions,
- active deviations,
- valid, stale, invalid, or missing evidence,
- blockers and known unknowns,
- next executable work.

The schema should remain proportional to task complexity.

## Conflict-aware state integration

Parallel execution must never imply uncontrolled parallel writes to canonical runtime state.

Specialists and work units produce results, findings, evidence, and proposed state transitions. The Director integrates those changes into the single canonical task state through a serialized or conflict-aware mechanism.

> Canonical state updates must be conflict-aware.

An implementation may use revision numbers, optimistic locking, compare-and-swap, an event queue, serialized Director integration, or another mechanism with equivalent semantics.

Conceptually:

```text
Canonical revision 17
↓
Specialist A result based on revision 17
Specialist B result based on revision 17
↓
A integrates → revision 18
↓
B detects changed base state
↓
B reconciles against revision 18
↓
revision 19
```

A stale result may still be valid, but it must be reconciled against the newer canonical state before mutation. Parallel work must not lose findings, decisions, evidence, or completed work through last-write-wins behavior.

## Runtime checkpoints

A Runtime Checkpoint is a compact state representation sufficient for reliable resumption. Checkpoints should be created at boundaries where losing current mental state would cause meaningful rediscovery, including where appropriate:

- completion of a significant work unit,
- accepted human decisions,
- model or owner handoff,
- meaningful interruption,
- before or after high-risk operations,
- review findings,
- replanning,
- blocking conditions.

Checkpointing should not become per-message bureaucracy.

## Resume protocol

Resume should not mean blind continuation. A runtime should:

```text
Load runtime state
↓
Validate state anchor
↓
Check repository and environment drift
↓
Revalidate affected dependencies and evidence
↓
Resolve next READY work
↓
Resume
```

If the stored state no longer matches reality, the runtime must classify and resolve the drift before continuing.

## Runtime drift

Runtime drift occurs when persisted execution state no longer fully matches the current environment. Sources may include new commits, manual edits, merged changes, dependency or API changes, external system changes, or work performed by another agent.

Possible recovery classes include:

- **CLEAN RESUME** — state and environment remain aligned.
- **PARTIAL DRIFT** — affected portions require revalidation.
- **MAJOR DRIFT** — central assumptions or graph structure require replanning.
- **UNKNOWN SIDE EFFECT** — external state must be observed before retrying.

## Evidence validity

Evidence remains anchored to the state it actually verified. Runtime state should be able to distinguish evidence such as:

- `VALID`
- `STALE`
- `INVALID`
- `MISSING`

A test that passed on an earlier commit is not automatically valid after affected state changes.

## State and trace

State answers: **Where are we now?**

Trace answers: **How did we reach this state?**

The current state should remain compact. The trace should preserve material transitions rather than entire agent conversations.

Useful trace events may include:

- task classification,
- role dispatch,
- work-unit start and completion,
- finding creation and resolution,
- accepted decisions,
- `INTENT_CHANGED`,
- evidence addition or invalidation,
- blocking,
- resume,
- replanning,
- completion.

## Recovery and side effects

Recovery must reason from observed evidence rather than intended actions. For side-effecting operations, useful states may include:

- `PLANNED`
- `ATTEMPTED`
- `CONFIRMED`
- `UNKNOWN`

An interrupted request must not automatically be treated as failed when the external system may have completed it.

Before repeating a non-idempotent or uncertain operation, the runtime should inspect the actual resulting state whenever practical.

## Idempotency awareness

Resumable work should account for whether an operation is safe to repeat. Idempotent operations may permit straightforward retry. Non-idempotent operations require state inspection or another recovery strategy before repetition.

## Persistent human decisions

Accepted human decisions must survive session changes and should not be repeatedly reopened without valid reopen conditions or new evidence.

Durable decisions should later be consolidated into the appropriate project knowledge when their relevance extends beyond the active task.

## Open questions and blockers

Runtime state may preserve unresolved questions and should identify which work units depend on them. An unresolved question should block only the scope that actually depends on its answer.

## Next action as first-class state

Where possible, checkpoints should identify the next executable or recommended work unit. This reduces rediscovery during resume and supports efficient ownership handoffs.

The stored next action is guidance, not governance. If current evidence makes the old plan unsuitable, the runtime should replan.

## State ownership

> The Director owns canonical runtime state integration.

Specialists may produce results, evidence, findings, and state-transition proposals, but they should not create competing canonical versions of task truth or directly overwrite canonical state independently.

A task may have many agents, logs, context packets, and evidence artifacts while maintaining one canonical current runtime state.

## Git and external trackers

Git state is important evidence but does not represent complete runtime state. It does not necessarily describe open findings, human gates, invalidated verification, blockers, or next work.

Likewise, an issue tracker may be used as a persistence backend without becoming a Core dependency.

The Core defines what execution semantics must survive; adapters determine where state is persisted.

Possible persistence backends may include repository-local runtime storage, issue trackers, databases, local structured files, or other runtime stores.

## Sensitive state

Runtime persistence must respect data classification. Secrets must not be stored in checkpoints or committed runtime state.

The runtime may store a secret reference or requirement, such as `DISCORD_BOT_TOKEN`, but not the secret value itself.

Security findings and infrastructure details may also require restricted persistence depending on project policy.

## Completion and cleanup

When a task completes, durable knowledge should be consolidated and ephemeral execution noise should not automatically become permanent project memory.

A completed task may retain the decisions, findings, evidence summaries, or learnings that have future value while archiving or removing transient runtime details.

Aborted tasks may still contain reusable findings and should record the reason for abandonment where useful.

## Crash-safe direction

Runtime architecture should remain compatible with a future execution pattern such as:

```text
prepare
↓
execute
↓
observe
↓
persist state
```

The initial framework does not require a fully transactional orchestration engine, but it should avoid designs that make reliable recovery impossible later.

## Human-facing resume

Human-facing resume output should summarize actionable state rather than expose raw runtime internals. It should explain what is complete, what remains open or invalid, what is blocked, and what should happen next.

Internal execution complexity should be compressed rather than transferred to the user.

## Core principles

> **Runtime state must be resumable without reconstructing the entire conversation.**

> **Conversation history is not a runtime database.**

> **One task should have one canonical current runtime state.**

> **Canonical state updates must be conflict-aware.**

> **Parallel execution must not create parallel canonical writes.**

> **Evidence validity must remain anchored to the state it actually verified.**

> **Resume must validate environment drift before continuing.**

> **Unknown side effects must be observed before they are retried.**

> **The Director owns canonical state integration.**

> **Git state is evidence, not complete runtime state.**

> **Runtime persistence defines what must survive, not where it must be stored.**

> **Completion should consolidate durable knowledge and discard ephemeral execution noise.**

> **A checkpoint is valuable when losing current mental state would create meaningful rediscovery.**
