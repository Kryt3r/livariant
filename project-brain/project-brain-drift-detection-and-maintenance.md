# Project Brain Drift Detection & Maintenance

## Purpose

Project Brain knowledge must remain useful as the actual project evolves. Code, configuration, dependencies, environments, native agent instructions, operational reality, and other current-facing project artifacts may change outside the framework or faster than canonical knowledge is updated.

Drift detection identifies meaningful divergence between canonical project knowledge, observed project reality, and current dependent truth surfaces without treating observation as permission for silent repair.

> **Observed reality may challenge Project Brain knowledge, but it does not silently rewrite it.**

> **Presence is not currency: a legitimate project-owned artifact may still contain superseded current guidance.**

The broader truth-surface model is defined by `core/knowledge-drift-and-truth-surfaces.md`.

## Drift as Reconciliation Evidence

A drift signal means that two relevant views of the project no longer appear aligned.

Examples include:

- the Project Brain records Vercel as the deployment target while the repository now contains active Railway configuration,
- an active security decision requires server-side authorization while current implementation evidence suggests client-side enforcement,
- a native `CLAUDE.md` or `AGENTS.md` projection contains guidance that no longer matches canonical Project Brain knowledge,
- a dependency or runtime version materially differs from the version recorded in project knowledge,
- the canonical CLI identity has changed while a current quickstart still documents the superseded command,
- canonical licensing or lifecycle semantics have changed while current-facing documentation still states the earlier policy.

Drift detection produces evidence for reconciliation. It does not decide by itself which side is correct and it does not grant mutation authority.

## Drift Categories

The framework should distinguish at least the following categories when the distinction materially helps diagnosis.

### Implementation Drift

Observed code, configuration, or runtime behavior diverges from documented project intent, constraints, or accepted decisions.

### Canonical Knowledge Drift

Canonical Project Brain knowledge contains technical or operational facts that appear stale relative to stronger current evidence.

This category asks whether the canonical project context itself needs reconciliation.

### Dependent Truth Drift

A current-facing project-owned artifact that depends on canonical truth still carries a superseded, inconsistent, or potentially stale claim.

Examples include current README files, quickstarts, installation instructions, architecture summaries, command examples, contribution guidance, or human-owned provider instruction files that restate current project constraints.

This category is materially different from Canonical Knowledge Drift: the canonical fact may be correct while one or more dependent current surfaces failed to move with it.

### Decision Drift

Observed implementation or project behavior conflicts with an active decision that has not been superseded.

### Projection Drift

Environment-native instruction surfaces or other derived projections no longer faithfully represent the canonical Project Brain state they are intended to expose.

### Dependency or Environment Drift

Provider, model, dependency, platform, runtime, account, region, or tool reality has changed in a way that may invalidate recorded assumptions.

These categories are diagnostic labels rather than a rigid ontology. A single finding may span more than one category when that better describes the real risk.

## Divergence Does Not Imply Error

Not every mismatch is a defect.

A project may intentionally be in transition. For example, the Project Brain may record a target architecture while the implementation still reflects the previous architecture during an active migration.

Likewise, a historical ADR or release review may intentionally contain a superseded name, version, policy, or command because preserving the old state is the point of the record.

Drift analysis should therefore distinguish, where evidence allows:

- likely defect,
- likely stale canonical knowledge,
- likely stale dependent current truth,
- intended migration or transition state,
- valid historical truth,
- accepted temporary divergence,
- ambiguous divergence requiring reconciliation.

The framework must not force one interpretation when the available evidence does not justify it.

## Evidence and Confidence

Each material drift finding should preserve enough evidence to explain why the discrepancy was detected.

Useful evidence may include:

- canonical Project Brain entries,
- repository files,
- dependency manifests and lockfiles,
- current provider or runtime observations,
- native instruction projections,
- recent accepted decisions,
- authoritative domain files such as a license or package manifest,
- explicit human declarations,
- artifact classification as current-facing or historical.

Confidence should be proportional to the evidence. A strong implementation signal may challenge stale knowledge, but it still does not automatically establish project intent.

A textual match alone is also not universal proof of drift. The same old identifier may be invalid in a current quickstart and correct in a historical decision record.

## Diagnostic Surface

The human interface should expose drift primarily through diagnostics such as `livariant doctor` or another explicitly supported diagnostic surface.

A useful finding should communicate:

1. what appears inconsistent,
2. which truth surfaces or observed realities are involved,
3. the relevant evidence,
4. likely impact or risk,
5. confidence or ambiguity when material,
6. the recommended reconciliation action.

