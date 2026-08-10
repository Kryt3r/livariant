---
type: standard
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Task Classification and Risk Model

> **Process rigor follows consequence, not effort.**
>
> **Unknown risk is not low risk.**

The framework classifies work on independent axes so that task size does not become a proxy for risk.

A small change may require maximal review if its failure modes are severe. A large change may require less stringent controls when it is isolated and easily reversible.

## 1. Task Size

Task size describes work scope, coordination need, and architectural breadth.

### T0 — Trivial
A tiny change with clear cause and clear solution.

Typical examples:
- copy or spelling correction,
- comments,
- obvious one-line safe change,
- narrow documentation correction.

Typical process:
- no written plan,
- no specialist dispatch,
- minimal verification.

### T1 — Local
A bounded change in one clearly scoped area.

Typical examples:
- one bug fix,
- one component,
- one small endpoint,
- local refactor,
- small configuration change.

Typical process:
- short analysis,
- no broad architecture decision,
- targeted verification.

### T2 — Systemic
A change spanning multiple files, components, layers, or responsibilities.

Typical examples:
- a new feature,
- API plus frontend work,
- a new module,
- multi-layer data flow,
- a larger refactor.

Typical process:
- explicit understanding of the problem,
- written plan,
- relevant specialist perspectives where useful,
- defined review,
- full applicable Definition of Done verification.

### T3 — Structural
A new system or a change with wide architectural consequences.

Typical examples:
- new authentication architecture,
- new data architecture,
- repository split,
- major migration,
- new plugin or module system,
- fundamental product logic change.

Typical process:
- architecture work,
- explicit alternatives,
- durable decision documentation where appropriate,
- multiple review perspectives,
- migration and rollback consideration,
- strong completion evidence.

## 2. Risk

Risk describes the severity of plausible failure, independent of task size.

### R0 — Negligible
Failure would be easy to detect and easy to reverse.

Examples:
- copy,
- README content,
- cosmetic low-impact UI changes.

### R1 — Limited
Failure can affect functionality but remains local and recoverable.

Examples:
- local UI bug,
- non-critical business logic,
- internal tooling.

### R2 — High
Failure may affect multiple users, data, tenants, or production behavior.

Examples:
- API behavior,
- database write paths,
- tenant isolation,
- background jobs,
- production configuration.

### R3 — Critical
Failure may affect security, money, authorization, data integrity, or irreversible state.

Examples:
- authentication,
- authorization,
- root or administrative privileges,
- secrets,
- billing,
- destructive or schema migrations,
- deletion,
- webhook verification,
- security policies,
- product-wide deployment controls.

## 3. Risk Dimensions

Risk should be derived from concrete dimensions rather than assigned by intuition alone.

Evaluate at least:

### Security Risk
Could the change enable unauthorized access, disclosure, privilege escalation, or manipulation?

### Data Risk
Could the change corrupt, lose, misassign, expose, or incorrectly migrate persistent data?

### Operational Risk
Could the change affect availability, deployment, recovery, or production stability?

### Financial Risk
Could the change incorrectly affect payments, pricing, entitlements, credits, invoices, or other billable state?

### Product / Trust Risk
Could the change significantly mislead users, damage a critical workflow, or materially harm public trust?

The highest applicable dimension defines the minimum overall risk level. Do not average risk downward.

## 4. Blast Radius

Classify the scope of plausible impact separately from severity.

### LOCAL
One user, one component, or one isolated internal path.

### TENANT
One customer, workspace, guild, project, account, or equivalent isolation boundary.

### MULTI_TENANT
Multiple independent customers or isolation domains may be affected.

### GLOBAL
The entire product, infrastructure, or shared control plane may be affected.

A small diff with a global blast radius must not be treated as low importance merely because implementation scope is small.

## 5. Reversibility

Classify how difficult it would be to undo the change and its consequences.

### EASY
A normal code rollback is sufficient and does not require data repair or external coordination.

### MODERATE
Rollback requires additional operational steps or coordinated state restoration.

### HARD
The change affects public contracts, persistent user state, schemas, external dependencies, or data in ways that make rollback costly or incomplete.

### IRREVERSIBLE
The action may create effects that cannot be reliably undone, such as permanent data loss or completed external financial transactions.

