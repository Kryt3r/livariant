# Project Context Snapshot

The Project Context Snapshot is a read-only Active Project Intelligence surface for exposing the current Project Brain as structured, provenance-aware context.

## Commands

```bash
livariant context
livariant context --json
```

The default command is for human review. `--json` exposes the same safety and authority distinctions as structured data for tooling and future agent integrations.

## What a clean snapshot contains

A clean snapshot includes:

- the current project locator;
- the stable logical Project Brain identity when the current schema provides one;
- the Livariant framework version;
- a deterministic material Project Brain baseline;
- confirmed project identity evidence;
- confirmed goals;
- active accepted decisions;
- known facts;
- unresolved unknowns;
- explicit authority classes for projected items;
- projection metadata stating that the snapshot is derived output and is not mutation authorization;
- `Changes made: 0`.

Confirmed Project Brain material is labelled `canonical-project`. Unresolved unknowns remain `unresolved-project` and are not promoted to facts by rendering.

## Material baseline

The snapshot baseline uses a deterministic SHA-256 identity over the managed Project Brain inputs that produced the snapshot.

The digest input is versioned, domain-separated, framed, and deterministically ordered. It binds the managed input names, exact bytes, and the interpretation-relevant Project Brain schema version. Because `metadata.json` is managed baseline material, a schema-2 `projectId` is captured coherently with the same state.

Generation time, display formatting, provider rendering, and the absolute project location do not establish the material baseline.

Two unchanged reads therefore keep the same material baseline even though their generation timestamps may differ. A material managed Project Brain change changes the baseline.

## Concurrent-change protection

Livariant does not return a clean snapshot if the managed Project Brain changes while the snapshot is being constructed.

The canonical content, material baseline, and stable project identity are derived from one captured state and the managed inputs are revalidated before clean return. If they changed concurrently, the result is blocked and the caller must retry from a fresh state.

## Blocked state

If the Project Brain is missing, damaged, ambiguous, recovery-required, or otherwise unsafe to project as clean current context, Livariant returns a blocked result instead of presenting partial material as trustworthy current context.

A schema-2 Project Brain with a missing or malformed `projectId` is damaged state. A read operation does not silently mint or repair the identifier.

For machine-facing use, blocked JSON contains an explicit `safetyState: "blocked"` and the CLI exits non-zero. Internal Runtime failure remains a different failure path.

Human output puts the blocking state before diagnostic detail.

## Project locator and stable logical identity are different

`projectLocator` is the filesystem location from which the snapshot was generated. It is not durable identity.

Current repository development supports a separate stable logical Project Brain identity:

- schema 2 requires one canonical UUID and exposes it as `stableProjectIdentity`;
- schema 1 is the historical pre-identity schema and reports `stableProjectIdentity: null` until an explicit supported migration occurs;
- moving or renaming a project directory does not rotate the logical ID;
- a byte-for-byte copied Project Brain retains the same logical ID.

The ID therefore identifies a logical Project Brain lineage, not one unique checkout or machine.

See [Stable Project Identity Foundation](stable-project-identity-foundation.md).

## Trust boundary

A Project Context Snapshot is derived output.

Neither the snapshot nor its stable project ID:

- authorizes mutation;
- creates or consumes an approval;
- proves anti-replay freshness or unique checkout identity;
- makes provider-returned copies trusted;
- promotes provider text to canonical truth;
- persists terminology or concept identities;
- repairs drift automatically;
- injects context automatically into Claude Code, Codex, or another provider.

A later material action must re-read and revalidate current canonical state instead of treating an old or returned snapshot, or identity equality alone, as standing authority.

## Relationship to `resume`

`livariant resume` remains the current provider-handoff surface for Claude Code and Codex.

`livariant context` is the structured project-truth projection layer. It establishes the read-side baseline, identity, and safety contract that Semantic Change Proposals, drift analysis, and Provider Context can use without gaining mutation authority.

Stable Project Identity and the other post-RC3 Active Project Intelligence surfaces are repository development and are not retroactively part of immutable `v0.1.0-rc.3`.
