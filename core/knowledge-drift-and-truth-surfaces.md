---
type: standard
status: baseline
domain: core
language: en
owner: framework
created: 2026-08-11
updated: 2026-08-11
---

# Knowledge Drift & Truth Surfaces

## Purpose

Livariant exists to preserve long-term project coherence. A canonical Project Brain is necessary for that goal, but canonical storage alone does not guarantee coherence across the rest of a living project.

Project-owned artifacts can remain technically valid files while becoming semantically stale after a decision, identity, policy, interface, lifecycle rule, or other canonical fact changes.

This document defines how Livariant reasons about that condition.

## Core rule

> **Presence is not currency.**
>
> A claim being present in a legitimate project-owned file does not prove that the claim still represents current project truth.

This rule complements:

> **Capability is not authority.**

Capability controls who or what may act. Currency controls whether information is still fit to guide current work.

## Knowledge Drift

**Knowledge Drift** is a state in which one or more project-owned artifacts contain claims that were once valid, plausible, or accepted but are no longer consistent with current canonical project truth or current executable reality.

Knowledge Drift is not limited to prose documentation. It may affect:

- README and user documentation;
- architecture or operational guides;
- native agent instruction files such as `CLAUDE.md` and `AGENTS.md`;
- examples and command snippets;
- release or installation guidance;
- configuration descriptions;
- decision summaries;
- generated provider handoff material if it is not regenerated from canonical state;
- other project-owned artifacts that communicate current facts, intent, constraints, or supported behavior.

A stale artifact may still be historically useful. The problem is not age itself; the problem is using historical or superseded information as if it were current.

## Truth-surface classes

Livariant distinguishes four semantic classes.

### 1. Canonical current truth

The authoritative current project knowledge for its declared domain.

For project context, the Project Brain is canonical. Other explicit canonical sources may exist for domains that are deliberately owned elsewhere, such as executable code for current implementation reality or a license file for authoritative legal terms.

Canonical sources must not be silently overridden by provider memory, generated projections, or copied summaries.

### 2. Dependent current truth

Project-owned artifacts intended to describe or operationalize current canonical truth but which are not independently authoritative.

Examples include:

- current README files;
- quickstarts and user guides;
- current installation and release instructions;
- current architecture summaries;
- examples that name supported commands, versions, providers, or policies;
- human-owned provider instruction files that restate current project constraints.

Dependent current truth must be reviewed when the canonical facts it depends on change.

### 3. Historical truth

Artifacts that intentionally preserve what was true, decided, reviewed, or observed at an earlier point in time.

Examples include:

- superseded ADRs;
- release-candidate review records;
- historical readiness reports;
- postmortems;
- migration history.

Historical truth should normally be preserved rather than rewritten to match the present. Its historical status must be clear enough that it is not mistaken for current guidance.

### 4. Ephemeral projection

Temporary material derived from canonical truth for a session, provider, task, or handoff.

Examples include provider Resume projections and generated context packets.

Ephemeral projections do not become authoritative merely because they are useful. When regenerated, they should derive from current canonical state rather than accumulate independent truth.

## Drift triggers

A change should trigger truth-surface review when it can invalidate dependent current truth.

Common triggers include:

- product, package, CLI, command, environment-variable, or repository identity changes;
- license or contribution-policy changes;
- supported provider or capability changes;
- lifecycle, update, migration, or recovery semantics changes;
- public/private distribution-state changes;
- security or trust-boundary changes;
- renamed or superseded architecture concepts;
- schema or compatibility changes;
- an ADR being superseded;
- a previous uncertainty becoming resolved canonical knowledge.

The trigger is semantic impact, not file count.

## Required reasoning flow

Knowledge-drift handling follows the normal Livariant mutation model:

```text
Inspect
→ identify changed canonical fact
→ explain dependent truth surfaces that may be affected
→ determine scope and impact
→ classify historical vs current artifacts
→ establish a recoverable baseline when mutation risk requires it
→ propose the smallest sufficient updates
→ obtain required authority
→ mutate only authorized current surfaces
→ verify semantic consistency
→ explain what changed and what intentionally remained historical
```

Livariant must not blindly rewrite every textual match. A historical review that says an old CLI name was used at that time may be correct and should remain historical evidence.

## Dependency and invalidation model

Where practical, a project should be able to express that a current artifact depends on one or more canonical facts or decisions.

For example:

```text
Canonical fact changes:
CLI = pb-dev → livariant

Potential dependent current truth:
README.md
docs/quickstart.md
docs/existing-projects.md
examples/
CLAUDE.md
AGENTS.md
CI or release command examples
```

A dependency does not imply mutation authority. It creates a review obligation.

When an affected surface cannot be proven current, Livariant should prefer a visible **potentially stale** diagnosis over silently assuming consistency.

## Verification

Verification should be proportional to the claim.

Useful evidence may include:

- deterministic checks for forbidden superseded identifiers in current user-facing surfaces;
- link and command validation;
- comparison against canonical product identity and lifecycle metadata;
- tests that execute documented commands where feasible;
- review that distinguishes current documentation from historical records;
- explicit acknowledgement when semantic consistency cannot be proven automatically.

Text search alone is insufficient as a universal solution because the same superseded term may be invalid in a current quickstart but correct in a historical ADR.

## Safety boundaries

Knowledge-drift protection must not become permission for broad rewriting.

Livariant must preserve these boundaries:

- detection capability does not grant mutation authority;
- historical records are not normalized into present-day wording merely to make searches clean;
- ambiguous artifacts are classified before mutation;
- user-owned or project-owned files remain preservation-first;
- generated projections remain downstream of canonical state;
- automatic fixes must be bounded, reviewable, and no broader than the verified inconsistency requires.

## Relationship to Project Brain

The Project Brain remains the project-owned canonical source for durable project context. Knowledge-drift handling extends the value of canonical truth outward: it helps determine whether artifacts that communicate or depend on that truth are still current.

This means Livariant should not only help a project remember.

It should help a project notice when parts of its own knowledge no longer agree about the present.

## Framework learning behind this rule

This standard is evidence-backed by Livariant's own development process. During Public Preview preparation, the canonical product identity, licensing model, and Preview semantics had already changed while several legitimate project-owned user-facing documents still contained superseded CLI, licensing, and preparation-state claims.

The failure mode was not missing canonical truth. The failure mode was failure to propagate and verify that truth across dependent current surfaces.

The resulting design lesson is general:

> **Canonical truth without dependency awareness can still coexist with stale guidance.**

## Desired outcome

A mature Livariant-managed project should increasingly be able to answer both:

- **What is true now?**
- **Which project artifacts may no longer reflect that truth?**

That is a core property of a living software framework rather than a static project-memory store.
