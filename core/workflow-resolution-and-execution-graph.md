---
type: core-policy
status: accepted
domain: studio-runtime
language: en
owner: framework
---

# Workflow Resolution & Execution Graph

**Foundation:** FOUNDATION-04D

## Purpose

A task should be executed as a dependency graph of work units, decisions, evidence, review, verification, and possible rework rather than assumed to be a linear conversation.

> A task is executed as a dependency graph, not assumed to be a linear conversation.

## Work Units

Larger tasks should be decomposed into work units with clear purpose, owner, dependencies, inputs, expected outputs, applicable gates, and state.

A work unit may represent implementation, analysis, decision, review, verification, documentation, experimentation, or evidence production.

## Execution graph

The Director resolves an initial execution graph from task classification, role resolution, affected systems, governance gates, decision dependencies, profile workflow rules, and known unknowns.

The graph exists to make dependency and concurrency explicit. It is not required to be represented by a dedicated orchestration engine in early framework versions.

## Work-unit states

Useful states may include:

- `READY`
- `BLOCKED`
- `ACTIVE`
- `REVIEW`
- `DONE`
- `INVALIDATED`

Only work whose prerequisites are sufficiently stable should become ready for execution.

## Dependency types

Dependencies may include:

- **Hard Dependency** — the next unit cannot begin correctly without the predecessor.
- **Soft Dependency** — provisional work is possible, but rework risk remains.
- **Knowledge Dependency** — a conclusion or decision must be available first.
- **Verification Dependency** — implementation may exist, but completion requires evidence.

The exact machine representation may evolve later.

## Parallel work

> Parallelize only work whose shared assumptions are sufficiently stable.

Concurrency is useful when work units are genuinely independent or share a stable foundation. Premature parallelization across unresolved contracts, architecture, data models, or product decisions increases divergence and rework.

Parallel execution does not permit uncontrolled parallel mutation of canonical runtime state. State-integration semantics are defined by FOUNDATION-04F.

## Speculative work

Work may proceed against a soft dependency when the expected value justifies it, but the speculation must remain explicit.

A speculative unit should identify the assumption it depends on and the condition that would invalidate its output.

## Adaptive graph

The workflow graph is a hypothesis about execution and should evolve when evidence changes.

New findings may:

- introduce new work units,
- activate new roles,
- change risk classification,
- create new dependencies,
- reopen completed work,
- invalidate verification,
- require additional human or governance gates.

The graph must adapt rather than preserve an obsolete plan for procedural consistency.

## Intent changes

A material change in human-approved project or task direction is a first-class runtime event: `INTENT_CHANGED`.

An intent change should trigger only the work necessary to reconcile the new direction with the current runtime state. The Director should:

```text
INTENT_CHANGED
↓
Validate decision authority and applicable governance
↓
Compare old and new intent / scope
↓
Reclassify risk if needed
↓
Re-evaluate affected roles and dependencies
↓
Invalidate affected work and evidence only
↓
Preserve unaffected accepted state
↓
Replan the execution graph
```

A new direction must not be ignored because older project knowledge was previously canonical, and it must not cause unrelated completed work to be discarded without impact evidence.

## Rework and invalidation

Findings may create rework edges into previously completed parts of the graph.

> Completion is valid only for the state on which its evidence depends.

If a dependency changes materially, downstream implementation, review, or verification may become `INVALIDATED` and require targeted re-evaluation.

Invalidation should be scoped to what actually changed rather than restarting unrelated work.

## Work-unit completion

A work unit reaches `DONE` only when its local acceptance and evidence requirements are satisfied for the current state.

The Director remains responsible for task-level completion across all required work units and gates.

## Scope growth

The runtime must distinguish:

- **Required Scope Expansion** — additional work necessary to satisfy the accepted task, governance, safety, or system integrity.
- **Suggested Improvement** — valuable but non-required opportunity discovered during execution.

Suggested improvements must not silently become implementation scope.

Required expansion may be added within existing authority; otherwise it must follow the applicable decision or escalation process.

## Critical path and bottlenecks

The Director should recognize which dependency chain controls task completion when doing so improves orchestration.

Human approvals, external dependencies, or unresolved architecture choices that block multiple downstream work units should be surfaced clearly instead of hidden behind unrelated parallel activity.

