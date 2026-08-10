# Guided Knowledge Editing & Impact Analysis

Project Brain editing operates on project meaning rather than storage files.

The human interface must allow users and agents to propose changes in natural project terms without requiring them to know which canonical file or field stores the affected knowledge. Storage layout is an implementation concern; semantic intent is the interface contract.

## 1. Knowledge Changes Are Semantic Changes

A request such as:

> We are moving from Paddle to Stripe.

must not be interpreted as a simple text replacement.

The framework should determine which parts of the project model may be affected, such as:

- existing architecture decisions,
- selected or relevant Patterns,
- active Profiles,
- security and secrets handling,
- deployment assumptions,
- integrations and webhooks,
- billing or entitlement behavior,
- verification obligations.

The purpose of impact analysis is not to maximize process. It is to surface materially affected project meaning before a durable knowledge change is accepted.

## 2. Knowledge-Change Classes

Project Brain changes should be interpreted by semantic effect rather than by file operation.

### Clarification

A clarification makes existing knowledge more precise without materially changing its meaning.

Example:

> By backend we mean the existing Supabase Edge Functions.

Clarifications normally require little additional process unless they expose a contradiction or alter an existing decision boundary.

### Extension

An extension adds new project knowledge without necessarily replacing prior knowledge.

Example:

> The product will also support organizations.

Extensions may affect existing assumptions and therefore can require impact analysis.

### Revision or Supersession

A revision materially changes previously accepted project knowledge, intent, or a durable decision.

Example:

> The product is no longer intended to be single-tenant.

Revisions require the framework to identify affected decisions, constraints, Profiles, Patterns, and implementation assumptions before replacing durable project truth.

## 3. Proportional Impact Analysis

Impact analysis must scale with semantic effect and risk.

A short sentence can represent a major architectural or security change, while a large textual edit may merely clarify wording.

The framework should therefore evaluate a proposed change against dimensions such as:

- affected project identity or product intent,
- affected goals,
- affected architectural assumptions,
- affected decisions,
- affected constraints or protected properties,
- affected Profiles or Patterns,
- affected security boundaries,
- affected implementation assumptions,
- likely verification consequences,
- potential migration or compatibility implications.

Low-impact changes should remain lightweight.

Material changes should receive enough analysis to make consequences understandable before mutation.

## 4. Conflict Detection

New project knowledge must not silently overwrite contradictory accepted knowledge.

When a proposed change conflicts with an existing decision or established project fact, the conflict should remain visible.

A useful interaction may communicate:

```text
Proposed change:
Use architecture B.

Conflicts with:
Decision D-014: Architecture A was selected because ...

Potential impact:
- invalidates assumption X
- affects subsystem Y
- requires reassessment of constraint Z
```

The human may then choose to:

- retain the existing decision,
- withdraw or revise the proposed change,
- explicitly supersede the existing decision,
- defer resolution and preserve the conflict as unresolved project knowledge.

Conflict detection does not create a universal priority order. Resolution follows existing Framework ownership, authority, evidence, and Project Brain decision semantics.

## 5. Decision Supersession and History

Material decisions should not simply disappear when replaced.

When one accepted decision replaces another, the previous decision should retain enough history to explain project evolution.

A superseded decision may record:

- its identity,
- previous accepted meaning,
- status as superseded,
- the replacing decision,
- reason for supersession when known,
- relevant timing or version context where useful.

Example:

```text
Decision D-014
status: superseded
superseded_by: D-027
reason: product direction changed to multi-tenant operation
```

This history supports future explanation without making obsolete guidance active project truth.

Not every textual change requires historical preservation. Typographic corrections, wording improvements, and non-semantic formatting changes should not create unnecessary audit ceremony.

## 6. Bounded Multi-Area Changes

A single human decision may legitimately affect multiple Project Brain areas.

For example:

> We are changing the product from a Discord bot into a SaaS web platform.

may affect:

- Project Identity,
- project types,
- active or candidate Profiles,
- goals,
- architecture assumptions,
- existing decisions,
- deployment context,
- product constraints.

The framework should not force one confirmation per file or knowledge field.

A material change may instead be presented as one bounded knowledge-change scope with a concise impact summary and one authorization covering the understood scope.

That authorization must not extend to unrelated project changes.

## 7. Guided Editing Flow

A typical material Project Brain edit should follow a flow such as:

1. interpret the human request as semantic project intent,
2. identify the canonical knowledge likely affected,
3. inspect relevant existing decisions, constraints, Profiles, Patterns, and evidence,
4. classify the change by semantic effect,
5. perform proportional impact analysis,
6. surface meaningful conflicts, uncertainty, and consequences,
7. establish a bounded authorized knowledge-change scope,
8. mutate the smallest sufficient canonical project knowledge,
9. preserve superseded history where materially useful,
10. verify that the resulting Project Brain remains internally coherent,
11. explain what changed and what remains unresolved.

This flow applies the Framework's existing human-ownership and mutation-safety principles to Project Brain knowledge itself.

## 8. Human Interface Responsibilities

The Human Interface should help users reason about changes without exposing storage internals unnecessarily.

It should be able to explain:

- what the requested change means to the project,
- which accepted knowledge it affects,
- which consequences are certain versus inferred,
- which conflicts require human judgment,
- whether a previous decision would be superseded,
- what durable knowledge will actually change.

The interface should avoid both extremes:

- treating Project Brain knowledge as plain editable text,
- turning every knowledge update into a heavy governance ceremony.

## 9. Relationship to Progressive Initialization

Guided editing and Progressive Initialization use the same distinction between evidence, inference, uncertainty, and accepted project truth.

New observations discovered during work may trigger a proposed knowledge change, but observation alone does not authorize mutation or establish durable project truth.

When missing knowledge becomes materially relevant, the interface may ask for clarification and then route the resulting accepted knowledge through the same semantic editing and impact-analysis process.

## 10. Core Principle

> **Project Brain editing operates on meaning rather than files. Material changes receive proportional impact analysis, conflicts remain explicit, and superseded decisions preserve enough history to explain how and why the project evolved.**
