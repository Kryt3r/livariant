# Profile Evolution and Community Contribution

Profiles are living domain intelligence. They may evolve as platforms, product domains, operating constraints, and accumulated evidence change.

> **Profile evolution may improve domain intelligence, but trust, ownership, and project adoption must remain explicit.**

## Versioned Evolution

Each Profile must expose a traceable version and lifecycle state.

Changes should distinguish between:

- clarifications that improve wording or evidence without materially changing behavior,
- material changes to applicability, invariants, risk triggers, quality gates, specialist guidance, workflow extensions, or domain assumptions.

A new Profile version does not automatically become new project truth. Existing Project Brain decisions remain project-owned and must not be silently rewritten by reusable Profile updates.

Material Profile changes may require:

- impact analysis,
- project re-evaluation,
- migration guidance,
- compatibility notes,
- or explicit project adoption.

If new evidence shows that an older Profile recommendation is unsafe, materially wrong, or based on invalid assumptions, that risk must be surfaced. Non-retroactive adoption does not justify hiding known hazards.

## Lifecycle

Profiles should support at least the following lifecycle states:

`draft -> accepted -> deprecated -> retired`

- `draft` — still under review and not yet trusted as accepted reusable domain intelligence.
- `accepted` — approved for normal use within its documented scope.
- `deprecated` — retained for compatibility or migration context but generally not recommended for new adoption.
- `retired` — retained only where historical reconstruction, compatibility, or migration requires it.

Lifecycle state must not be confused with trust provenance.

## Trust Provenance

Profiles may use a separate trust/ownership signal such as:

- `official` — reviewed and maintained by the framework project,
- `community` — externally contributed or maintained while remaining compatible with the Profile Contract.

These labels are not a simplistic quality ranking. They communicate ownership, review provenance, and maintenance responsibility.

Popularity, installation count, repeated agent use, or community familiarity are not sufficient evidence that a Profile is trustworthy.

## Community Contribution

Community contributors may propose:

- new Profiles,
- corrections,
- stronger evidence,
- new risks or failure modes,
- improved applicability or anti-applicability,
- better verification guidance,
- or deprecation of stale guidance.

Before a contributed Profile becomes part of the official framework set, it should demonstrate at least:

1. a clear and reusable domain scope,
2. meaningful value beyond one project,
3. compliance with the Profile Contract,
4. no hidden duplication or re-ownership of Core or Pattern semantics,
5. credible evidence for strong domain claims,
6. review for security, scope, maintainability, and likely misuse,
7. explicit ownership and maintenance expectations.

Community origin must not bypass normal review simply because the contribution appears useful.

## Layer Ownership During Evolution

Profile evolution must preserve framework ownership boundaries.

If new knowledge is actually universal, it may belong in Core.

If it describes a recurring solution space across domains, it may belong in Patterns.

If it is provider- or tool-specific, it may belong in an Adapter.

If it is specific to one project, it belongs in Project Brain.

Moving knowledge between layers is an explicit reviewed change. It must not happen silently through Profile edits.

## Project Adoption

Projects may remain on an older Profile version when justified by compatibility, migration cost, or deliberate project decisions.

However, projects should be warned when:

- the active version is deprecated or retired,
- a newer version contains material safety or correctness changes,
- the current project state conflicts with newly established domain constraints,
- or migration becomes necessary to preserve compatibility.

A Profile update may recommend project changes but may not directly rewrite project-owned decisions without appropriate authority.

## Distribution Boundary

Profiles should remain usable without requiring a centralized marketplace.

An official registry, package distribution model, signatures, entitlements, installation channels, and commercial packaging may later improve discovery and trust, but those concerns belong primarily to the framework distribution and lifecycle layer.

The Profile system therefore defines compatibility and trust semantics without requiring one distribution mechanism.

## Anti-Patterns

Avoid:

- treating popularity as evidence,
- auto-upgrading projects into materially changed Profile behavior,
- letting community contributions bypass ownership boundaries,
- requiring a centralized marketplace for Profile existence,
- silently reclassifying Profile knowledge into Core or Patterns,
- confusing `official` with infallible or `community` with untrusted by default,
- retaining dangerous old recommendations without explicit warnings.

## Core Principle

> **Profile evolution may improve domain intelligence, but trust, ownership, and project adoption must remain explicit.**
