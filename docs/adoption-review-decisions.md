# Existing-Project Adoption Review Decisions

This page describes the bounded review-decision and proposal layer used after explicit adoption content review.

## Boundary

Reviewed repository text is still Evidence. A review decision does not make it Project Truth and a proposal does not grant Authority.

The layer keeps these states separate:

```text
observed Evidence
→ explicit review decision
→ candidate Evidence
→ deterministic proposal
→ separate authorization review
→ later durable mutation path
```

There is no implicit transition between these states.

## Explicit decisions

Each reviewed evidence item may receive exactly one current decision:

- `accept-as-candidate` — include the exact reviewed material as candidate Evidence for a later proposal;
- `reject` — exclude that reviewed material from the proposal;
- `defer` — keep the item unresolved and block proposal readiness.

Reviewed evidence without a decision is also unresolved and is never implicitly accepted.

## Exact-material binding

Every decision is bound to a SHA-256 digest of the exact reviewed material, including its kind, path, scope, review status, byte count, truncation state and observed content.

If a fresh review observes different material, an older decision no longer matches and must not be reused silently. Proposal construction revalidates the decision against the current review material.

Truncated evidence cannot be accepted as candidate Evidence because omitted material remains unknown.

## Scope and conflicts

Nested guidance retains the scope produced by adoption content review. If multiple accepted guidance items have overlapping scope and the review reported unresolved overlap, proposal construction keeps that ambiguity visible and marks the proposal as blocked. It does not choose precedence or reconcile the content automatically.

## Deterministic proposal

`buildAdoptionReviewProposal(...)` constructs a deterministic proposal from explicit current decisions. The proposal:

- includes only `accept-as-candidate` material;
- records rejected and deferred evidence separately;
- surfaces undecided, deferred, truncated or unresolved-overlap blockers;
- receives a deterministic proposal identifier from the normalized proposal material;
- reports `ready-for-authorization-review` only when no blocker remains.

Even a ready proposal is not Authorization and is not Project Truth. Its boundaries remain:

- `evidenceIsProjectTruth: false`;
- `decisionsAreProjectTruth: false`;
- `proposalIsAuthorization: false`;
- `grantsAuthority: false`;
- `changesMade: 0`.

This slice makes no project-owned file changes and does not itself write Project Brain state.
