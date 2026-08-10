---
type: core-policy
status: accepted
domain: studio-runtime
language: en
owner: framework
---

# Runtime Safety, Authority & Intervention

**Foundation:** FOUNDATION-04G

## Purpose

The Studio may operate autonomously only inside explicit authority boundaries. Technical capability does not imply permission to use that capability, and runtime autonomy must scale with real consequence, reversibility, and governance.

> Autonomy must operate inside explicit authority boundaries.

## Authority classes

A project may map concrete permissions to conceptual authority classes such as:

- **A0 — Observe** — read, analyze, compare, document, and recommend.
- **A1 — Reversible Change** — make local or clearly reversible changes within accepted scope.
- **A2 — Controlled External Change** — modify shared or external systems within explicit policy boundaries.
- **A3 — Conditionally Delegated Change** — prepare the consequential action, but execution authority exists only after the required scoped human approval or other explicitly defined gate has been satisfied.

These are semantic classes, not a simple monotonic ladder in which a larger number means more permanent agent power. In particular, A3 represents a stronger human gate before temporary scoped execution authority is granted.

The exact implementation may vary by adapter or project, but the semantics should remain clear.

## Capability is not authority

> Capability is not authority.

A tool or model may technically be able to deploy, delete, send, merge, rotate, or modify production state. That does not grant permission to perform those actions.

Authority derives from governance, project policy, delegated scope, and current task state rather than tool reachability.

## Least authority

> Agents should operate with the least authority sufficient for the current work.

Read-only specialists should not inherit write authority. Branch-level implementation should not imply production authority. Review roles should not silently inherit deployment or destructive permissions.

Authority must be explicitly delegated rather than inherited through orchestration.

## Reversibility and consequence

Authority depth should increase with the consequence and reversibility of an action.

Common low-impact examples include local file changes, tests, and branch-level edits. High-consequence examples may include production data mutation, irreversible migrations, account changes, credential rotation, public release, destructive infrastructure operations, or material new financial commitments.

## Production boundary

Production is a privileged environment rather than merely another deployment target. Production changes may affect real users, real data, public behavior, cost, compliance, and recovery obligations.

Production-changing authority should therefore be explicitly governed and human-gated by default unless a project policy deliberately grants a narrower autonomous path.

## Scoped approval

Human approval must describe the action being authorized, its expected impact, risk, relevant evidence, and rollback or recovery characteristics when material.

> Approval is scoped and cannot silently transfer to changed or adjacent actions.

If scope, state, risk, or evidence materially changes after approval, the runtime must reassess whether the approval remains valid.

For A3 work, approval grants only the temporary execution authority necessary for the approved action or bundle. It does not permanently promote the agent's authority class for future tasks.

## Pre-action verification

Before consequential actions, the runtime should verify as appropriate:

- target identity,
- current state,
- delegated authority,
- approval validity,
- evidence validity,
- rollback or recovery understanding.

The depth of this preflight should scale with consequence.

## External side effects

Actions that change state outside the local execution environment should be treated as side effects. Examples include deployments, database writes, external messages, issue creation, cloud configuration changes, billing actions, and API mutations.

Side effects require stronger state, recovery, and audit semantics than pure analysis.

## Cost-bearing actions

Agents must not silently create materially new financial commitments. Existing low-level usage within an accepted project policy may be autonomous; new infrastructure, paid services, major API spend, or other material commitments should follow project cost governance.

Mandatory quality or governance requirements must not be silently weakened for cost reasons. If sufficient capability is unavailable within allowed budgets, the limitation must be exposed and handled through normal escalation.

## Secret handling

> Secrets are capabilities to reference, not knowledge to propagate.

Agents may identify that a secret is required and may reference its configured name or purpose. Secret values must not be stored in runtime state, committed files, logs, or unnecessary context packets.

Secret access should remain limited to the minimum work that requires it.

## Safe preparation under insufficient authority