Example:

```text
Finding: Project Brain records PostgreSQL 15
Observed: deployment environment reports PostgreSQL 17
Category: Canonical Knowledge Drift
Severity: low
Likely meaning: stale technical fact
Recommended action: reconcile recorded environment knowledge
```

Dependent-truth example:

```text
Finding: current quickstart documents `pb-dev init`
Canonical identity: CLI is `livariant`
Category: Dependent Truth Drift
Severity: medium
Likely meaning: current user guidance is stale
Recommended action: review affected current documentation; preserve historical records unchanged
```

A higher-risk example may identify that an active protected security property appears inconsistent with current implementation behavior.

## Diagnosis Is Separate from Repair

Drift detection and `doctor`-style diagnostics do not grant repair authority.

Possible reconciliation outcomes include:

- update Project Brain knowledge,
- correct implementation,
- update an affected dependent current truth surface,
- supersede an earlier decision,
- regenerate a stale native projection,
- classify an artifact as valid historical truth,
- record an accepted temporary divergence,
- leave the finding unresolved while gathering more evidence.

Any persistent mutation still follows project mutation safety, bounded authority, impact analysis, and verification requirements.

## Canonical-change invalidation

When a canonical fact changes, the framework should consider whether that change invalidates dependent current truth.

Examples of high-signal invalidation triggers include:

- product, package, CLI, command, or environment-variable identity changes,
- license or contribution-policy changes,
- supported provider or capability changes,
- lifecycle/update/migration/recovery changes,
- public/private distribution-state changes,
- security or trust-boundary changes,
- superseded architecture concepts or ADRs,
- schema and compatibility changes.

The desired behavior is:

```text
canonical fact changes
      ↓
identify likely dependents
      ↓
classify current vs historical surfaces
      ↓
report potentially stale current surfaces
      ↓
propose bounded reconciliation
      ↓
authorize mutation separately
      ↓
verify consistency
```

A dependency creates a review obligation, not write authority.

## Accepted Divergence

The framework may record an explicitly accepted divergence when the human or applicable project authority intentionally allows canonical intent and current implementation to differ temporarily.

Accepted divergence should be scoped and understandable. Where practical, it should include the reason and conditions that would trigger reassessment.

Acceptance must not become a generic mechanism for suppressing meaningful safety or correctness findings indefinitely.

## Detection Triggers

The first public baseline does not require a permanent background scanner or universal semantic document parser.

Drift detection may run proportionally during:

- initialization discovery,
- resume or re-entry when relevant context may have changed,
- explicit diagnostics,
- canonical decision or identity changes that have known dependents,
- high-impact changes where stale assumptions matter,
- direct human request,
- later lifecycle or migration operations where compatibility depends on current project reality.

Continuous background monitoring may be added later without changing the semantic contract.

## Noise Control

Drift detection should focus on discrepancies that can materially affect project understanding, safety, architecture, operation, user guidance, or future work.

It should not surface every formatting difference, incidental generated-file change, harmless historical reference, or transient observation as a knowledge problem.

Repeated low-value warnings reduce trust in the diagnostic system.

## Relationship to Progressive Knowledge

Drift detection and Progressive Initialization are complementary.

- Progressive Initialization improves incomplete knowledge as relevant evidence becomes available.
- Drift Detection challenges knowledge or dependent truth surfaces that may no longer match current reality or canonical state.

Neither mechanism may silently convert observations into durable project truth.

## Relationship to Native Projections

Native instruction files and other adapter-generated project surfaces are derived from canonical knowledge when Livariant owns the projection. Human-owned native instruction files remain project-owned surfaces with their own authority boundary.

When a projection or native instruction surface drifts:

- determine whether the canonical source changed,
- determine whether the projection was modified intentionally by a human,
- preserve human-owned content according to Adapter ownership rules,
- propose regeneration or reconciliation rather than overwriting ambiguous ownership.

## Core Principles

> **Drift detection compares canonical project knowledge with observed project reality, derived projections, and dependent current truth surfaces, but discrepancies remain evidence for reconciliation rather than permission for silent repair.**

> **Observed implementation is evidence of current reality, not automatic proof of intended project truth.**

> **Presence is not currency: project ownership proves provenance, not freshness.**

> **Diagnosis and repair are separate authority steps.**

> **Historical truth should be preserved while stale current guidance is surfaced.**

> **Drift handling should preserve deliberate transitions and accepted divergence while making material unresolved contradictions visible.**

> **The framework should detect meaningful drift proportionally rather than turning project maintenance into permanent background bureaucracy.**
