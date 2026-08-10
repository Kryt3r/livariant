---
type: core-policy
status: accepted
domain: studio-runtime
language: en
owner: framework
---

# Context Routing & Handoff Protocol

**Foundation:** FOUNDATION-04C

## Purpose

Context routing determines what each role must know, how that knowledge is sourced and refreshed, and how conclusions survive handoffs without creating context bloat or knowledge corruption.

> Context should be routed by relevance, authority, and freshness — not dumped wholesale.

## Context Packet

Relevant dispatches should receive a structured Context Packet containing enough information to reason correctly without requiring the specialist to reconstruct the full project history.

A Context Packet may include:

- task intent,
- assigned role,
- expected output,
- task classification,
- affected systems,
- relevant invariants,
- relevant decisions,
- known unknowns,
- current execution state,
- authority boundaries,
- freshness or state anchor.

The exact shape should remain proportional to the work.

## Minimum sufficient context

> A specialist should receive the minimum context sufficient to reason correctly, plus a path to retrieve more.

Too little context encourages incorrect assumptions. Too much context increases noise, cost, stale-information risk, and confirmation bias.

## Context layers

Context may be progressively disclosed in conceptual layers:

```text
L0 — Task Core
Intent, scope, acceptance criteria

L1 — Governance
Risk, invariants, relevant policies

L2 — Local System
Affected files, services, interfaces, data flows

L3 — Project Intelligence
Relevant ADRs, patterns, known constraints

L4 — Extended Context
Historical decisions, related systems, broader documentation

L5 — Full Brain
Only when genuinely necessary
```

Specialists should not default to loading the entire Project Brain.

## Provenance and inference

Context is not automatically truth merely because it appears in a packet. Relevant information should retain provenance where useful, such as:

- accepted ADR,
- current implementation,
- user decision,
- profile rule,
- verified observation,
- inference.

> Inference must remain distinguishable from source fact.

This prevents assumptions from becoming false project truth across repeated handoffs.

## Freshness and state anchoring

> Stale context is a correctness risk.

Important review and verification evidence should remain anchored to the state that was actually inspected. Relevant state anchors may include branch, commit, working-state identifier, or another implementation-specific marker.

If material changes occur after review or verification, prior evidence must be re-evaluated to determine whether it is still valid.

> Evidence must remain anchored to the state it actually verified or reviewed.

## Handoff types

The runtime may use several directional handoffs:

- **Director → Specialist** — assignment, context, authority, and expected result.
- **Specialist → Director** — findings, evidence, uncertainty, recommendations, and new triggers.
- **Specialist → Specialist** — targeted transfer when a material dependency genuinely requires it.
- **Runtime → Human** — compressed decision or escalation context when human authority is required.

Internal coordination should not be exposed to the user unless it materially affects their decision.

## Specialist Result Contract

Specialist outputs should be structured enough for integration. Depending on role, a result may include:

- conclusion,
- findings,
- evidence,
- severity,
- recommendation,
- remaining uncertainty,
- new role triggers,
- confidence.

The objective is actionable transfer, not verbose transcripts.

## Context mutation

New evidence may change the runtime's understanding of the task. Newly discovered systems, risks, dependencies, or a valid new human direction should update the active context and may trigger redispatch, reclassification, graph replanning, evidence invalidation, or additional verification.

Context routing is therefore a continuous knowledge flow rather than a one-time initialization step.

## Context expansion requests

A specialist who lacks material information should request targeted context rather than guess or ask for the entire project.

> A material context gap must be resolved by retrieval, clarification, or escalation — never by invented continuity.

The request should identify what is missing and why it matters when practical.

## Context authority resolution

Relevant sources must not be collapsed into a single simplistic priority list. Conflicts should be resolved through a combination of:

```text
Applicable Governance / Hard Invariants
↓
Decision Authority
↓
Freshness
↓
Applicable Scope
↓
Evidence Strength
```

The ordering is a reasoning model, not a mechanical sorter. A valid current human decision may supersede older accepted project knowledge within the human's authority and the decision's scope, provided it does not violate higher-order governance or hard invariants.

Older project knowledge must not trap the project owner inside a superseded direction merely because it was previously canonical.

Conversely, a current request does not silently override governance, security invariants, or another boundary that requires an explicit governance change.

## Conflicting context

When two relevant sources conflict:

```text
Conflict detected
↓
Resolve applicable governance
↓
Resolve decision authority
↓
Compare freshness and scope
↓
Compare evidence strength
↓
Resolve if deterministic
or
↓
Escalate
```

The conflict itself may be important project intelligence and must not be hidden by silently selecting the most convenient source.

## Intent changes

A material human change of project or task direction should be treated as an explicit intent change rather than an ordinary low-level context edit.

