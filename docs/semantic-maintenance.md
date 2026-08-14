# Agent-Assisted Semantic Maintenance

Agent-Assisted Semantic Maintenance is a post-RC3 provider-neutral composition layer over Livariant's existing Active Project Intelligence primitives.

It reduces manual orchestration without changing who owns project truth or who may authorize mutation.

This capability is repository development after the immutable `v0.1.0-rc.3` Foundation Preview release.

## Current surface

```text
livariant maintain --input <candidate.json>
livariant maintain --input <candidate.json> --json
livariant maintain --input <candidate.json> --authorization <authorization-id>
livariant maintain --input <candidate.json> --authorization <authorization-id> --json
```

Runtime API:

```text
maintainSemanticProjectState()
```

The command accepts exactly one candidate using the existing strict Semantic Proposal candidate schema.

## What it composes

The workflow reuses existing trusted primitives:

```text
explicit candidate
-> Semantic Proposal reconstruction
-> Actionable Proposal reconstruction when eligible
-> separate existing Authorization boundary
-> existing Semantic Apply when an explicit authorization ID is supplied
-> fresh Project Context reconstruction after successful apply
```

It does not introduce a second proposal engine, Authority source, semantic writer, or recovery mechanism.

## Result states

### `review-required`

The candidate is already satisfied/duplicate or otherwise remains a review-only outcome under the bounded current rules.

Properties:

- zero semantic mutation;
- zero Authority creation;
- no Authority consumption;
- returns review evidence.

### `authorization-required`

The candidate currently reconstructs an exact Actionable Proposal but no authorization ID was supplied.

Properties:

- returns the exact reconstructed Actionable Proposal;
- zero semantic mutation;
- zero implicit Authority creation;
- zero implicit consumption of matching Authority that may already exist;
- the user must use the separate supported `livariant authorize` path.

The CLI uses a distinct non-success exit state so integrations do not need to scrape human text to distinguish this condition.

### `blocked`

Current project state, candidate/proposal reconstruction, Authority evidence, baseline, identity, scope, replay state, or recovery state cannot safely support the requested next step.

Before Authority consumption is provably possible, a blocked result may report `semanticChangesMade: 0`.

If the selected authorization may already have entered an active/recovery-required lifecycle, the result does not guess a zero-write outcome. It reports recovery-required uncertainty explicitly.

### `completed`

Allowed only when the exact current candidate reconstructs the exact authorized Actionable Proposal, the supplied authorization ID passes the existing WP-008/WP-009 checks, Semantic Apply completes exactly one supported mutation, and a fresh Project Context Snapshot is clear afterward.

The returned context is rebuilt from canonical Project Brain state after mutation; it is not patched from the caller's previous packet.

### `completed-context-blocked`

Semantic Apply completed and Authority is already terminal `completed`, but the subsequent fresh Project Context reconstruction is blocked.

This state is intentionally distinct from `completed` and from a pre-apply `blocked` result. It reports one completed semantic mutation while refusing to claim a clean refreshed context. The completed Authority is not replayable.

## Authorization boundary

`maintain` never creates mutation Authority.

The supported consent flow remains:

```text
livariant maintain --input candidate.json
-> authorization-required + exact Actionable Proposal

livariant authorize --input actionable-proposal.json
-> explicit local user-presence authorization

livariant maintain --input candidate.json --authorization <id>
-> may delegate to existing Semantic Apply
```

The authorization ID is only a selector. It is not proof by itself.

A candidate, provider packet, provider statement, matching project ID, copied project-local audit record, or prior conversational approval cannot substitute for the separate Livariant-owned authorization event.

If the candidate, project identity, baseline, proposal digest, or mutation scope changed since authorization, existing verification fails closed.

## No implicit Authority consumption

Calling `maintain` without `--authorization` never searches for and consumes an existing matching authorization implicitly.

This is deliberate. A convenient orchestration command does not become standing permission merely because narrow Authority happens to exist.

## No-op and duplicate boundary

When the existing Semantic Proposal logic determines that an exact active decision, confirmed goal, or confirmed knowledge entry already satisfies the candidate, `maintain` stops before Actionable Proposal consumption and returns a non-mutating review state.

It does not consume stale or unrelated Authority just because text matches an already satisfied request.

## Replay, recovery, and exact-delta boundary

When `maintain` reaches mutation, it calls the existing `applyActionableProposal()` path. All existing rules remain authoritative, including:

- machine-local Authority consumption locking;
- terminal replay resistance;
- exact proposal/project/baseline/scope binding;
- pre-mutation fail-closed reconciliation only when the exact authorized pre-state is reproducible;
- same-process exact managed-delta and stability verification;
- `failed-recovery-required` handling after Authority consumption;
- no inference of post-crash success from desired semantic text alone;
- no reset of terminal Authority to `authorized`.

The composer does not add a checkpoint, journal, recovery trust object, or alternate repair path.

## Provider neutrality

The Core surface is provider-neutral. A CLI user, future MCP adapter, Desktop application, or provider integration may call it, but provider identity is not Authority.

WP-010 does not add:

- automatic candidate discovery from conversations or model output;
- provider transport or automatic injection;
- provider-specific approval;
- remote execution;
- standing or wildcard authorization.

## Supported mutation scope

The composition reaches only the semantic domains already supported by Actionable Proposal + Semantic Apply:

- decision add;
- decision supersede;
- confirmed goal add;
- confirmed knowledge add.

It does not add arbitrary repository writes, terminology rename, batch mutation, goal/knowledge replacement or deletion, or a new semantic schema.

## CLI exit-state boundary

The command exposes deterministic machine-readable workflow states. Current human/JSON handling distinguishes at least:

- completed success;
- review required;
- authorization required;
- blocked/recovery-required;
- mutation completed but refreshed context blocked.

Callers should branch on structured state rather than infer authority or success from prose.

## Release boundary

Agent-Assisted Semantic Maintenance is not part of `v0.1.0-rc.3`.

RC3 remains immutable. Distribution of this post-RC3 capability requires a separately approved release process.
