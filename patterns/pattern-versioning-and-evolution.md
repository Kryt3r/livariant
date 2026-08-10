---
type: framework-layer-policy
status: accepted
domain: patterns
language: en
owner: framework
foundation: FOUNDATION-06E
---

# Pattern Versioning & Evolution

Patterns are living reusable intelligence. They may improve as evidence, implementation experience, standards, or recurring failure modes change.

> Pattern evolution updates reusable intelligence; it does not silently rewrite projects that previously used it.

## Versioned knowledge

Every Pattern must have a version identity sufficient to distinguish materially different states of its reusable knowledge.

Pattern evolution should make it possible to determine whether a change merely clarifies existing guidance or materially changes applicability, invariants, recommendations, trade-offs, failure knowledge, or migration expectations.

FOUNDATION-06 does not define a complete Semantic Versioning policy. Framework-wide release and version semantics belong to FOUNDATION-10. The Patterns layer requires only enough version meaning to preserve traceability and safe evolution.

## No retroactive project truth

A new Pattern version must not silently reinterpret prior project decisions as though the newer guidance had existed when those decisions were made.

Projects that used an earlier Pattern version retain their actual historical decision context.

A later Pattern may provide better guidance, but adoption of that guidance is a new evaluation or project change rather than a retroactive rewrite.

## Impact on existing projects

When a Pattern changes materially, existing usages may need re-evaluation.

Relevant impact questions may include:

- whether an accepted project decision depends on superseded guidance,
- whether a new failure mode or risk affects an existing implementation,
- whether an invariant has materially changed,
- whether a migration or replacement path is advisable,
- whether no project action is required.

The evaluation should remain proportional to the significance of the Pattern change and the project's actual use of it.

## Safety-relevant evolution

Non-retroactivity does not justify hiding newly discovered hazards.

If later evidence shows that prior Pattern guidance can create material security, reliability, data-integrity, safety, or product risk, the Pattern system should surface that evidence to affected contexts when practical.

The project must still make or record the resulting change through normal project authority and decision mechanisms.

## Deprecated Patterns

A `deprecated` Pattern is generally not recommended for new selection unless a specific compatibility, migration, or project constraint justifies it.

Deprecation should explain, where material:

- why the Pattern is deprecated,
- what supersedes it or which alternative is preferred,
- what existing users should evaluate,
- and whether continued use carries known risk.

Existing project decisions do not become invalid merely because their source Pattern is deprecated, but they may warrant re-evaluation.

## Retired Patterns

A `retired` Pattern is no longer active reusable guidance for normal selection.

It may remain available for:

- historical traceability,
- understanding previous project decisions,
- compatibility analysis,
- migration reasoning.

Retirement should not destroy knowledge required to understand previously accepted project state.

## Historical traceability

Pattern history must remain sufficiently reconstructable that an old project decision can still be understood in the context of the reusable knowledge that informed it.

This does not require retaining every incidental textual revision forever. It requires preserving materially meaningful historical states, provenance, or migration context where loss would make past decisions misleading or unintelligible.

## Evolution principle

> **Pattern evolution may change current reusable guidance, but it must preserve the distinction between new framework knowledge and previously accepted project truth.**

> **Newly discovered material risks should be surfaced rather than hidden behind non-retroactivity.**

> **Versioning exists to preserve traceability and safe evolution, not to introduce release bureaucracy prematurely.**
