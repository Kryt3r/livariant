# Existing-Project Adoption — Desktop presentation contract

The Desktop presentation layer must expose the canonical Existing-Project-Adoption lifecycle without becoming a second adoption engine.

`buildAdoptionDesktopPresentation(...)` derives a bounded, read-only presentation model from the current adoption content review and explicit material-bound review decisions. Optional canonical authorization and Semantic Apply evidence may extend the displayed lifecycle state only when they still bind to the exact current adoption proposal.

## What the Desktop may show

The presentation contract exposes:

- provenance-bearing reviewed evidence;
- evidence kind, path, scope and material identity;
- review-attention codes such as conflicts or overlapping guidance;
- explicit decision state: `accept-as-candidate`, `reject`, `defer`, `undecided`, or `review-again`;
- whether the current adoption proposal is blocked or ready for authorization review;
- whether canonical authorization has been reached;
- whether canonical Semantic Apply has completed.

## Stale or replaced material

Prior decisions do not silently carry forward when evidence changes. If a decision no longer matches the exact current evidence material, or refers to evidence that has disappeared from the current review, the presentation fails closed and requires review again.

Likewise, authorization or apply evidence bound to a different adoption proposal is not displayed as current authority or completion.

## Boundaries

The presentation contract explicitly preserves these boundaries:

- Evidence is not Project Truth.
- A UI decision is not Project Truth.
- A UI decision does not grant mutation Authority.
- A proposal is not Authorization.
- Authorization is not Semantic Apply completion.
- Project-owned repository files remain read-only in this presentation slice.
- Conflicts are not silently reconciled.
- The presentation itself makes no product-state changes.

This capability is generic Existing-Project-Adoption behavior. It is not a Livariant Self-Hosting special case and does not authorize release, publication, tagging or updater changes.