When execution authority is insufficient, safe non-side-effecting work may continue where useful. The Studio may analyze, plan, simulate, create diffs, run dry-runs, prepare rollback plans, or collect evidence before a human gate.

> When authority is insufficient, preparation should continue where safe.

## Dry-run preference

Dry-runs, previews, schema diffs, impact estimates, simulations, or comparable non-destructive evidence should be used before consequential actions when they materially reduce uncertainty.

## Confirmation fatigue

Human confirmation should be reserved for material authority transitions or consequences rather than routine reversible motion.

> Guard consequence, not motion.

Closely related consequential actions may be approved as one clearly described bundle when their scope and risks are understood in advance.

## Runtime intervention

The runtime should support human intervention states such as:

- **PAUSE** — stop initiating new side effects, reach a safe checkpoint, and preserve runtime state.
- **STOP** — end active work in a controlled manner and start no new work units.
- **REPLAN** — stop following the current execution strategy and reassess the graph.
- **ROLLBACK** — execute a validated recovery path only when authority, evidence, and impact are understood.

Rollback is an operation, not an emotional reaction. It may itself be risky and must be governed accordingly.

## Emergency authority

Emergency authority must be predefined by project or profile policy. A runtime must not invent unlimited emergency power after an incident begins.

Permitted emergency actions should focus on the smallest safe intervention that limits ongoing harm, such as disabling a compromised integration or pausing a dangerous worker where explicitly authorized.

Emergency intervention should be followed by runtime-state capture, human notification, applicable deviation handling, recovery, and post-incident learning.

## Actual impact controls authority

> Authority follows actual impact, not original expectation.

If new evidence reveals that a task affects more systems, users, data, or risk than initially believed, the runtime must reclassify and apply the stronger resulting authority and governance requirements immediately.

A task originally considered low-risk does not retain low-risk authority after material scope surprise.

## Permission drift

Changes in technical permissions do not automatically change runtime authority. A newly available production credential or expanded platform role must not be used unless governance and delegated authority also permit it.

## Multi-agent authority

Each agent or role receives only the authority required for its work. Specialists do not inherit Director authority, and dispatched agents do not inherit one another's permissions.

Relevant runtime state may record the allowed and denied operations for a work unit when doing so improves safety and auditability.

## Governance changes versus exceptions

A request to permanently grant broader authority should be treated as a governance or project-policy change, not smuggled through as a one-task exception when the effect is intended to persist.

This preserves the framework's distinction between temporary deviation and deliberate evolution.

## Human-facing approval UX

Approval requests should compress internal complexity and present the decision the human actually needs to make: action, impact, risk, evidence, rollback characteristics, blocked scope, and a recommendation when appropriate.

The human should not need to reconstruct internal agent traffic before approving or rejecting a consequential action.

## Auditability

For critical side effects, the runtime should be able to reconstruct what initiated the action, which authority applied, what approval existed, which state was targeted, and what result was observed.

Auditability exists to support recovery and responsibility, not to create process theater.

## Core principles

> **Autonomy must operate inside explicit authority boundaries.**

> **Capability is not authority.**

> **Authority classes describe operational conditions, not a simple ladder of increasing permanent power.**

> **Agents should operate with the least authority sufficient for the current work.**

> **Approval is scoped and cannot silently transfer to changed or adjacent actions.**

> **A3 approval grants temporary scoped execution authority, not permanent authority expansion.**

> **Authority follows actual impact, not original expectation.**

> **Human confirmation should guard material consequence, not routine motion.**

> **When authority is insufficient, safe preparation may continue.**

> **Emergency authority must be predefined and limited to the smallest safe intervention.**

> **Secrets are capabilities to reference, not knowledge to propagate.**

> **Rollback is an operation that requires evidence and authority, not a reflex.**

> **Authority must be delegated explicitly and never inherited implicitly through orchestration.**

> **Guard consequence, not motion.**
