# Existing-project adoption authorization handoff

WP-053 keeps repository evidence, review decisions, proposal construction, authorization and durable mutation as separate stages.

A ready adoption proposal is not Authority. Reviewed evidence is not Project Truth. Candidate evidence is not copied wholesale into Project Brain.

`prepareAdoptionAuthorizationHandoff(...)` rebuilds the current adoption proposal from the current bounded review plus current material-bound decisions. The caller must provide the exact current `adoptionProposalId`, one exact accepted evidence id/material digest, and an explicit semantic projection.

The projection is a separate user-intent statement. v1 supports additive `project-goal` and `project-knowledge` projections only. This intentionally avoids interpreting an arbitrary documentation, architecture, CI, tooling or guidance file as one canonical semantic statement.

If the current proposal is blocked, incomplete, changed or replaced, the handoff fails closed. If the selected candidate evidence no longer matches exactly, the handoff is refused.

For a valid request, Livariant reuses the existing Actionable Proposal foundation. The returned handoff binds the adoption proposal identity, source evidence identity/material digest, semantic projection, actionable proposal identity/digest, stable project identity and current Project Brain baseline.

The result remains non-authoritative:

```text
evidenceIsProjectTruth: false
adoptionProposalIsAuthorization: false
projectionIsProjectTruth: false
mutationAuthorization: false
authorizationRequired: true
changesMade: 0
```

The handoff does not call the authorization core and does not write authorization state. Explicit authorization remains a separate operation through the existing proposal-bound authorization path. Durable semantic mutation remains a later separate apply step with the existing recovery and ambiguity protections.

Project-owned files are not changed by review, proposal construction or authorization handoff.
