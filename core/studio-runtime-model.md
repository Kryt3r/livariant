---
type: standard
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Studio Runtime Model

The Studio Runtime turns framework knowledge into coordinated execution. Its purpose is to orchestrate only the expertise, context, verification, and review that materially improve an outcome.

> **The Studio orchestrates expertise; it does not simulate bureaucracy.**

## Scope and canonical ownership

This document is the integration overview for FOUNDATION-04. It explains how the Studio Runtime fits together, but specialized runtime behavior is canonically defined in the dedicated documents that follow:

- **04B** — Role Resolution & Dispatch Model
- **04C** — Context Routing & Handoff Protocol
- **04D** — Workflow Resolution & Execution Graph
- **04E** — Capability & Model Routing
- **04F** — Runtime State, Trace & Recovery
- **04G** — Runtime Safety, Authority & Intervention
- **04H** — Runtime Learning & Self-Improvement

Where a summary here and a specialized document differ in detail, the specialized document is the canonical source for its domain.

## Director

The Director is the integration and orchestration role for a task. It is responsible for understanding intent, loading relevant project intelligence, classifying work, resolving governance, selecting required expertise, coordinating work units, integrating specialist output, ensuring verification, and completing knowledge consolidation.

The Director is not assumed to be the strongest specialist in every domain and must not treat its own judgment as automatically superior to specialist evidence.

Specialists may challenge the Director through constructive dissent.

## Roles, agents, and models are separate concepts

The framework distinguishes:

- **Role** — the perspective or responsibility required by the work.
- **Agent** — a concrete execution instance that performs a role for a particular work unit or review pass.
- **Model** — the underlying model or system used by that agent.

> **Roles describe required perspectives, not personalities or specific models.**

The Core must not encode provider-specific model names as universal requirements. Adapters and model-routing mechanisms translate role and capability requirements into concrete available models and tools.

## Roles are capability contracts

Roles should be defined by purpose, triggers, required context, expected output, authority boundaries, and responsibilities rather than fictional personalities.

A role may be executed by different models or tools. One model may also execute multiple roles in separate passes when necessary.

Review independence remains a property of the review process and execution relationship, not an intrinsic capability label on a model.

## Minimum Necessary Expertise

> **Dispatch only expertise that can materially improve the outcome.**

The Studio must not activate specialist roles merely because they exist. Required perspectives should be resolved from task classification, affected systems, governance, decision class, design importance, uncertainty, and domain-specific profile rules.

Trivial work should remain trivial. High-consequence or cross-domain work may justify several focused perspectives.

## Core roles and profile roles

The framework may define reusable Core roles such as:

- Director,
- Architect,
- Implementer,
- Reviewer,
- Security,
- Verification,
- Product,
- Design,
- Design Critic,
- Knowledge Curator.

Profiles may define additional domain-specific roles without inflating the Core. Examples may include Discord integration, multi-tenant isolation, game economy, or progression-system expertise.

## Runtime role resolution

Required expertise should be derived dynamically from project context rather than selected manually by default.

Conceptually:

```text
Task Classification
+
Affected Systems
+
Governance
+
Decision Class
+
Design Importance
+
Uncertainty
↓
Role Resolver
```

The Director may request additional expertise when new dependencies or risks emerge, but additional dispatch should be justified rather than precautionary role inflation.

Detailed role-resolution semantics are defined in FOUNDATION-04B.

## Specialist Contract

A specialist role should have a concise contract containing, where relevant:

- purpose,
- typical triggers,
- required context,
- expected output,
- mandatory checks,
- authority boundaries,
- explicit non-responsibilities.

For example, a Security role may inspect trust boundaries and challenge assumptions while remaining unable to redefine product requirements or grant approval outside its delegated authority.

## Context minimization

> **Context should be sufficient, not maximal.**

Specialists should receive the minimum sufficient context for reliable work and retain the ability to retrieve more when necessary.

Providing every specialist with the complete Project Brain by default can increase cost, distraction, confirmation bias, and irrelevant reasoning. Progressive disclosure applies to runtime orchestration as well as documentation.

## Context Packets

Focused work may be dispatched through a Context Packet containing the information required for the assigned role, such as:

```text
Task Intent
Acceptance Criteria
Classification
Relevant Invariants
Affected Components
Relevant Decisions
Known Unknowns
Assigned Role
Expected Output
```

The packet is a starting context, not a constraint against retrieving additional required evidence.

Agents must not guess when missing context is material.

Detailed context-routing and handoff semantics are defined in FOUNDATION-04C.

## Structured specialist output

Role output should be structured enough for integration without forcing every role into an identical schema.

Examples include:

### Review

```text
Findings
Evidence
Severity
Recommendation
Remaining Uncertainty
```

### Architecture

```text
Current State
Constraints
Options
Trade-offs
Recommendation
ADR Trigger
```

### Design

```text
Intent
Directions
Trade-offs
Recommendation
Open Unknowns
```

The objective is reliable synthesis, not administrative formatting for its own sake.

## Specialist output is not automatic truth

> **Specialist output is input to Director reasoning, not automatic truth.**

The Director must integrate specialist results against project intent, governance, other evidence, existing decisions, complexity cost, and conflicting perspectives.

