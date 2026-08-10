---
type: reference
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-09
updated: 2026-08-09
---

# Design Intelligence Source Ownership

FOUNDATION-03 is intentionally split into focused canonical sources. Some concepts are introduced at a high level in Design Intent & Identity and then defined in greater detail elsewhere. This document resolves ownership explicitly so agents do not treat overlapping summaries as competing sources of truth.

## Canonical ownership

- `design-intent-and-identity.md` owns design intent, identity, anti-identity, recognition-based design, the high-level design loop, and the principle that design decisions become project knowledge.
- `design-exploration-and-reference-intelligence.md` owns reference roles, reference analysis, exploration briefs, meaningful divergence, structured comparison, design hypotheses, convergence, and exploration memory.
- `design-critique-and-quality-gates.md` owns anti-slop critique, quality dimensions, importance classes, quality gates, Signature Elements at critique level, and the distinction between evidence-based findings and preference.
- `design-memory-tokens-and-identity-governance.md` owns durable Design Memory, tokens, component usage reasoning, Signature Element governance, Design Invariants, preference scope, identity evolution, and design drift.
- `design-workflow-and-human-interaction.md` owns human-agent design collaboration, recognition-first interaction, question discipline, feedback interpretation, Design State Snapshots, autonomy, confirmation gates, and Explore / Refine / Execute dialogue modes.
- `visual-evaluation-prototyping-and-acceptance.md` owns design acceptance criteria, prototype fidelity, structural/behavioral/perceptual evidence, realistic-content testing, state completeness, motion evaluation, contextual/systemic review, and acceptance verdicts.

## Conflict rule

When a high-level summary in one document overlaps with a detailed rule in the canonical owner listed above, the detailed owner is authoritative for that concept.

Overviews may summarize. They must not silently redefine specialist rules.

If two specialist documents appear to conflict and ownership does not resolve the issue, use the framework's governance conflict and escalation rules rather than inventing an interpretation.

## Purpose

The split exists to support progressive disclosure and single-source-of-truth behavior at the same time: newcomers can understand the overall design philosophy without loading every detail, while agents doing focused work can retrieve the authoritative specialist source.
