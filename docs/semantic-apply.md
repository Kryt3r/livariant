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

A fresh apply requires the existing WP-008 dual-evidence authority to match the exact:

- authorization ID;
- Actionable Proposal identity and digest;
- stable logical Project Brain identity;
- material Project Brain baseline;
- normalized mutation scope;
- project-local authorization lifecycle evidence;
- independent machine-local authorization receipt.

Project-local bytes alone, a provider claim, copied packet, stable project ID, review-only proposal, matching text, or prior conversational approval cannot authorize apply.

## Fresh apply sequence

The supported normal flow is:

```text
strictly parse Actionable Proposal
-> reconstruct current trusted proposal and baseline
-> verify exact dual-evidence authorized state
-> consume Authority: authorized -> applying
-> revalidate the exact pre-mutation proposal/baseline
-> prepare the existing supported semantic writer
-> revalidate again immediately before atomic promotion
-> promote only the exact authorized semantic mutation
-> re-read and structurally verify the canonical semantic result
-> complete Authority: applying -> completed
```

Authority becomes non-replayable before semantic mutation begins.

A successful normal invocation reports one semantic change and terminal completion.

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
- post-write verification.

The Actionable Proposal controls what mutation may be attempted. Current canonical Project Brain state still controls whether that exact attempt remains valid.

## Verification before completion

`completed` is permitted only after Livariant re-reads canonical Project Brain state and proves the supported semantic result.

Current verification includes:

- decision add: exactly one active structured decision with the authorized statement;
- decision supersede: the exact authorized target is superseded and points to one active exact replacement;
- goal add: exactly one matching confirmed goal exists in the confirmed-goal region;
- knowledge add: exactly one matching confirmed fact exists in confirmed project knowledge.

A semantic postcondition is sufficient for the normal in-process verification step only because it follows the existing atomic writer and the immediately preceding exact-baseline revalidation in the same trusted execution flow.

It is **not** automatically sufficient evidence for crash-time post-state recovery after that execution context has been lost.

## Failure and replay resistance

If a failure occurs after Authority consumption begins, Authority never returns to `authorized`.

The normal failure transition is:

```text
applying -> failed-recovery-required
```

A completed or failed authorization is terminal and cannot be replayed as a new mutation token.

Concurrent consumers share the WP-008 machine-local transition lock, so two copies of the same logical Project Brain on one machine cannot both consume the same authorization concurrently.

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

Semantic Apply may continue these states only when the current Project Brain still reproduces the **exact original Actionable Proposal baseline**. In that case the original pre-mutation state proves that the semantic write did not commit.

The only forward actions are:

- align project-local `authorized -> applying` when machine-local evidence is already `applying`;
- continue from matching `applying/applying`;
- execute the exact authorized semantic mutation once.

Machine-local Authority is never reset to `authorized`.

An active or interrupted machine transition lock blocks reconciliation.

## Post-mutation crash proof boundary

The Actionable Proposal baseline is one aggregate digest over the managed Project Brain inputs. It proves the exact authorized pre-mutation state, but after mutation it does not reveal the old bytes for each individual managed surface.

Therefore an apparently correct semantic postcondition such as “the requested goal exists” does **not** prove after a process crash that unrelated managed Project Brain surfaces remained unchanged.

Current Semantic Apply deliberately fails closed for changed-baseline interrupted states instead of inferring success from desired text.

In particular, a split such as:

```text
project-local: applying
machine-local: completed
```

is not automatically promoted to project-local `completed` after a process boundary merely because the requested statement is present.

Automatic post-crash completion would require separately accepted trusted durable exact-delta evidence. WP-009 does not silently introduce a new checkpoint, recovery journal, machine-local trust object, or second authority substrate to create such evidence.

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

Blocked attempts report zero semantic changes for that invocation.

The command does not present an unresolved recovery state as successful completion.

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
