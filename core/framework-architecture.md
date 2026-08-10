---
type: POLICY
status: accepted
owner: framework-director
created: 2026-08-09
updated: 2026-08-09
---

# Framework Architecture

The Project Brain Framework is split into five logical layers:

1. CORE
2. PATTERNS
3. PROFILE
4. ADAPTER
5. PROJECT BRAIN

## CORE

Contains universal, tool- and domain-independent operating rules.

Examples:
- context loading,
- task classification,
- governance,
- review systems,
- decision records,
- security philosophy,
- design intelligence,
- knowledge management,
- Brain maintenance,
- model capability routing.

The Core must not know about specific domains, stacks, providers, or products.

**Rule:** If a concept only applies to one domain or one tool, it does not belong in Core.

## PATTERNS

Reusable product and architecture patterns that are broader than one domain but not universal enough for Core.

Examples:
- OAuth,
- permissions,
- account systems,
- dashboards,
- payments,
- messaging,
- realtime,
- notifications,
- settings,
- search,
- admin panels,
- plugin/module systems,
- inventory.

Patterns are optional reusable building blocks.

## PROFILE

Domain-specific governance and engineering rules.

Examples:
- Discord Platform,
- Game Development,
- SaaS,
- Mobile App,
- API/Backend.

A Profile may define domain risks, specialist roles, review triggers, architecture constraints, and quality gates.

Profiles specialize the framework without modifying Core.

## ADAPTER

Tool- and environment-specific translation of Framework behavior.

Examples:
- Codex,
- Claude Code,
- Gemini,
- Cursor,
- Copilot.

Adapters may contain native instruction files, tool workflows, tool limitations, available agent behavior, model registries, and model routing.

Adapters must never redefine Framework philosophy or silently override Core policy.

## PROJECT BRAIN

The living source of truth for one concrete project.

It contains project-specific vision, roadmap, architecture, features, decisions, operations, review reports, current status, integration contracts, and design language.

A Project Brain consumes Framework layers. It does not mutate Core as an implicit project exception.

## Source-of-truth invariants

> Every document has exactly one purpose.
>
> Every purpose has exactly one owner.
>
> Every durable fact or rule has exactly one source of truth.
>
> Every important decision must be findable.

References point to canonical sources instead of duplicating them.

Contradictions are surfaced and investigated, never silently reconciled.

## Knowledge ownership

Documents may declare an owner role. Ownership means responsibility for authoritative interpretation and change review, not exclusive write permission.

Examples:
- security policy → Security owner,
- design intelligence → Art Director / Design owner,
- governance → Framework Director,
- ADR → decision owner.

## Document types

Each durable document has exactly one primary type:

- `POLICY` — binding principle or prohibition,
- `STANDARD` — required measurable implementation/quality standard,
- `GUIDE` — recommended procedure or explanatory workflow,
- `REFERENCE` — factual lookup material,
- `DECISION` — durable architecture/product decision,
- `REPORT` — audit/review/postmortem output,
- `SPECIFICATION` — behavior/interface/product contract,
- `CHECKLIST` — executable verification list,
- `TEMPLATE` — reusable document skeleton.

The document type tells agents whether content is normative, descriptive, historical, or procedural.

## Layering rule

A lower layer may reference a higher-level canonical rule but must not copy its normative content merely for convenience.

Tool-specific differences belong in ADAPTER. Domain-specific differences belong in PROFILE. Project-specific facts belong in PROJECT BRAIN. Reusable architecture/product behavior belongs in PATTERNS. Universal operating rules belong in CORE.