A specialist recommendation does not automatically authorize implementation.

## Specialist disagreement

Disagreement between roles is expected when legitimate objectives conflict.

A Security perspective may prefer stronger isolation while Operations may identify meaningful complexity cost and Product may prioritize latency or usability.

The Director should expose the actual trade-off, apply governance and decision authority, and either resolve the conflict within delegated authority or escalate it.

Do not average incompatible recommendations merely to produce consensus.

## Focused handoffs

The Studio should prefer focused dispatch and integration over long simulated multi-agent conversations.

A typical pattern is:

```text
Director
↓
Focused Dispatch
↓
Specialist Result
↓
Director Integration
↓
Optional Targeted Counter-Review
```

Additional rounds should occur when evidence, unresolved findings, or meaningful conflict justify them.

## Parallelization

Independent perspectives or work units may run in parallel when they share a stable sufficient baseline.

Dependent decisions should not be parallelized prematurely. Parallel implementation against an unresolved architecture or data contract can create contradictory work and unnecessary merge conflict.

Canonical state integration remains conflict-aware and is defined in FOUNDATION-04F; parallel execution does not imply parallel uncontrolled writes to task truth.

## Work ownership

Each active work unit should have a clear owner.

> **One work unit should normally have one active implementation owner at a time.**

Multiple agents may analyze, critique, review, or propose alternatives, but the accepted implementation should normally be integrated by one active owner for that work unit.

This Single-Writer Principle reduces contradictory edits and merge conflict while preserving independent review.

## Completion ownership

The Director owns task-level integration and completion. A specialist verdict is not task completion.

Before declaring `DONE`, the Director must resolve the effective Definition of Done, including relevant acceptance criteria, verification evidence, review results, governance gates, debt, and knowledge consolidation.

## Claims versus evidence

The runtime must preserve the distinction between claims and evidence.

An agent must not report tests as passing when they were not executed. The Director must not convert an unsupported specialist assertion into verified evidence.

```text
CLAIM ≠ EVIDENCE
```

This applies to implementation, testing, review, security, design, deployment, and all other runtime activities.

## Runtime trace

Relevant work should remain reconstructable through a concise execution trace, for example:

```text
Task classified T2/R2
↓
Backend perspective dispatched
↓
Security review dispatched
↓
Implementation completed
↓
F2 finding discovered
↓
Finding resolved
↓
Integration verification passed
↓
Knowledge consolidated
↓
DONE
```

A runtime trace is not a full conversation transcript. It preserves the significant decisions, transitions, evidence, and gates needed to understand why the work reached its final state.

Detailed state, trace, resume, and conflict-integration semantics are defined in FOUNDATION-04F.

## Transparent degradation

> **The runtime must degrade transparently when fewer agents, models, or tools are available.**

The framework must remain usable with one model, several models, local tools, connected agents, or human team members.

When only one model is available, multiple roles may be executed through separate passes and the resulting independence level must be reported honestly. When independent agents or models are available, stronger independence may be used where justified.

Unavailable capabilities must reduce claimed confidence or verification strength rather than be silently assumed.

## Capability detection and model routing

The Runtime should operate on abstract capability requirements rather than provider-specific product names.

Potential capabilities may include:

- software implementation,
- high-depth reasoning,
- security analysis,
- review reasoning,
- vision,
- web research,
- terminal access,
- browser interaction,
- image generation.

Review independence is resolved from the relationship between implementation and review according to the I0/I1/I2 model; it is not an intrinsic model capability.

Adapters determine which concrete models and tools can supply required capabilities in the current environment. Detailed routing semantics are defined in FOUNDATION-04E.

## Logical before technical orchestration

The Studio Runtime is a logical operating model and does not require a fully automated multi-agent orchestration engine in the initial framework version.

The same runtime can initially be executed through explicit passes, subagents, separate conversations, or human coordination. Automation should be introduced when it produces demonstrated value.

## Baseline runtime flow

```text
USER INTENT
    ↓
DIRECTOR
    ↓
Load Project Intelligence
    ↓
Classify Task
    ↓
Resolve Governance
    ↓
Resolve Required Capabilities
    ↓
Resolve Roles
    ↓
Create Context Packets
    ↓
Dispatch Specialists / Work Units
    ↓
Integrate Results
    ↓
Implement
    ↓
Verify
    ↓
Review
    ↓
Resolve Findings
    ↓
Completion Gate
    ↓
Knowledge Consolidation
    ↓
DONE
```

The exact depth of this flow remains proportional to the work. It is a reasoning model, not mandatory ceremony for every task.

## Core principles

> **The Studio orchestrates expertise; it does not simulate bureaucracy.**

> **Roles describe required perspectives, not personalities or specific models.**

> **Role, agent, and model are separate concepts.**

> **Dispatch only expertise that can materially improve the outcome.**

> **Context should be sufficient, not maximal.**

> **Specialist output is input to Director reasoning, not automatic truth.**

> **One work unit should normally have one active implementation owner at a time.**

> **The Director owns integration and completion, not every specialist decision.**

> **The runtime must degrade transparently when fewer agents, models, or tools are available.**
