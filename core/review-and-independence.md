---
type: standard
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Review and Independence Model

Review is not a ceremonial second opinion. It is a deliberate attempt to discover defects, blind spots, invalid assumptions, and unintended consequences.

> **A reviewer should try to falsify the solution, not validate the author's confidence.**

Independence is not a label. It is a property of the review process and must be represented honestly.

## Review goals

Reviews must have an explicit purpose. Common review types include:

- **Correctness Review** — verifies that the solution satisfies the intended behavior and acceptance criteria.
- **Regression Review** — looks for existing behavior that may have been unintentionally damaged.
- **Security Review** — examines trust boundaries, authorization, input handling, data access, secrets, abuse paths, and other security-relevant behavior.
- **Architecture Review** — evaluates boundaries, coupling, reversibility, long-term maintainability, and decision-record implications.
- **Product / UX / Design Review** — evaluates product intent, usability, interaction quality, accessibility, and visual identity where relevant.

A generic “review the diff” instruction is insufficient for meaningful work when a more specific review goal can be identified.

## Review depth follows risk

Review effort is proportional to task risk, impact, uncertainty, and reversibility.

Typical baseline behavior:

- T0/R0: independent review is normally unnecessary.
- T1/R1: self-review and targeted verification are usually sufficient.
- T2 or R2: at least one explicitly defined additional review perspective is expected.
- T3 or R3: at least one genuinely independent review perspective is required; multiple perspectives may be required when several risk domains are involved.

A small high-risk change must not receive a shallow review merely because its diff is small.

## Independence levels

### I0 — Self Review

The implementer reviews their own work.

This is useful but not independent.

### I1 — Context-Separated Review

The same model or agent performs a separate review pass designed to reduce continuation bias.

Where possible, the review should use:

- a new thread, isolated context, or separate subagent,
- the task intent,
- acceptance criteria,
- relevant invariants,
- task classification,
- the actual diff or implementation result,
- and required standards,

without priming the reviewer to confirm the original author's reasoning.

I1 is stronger than self-review but must not be represented as fully independent.

### I2 — Independent Reviewer

A different agent, model, tool, or qualified human performs the review with its own reasoning context.

This is the framework's strongest baseline independence class.

Profiles may require I2 for particular high-risk domains.

## Honest representation of review independence

A project using only one model or one agent may still use the framework.

The same model may perform implementation and review sequentially when no stronger option is available, but the resulting independence level must be stated accurately.

Example:

```text
Review Independence: I1
Reviewer: same model, isolated review pass
```

Do not report an “independent review” when no independent reviewer was used.

## Adversarial review posture

Review should actively challenge the solution.

A reviewer should look for, where relevant:

- violated invariants,
- unhandled edge cases,
- missing negative tests,
- authorization or isolation failures,
- unsafe data paths,
- hidden coupling,
- unsupported assumptions,
- incomplete rollback or failure behavior,
- unnecessary complexity,
- scope creep,
- incomplete operational handling,
- and missing knowledge consolidation.

The objective is not to be hostile. The objective is to reduce confirmation bias.

## Required review context

Meaningful review should inspect more than code style.

Where applicable, the reviewer should receive or retrieve:

- task intent,
- acceptance criteria,
- task and risk classification,
- relevant invariants,
- implementation diff or changed behavior,
- relevant architectural or governance constraints,
- test and verification evidence,
- known uncertainties and limitations.

Without this context, a reviewer may only be able to judge implementation appearance rather than whether the correct problem was solved.

## Finding severity

Review findings use the following baseline severity classes.

### F0 — Note

No defect is established. Informational observation only.

### F1 — Minor

A real improvement is desirable but the issue does not materially threaten correctness, security, data integrity, or the accepted outcome.

### F2 — Major

A meaningful weakness, defect, or risk exists. It must be fixed before Done unless the framework explicitly permits it to be accepted as documented debt.

### F3 — Critical

A critical security, authorization, data-integrity, production, or fundamental architectural issue exists.

F3 blocks Done.

Critical findings must not be converted into ordinary follow-up debt when doing so would expose the affected system to the identified risk.

## Finding resolution

Reviewer and implementer disagreement is allowed and expected.

A finding follows a resolution path such as:

```text
Finding
→ Implementer Response
→ Reviewer Re-evaluation
→ Resolved / Accepted Risk / Escalated
```

A finding does not disappear because the implementer disagrees with it.

For high-risk, D2/D3, or F3 disputes, human decision authority may be required by the decision or governance model.

## Review is not style policing

Review must not turn personal preference into mandatory work when no relevant standard, invariant, requirement, or product objective is violated.

Avoid:

- unnecessary nitpicking,
- speculative refactors,
- preference-based rewrites,
- and “I would have implemented it differently” findings without a concrete engineering reason.

Review effort should focus on correctness, risk, maintainability, governance, invariants, operations, and product or design objectives.

## No unbounded review recursion

The framework does not require review of review indefinitely.

Once required findings are resolved and the required evidence exists, the review can close.

Additional review rounds are justified only when:

- material new changes were introduced,
- important new risk was discovered,
- or the applicable governance explicitly requires another independent pass.

## Independence budget

Independent review has a cost in time, model usage, human attention, and sometimes money.

> **Independence should be spent where consequence justifies it.**

Low-risk work should not incur maximal review overhead.

High-risk work must not avoid independence merely to reduce cost or latency.

## Cross-model and cross-tool review

When several suitable environments are available, using a different model family or tool for review can provide valuable diversity of reasoning and failure modes.

Example:

```text
Implementation: environment A
Security Review: environment B
Verification: reproducible automated tests
```

Cross-model review is a strong optional mechanism, not a universal Core requirement.

Concrete model recommendations belong to adapters and model-routing rules rather than this document.

## Human review is not automatically stronger

Human review can be shallow or incorrect just as automated review can be.

Human involvement does not by itself prove quality.

Independence, relevant competence, appropriate review context, and review quality all matter.

## Review report

For T2/T3 or R2/R3 work, a concise structured review result should normally record:

```text
Review Report

Type:
Security + Regression

Independence:
I2

Findings:
F2 — missing negative permission test
F1 — unclear error handling

Resolution:
F2 fixed
F1 accepted as permitted follow-up

Remaining Risk:
Low

Verdict:
PASS
```

The exact format may vary by project or adapter, but the result must remain understandable and auditable.

## Review verdicts

### PASS

No blocking findings remain and required evidence is present.

### PASS_WITH_DEBT

Only explicitly permitted and documented residual issues remain.

For R3 work, PASS_WITH_DEBT must not be used to carry unresolved critical security, authorization, or data-integrity risk into production.

### REWORK_REQUIRED

Meaningful findings must be corrected before the task can progress to Done.

### BLOCK

A critical defect, governance violation, missing mandatory evidence, or unresolved hard constraint prevents completion.

## Relationship to Project Intelligence

Reviews are not only gates. They are learning events.

A review may reveal durable knowledge such as:

- a recurring defect class,
- a new invariant,
- a security assumption,
- a dangerous pattern,
- a design anti-pattern,
- or an operational weakness.

When such knowledge has future value, it should be consolidated through the framework's knowledge lifecycle rather than remaining trapped in one review report.

## Core rules

> **Review should actively search for what the implementer may have missed.**

> **Review independence must be represented honestly and applied proportionally to risk.**

> **Review findings should improve future work, not merely judge the current diff.**
