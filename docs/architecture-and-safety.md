# Architecture & Safety

Livariant separates project knowledge, reusable framework rules, provider-specific translation, and Runtime authority. The goal is simple: useful tooling should not quietly become the owner of the project.

This page explains the deeper model behind that rule. You do not need to understand every section before using Livariant for the first time.

## The main layers

Livariant has five primary logical layers:

1. **Core**: framework-wide governance and safety rules.
2. **Patterns**: reusable architecture and product patterns.
3. **Profiles**: domain-specific guidance and constraints.
4. **Adapters**: environment-specific capability discovery and translation.
5. **Project Brain**: project-owned knowledge and lifecycle identity for one concrete project.

The executable Runtime coordinates these layers. An Adapter does not become authoritative simply because it can technically perform an action.

## The Project Brain is the durable project record

The Project Brain stores the project context Livariant treats as canonical. Resume output, provider projections, temporary plans, tool observations, and hidden provider memory may be useful, but they are not competing canonical stores.

For example, Claude Code and Codex may receive differently formatted Resume output while both projections still describe the same Project Brain state.

## Presence is not currency

A file can belong to the project and still contain old information.

A README, Quickstart, architecture summary, provider instruction file, example, or release guide may have been correct when it was written and become stale after a later product, policy, CLI, provider, lifecycle, licensing, or architecture decision.

Livariant calls this **Knowledge Drift**.

> [!IMPORTANT]
> **Presence is not currency.** The existence of a claim in a legitimate project-owned file does not prove that the claim is still current.

Livariant distinguishes four kinds of information:

- **canonical current truth**: the authoritative current knowledge for its domain;
- **dependent current truth**: current-facing material that must stay aligned with canonical truth;
- **historical truth**: records that deliberately preserve an earlier state or decision;
- **ephemeral projections**: temporary context derived from canonical truth.

When canonical truth changes, dependent current material should be identified and reviewed. Historical records normally stay historical instead of being rewritten just to remove old terminology.

Finding stale material does not create permission to rewrite it. Detection and authority are separate.

The canonical semantic contract is defined in [`core/knowledge-drift-and-truth-surfaces.md`](../core/knowledge-drift-and-truth-surfaces.md).

## Capability is not authority

One rule appears throughout Livariant:

> Technical ability to mutate something does not mean the Runtime is authorized to mutate it.

Supported mutations require explicit authority at the Runtime boundary. This applies to initialization, canonical decision changes, framework updates, migrations, and recovery.

The same rule applies to executable release trust. Project input can describe a release or request an update, but it cannot turn its own bytes into execution authority.

## Existing projects are protected by default

Livariant uses a preservation-first mutation model:

```text
inspect
-> explain intent and scope
-> determine impact and risk
-> establish a recoverable baseline when needed
-> authorize
-> perform the smallest sufficient mutation
-> verify
```

Existing project-owned files are not normalized just because Livariant would prefer a different structure.

## Ambiguous state fails closed

When Livariant cannot prove that a state is safe and supported, it narrows behavior instead of guessing through the problem.

Examples include:

- damaged or partial Project Brain state;
- invalid lifecycle journals;
- unresolved interrupted migrations;
- symlinked managed write surfaces;
- unsupported migration paths;
- unexpected release sources or artifact identities;
- missing independent machine-local artifact authority;
- installed Runtime integrity drift;
- ambiguous or stale compatibility evidence.

`doctor` is intentionally diagnostic and read-only. It reports the problem instead of silently repairing it.

## Update trust and activation

A release artifact being valid does not automatically mean it is authorized, compatible, installed, trusted for execution, or active.

Livariant keeps these checks separate:

```text
release identity
-> artifact and source integrity
-> compatibility
-> explicit --apply authorization
-> pre-existing independent machine-local artifact authority
-> Runtime installation without lifecycle scripts
-> release-evidence verification
-> installed package-tree measurement
-> machine-local Runtime trust establishment and recheck
-> candidate Runtime attestation and execution
-> lifecycle validation
-> canonical Project Brain release pin
```

Project-controlled input cannot create the independent release-authority record through the Livariant CLI or production API. There is intentionally no project-facing `authorize-runtime` command.

The Project Brain framework pin is the canonical activation decision. A prepared Runtime that merely exists on disk cannot activate itself.

## Migration and recovery

Schema-changing updates use durable migration evidence and integrity-checked checkpoints. Interrupted work that is not safe to replay cannot simply be rerun because the command was repeated.

Recovery is a separate authorized lifecycle operation. Before a checkpoint is restored, Livariant verifies both its path binding and content integrity.

After rollback has produced and validated the restored Project Brain, cleanup must not undo that successful restore. Displaced state is removed before the final valid checkpoint is deleted. If late cleanup fails, the restored Project Brain and the checkpoint remain available.

## Provider boundary

The current Preview adapter surface supports Project Brain Resume handoff for Claude Code and Codex.

Adapters can report environment evidence and compatibility for that capability. They do not grant themselves project authority and do not silently rewrite native provider instruction files.

Future adapter capabilities need their own conformance and adversarial evidence before they become supported surfaces.
