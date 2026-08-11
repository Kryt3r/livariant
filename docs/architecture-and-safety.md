# Architecture & Safety

The framework separates durable project truth, reusable framework rules, environment-specific translation, and runtime authority so that convenient tooling cannot silently become project ownership.

## Logical layers

The accepted architecture has five primary layers:

1. **Core** — universal framework governance and safety rules.
2. **Patterns** — reusable architecture/product patterns.
3. **Profiles** — domain-specific guidance and constraints.
4. **Adapters** — environment-specific capability discovery and translation.
5. **Project Brain** — project-owned canonical knowledge and lifecycle identity for one concrete project.

The executable Runtime coordinates these layers. It does not make an Adapter authoritative merely because an Adapter can technically perform an action.

## Project Brain is canonical

The Project Brain is the durable source of truth for project context. Resume output, provider projections, temporary plans, tool observations, and hidden provider memory are derived or external evidence — not competing canonical stores.

A provider-specific Resume projection may look different for Claude Code and Codex while representing the same canonical state.

## Presence is not currency

Canonical truth does not guarantee that every project-owned artifact still reflects that truth.

A README, quickstart, architecture summary, provider instruction file, example, or release guide may contain a claim that was correct when written and is now stale after a product, policy, CLI, provider, lifecycle, licensing, or architecture decision changed.

Livariant calls this **Knowledge Drift**.

> [!IMPORTANT]
> **Presence is not currency.** A claim being present in a legitimate project-owned file does not prove that the claim is still current.

The framework distinguishes:

- **canonical current truth** — authoritative current knowledge for its domain;
- **dependent current truth** — current-facing artifacts that must remain consistent with canonical truth;
- **historical truth** — records intentionally preserving earlier states or decisions;
- **ephemeral projections** — temporary context derived from canonical truth.

When canonical truth changes, affected dependent current surfaces should be identified and reviewed. Historical records should normally remain historical rather than being rewritten merely to remove old terminology.

Detection also does not create authority: identifying a stale document does not authorize Livariant to rewrite it.

The canonical semantic contract is defined in [`core/knowledge-drift-and-truth-surfaces.md`](../core/knowledge-drift-and-truth-surfaces.md).

## Capability is not authority

A recurring framework rule is:

> Technical ability to mutate something does not mean the Runtime is authorized to mutate it.

Supported mutations therefore require explicit authority at the Runtime boundary. This applies to initialization, canonical decision changes, framework updates, migrations, and recovery.

## Existing projects are protected by default

The mutation model is preservation-first:

```text
inspect
→ explain intent and scope
→ determine impact/risk
→ establish recoverable baseline when needed
→ authorize
→ perform the smallest sufficient mutation
→ verify
```

Existing project-owned files are not normalized merely because the framework would prefer a different structure.

## Fail closed on ambiguity

Examples of states that narrow behavior rather than trigger automatic repair include:

- damaged or partial Project Brain,
- invalid lifecycle journals,
- unresolved interrupted migrations,
- symlinked managed write surfaces,
- unsupported migration paths,
- unexpected release sources or artifact identities,
- installed-runtime integrity drift,
- ambiguous or stale compatibility evidence.

`doctor` is intentionally diagnostic and read-only.

## Update trust and activation

A verified release artifact is not automatically authorized, compatible, installed, or active.

The implemented lifecycle keeps these concepts separate:

```text
release identity
→ artifact/source integrity
→ compatibility
→ explicit authorization
→ runtime installation and attestation
→ validation
→ canonical Project Brain release pin
```

The Project Brain framework pin is the canonical activation decision. A prepared runtime on disk cannot activate itself.

## Migration and recovery

Schema-changing updates use durable migration evidence and checkpoint integrity. Interrupted non-replay-safe work cannot simply be re-run because the command was repeated.

Recovery is a separately authorized lifecycle operation. Checkpoints are path-bound and content-integrity-bound before restore.

## Provider boundary

The current Preview adapter surface supports Project Brain Resume handoff for Claude Code and Codex. Adapters report environment evidence and compatibility for that capability; they do not grant themselves project authority or mutate native provider instruction files.

Future adapter capabilities require their own conformance and adversarial evidence before becoming supported surfaces.
