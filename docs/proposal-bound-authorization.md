# Proposal-bound Authorization and Replay Resistance

Proposal-bound Authorization is a post-RC3 Active Project Intelligence foundation for granting narrow authority to one exact future semantic mutation without turning a provider message, copied proposal, project-owned file, or old approval into standing permission.

This capability is repository development after the immutable `v0.1.0-rc.3` Foundation Preview release.

## Current surface

The current repository implementation adds two bounded commands:

```text
livariant prepare --input <candidate.json>
livariant prepare --input <candidate.json> --json

livariant authorize --input <actionable-proposal.json>
livariant authorize --input <actionable-proposal.json> --json
```

Runtime APIs expose the corresponding Actionable Proposal and internal authorization lifecycle primitives.

`prepare` and `authorize` do **not** perform the semantic Project Brain mutation. Semantic Apply is a separate later slice.

## Review-only proposals remain non-actionable

The existing Semantic Proposal Core is unchanged and permanently review-only. Existing proposal output continues to state:

```text
reviewOnly: true
mutationAuthorization: false
applySupported: false
authorizationEligible: false
changesMade: 0
```

A review-only `proposalId`, digest, stable project identity, origin claim, or matching baseline cannot be reinterpreted as authorization.

## Actionable Proposal

`livariant prepare` takes the same bounded candidate schema used by the Semantic Proposal Core and reconstructs the current trusted Project Brain state.

If the project is healthy and schema 2 exposes a valid stable logical project identity, Livariant can produce a **distinct Actionable Proposal** envelope.

The envelope binds:

- one stable logical Project Brain identity;
- one exact material Project Brain baseline;
- one exact candidate;
- one supported semantic domain and operation;
- an exact target identity where the operation requires one;
- the normalized material mutation scope;
- deterministic proposal identity and SHA-256 material digest.

The Actionable Proposal reports:

```text
authorizationEligible: true
mutationAuthorization: false
applySupported: false
authorizationRequired: true
changesMade: 0
```

It is eligible to be reviewed for authorization, but it is not itself authority.

## Explicit authorization

`livariant authorize` accepts one Actionable Proposal file, parses it strictly, verifies its digest, and then **reconstructs the proposal again from current canonical Project Brain state**.

Authorization is refused if the current trusted state no longer reproduces the exact same project identity, baseline, proposal identity, proposal digest, or mutation scope.

This means a stored Actionable Proposal becomes stale when material Project Brain truth changes.

The supported authorization path also requires an interactive local terminal. Livariant displays the exact project identity, proposal identity/digest, baseline and mutation scope, then requires the exact proposal-specific confirmation challenge before authority state can be written. The gate is enforced by the authorization core rather than only by the CLI wrapper, so a non-interactive direct call does not bypass it.

This interactive challenge is an **explicit local interaction boundary**, not a cryptographic attestation of a human being and not an OS-level defense against an already compromised process running with the same user privileges. Livariant's machine-local trust model separates project authority from user-home trust state; it does not claim to isolate mutually hostile processes that already have equivalent access to the same operating-system user account.

Provider text, candidate fields, task files, environment-controlled project input, copied packets, or claims such as “the user already approved this” cannot create authority by themselves.

## Dual-evidence trust boundary

Project-owned bytes cannot be the trust root for their own mutation authority.

A repository can modify or manufacture files below `.project-brain`, so a valid-looking project-local authorization record is never sufficient by itself.

Livariant uses two matching evidence surfaces:

1. **Project-local lifecycle/audit evidence** below `.project-brain/.authorizations`. It records the exact binding, current lifecycle state, interruption evidence, and terminal history.
2. **Independent machine-local authority** below the operating-system user's Livariant trust state, outside the project directory. The machine-local receipt binds the same authorization ID, stable project identity, Actionable Proposal identity/digest, scope, and baseline.

A future apply operation may consume authority only when both surfaces are present, valid, non-ambiguous, and materially identical.

The machine-local authorization root is checked against the physical user-home and project paths so project-controlled path overlap or symlink substitution cannot turn repository state into machine-local authority.

## Copy and checkout semantics

Stable Project Identity still identifies a logical Project Brain lineage, not a unique physical checkout.

Copying a Project Brain copies its project-local authorization audit bytes, but does not copy machine-local authority to another machine.

On the same machine, two physical copies with the same logical Project Brain identity can refer to the same narrow machine-local authorization receipt. The receipt is therefore protected by an atomic machine-local transition lock when consumption begins so two concurrent consumers cannot both reuse the same authorization.

This does not create a claim that Livariant has unique checkout identity.

## Authorization lifecycle

The authorization lifecycle distinguishes:

```text
preparing
authorized
applying
completed
failed-recovery-required
invalidated
```

`preparing` is project-local dual-evidence creation state. It cannot authorize apply.

An `authorized` record may later transition to `applying` only after the Actionable Proposal, current baseline, project identity, project-local audit evidence, and machine-local authority are revalidated.

The machine-local receipt is consumed first under an atomic lock. This makes replay unavailable before semantic mutation can begin.

A successful future apply will finish as terminal `completed`. A failed or ambiguous apply becomes `failed-recovery-required`. Explicit invalidation is terminal as well.

Terminal authorization cannot be silently reset to `authorized` or replayed for another mutation.

## Interrupted and ambiguous state

A partial authorization creation or lifecycle transition fails closed.

Examples include:

- project-local `preparing` state without a matching machine-local receipt;
- project-local `authorized` evidence without matching machine-local authority;
- machine-local authority without matching project-local lifecycle evidence;
- material binding mismatch between the two surfaces;
- a machine-local consumption lock left by an interrupted transition;
- active and terminal project evidence that contradict each other.

Livariant does not infer that one side should overwrite the other. A supported later recovery path must resolve lifecycle ambiguity where necessary.

Read and verification operations do not create missing authorization directories or repair absent evidence. Unknown entries in the managed project authorization root are treated as ambiguous and fail closed.

## No semantic mutation in this slice

WP-008 creates and manages authority state only.

The current authorization result may report that matching authority exists, but:

```text
applySupported: false
semanticChangesMade: 0
```

The actual Project Brain semantic mutation belongs to Semantic Apply and must consume the exact authorization lifecycle safely.

## Release boundary

Proposal-bound Authorization is not retroactively part of `v0.1.0-rc.3`.

RC3 remains immutable historical release evidence. Any future distributed release containing this capability requires a separately approved release process.
