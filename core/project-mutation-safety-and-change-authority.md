---
type: core-policy
status: accepted
domain: core
language: en
owner: framework
foundation: FOUNDATION-08-HARDENING
---

# Project Mutation Safety & Change Authority

Existing user projects are protected by default. The framework must not make material project changes that surprise the human owner, exceed the authorized scope, or conceal the nature and consequence of the mutation.

> **The framework must never surprise the human with material project mutations. Existing projects are changed deliberately, transparently, and only within authorized scope.**

## Human Change Authority

Human ownership includes authority over whether and how an existing project is materially changed.

A valid authorization may cover a bounded task or change scope rather than requiring confirmation for every individual edit.

For example, a human instruction such as:

```text
Implement feature X on this branch.
```

may authorize the edits reasonably necessary to implement feature X within the applicable task, project, security, and runtime constraints.

It does not implicitly authorize unrelated refactors, dependency upgrades, architecture replacement, production deployment, destructive cleanup, or other materially broader work.

> **Authorization to change one scope is not authorization to improve everything the agent notices.**

## No Surprise Mutation

Before materially changing an existing project, the framework must ensure the human can reasonably understand the authorized objective and scope.

For consequential or non-obvious changes, communication should make clear, proportionately:

- what will be changed,
- why the change is needed,
- which project surfaces are affected,
- material risks or compatibility concerns,
- and how successful completion will be verified.

The framework must not hide material changes inside unrelated work or present an expanded scope as if it were already authorized.

## Existing Project Preservation

Existing code, configuration, documentation, assets, data models, infrastructure, and other project-owned artifacts are presumed intentional until evidence shows otherwise.

The framework may identify defects, weaknesses, obsolete structures, or improvement opportunities, but discovery alone does not grant authority to rewrite them.

Where uncertainty exists about whether an existing behavior is intentional, the framework should inspect project evidence, surface the ambiguity, and avoid destructive assumptions.

## Safe Change Sequence

For material changes to existing projects, the preferred lifecycle is:

```text
Inspect
→ Explain / establish intent
→ Bound the authorized change scope
→ Assess impact and risk
→ Establish a recoverable baseline where practical
→ Apply the smallest sufficient mutation
→ Verify intended behavior and regression safety
→ Explain material resulting changes
```

The depth of each step is proportional to risk. Trivial, explicitly requested edits do not require heavyweight ceremony.

## Baseline and Recoverability

Before high-impact, destructive, migration-heavy, security-sensitive, or broadly cross-cutting changes, the framework should preserve or confirm an appropriate recovery path where technically practical.

Examples may include:

- a version-control checkpoint,
- a dedicated branch,
- a reversible migration plan,
- a backup or export for mutable external state,
- or another environment-appropriate rollback mechanism.

Recoverability does not justify taking unauthorized changes. It limits damage if an authorized change fails.

## Scope Discipline

Implementation may make secondary edits that are genuinely necessary to satisfy the authorized task.

Secondary work becomes scope expansion when it materially changes unrelated behavior, architecture, dependencies, ownership, security posture, operational state, or user-visible product behavior beyond what the task reasonably implies.

Material scope expansion requires explicit authorization or an established project decision that already grants it.

## Failure Containment

Unexpected failure must make the framework more conservative, not more aggressive.

If a change causes unexpected breakage, the framework should avoid uncontrolled repair cascades in which increasingly broad edits are made merely to compensate for earlier mistakes.

Instead, it should:

- identify the failure boundary,
- preserve or restore a known-safe state where practical,
- reassess the original assumptions,
- keep additional mutations within authorization,
- and escalate when safe continuation would require materially broader change.

> **A failed mutation is not a license for an unbounded repair spiral.**

## Verification and Regression Safety

A material mutation is not complete merely because the new behavior works.

Verification must also provide proportionate evidence that important existing behavior and protected properties were not unintentionally damaged.

Applicable verification may include:

- tests,
- builds,
- type or static checks,
- integration or end-to-end checks,
- negative-path verification,
- schema or migration validation,
- configuration inspection,
- deployment preview,
- or targeted human review.

The existing Core Definition of Done and risk model remain authoritative for evidence strength.

## Transparency After Change

For material work, the completion output should make the actual resulting change discoverable rather than merely saying that the requested task is done.

Where relevant, summarize:

- what changed,
- material deviations from the original plan,
- verification performed,
- remaining risks or debt,
- and any follow-up that still requires human decision.

Minor implementation details do not need exhaustive narration.

## Tool and Adapter Boundary

Technical write access does not grant change authority.

Adapters and tools may expose the capability to modify project state, but Runtime authorization must preserve this policy and the authorized task scope.

Generated files, automated migrations, refactoring tools, formatters, code generators, deployment tools, and agent-native instructions are all mutations when they change durable project state and are subject to the same authority boundary.

## Anti-Patterns

Avoid:

- silent "cleanup" during unrelated work,
- opportunistic architecture refactors without authorization,
- overwriting existing user artifacts because the framework has a preferred template,
- treating a writable repository as permission to modify everything,
- escalating repair scope after an agent-caused failure without reassessment,
- hiding destructive or high-impact changes inside generic implementation language,
- declaring completion without regression evidence where existing behavior was at risk,
- asking for confirmation on every trivial edit when the human already authorized a clear bounded task.

## Core Principles

> **The framework must never surprise the human with material project mutations.**

> **Existing projects are preserved by default and changed only within an authorized, understandable scope.**

> **A bounded task authorization may cover necessary implementation edits, but it never grants unrelated scope expansion.**

> **Unexpected failure narrows behavior toward containment and reassessment rather than triggering an uncontrolled repair cascade.**

> **Technical capability to write is never equivalent to authority to change.**
