# Project Brain Drift Detection & Maintenance

## Purpose

Project Brain knowledge must remain useful as the actual project evolves. Code, configuration, dependencies, environments, native agent instructions, and operational reality may change outside the framework or faster than canonical knowledge is updated.

Drift detection identifies meaningful divergence between canonical project knowledge and observed project reality without treating observation as permission for silent repair.

> **Observed reality may challenge Project Brain knowledge, but it does not silently rewrite it.**

## Drift as Reconciliation Evidence

A drift signal means that two relevant views of the project no longer appear aligned.

Examples include:

- the Project Brain records Vercel as the deployment target while the repository now contains active Railway configuration,
- an active security decision requires server-side authorization while current implementation evidence suggests client-side enforcement,
- a native `CLAUDE.md` or `AGENTS.md` projection contains guidance that no longer matches canonical Project Brain knowledge,
- a dependency or runtime version materially differs from the version recorded in project knowledge.

Drift detection produces evidence for reconciliation. It does not decide by itself which side is correct.

## Drift Categories

The framework should distinguish at least the following categories when the distinction materially helps diagnosis.

### Implementation Drift

Observed code, configuration, or runtime behavior diverges from documented project intent, constraints, or accepted decisions.

### Knowledge Drift

Canonical Project Brain knowledge contains technical or operational facts that appear stale relative to stronger current evidence.

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

Drift analysis should therefore distinguish, where evidence allows:

- likely defect,
- likely stale knowledge,
- intended migration or transition state,
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
- explicit human declarations.

Confidence should be proportional to the evidence. A strong implementation signal may challenge stale knowledge, but it still does not automatically establish project intent.

## Diagnostic Surface

The human interface should expose drift primarily through diagnostics such as the product-defined equivalent of the development placeholder `pb doctor`.

A useful finding should communicate:

1. what appears inconsistent,
2. the relevant evidence,
3. likely impact or risk,
4. confidence or ambiguity when material,
5. the recommended reconciliation action.

Example:

```text
Finding: Project Brain records PostgreSQL 15
Observed: deployment environment reports PostgreSQL 17
Severity: low
Likely meaning: stale technical fact
Recommended action: reconcile recorded environment knowledge
```

A higher-risk example may identify that an active protected security property appears inconsistent with current implementation behavior.

## Diagnosis Is Separate from Repair

Drift detection and `doctor`-style diagnostics do not grant repair authority.

Possible reconciliation outcomes include:

- update Project Brain knowledge,
- correct implementation,
- supersede an earlier decision,
- regenerate a stale native projection,
- record an accepted temporary divergence,
- leave the finding unresolved while gathering more evidence.

Any persistent mutation still follows project mutation safety, bounded authority, impact analysis, and verification requirements.

## Accepted Divergence

The framework may record an explicitly accepted divergence when the human or applicable project authority intentionally allows canonical intent and current implementation to differ temporarily.

Accepted divergence should be scoped and understandable. Where practical, it should include the reason and conditions that would trigger reassessment.

Acceptance must not become a generic mechanism for suppressing meaningful safety or correctness findings indefinitely.

## Detection Triggers

The first public baseline does not require a permanent background scanner.

Drift detection may run proportionally during:

- initialization discovery,
- resume or re-entry when relevant context may have changed,
- explicit diagnostics,
- high-impact changes where stale assumptions matter,
- direct human request,
- later lifecycle or migration operations where compatibility depends on current project reality.

Continuous background monitoring may be added later without changing the semantic contract.

## Noise Control

Drift detection should focus on discrepancies that can materially affect project understanding, safety, architecture, operation, or future work.

It should not surface every formatting difference, incidental generated-file change, or harmless transient observation as a knowledge problem.

Repeated low-value warnings reduce trust in the diagnostic system.

## Relationship to Progressive Knowledge

Drift detection and Progressive Initialization are complementary.

- Progressive Initialization improves incomplete knowledge as relevant evidence becomes available.
- Drift Detection challenges knowledge that may no longer match current reality.

Neither mechanism may silently convert observations into durable project truth.

## Relationship to Native Projections

Native instruction files and other adapter-generated project surfaces are derived from canonical knowledge.

When a projection drifts:

- determine whether the canonical source changed,
- determine whether the projection was modified intentionally by a human,
- preserve human-owned content according to Adapter ownership rules,
- propose regeneration or reconciliation rather than overwriting ambiguous ownership.

## Core Principles

> **Drift detection compares canonical project knowledge with observed project reality and derived projections, but discrepancies remain evidence for reconciliation rather than permission for silent repair.**

> **Observed implementation is evidence of current reality, not automatic proof of intended project truth.**

> **Diagnosis and repair are separate authority steps.**

> **Drift handling should preserve deliberate transitions and accepted divergence while making material unresolved contradictions visible.**

> **The framework should detect meaningful drift proportionally rather than turning project maintenance into permanent background bureaucracy.**
