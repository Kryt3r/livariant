---
type: POLICY
status: accepted
owner: framework-director
created: 2026-08-09
updated: 2026-08-09
---

# Knowledge Architecture

Project knowledge is treated as versioned infrastructure. The goal is not maximum documentation, but durable context that is easy to find without loading the entire project history.

## Progressive disclosure

Load context in layers:

1. compact current context,
2. navigational index when needed,
3. only the canonical documents relevant to the task.

Loading the whole Brain by default is an anti-pattern.

## Single source of truth

Every durable rule, decision, fact, or specification has one canonical home. Other documents reference it rather than becoming parallel authorities.

## Code and Brain

- Code is authoritative for current behavior.
- The Brain is authoritative for intended behavior, rationale, product direction, and non-code constraints.
- Conflicts are recorded and investigated rather than silently reconciled.

## Documentation value test

Persist knowledge only when it does at least one of the following:

1. explains a why that cannot be reliably inferred from code,
2. prevents repetition of a meaningful mistake,
3. records state or intent that exists outside the codebase.

Otherwise, do not create durable documentation merely to record activity.

## Decision discoverability

Every important decision must be findable. Expensive-to-reverse decisions with genuinely considered alternatives use durable decision records. Cheap or obvious implementation details must not create decision-record inflation.

A decision index may provide navigation, but must link to canonical records rather than duplicate their reasoning.

## WHY as a first-class concern

Rationale must be easy to locate. A project may expose a `WHY.md` entry point or equivalent navigation, but detailed reasoning remains canonical in the document that owns the rule or decision.

## No empty scaffolding

Do not create empty folders, placeholder notes, or speculative documentation trees solely because they may be useful later. Structure grows when real content earns a place.

## Historical integrity

Historical reports and decisions are not rewritten to make the present look cleaner. Superseded decisions are marked and linked to their replacements.