Hard or irreversible changes increase required review and verification even when the nominal risk category remains unchanged.

## 6. Uncertainty and Confidence

These are related but distinct.

### Uncertainty
Describes how many relevant facts remain objectively unknown.

Examples:
- unknown production consumers,
- undocumented dependencies,
- unclear data ownership,
- incomplete runtime topology.

Unknown risk is not low risk. High uncertainty requires investigation and may raise process rigor.

### Confidence
Describes how strongly the current assessor can justify the classification based on available evidence and understanding.

A task may have:
- low uncertainty but low confidence because the assessor lacks domain familiarity,
- high uncertainty but high confidence that the unknowns are real and material.

Low confidence should trigger additional analysis, source inspection, or an independent perspective rather than silent guesswork.

## 7. Risk Override

Risk can override task-size process defaults.

### R3 Override
Any R3 task receives at least T3-level review and verification rigor regardless of nominal task size.

Examples:
- T0/R3 → do not treat as trivial,
- T1/R3 → T3 review gate,
- T2/R3 → T3 review gate,
- T3/R3 → maximum applicable review path.

### R2 Minimum
R2 work requires at minimum:
- an explicit plan,
- at least one additional explicitly defined review perspective,
- relevant regression testing where technically feasible,
- rollback/failure consideration for persistent or production-impacting changes.

The required independence level for that review is defined by the Review and Independence Model and may be strengthened by Profiles.

Profiles may define additional mandatory triggers and stronger requirements.

## 8. Derived Classification, Not Free Assertion

Agents and humans should not assign labels without evidence.

A classification should be justified from observable triggers and constraints.

Example:

```text
Risk Assessment

- Authentication touched: yes
- Multi-tenant boundary touched: yes
- Data migration: no
- Rollback difficulty: hard

=> Risk: R3
```

The purpose is not bureaucratic scoring. It is to make the reason for process rigor inspectable.

## 9. Classification Record

For non-trivial work, use a compact record such as:

```text
Task Classification

Size: T2
Risk: R3
Blast Radius: MULTI_TENANT
Reversibility: HARD
Confidence: LOW
Uncertainty: MEDIUM

Primary risk:
Tenant authorization boundary

Effective process:
T3 review gate required
```

Keep this concise. The classification should guide work, not become a separate project.

## 10. Effective Process

Task size determines coordination needs.
Risk determines process rigor.
Blast radius, reversibility, uncertainty, and confidence can strengthen the required process further.

Indicative mapping:

| Classification | Plan | Review | Testing | ADR | Model Fit |
|---|---|---|---|---|---|
| T0/R0 | No | No | Optional | No | No |
| T1/R1 | Brief | Optional | Targeted | No | Only on mismatch |
| T2/R1 | Yes | 1 review | Yes | When justified | Yes |
| T2/R2 | Yes | Required | Required | When justified | Yes |
| T1/R3 | Yes | T3 gate | Regression required | When justified | Required |
| T3/R3 | Detailed | Multiple independent reviews | Comprehensive | Usually | Required |

This table is a baseline. Governance and Profiles may define stronger requirements.

## 11. Profile-Specific Risk Triggers

The Core defines the classification mechanism, not domain-specific trigger lists.

Profiles define what is especially sensitive in their domain.

Examples:

A Discord Platform Profile may treat the following as mandatory high-risk triggers:
- OAuth,
- sessions,
- tenant/guild isolation,
- Discord permissions,
- billing,
- webhooks,
- uploads,
- database migration,
- secrets,
- root/admin controls,
- integration contracts.

A Game Development Profile may define different triggers such as:
- real-money purchase paths,
- economy mutations,
- save data,
- anti-cheat,
- account systems,
- migrations.

This keeps domain knowledge out of the Core while preserving strict risk governance.

## 12. Future Workflow Resolution

The framework should eventually be able to resolve process requirements deterministically from classification inputs.

Conceptually:

```text
Classification
    ↓
Workflow Resolver
    ↓
Required plan depth
Required roles
Required reviews
Required verification
Required model-fit gate
Required documentation
```

Automation may support this later, but the underlying decision logic must remain inspectable and tool-independent.
