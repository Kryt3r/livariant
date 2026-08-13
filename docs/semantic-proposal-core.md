# Semantic Proposal Core

This post-RC3 repository capability creates a read-only review proposal from one explicit Project Brain decision candidate.

## Commands

```text
livariant propose --input <candidate.json>
livariant propose --input <candidate.json> --json
```

The first supported domain is `project-decision` with `add` and `supersede` candidates.

Candidate files use schema version 1 and are treated as external input. The `origin` field is reported as an unverified origin claim.

A proposal is bound to the same material Project Brain baseline used by Project Context Snapshot. Project Brain changes during construction cause a blocked result.

Every proposal in this first schema is review-only and makes zero changes:

```text
reviewOnly: true
applySupported: false
changesMade: 0
```

Exact active decision duplicates can be identified. Different decision text is not declared semantically compatible by this first slice. Supersede candidates must name one structured active decision ID.

Input limits are 64 KiB for the candidate file, 4 KiB for the proposed statement, and 8 KiB for the rationale.

Successful proposal construction exits with status `0`. Invalid candidate input and blocked construction use non-zero status values and distinct JSON result states.

This slice does not add proposal application, automatic drift scanning, terminology persistence, provider transport, stable project identity, LLM semantic comparison, or broader proposal domains.

`v0.1.0-rc.3` remains unchanged. This capability is post-RC3 repository development until a later separately approved release.
