---
type: standard
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Design Memory, Tokens & Identity Governance

## Purpose

Design intelligence must survive individual sessions, agents, and implementations. A conventional design system preserves visual state and reusable components; design memory additionally preserves the reasoning, constraints, evidence, and identity knowledge that explain why those elements exist.

> Design memory should preserve rationale, not only visual state.

## Layers of design memory

Useful design knowledge may be consolidated into several complementary layers.

### Identity Memory
Preserves the intended emotional and visual character of the product, including desired qualities, anti-identity, signature characteristics, and important boundaries.

### System Memory
Preserves reusable design logic such as typography hierarchy, spacing logic, surfaces, motion principles, interaction patterns, navigation logic, accessibility expectations, and other durable system behavior.

### Decision Memory
Preserves significant design decisions, their rationale, alternatives, assumptions, consequences, and relevant evidence.

### Experience Memory
Preserves findings from actual use, prototypes, tests, or observation when they should influence future design decisions.

Design memory should consolidate future decision value rather than accumulate every design artifact.

## Tokens express intent

> Semantic meaning should be preferred over implementation detail in design tokens.

Primitive tokens may represent implementation primitives such as raw colors or measurements. Semantic tokens should express product intent and should normally be preferred by product-facing implementation.

For example, a primitive token may represent a particular blue value while a semantic token represents `action-primary`. The implementation value may change without changing the semantic purpose.

Token architecture should remain capable of supporting themes, accessibility requirements, and future identity evolution without coupling product meaning to incidental implementation details.

## Components are tools, not design decisions

> Component availability does not justify component use.

The existence of a reusable component is never sufficient reason to use it. Components should include usage reasoning where valuable, including both appropriate and inappropriate contexts.

A component library must not silently turn into a visual grammar in which every type of content is forced into whatever reusable containers happen to exist.

## Signature Elements

Signature Elements are recurring design properties that materially contribute to product identity or experience. They may include composition principles, navigation behavior, environmental integration, characteristic framing, progression representation, motion behavior, or other product-defining patterns.

Not every distinctive detail is a Signature Element. The designation should be reserved for properties whose accidental loss would materially weaken identity or experience.

## Design Invariants

> Signature elements may create durable design invariants.

A Design Invariant preserves an identity or experience property that future work must not accidentally destroy. It should describe the property to preserve rather than freeze one specific implementation.

Design Invariants may be deliberately revisited through the framework's decision and governance processes. They are protection against accidental drift, not permanent bans on evolution.

Changes that materially affect Signature Elements or Design Invariants should receive decision and review depth proportional to their importance.

## Memory states

Significant design knowledge may use lifecycle states such as `PROPOSED`, `ACCEPTED`, `REJECTED`, `DEPRECATED`, and `SUPERSEDED`.

Rejected design knowledge should be retained only when its rationale has meaningful future value, such as a high probability that the same unsuitable direction would otherwise be rediscovered.

## Preference scope and evidence

> Preferences must retain scope and must not silently become universal rules.

A local rejection must not automatically become a global personal or project preference. Preference knowledge should retain relevant scope, such as project, product surface, component, or interaction context.

Where useful, repeated observations may increase confidence that a preference is broader than its original context. Agents must still distinguish evidence from inference and should not convert weak preference evidence into hard governance.

Possible supporting metadata may eventually include occurrence count, contexts, interpretation, and confidence. This is an extensibility point rather than a requirement to formalize every preference immediately.

## Identity evolution

Design identity is living project knowledge. Significant identity changes should be explainable and traceable rather than silently replacing the previous state.

When an identity decision evolves, prior accepted knowledge may become `SUPERSEDED` while remaining available as historical rationale where useful.

> Design systems evolve through evidence, not accidental drift.

## Design drift

New work should be evaluated against relevant Design Invariants, Signature Elements, semantic intent, accepted patterns, meaningful rejections, and Identity Memory.

Potential drift should be reported with the conflicting knowledge and a recommendation rather than treated as an unexplained aesthetic objection.

Design drift detection should protect shared logic without forcing every product surface into the same layout.

## Local innovation and consolidation

New features may introduce new design ideas. The framework must not reject an idea merely because it has not appeared before.

```text
Experiment
↓
Validation
↓
Repeated Value
↓
Pattern
↓
System
```

> Repeated local success may become a pattern; one occurrence does not create a standard.

This prevents both uncontrolled drift and premature standardization.

## Machine-readable future

Design memory should remain structurally capable of becoming partially machine-readable. Future tooling may represent invariants, tokens, Signature Elements, scope, status, importance, or drift checks as structured data.

The baseline framework should not prematurely convert all design knowledge into configuration syntax. Structure should be introduced where automation creates real value.

## Design Intelligence versus a conventional design system

A conventional design system can answer what a component looks like, which token controls a surface, and which components are available.

Design Intelligence should additionally explain why it looks this way, when and when not to use a pattern, which assumptions support it, which alternatives were rejected, and whether changing it would affect product identity.

The objective is not more documentation. It is lower rediscovery cost and better future reasoning.

## Core principles

> **Design memory should preserve rationale, not only visual state.**

> **Semantic meaning should be preferred over implementation detail in design tokens.**

> **Component availability does not justify component use.**

> **Signature elements may create durable design invariants.**

> **Preferences must retain scope and must not silently become universal rules.**

> **Design systems evolve through evidence, not accidental drift.**

> **Repeated local success may become a pattern; one occurrence does not create a standard.**
