# Provider Roundtrip Evidence Intake

Provider Roundtrip Evidence Intake is a post-RC3 local repository capability for accepting one structured provider return as **untrusted evidence** and correlating it with one supplied ready Provider Context copy.

It does not make provider output trusted project truth and it does not make a Provider Context packet proof that Livariant historically issued or delivered that packet.

Supported providers remain:

- `claude-code`
- `codex`

This capability is repository development after RC3 and is not part of the immutable `v0.1.0-rc.3` release.

## CLI

```bash
livariant provider-return --context provider-context.json --input provider-return.json
livariant provider-return --context provider-context.json --input provider-return.json --json
livariant provider-return --context provider-context.json --input provider-return.json --authorization <authorization-id> --json
```

Runtime API: `processProviderReturn()`.

The context and return files are external input. Livariant parses both strictly before using them.

## Provider return shape

A provider return uses schema/packet version 1 and contains:

```json
{
  "schemaVersion": 1,
  "packetVersion": 1,
  "provider": "codex",
  "contextPacketId": "pcx_<sha256>",
  "stableProjectIdentity": "<project-uuid>",
  "baselineDigest": "<sha256>",
  "taskDigest": "<sha256>",
  "candidate": null
}
```

`candidate` may be `null` or one candidate using the existing Semantic Proposal candidate schema. WP-011 adds no new semantic mutation domain.

Unknown approval, authority, safety, or mutation-permission fields are not accepted as a way to strengthen the return.

## Correlation is not Authority

Livariant verifies deterministic correlation material including:

- supported provider;
- Provider Context packet ID self-consistency;
- stable logical Project Brain identity;
- material baseline;
- task correlation;
- return-to-context packet relationship.

Those checks establish correlation only.

They do **not** prove:

- that Livariant historically issued the supplied packet;
- that a provider actually consumed it;
- that provider output is canonical Project Brain truth;
- that the user approved the candidate;
- that mutation is authorized.

A caller can fabricate a schema-valid, internally self-consistent Provider Context copy and matching return. That fabricated pair must have no stronger capability than supplying the same typed candidate directly to the existing semantic maintenance surface.

Copied Provider Context evidence is therefore schema-validated but remains untrusted.

## Fresh local truth and staleness

Before a returned candidate can enter semantic maintenance, Livariant freshly reconstructs current canonical Project Brain context locally.

The current trusted stable project identity and material baseline must still match the correlated Provider Context copy.

If the material Project Brain baseline moved after context creation, the return becomes `stale-context`. Livariant does not silently rebind the old provider evidence to a newer baseline.

If provider, packet, task, project identity, or other required correlation material does not match, the result is `mismatched-context`.

Blocked current Project Brain state remains blocked.

## Candidate and authorization boundary

A coherent current return may contain at most one existing-schema candidate.

The candidate is normalized and delegated into the existing `maintainSemanticProjectState()` composition. WP-011 does not create a second proposal, authorization, Authority store, or mutation implementation.

Without `--authorization`, provider return does not implicitly search for or consume matching existing Authority. The normal eligible result remains `authorization-required` or another non-mutating review/block state.

With `--authorization <id>`, the ID is only an explicit selector for existing proposal-bound Authority. Mutation can occur only through the already verified Semantic Apply path and its exact project identity, baseline, proposal, scope, lifecycle, replay, recovery, and verification rules.

Provider-return bytes cannot create approval or Authority.

## Roundtrip-to-maintain coherence

The provider-return flow passes the freshly verified expected stable project identity and material baseline into semantic maintenance as invocation-local coherence constraints.

After semantic maintenance rebuilds the candidate against fresh canonical state, a changed identity or baseline blocks before Actionable Proposal preparation, Authority lookup/consumption, or semantic mutation.

This constraint is not a new trust root, issuance ledger, or persistent recovery object.

## Result states

The local roundtrip exposes structured states including:

- `no-candidate`;
- `candidate-received` with the nested semantic-maintenance result;
- `stale-context`;
- `mismatched-context`;
- `blocked`.

For an eligible candidate without explicit authorization, the nested maintenance state is normally `authorization-required` and semantic changes remain zero.

## Explicit limitations

Provider Roundtrip Evidence Intake does not add:

- MCP or network transport;
- automatic provider injection;
- provider process control;
- provider-specific authorization;
- trusted Provider Context issuance history;
- packet signatures or authentication;
- free-form LLM inference of durable truth inside Livariant;
- automatic candidate extraction from arbitrary conversation text;
- standing or wildcard authorization;
- batch candidates or multi-mutation transactions;
- new semantic domains;
- arbitrary repository writes;
- release, tag, or package publication.

See also:

- [Provider Context Foundation](provider-context-foundation.md)
- [Agent-Assisted Semantic Maintenance](semantic-maintenance.md)
- [Proposal-bound Authorization Foundation](proposal-bound-authorization.md)
- [Semantic Apply](semantic-apply.md)
