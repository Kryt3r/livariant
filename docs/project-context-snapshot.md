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
- the Livariant framework version;
- a deterministic material Project Brain baseline;
- confirmed project identity;
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

The digest input is versioned, domain-separated, framed, and deterministically ordered. It binds the managed input names, exact bytes, and the interpretation-relevant Project Brain schema version.

Generation time, display formatting, provider rendering, and the absolute project location do not establish the material baseline.

Two unchanged reads therefore keep the same material baseline even though their generation timestamps may differ. A material managed Project Brain change changes the baseline.

## Concurrent-change protection

Livariant does not return a clean snapshot if the managed Project Brain changes while the snapshot is being constructed.

The canonical content and baseline are derived from one captured state and the managed inputs are revalidated before clean return. If they changed concurrently, the result is blocked and the caller must retry from a fresh state.

## Blocked state

If the Project Brain is missing, damaged, ambiguous, recovery-required, or otherwise unsafe to project as clean current context, Livariant returns a blocked result instead of presenting partial material as trustworthy current context.

For machine-facing use, blocked JSON contains an explicit `safetyState: "blocked"` and the CLI exits non-zero. Internal Runtime failure remains a different failure path.

Human output puts the blocking state before diagnostic detail.

## Project locator is not durable project identity

The current snapshot exposes the project location from which it was generated, but this is not a stable durable project identity.

The first snapshot contract deliberately reports:

```text
stableProjectIdentity: null
```

A moved or copied project must not be assigned an invented identity merely because Livariant can read it. Any future durable cross-project identity requires a separate reviewed storage and migration contract.

## Trust boundary

A Project Context Snapshot is derived output.

It does not:

- authorize mutation;
- create or consume an approval;
- make provider-returned copies trusted;
- promote provider text to canonical truth;
- persist terminology or concept identities;
- repair drift automatically;
- inject context automatically into Claude Code, Codex, or another provider.

A later material action must re-read and revalidate current canonical state instead of treating an old or returned snapshot as standing authority.

## Relationship to `resume`

`livariant resume` remains the current provider-handoff surface for Claude Code and Codex.

`livariant context` is the structured project-truth projection layer. It establishes the read-side baseline and safety contract that future Semantic Change Proposals, drift analysis, and richer provider integrations can build on.

Those later capabilities are not implied to be available merely because the Project Context Snapshot exists.
