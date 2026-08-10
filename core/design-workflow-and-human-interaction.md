---
type: standard
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Design Workflow & Human Interaction

## Purpose

The design process should reduce the user's design burden rather than transfer the agent's reasoning burden to them. It must support recognition-based collaboration, progressively learn from feedback, preserve accepted state across iterations, and increase agent autonomy as design intelligence grows.

> The agent should reduce the user's design burden, not transfer its own reasoning burden to them.

## Users do not need design vocabulary

The framework must not assume that a user can describe visual hierarchy, density, composition, materiality, typography systems, or other specialist concepts precisely.

Agents should translate design reasoning into questions that are easy to answer and materially useful for the next decision. When possible, ask about desired effects and trade-offs rather than technical design terminology.

## Recognition before description

> Recognition should be preferred when description is difficult or unnecessary.

If a user cannot articulate a complete visual direction, the agent should not repeatedly demand a mental picture. Instead it may present or describe concrete alternatives, identify meaningful differences, collect reactions, and refine the design direction iteratively.

A user may be far better at recognizing "this feels right" or "this feels wrong" than inventing a complete design from nothing. The workflow must treat that as valid design input.

## Questions must have decision value

> Ask only questions whose answers can materially influence the design.

Do not use large generic questionnaires merely to appear thorough. Before asking, the agent should understand how the answer could change the next meaningful design choice.

Related questions may be grouped when doing so reduces friction, but the user should not be forced through unnecessary design interviews.

## Progressive design discovery

```text
Initial Identity
↓
Early Directions
↓
User Reaction
↓
Refined Preferences
↓
Prototype
↓
Concrete Feedback
↓
Design Memory
```

This is compatible with Living Software: design intelligence should become richer through real use and iteration.

## Feedback interpretation

Feedback is evidence, not always a complete diagnosis. A statement such as "this feels boring" may indicate weak hierarchy, excessive symmetry, low contrast, generic composition, weak identity, or another cause.

The agent should investigate plausible design explanations rather than translating vague feedback directly into equally vague implementation instructions.

> Feedback is evidence to interpret, not an instruction to overgeneralize.

## Do not over-infer preferences

Agents must not convert one local reaction into a broad personality or design rule without evidence.

```text
Observation
↓
Hypothesis
↓
Additional Evidence
↓
Scoped Preference Memory
```

When a recurring preference pattern seems likely, the agent may reflect the hypothesis back to the user for confirmation.

## Comparative feedback

Comparative feedback is often easier and more informative than absolute specification. Agents may ask what works better in one direction than another, which element should be preserved, or which trade-off is preferable.

## Feedback scope preservation

Negative feedback about one part of a design is not permission to redesign everything.

Before iterating, preserve accepted properties, open questions, rejected properties, and active experiments. The agent should modify the smallest meaningful scope consistent with the feedback unless broader change is justified and explicitly discussed.

> Accepted design state must survive iteration.

## Design State Snapshot

For meaningful iterative design work, a concise state snapshot may be maintained, for example:

```text
Accepted:
- composition
- navigation
- typography

Open:
- progression representation

Rejected:
- floating card cluster

Experiment:
- environmental progress path
```

## Confidence-aware autonomy

Design autonomy should scale with confidence and impact.

```text
HIGH confidence + LOW/MEDIUM impact
→ ACT

MEDIUM confidence + meaningful impact
→ RECOMMEND

LOW confidence + meaningful impact
→ EXPLORE / ASK

LOW confidence + signature decision
→ HUMAN CONFIRMATION
```

This should integrate with the framework's broader authority, escalation, and decision systems.

## Visual confirmation gates

Human visual confirmation should normally be required for identity-defining changes such as a new product identity, Signature Experience, major navigation model change, new central design pattern, material Signature Element change, or intentional departure from Identity Memory.

Routine application of accepted tokens and patterns, obvious responsive corrections, or low-impact visual maintenance should not require unnecessary confirmation.

> Human confirmation should scale with design significance and uncertainty.

## Proactive design intelligence

Agents may initiate design concerns and improvement proposals when new work exposes weaknesses in an existing system. They must not silently expand implementation scope, but they should surface issues such as navigation saturation, hierarchy collapse, repeated design debt, or conflict with existing identity.

This is the design-specific application of constructive dissent.

## Informal feedback is valid

Everyday reactions such as "This feels sterile", "It looks like a cheap mobile game", or "This does not feel like the product" can contain useful design evidence. The agent's responsibility is to translate them into testable design hypotheses rather than demand specialist terminology.

## Growing intelligence should reduce questions

At project start, more collaborative discovery may be necessary. As Identity Memory, reference knowledge, preferences, design decisions, and system patterns accumulate, the agent should increasingly infer routine choices safely.

> Growing design intelligence should reduce unnecessary future questions.

If the project gains knowledge but the agent asks the same basic questions repeatedly, the framework is failing to convert experience into intelligence.

## Selective presentation

Agents may explore many possibilities internally but should present only the strongest meaningful choices externally.

> Explore broadly internally; present selectively externally.

Two to four genuinely different directions are usually more useful than a large undifferentiated set. The exact number depends on significance and uncertainty.

## Design dialogue modes

### Explore
The direction is unclear. The agent leads discovery, references, comparisons, and alternative hypotheses.

### Refine
The broad direction is accepted but unresolved details or quality issues remain. The agent preserves accepted state and iterates selectively.

### Execute
The relevant design decisions are sufficiently established. The agent implements within accepted constraints and asks only when material uncertainty remains.

These modes may be inferred from context rather than manually selected.

## Core principles

> **The agent should reduce the user's design burden, not transfer its own reasoning burden to them.**

> **Recognition should be preferred when description is difficult or unnecessary.**

> **Ask only questions whose answers can materially influence the design.**

> **Feedback is evidence to interpret, not an instruction to overgeneralize.**

> **Accepted design state must survive iteration.**

> **Growing design intelligence should reduce unnecessary future questions.**

> **Explore broadly internally; present selectively externally.**

> **Human confirmation should scale with design significance and uncertainty.**
