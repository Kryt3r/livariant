# Semantic Apply

Semantic Apply is a post-RC3 Active Project Intelligence capability that consumes one exact WP-008 proposal-bound authorization and performs one supported canonical Project Brain semantic mutation.

This capability is repository development after the immutable `v0.1.0-rc.3` Foundation Preview release.

## Current surface

```text
livariant apply --authorization <authorization-id> --input <actionable-proposal.json>
livariant apply --authorization <authorization-id> --input <actionable-proposal.json> --json
```

High-level Runtime API:

```text
applyActionableProposal()
```

The input must be the exact Actionable Proposal that was authorized. Candidate JSON and the permanently review-only Semantic Proposal object are not substitutes.

## Supported semantic operations

The current bounded schema supports exactly:

- `project-decision` / `add`;
- `project-decision` / `supersede`;
- `project-goal` / `add`;
- `project-knowledge` / `add`.

Semantic Apply does not add a new semantic domain or a generic arbitrary file-write mechanism.

## Authority boundary

Semantic Apply does not create or infer mutation authority.

A fresh apply requires the existing WP-008 dual-evidence Authority to match the exact:

- authorization ID;
- Actionable Proposal identity and digest;
- stable logical Project Brain identity;
- material Project Brain baseline;
- normalized mutation scope;
- project-local authorization lifecycle evidence;
- independent machine-local authorization receipt.

Project-local bytes alone, provider claims, copied packets, stable project identity, review-only proposal output, matching text, or prior conversational approval cannot authorize apply.

## Fresh apply sequence

The supported normal flow is:

```text
strictly parse Actionable Proposal
-> reconstruct current trusted proposal and baseline
-> verify exact dual-evidence authorized state
-> consume Authority: authorized -> applying
-> revalidate the exact pre-mutation proposal/baseline
-> retain the current invocation's managed pre-state in volatile memory
-> prepare the existing supported semantic writer
-> revalidate again immediately before atomic promotion
-> promote only the exact authorized semantic mutation
-> prove every unaffected managed Project Brain input stayed byte-identical
-> re-read and structurally verify the exact authorized semantic target
-> capture the complete verified managed post-state in volatile memory
-> immediately before terminal completion prove the complete managed state is still byte-identical
-> complete Authority: applying -> completed
```

Authority becomes non-replayable before semantic mutation begins.

The volatile pre/post bytes exist only for the current trusted process. WP-009 does not persist them as a new recovery checkpoint, journal, Authority source, or machine-local trust object.

## Existing semantic writers remain authoritative for mutation mechanics

Semantic Apply composes the existing decision, goal, and knowledge mutation implementations rather than introducing a second Project Brain writer.

The existing boundaries therefore remain active, including:

- managed-path confinement;
- regular-file and symbolic-link safety;
- exact-original optimistic concurrency checks;
- atomic file replacement;
- preservation of unrelated human-authored content;
- duplicate rejection;
- structured decision history and supersession semantics;
- writer-level post-write verification.

The Actionable Proposal controls what mutation may be attempted. Current canonical Project Brain state still controls whether that exact attempt remains valid.

## Verification before `completed`

Normal same-process completion requires more than the desired semantic statement merely being present.

Livariant verifies:

- every unaffected managed Project Brain input remains byte-identical to the exact current-invocation pre-state;
- decision add: exactly one active structured decision with the authorized statement;
- decision supersede: the exact authorized target is superseded and points to one active exact replacement;
- goal add: exactly one matching confirmed goal exists in the confirmed-goal region;
- knowledge add: exactly one matching confirmed fact exists in confirmed project knowledge;
- the complete managed Project Brain state remains byte-identical from the verified post-state capture through the final Authority-completion boundary.

If any of those checks fail after Authority consumption, Semantic Apply fails closed under the existing `failed-recovery-required` rules instead of reporting successful completion.

## Failure and replay resistance

If a failure occurs after Authority consumption begins, Authority never returns to `authorized`.

The normal failure transition is:

```text
applying -> failed-recovery-required
```

A completed or failed authorization is terminal and cannot be replayed as a new mutation token.

Concurrent consumers share the WP-008 machine-local transition lock, so two consumers sharing the same logical Project Brain identity cannot both consume the same authorization concurrently.

## Interrupted pre-mutation reconciliation

