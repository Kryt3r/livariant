# Semantic Proposal Core

This post-RC3 repository capability creates a read-only review proposal from one explicit Project Brain candidate.

## Commands

```text
livariant propose --input <candidate.json>
livariant propose --input <candidate.json> --json
```

Schema version 1 currently supports:

- `project-decision` with `add` and `supersede`;
- `project-goal` with `add`;
- `project-knowledge` with `add`.

Candidate files are external input. The `origin` field is reported as an unverified origin claim and does not establish approval, project identity, or mutation authority.

A proposal is bound to the same coherent material Project Brain state used by Project Context Snapshot. For a valid schema-2 Project Brain, the proposal also includes the canonical logical `stableProjectIdentity` captured from the same managed `metadata.json` state. Historical schema-1 projects expose `stableProjectIdentity: null` until explicit migration.

The stable project identity is part of the proposal material used for deterministic proposal identity. It identifies the logical Project Brain lineage; it does not make a proposal executable or authorized. Project Brain changes during construction cause a blocked result.

Every current proposal is review-only and makes zero changes:

```text
reviewOnly: true
mutationAuthorization: false
applySupported: false
authorizationEligible: false
changesMade: 0
```

Identity equality alone does not establish approval, anti-replay freshness, unique checkout identity, or trusted returned proposal state. A later material action must re-read canonical state.

See [Stable Project Identity Foundation](stable-project-identity-foundation.md).

## Decision proposals

Exact active decision duplicates can be identified. Different decision text is not declared semantically compatible by this bounded implementation. Supersede candidates must name one structured active decision ID.

## Goal proposals

`project-goal` currently supports only `add`.

Livariant compares the candidate against the confirmed goal region. An exact confirmed duplicate can be identified. A matching bullet outside the confirmed goal region is surfaced separately and is not promoted to a confirmed goal. Different goal text is not declared semantically compatible.

## Knowledge proposals

`project-knowledge` currently supports only `add`.

Livariant compares the candidate against confirmed project knowledge. An exact confirmed fact can be identified. A matching entry under `Known unknowns` is surfaced as an unresolved-state scope conflict and is not treated as confirmed knowledge. Different fact text is not declared semantically compatible or non-contradictory.

The Goal, Knowledge, and Project Context surfaces use the same Project Brain semantic-region interpretation so they do not derive different canonical regions from the same managed files.

For goal and knowledge candidates, the proposed statement must be a single-line scalar value. The same statement under different proposal domains is material to proposal identity.

Input limits remain 64 KiB for the candidate file, 4 KiB for the proposed statement, and 8 KiB for the rationale.

Successful proposal construction exits with status `0`. Invalid candidate input and blocked construction use non-zero status values and distinct JSON result states.

This capability still does not add proposal application, proposal-bound authorization, authorization replay state, automatic drift scanning, terminology persistence, provider transport, LLM semantic comparison, autonomous candidate discovery, goal or knowledge replacement, or goal or knowledge supersession.

`v0.1.0-rc.3` remains unchanged. Stable Project Identity and these proposal capabilities are post-RC3 repository development until a later separately approved release.
