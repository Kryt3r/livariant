---
type: standard
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Governance Levels

Not every statement in the framework has the same binding force.

Governance must make it explicit whether a rule is optional, expected, required, or forbidden.

## G0 — Recommendation

A recommended practice that is usually useful but may be skipped without a formal deviation when the concrete context provides a better reason not to follow it.

G0 does not create a compliance obligation.

Examples may include preferred review order, non-critical formatting conventions, or optional workflow improvements.

## G1 — Standard

The normal and expected way of working.

A G1 rule may be deviated from when justified by the concrete situation, but the reason should remain understandable.

Small local deviations may be recorded in the task context. Repeated, persistent, or systemic deviations require a formal Deviation Record.

Examples may include conventional commit formats, preferred documentation structure, or normal testing practices.

## G2 — Requirement

A binding condition that must be satisfied before the relevant process step may be considered complete.

A G2 rule must not be silently ignored.

If it cannot be satisfied, the task is blocked unless that specific rule explicitly allows a deviation path.

Examples may include required migration artifacts for schema changes, mandatory independent verification for defined high-risk work, or required human approval for selected decision classes.

## G3 — Prohibition / Hard Constraint

A hard boundary that must not be crossed through ordinary task-level exception handling.

A G3 rule has no task-local deviation path.

If a G3 rule itself should change, the governance must be changed deliberately through the decision and evolution process.

Examples may include committing secrets, fabricating verification results, silently changing acceptance criteria to claim completion, or representing an agent decision as human approval.

## Summary matrix

| Level | Meaning | Deviation | Typical mechanism |
|---|---|---|---|
| G0 | Recommendation | Freely allowed | Judgment |
| G1 | Standard | Allowed with rationale | Task note / Deviation Record |
| G2 | Requirement | Only when explicitly permitted | Gate |
| G3 | Hard constraint | No task-level exception | Hard stop / Governance change |

## Explicit normative language

Normative force must not be hidden behind vague wording such as “strongly recommended”, “should never”, or similar ambiguous phrases.

Where a statement creates a behavioral obligation, its governance level should be explicit when ambiguity would matter.

Example:

```text
Level: G3
Rule: Secrets must never be committed to version control.
```

## Document type and governance level are independent

A document's type describes what kind of document it is.

A governance level describes how binding a specific normative statement is.

A STANDARD document may therefore contain G1, G2, and G3 rules.

Descriptive statements do not require governance levels merely because they appear inside a normative document.

## Governance inheritance

The framework is layered:

```text
CORE
→ PATTERN
→ PROFILE
→ ADAPTER
→ PROJECT
```

Lower layers may strengthen governance requirements for their narrower scope.

They must not silently weaken higher-level requirements.

Example:

- Core: independent review is G1 for a class of work.
- Discord Profile: independent review becomes G2 for authentication-related work.

This is valid because the narrower layer increases rigor.

A project may not redefine a Core G3 rule as G1 through local configuration.

## Weakening higher-level governance

If a lower layer has evidence that a higher-level rule should be weakened, this must be handled as an explicit Governance Change Proposal rather than a local override.

The proposal should preserve:

- the existing rule,
- the proposed change,
- rationale,
- scope,
- identified risks,
- and required human decision authority.

Weakening Core G2 or G3 governance is normally a high-impact decision and should be treated accordingly by the decision system.

## Conflict resolution

When applicable governance rules appear to conflict:

1. The higher governance level takes precedence.
2. At the same level, the more specific valid rule takes precedence within its declared scope.
3. If equal-strength rules remain irreconcilable, stop and report a Governance Conflict.

Agents must not invent their own reconciliation for unresolved governance conflicts.

## Scope

Normative rules should define scope when it is not obvious.

Possible scopes include:

- GLOBAL
- PROFILE
- PROJECT
- COMPONENT
- ENVIRONMENT
- TASK_CLASS
- RISK_CLASS
- TEMPORARY

A narrow rule must not be generalized beyond its intended scope merely because an agent finds it convenient.

## Temporal scope and review triggers

Governance may be intentionally temporary.

Temporary rules should define an expiry condition, review trigger, or bounded lifecycle where practical.

Examples:

```text
Scope: migration phase
Review trigger: database separation complete
```

or:

```text
Valid until: 2026-12-31
```

This prevents temporary constraints from becoming undocumented permanent governance.

## Normative vs. descriptive statements

Only normative statements require governance classification.

A normative statement defines what should, must, may, or must not happen.

A descriptive statement explains architecture, history, context, rationale, or observed state.

The framework should not add G-level metadata to purely descriptive prose merely for consistency.

## Agent interpretation

Agents must not creatively reinterpret G2 or G3 requirements merely to satisfy the perceived spirit of a task.

For a binding rule, the valid options are:

- satisfy it,
- use an explicitly permitted deviation mechanism,
- report a conflict or block,
- or initiate a governance-change process where appropriate.

Quietly redefining a requirement is not permitted.

## Human authority and hard constraints

Human ownership remains authoritative over project direction.

However, a human request to violate an active G3 rule is not treated as an ordinary task-level override.

The agent should state that the requested action conflicts with an active hard constraint and, if the owner genuinely intends to change that rule, route the change through the governance-evolution process.

This preserves human control without making hard constraints meaningless.

## Governance debt

The framework does not use a general “governance debt” category to normalize unfulfilled requirements.

- G0 may be skipped.
- G1 may be deviated from with appropriate rationale.
- G2 may only be deviated from when the rule explicitly provides such a path.
- G3 has no task-level deviation path.

Mandatory governance must not degrade into an accumulating backlog of ignored obligations.

## Enforcement

Governance strength and technical enforceability are different dimensions.

A rule may be enforced through one or more mechanisms such as:

- AUTOMATED
- REVIEW
- HUMAN
- HYBRID

The framework remains open to machine-readable enforcement metadata, but enforcement automation is not required for the baseline governance model.

## Core rules

> **Governance must be explicit about what is optional, expected, required, and forbidden.**

> **Lower layers may strengthen higher-level governance, but must not silently weaken it.**

> **A hard constraint can only be changed by changing the governance, not by ignoring it for one task.**