WP-008 deliberately consumes machine-local evidence before project-local evidence. A crash can therefore leave:

```text
project-local: authorized
machine-local: applying
```

or:

```text
project-local: applying
machine-local: applying
```

Semantic Apply may continue these states only when the current Project Brain still reproduces the **exact original Actionable Proposal pre-mutation baseline**. In that case the exact pre-state proves that the semantic write did not commit.

The only forward actions are:

- align project-local `authorized -> applying` when matching machine-local evidence is already `applying`;
- continue from matching `applying/applying`;
- execute the exact authorized semantic mutation once.

Machine-local Authority is never reset to `authorized`. An active or interrupted machine transition lock blocks reconciliation.

## Post-mutation crash proof boundary

The same-process exact-delta proof is intentionally volatile. After a process boundary it is no longer available as durable recovery evidence.

The Actionable Proposal baseline proves the exact authorized pre-mutation managed state, but it does not preserve old per-surface bytes after mutation. Therefore an apparently correct semantic postcondition such as “the requested goal exists” does **not** prove after a crash that unrelated managed Project Brain surfaces remained unchanged.

Current Semantic Apply deliberately fails closed for changed-baseline interrupted states instead of inferring success from desired text.

In particular, a split such as:

```text
project-local: applying
machine-local: completed
```

is not automatically promoted to project-local `completed` after a process boundary merely because the requested statement is present.

Automatic post-crash completion would require separately accepted trusted durable exact-delta evidence. WP-009 does not silently introduce such a trust substrate.

## Forward-only failure reconciliation

If machine-local failure terminalization completed first and project-local evidence is still `applying`:

```text
project-local: applying
machine-local: failed-recovery-required
```

matching full bindings may align project-local evidence forward to terminal `failed-recovery-required` without semantic mutation.

This is failure-state bookkeeping only. It does not repair canonical Project Brain state and does not make Authority reusable.

## Unsupported and ambiguous states

Unsupported or insufficiently proven states remain fail-closed. Examples include:

- changed canonical baseline after Authority consumption;
- `project=authorized / machine=completed`;
- `project=applying / machine=authorized`;
- `project=applying / machine=completed` without complete trusted post-state proof;
- mismatched proposal/project/scope/baseline bindings;
- missing one side of dual evidence;
- contradictory project active/history records;
- unsafe managed filesystem topology;
- active machine transition locks.

Semantic Apply does not guess which side should win.

## Output boundary

A normal successful result reports semantics equivalent to:

```text
state: completed
mutationAuthorizationConsumed: true
semanticChangesMade: 1
```

Failures that are proven to occur before a valid Actionable Proposal can reach Authority consumption may report:

```text
recoveryRequired: false
mutationOutcome: not-applied
semanticChangesMade: 0
```

Once the exact authorization may already be in an active or recovery-required lifecycle, the CLI does **not** overclaim a zero-write outcome. It reports the uncertainty explicitly, for example:

```text
recoveryRequired: true
mutationOutcome: unknown-recovery-required
semanticChangesMade: unknown
```

The command does not present an unresolved recovery state as successful completion and does not use a `0` mutation claim as a substitute for missing evidence.

## Composition through `maintain`

Post-RC3 repository development also contains the separate provider-neutral Semantic Maintenance composition surface documented in [Agent-Assisted Semantic Maintenance](semantic-maintenance.md).

`maintain` does not create Authority. Without an explicit authorization ID it can only reconstruct review/actionable state and return `review-required` or `authorization-required`. With an explicit authorization ID it delegates the mutation to this existing Semantic Apply path, so all WP-008/WP-009 replay, recovery, exact-delta, and terminal-state rules remain authoritative.

## Non-goals

Semantic Apply does not implement:

- automatic candidate discovery;
- automatic drift repair;
- provider-triggered or provider-approved mutation;
- standing or wildcard authorization;
- batch/multi-proposal apply;
- arbitrary repository file mutation;
- terminology lifecycle persistence or canonical rename;
- provider transport or automatic injection;
- unique physical checkout identity;
- generic authorization repair;
- a new trusted post-crash checkpoint/journal;
- release, tag, or package publication.

## Release boundary

Semantic Apply is not part of `v0.1.0-rc.3`.

RC3 remains immutable historical release evidence. Any distributed release containing Semantic Apply requires a separately approved release process.