When valid within human authority, an intent change should trigger impact analysis across affected scope, project knowledge, runtime graph, decisions, evidence, and accepted implementation state.

Conceptually:

```text
INTENT_CHANGED
↓
Validate authority and scope
↓
Compare old and new intent
↓
Mark affected knowledge stale / superseded where appropriate
↓
Re-evaluate task classification and execution graph
↓
Invalidate only affected work or evidence
↓
Preserve unaffected accepted state
↓
Consolidate the new durable direction when appropriate
```

A change of direction must not cause unrelated accepted state to be discarded by default.

## Context compression

Long-running projects require compression. Context may be consolidated by meaning, but provenance and significant rationale should not be destroyed merely to shorten the representation.

> Compress context by meaning, not by deleting provenance.

The objective is lower retrieval cost without loss of trustworthiness.

## Derived context

The runtime may derive new context from multiple accepted facts or rules. Derived conclusions should remain distinguishable from directly sourced statements when the distinction matters.

Derived context may drive role resolution or workflow decisions, but unverified derivation must not silently become canonical project knowledge.

## Context lifetime

Runtime information should be scoped by lifetime:

- **Ephemeral Context** — relevant only to the current work unit.
- **Task Context** — valid until the task concludes or changes materially.
- **Project Knowledge Candidate** — potentially durable insight awaiting consolidation.
- **Canonical Knowledge** — accepted durable project knowledge.

This prevents temporary workarounds and speculative observations from polluting the Second Brain.

## Handoff loss prevention

A meaningful handoff should preserve at least:

- what was concluded,
- what remains uncertain,
- what changed,
- what the next role must know.

A complete conversation transcript is usually unnecessary and may be actively harmful.

## Decision continuity

Accepted decisions should survive handoffs. A new specialist should not reopen settled questions merely because the decision was omitted from its context.

A decision may be challenged when valid reopen conditions, a higher-authority current decision, or material new evidence exist, but not through accidental amnesia.

> Accepted decisions must survive handoffs unless valid reopen conditions exist.

## Context poisoning protection

> Unverified agent conclusions must not silently become canonical context.

Useful knowledge states may distinguish concepts such as:

- observed,
- verified,
- accepted,
- inferred,
- disputed,
- superseded.

The exact representation may be implemented later; the semantic distinction is part of the baseline.

## User intent and observed state

User statements about intended behavior and observed technical state are different forms of evidence.

When declared intent conflicts with code or runtime observation, preserve both explicitly and resolve the conflict rather than silently choosing one.

The user owns product intent; the implementation reflects current technical state. Current intent may legitimately supersede older project intent when applicable authority and governance permit it.

## Role-specific packet templates

The Core defines the Context Packet concept. Roles and Profiles may define more specific packet requirements.

Examples may include trust boundaries for Security, identity and accepted state for Design, or resource sources and sinks for Economy analysis.

Role-specific templates should improve reasoning without creating fixed document ceremony for trivial work.

## Handoff quality

A material handoff is insufficient when critical elements such as scope, expected output, relevant invariants, known uncertainty, or reviewed state are missing in a way that could materially change the result.

When that occurs, improve the packet before relying on the downstream work.

## Human-facing context

Human escalations should compress internal analysis into a decision-ready form: decision needed, relevant trade-offs, recommendation, risk, and what is blocked.

This implements the broader principle that escalation transfers decision authority rather than analysis burden.

## Runtime memory hygiene

At task completion, the Studio should:

- discard ephemeral context,
- consolidate durable knowledge candidates,
- remove invalidated hypotheses,
- mark superseded context appropriately,
- retain relevant evidence and decision links.

> Ephemeral runtime context must not pollute durable project knowledge.

## Conceptual context flow

```text
Project Brain
    ↓
Director resolves relevant context
    ↓
Context Packet
    ↓
Specialist
    ↓
Targeted retrieval if needed
    ↓
Structured Result
    ↓
Director integration
    ↓
Context state updated
    ↓
Next dispatch / implementation
    ↓
Task completion
    ↓
Knowledge consolidation
```

## Core principles

> **Context should be routed by relevance, authority, and freshness — not dumped wholesale.**

> **Specialists receive minimum sufficient context plus a path to retrieve more.**

> **Inference must remain distinguishable from source fact.**

> **Evidence must remain anchored to the state it actually verified or reviewed.**

> **Material context gaps must be resolved, not guessed across.**

> **Current valid human intent may supersede older project knowledge within applicable authority and governance.**

> **Accepted decisions must survive handoffs unless valid reopen conditions exist.**

> **Unverified agent conclusions must not silently become canonical context.**

> **Handoffs should preserve conclusions, uncertainty, change, and next-role relevance — not entire conversation history.**

> **Ephemeral runtime context must not pollute durable project knowledge.**
