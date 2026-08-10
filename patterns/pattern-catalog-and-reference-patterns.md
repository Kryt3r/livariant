---
type: framework-layer-policy
status: accepted
domain: patterns
language: en
owner: framework
foundation: FOUNDATION-06G
---

# Pattern Catalog & Reference Patterns

The Pattern Catalog is the discoverability layer for reusable Pattern intelligence.

> The catalog makes Patterns discoverable; reference Patterns validate the system without freezing the framework into a premature library.

## Catalog purpose

The catalog should expose enough lightweight metadata for the runtime to discover candidate Patterns without loading every Pattern in full.

Useful catalog metadata may include:

- stable Pattern identifier,
- short description,
- problem space,
- major applicability signals,
- major anti-applicability signals where useful for filtering,
- lifecycle status,
- version,
- discoverable relationships or composition hints,
- location of the full Pattern definition.

The catalog is an index, not a second source of truth. Full Pattern semantics remain owned by the Pattern itself.

## Progressive loading

Pattern discovery should normally inspect catalog-level metadata first and retrieve full Pattern intelligence only after a Pattern becomes materially relevant.

This preserves minimum sufficient context and avoids turning the Patterns layer into a global context dump.

## Catalog consistency and drift

Catalog metadata should remain consistent with the full Pattern definition closely enough for discovery to be trustworthy.

If catalog metadata conflicts materially with the Pattern itself:

- the full Pattern definition is authoritative,
- the catalog entry must not override Pattern semantics,
- the mismatch should be treated as catalog drift and repaired,
- decisions based only on stale catalog metadata should be re-evaluated when the mismatch could have changed selection.

Implementations may later automate catalog generation or consistency checks, but FOUNDATION-06 requires the semantic rule rather than a specific mechanism.

> Catalog metadata may route discovery, but it may not become a competing source of Pattern truth.

## Incremental library growth

FOUNDATION-06 defines the system for Patterns, not a requirement to complete an exhaustive Pattern library before the framework can progress.

Concrete Patterns may be added incrementally as real use cases, evidence, and Profiles reveal where reusable intelligence provides value.

The initial roadmap examples — including permissions, OAuth, notifications, messaging, payments, search, settings, dashboards, and plugin systems — are candidate families rather than a mandate to fully specify all of them during FOUNDATION-06.

## Reference Patterns

At least one or two representative reference Patterns should be developed during or immediately after FOUNDATION-06 to validate that the Pattern Contract, discovery rules, applicability model, composition surface, and evolution rules work in practice.

Good reference candidates should exercise materially different concerns. Permissions and Notifications are suitable examples because they test security-sensitive decision logic and cross-system product behavior respectively.

Reference Patterns are validation artifacts as well as reusable intelligence.

They should reveal weaknesses in the Pattern system rather than merely conform cosmetically to its schema.

## Conformance role

A reference Pattern should demonstrate, proportionally to its complexity:

- clear problem-space ownership,
- applicability and anti-applicability,
- meaningful trade-offs,
- solution-space reasoning,
- Pattern invariants where appropriate,
- failure modes,
- decision boundaries,
- composition surfaces,
- verification guidance,
- version and lifecycle identity.

If a real Pattern cannot be expressed cleanly without awkward ceremony, that is evidence that the Pattern system itself may need refinement.

## Avoiding premature taxonomy

The catalog should not require an elaborate universal taxonomy before enough Patterns exist to justify one.

Simple categories, tags, or problem-space descriptors may be used for discovery, but classification structure should evolve from demonstrated retrieval needs rather than speculative ontology design.

## Extensibility

New Patterns should be addable without modifying Core governance.

The catalog may grow, reorganize, or improve its discovery metadata over time, provided Pattern identity and historical traceability remain intact.

## Principles

> **The Pattern Catalog is an index for discovery, not a second canonical definition of Pattern semantics.**

> **Catalog metadata should enable progressive retrieval instead of requiring full-library loading.**

> **Catalog drift must be repaired rather than resolved by treating stale index metadata as Pattern truth.**

> **Concrete Pattern coverage grows incrementally from demonstrated value rather than roadmap checkbox completion.**

> **Reference Patterns exist to pressure-test the system in practice, not merely to provide decorative examples.**

> **Pattern taxonomy should emerge from real retrieval needs rather than premature ontology design.**
