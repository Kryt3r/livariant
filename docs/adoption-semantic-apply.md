# Adoption Semantic Apply

Existing-project adoption reaches durable Project Brain mutation only through Livariant's existing Semantic Apply path.

A reviewed repository surface is still Evidence. An accepted adoption candidate is still not Project Truth. The explicit projection selected during adoption is not mutation Authority. The local authorization record is not independent Guardian Authority.

`applyAuthorizedAdoptionHandoff(...)` rebuilds the current adoption authorization handoff from the current bounded review, material-bound decisions, explicit projection, and current Project Brain. Before delegating to `applyActionableProposal(...)`, it requires all of the following to remain exact:

- adoption proposal identity;
- selected evidence identity and material digest;
- evidence path, kind, and scope;
- explicit semantic projection;
- Actionable Proposal identity and digest;
- stable project identity;
- Project Brain baseline;
- canonical authorization binding and authorization id.

Changed, stale, replaced, forged, or ambiguous material fails closed before adoption-specific code can request semantic mutation.

The adapter does not create another Authority store and does not consume mutation Authority itself. It delegates to the canonical `applyActionableProposal(...)` lifecycle. That lifecycle remains responsible for current-proposal verification, exact local authorization matching, protected Guardian Semantic Authority consumption, replay resistance, recovery transitions, exact managed-state delta checks, postcondition verification, and accepted Project Brain integrity advancement.

Only the projected supported semantic statement may become canonical state. v1 adoption projection remains additive `project-goal` or `project-knowledge`. The source repository document is not rewritten, normalized, or copied wholesale into Project Brain.

Project-owned repository files remain outside the adoption mutation target. The only supported durable change is the already authorized managed Project Brain semantic target selected by the Actionable Proposal.

A successful return therefore means that the canonical Semantic Apply path completed and verified exactly one semantic Project Brain change. It does not broaden future Authority and cannot be replayed as another mutation.