## Human gates

Human decisions and approvals are explicit workflow nodes where required.

A D3 decision, identity-defining visual confirmation, or other mandatory human authority must not be treated as an informal conversational aside that the runtime can accidentally bypass.

## Review and verification

Review and verification are distinct graph nodes because they provide different evidence.

Green automated tests do not establish architecture or design quality. A positive review does not establish that required tests passed.

Both should connect to completion according to task-specific requirements.

## Targeted re-review

When rework occurs, only evidence materially affected by the change should be invalidated.

A security fix may require targeted security re-review and relevant tests while leaving an unrelated design review valid.

The runtime should preserve valid evidence instead of reflexively repeating all work.

## Evidence outputs

Work units may produce evidence rather than implementation artifacts. Performance tests, simulations, accessibility checks, security reviews, or design evaluations may satisfy downstream gates through evidence outputs.

Evidence must remain anchored to the state it evaluated.

## Alternative paths

The graph may contain alternative execution paths while a material decision remains open. After the decision, the selected path becomes active and alternatives should not continue consuming implementation effort unless explicitly justified.

## Failure handling

Failure responses may include:

- `RETRY`
- `REWORK`
- `REPLAN`
- `ESCALATE`
- `ABORT`

Repeated failure should trigger diagnosis rather than mechanical repetition.

> Repeated failure should trigger diagnosis or replanning, not blind retries.

## Retry and loop protection

The runtime should detect repeated unsuccessful attempts or cycles that recreate substantially the same failure state.

When meaningful progress is no longer occurring, it should change approach, replan, retrieve new context, dispatch different expertise, or escalate rather than consume resources indefinitely.

## Ownership continuity

A work unit should normally have one active implementation owner at a time. If ownership changes, the next owner must receive an explicit handoff with the relevant current state, conclusions, assumptions, and open concerns.

## Graph state snapshot

For longer tasks, the runtime should be able to summarize current graph state, such as which units are done, active, ready, blocked, or invalidated and why.

This is more useful than ambiguous percentage-based progress reporting.

## Task completion gate

Before task-level `DONE`, the Director should determine that:

- all required work units are complete,
- mandatory governance and human gates are satisfied,
- no blocking findings remain unresolved,
- evidence is valid for the current state,
- no hidden speculative assumptions remain,
- required knowledge consolidation has been handled.

False completion is prohibited by the framework's broader verification and escalation rules.

## Proportional graph complexity

> Graph complexity should reflect work complexity, not framework ambition.

A trivial task may legitimately have a graph equivalent to:

```text
Implement
↓
Verify
↓
Done
```

The existence of the execution-graph model must not create ceremony where no meaningful dependency exists.

## Profile workflow patterns

Profiles may define recurring domain-specific workflow patterns. These patterns may add expected work units, evidence, or specialist review for known classes of changes.

Profile workflow rules cannot weaken applicable Core governance.

## Workflow learning

Repeatedly successful execution structures may become reusable workflow-pattern candidates.

> Repeated successful execution graphs may become reusable workflow patterns.

One successful task does not automatically create a standard. Patterns should emerge from repeated value and retained reasoning.

## Conceptual runtime flow

```text
User Intent
↓
Director
↓
Task Classification
↓
Role Resolution
↓
Context Resolution
↓
Execution Graph
↓
Ready Work Units
↓
Parallel / Sequential Execution
↓
Evidence + Findings
↓
Graph Update
↓
Rework / Redispatch / Escalation if needed
↓
Completion Gate
↓
Knowledge Consolidation
↓
DONE
```

## Core principles

> **A task is executed as a dependency graph, not assumed to be a linear conversation.**

> **Parallelize only work whose shared assumptions are sufficiently stable.**

> **Completion is valid only for the state on which its evidence depends.**

> **A material change of human intent is a first-class runtime event and triggers targeted replanning.**

> **Findings and new evidence may reshape or invalidate parts of the execution graph.**

> **Required scope expansion and optional improvement must remain distinguishable.**

> **Repeated failure should trigger diagnosis or replanning, not blind retries.**

> **Human approvals are explicit workflow gates, not conversational side notes.**

> **Graph complexity should reflect work complexity, not framework ambition.**

> **Repeated successful execution graphs may become reusable workflow patterns.**
