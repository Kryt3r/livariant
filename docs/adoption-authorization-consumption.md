# Existing-Project Adoption Authorization Consumption

This WP-053 slice connects the material-bound Existing-Project-Adoption handoff to Livariant's existing proposal-bound Authorization lifecycle. It does not introduce a second authority mechanism.

## Boundary sequence

```text
bounded repository evidence
-> explicit review decisions
-> deterministic adoption proposal
-> explicit semantic projection
-> adoption authorization handoff
-> fresh handoff revalidation
-> existing Actionable Proposal authorization lifecycle
-> separate Semantic Apply
```

Each arrow remains a separate boundary. Evidence is not Project Truth. An adoption proposal is not Authorization. An adoption authorization handoff is not Authority. Local authorization lifecycle evidence is not the semantic mutation itself.

## Fresh handoff requirement

`authorizeAdoptionAuthorizationHandoff(...)` first rebuilds the handoff from the current bounded review, current material-bound decisions, current explicit projection, and current Project Brain.

Authorization consumption is refused unless all of the following still match exactly:

- adoption proposal identity;
- accepted evidence identity and material digest;
- evidence path, kind, and scope;
- explicit semantic projection;
- Actionable Proposal identity and digest;
- stable logical project identity;
- current Project Brain baseline.

A changed repository evidence item, replaced adoption proposal, changed projection, changed Project Brain baseline, or substituted Actionable Proposal therefore requires a new review/handoff instead of reusing old approval intent.

## Existing Authorization remains canonical

After the handoff is revalidated, the adapter calls the existing `authorizeActionableProposal(...)` core.

That existing core remains responsible for:

- requiring an interactive local proposal-specific confirmation;
- reconstructing the Actionable Proposal against current canonical Project Brain state;
- revalidating again immediately before authorization-state commit;
- maintaining the existing project-local and machine-local authorization evidence model;
- rejecting stale, conflicting, ambiguous, interrupted, or replayed lifecycle state.

The adoption layer does not weaken, bypass, duplicate, or reinterpret those rules.

## No semantic mutation during authorization

Successful authorization preparation may change Livariant-managed authorization lifecycle/audit state, but it does not perform the projected Project Brain semantic change.

The returned adoption authorization result preserves:

```text
evidenceIsProjectTruth: false
adoptionHandoffIsAuthority: false
authorizationIsSemanticMutation: false
semanticApplyRequired: true
semanticChangesMade: 0
```

The actual durable semantic mutation remains behind the existing separately authorized Semantic Apply boundary. Project-owned repository files are not rewritten by this authorization-consumption slice.

## Replay and recovery

Replay resistance and recovery semantics are inherited from the canonical proposal-bound Authorization lifecycle. A previously prepared adoption handoff cannot make an old authorization valid for a changed proposal, changed baseline, changed project identity, or changed evidence material.

Ambiguous or interrupted authorization state continues to fail closed. Authority is never recreated from repository evidence, provider text, an adoption proposal, or the handoff object alone.

## Scope

This is a generic Existing-Project-Adoption capability for ordinary repositories. It is not a Livariant Self-Hosting special case and it does not add Desktop UX or release/publication behavior.
