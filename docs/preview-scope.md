# Public Preview Scope & Limitations

This page separates the **published Foundation Preview release** from newer repository development so users can see exactly what is released and what is only present in post-RC3 source.

It is not a marketing feature list. Its purpose is to state supported surfaces and boundaries without turning planned or unreleased work into a release claim.

## Published Foundation Preview

The current public release is the immutable pre-release:

```text
v0.1.0-rc.3
```

RC3 is the first clean public Foundation Preview release. It remains historical release evidence and is not rewritten when later development adds capabilities to `main`.

The hardened RC3 foundation has executable evidence for:

- fresh and existing projects;
- repeated-use semantic editing of confirmed goals, confirmed project knowledge, and accepted decisions;
- plan-first mutation with explicit `--apply`;
- decision supersession with preserved history;
- Claude Code and Codex Project Brain Resume handoff;
- stale-context protection;
- normal updates;
- the explicit Project Brain schema `1 -> 2` migration path;
- interrupted-update diagnosis;
- separately authorized recovery;
- filesystem boundaries;
- release and Runtime integrity;
- independent machine-local Runtime release authority;
- drift diagnosis;
- clean packaged installation.

The released RC3 command surface is:

```text
init
status
doctor
resume
goals
knowledge
decisions
update
recover
version
```

The package, Runtime, and installed CLI command all use the name `livariant`.

The release support claim is deliberately limited to the environments exercised by the hardened release pipeline: Ubuntu and Windows with Node.js 24. The package declares Node.js `>=20`.

## Post-RC3 repository development

Development after RC3 adds bounded Active Project Intelligence surfaces and supporting Project Brain foundations. These capabilities remain unreleased until a later separately approved release.

### Project Context Snapshot

Repository source exposes:

```text
livariant context
livariant context --json
```

and the Runtime API `buildProjectContextSnapshot()`.

The snapshot is read-only. It exposes confirmed Project Brain context, unresolved unknowns, explicit authority classes, a deterministic material Project Brain baseline, and a `clear` or `blocked` safety state. Concurrent managed-state change fails closed rather than producing mixed-time clean output.

A valid schema-2 Project Brain exposes its canonical logical UUID as `stableProjectIdentity`; historical schema-1 state exposes `null` until explicit supported migration. The project locator remains separate from logical identity.

See [Project Context Snapshot](project-context-snapshot.md) and [Stable Project Identity Foundation](stable-project-identity-foundation.md).

### Semantic Proposal Core

Repository source exposes:

```text
livariant propose --input <candidate.json>
livariant propose --input <candidate.json> --json
```

and the Runtime API `buildSemanticProposal()`.

Schema version 1 supports:

- `project-decision` with `add` and `supersede`;
- `project-goal` with `add`;
- `project-knowledge` with `add`.

Candidate JSON is external untrusted input. Its `origin` is only an unverified origin claim, never approval, project identity, or mutation authority.

Semantic Proposal output remains permanently review-only: `reviewOnly: true`, `mutationAuthorization: false`, `applySupported: false`, `authorizationEligible: false`, and `changesMade: 0`. Proposal identity is deterministic and bound to the coherent material Project Brain baseline; schema-2 identity is also material to that derived identity. Concurrent managed-state change fails closed.

Exact active decision, confirmed-goal, and confirmed-knowledge duplicates can be identified. Different text is not declared semantically equivalent or conflict-free. Decision supersession requires one exact active structured decision target. Goal and knowledge proposals are add-only in the current schema.

See [Semantic Proposal Core](semantic-proposal-core.md).

### Conflict and Drift Assessment

Repository source exposes:

```text
livariant drift --input <observation.json>
livariant drift --input <observation.json> --json
```

and the Runtime API `buildConflictDriftAssessment()`.

The current bounded read-only assessment accepts one explicit observation in the decision, goal, or knowledge domain with evidence classes `dependent-current`, `historical`, or `provider-observation`.

The trusted diagnosis subset is `consistent`, `confirmed-drift`, `historical-match`, `authority-ambiguous`, and `insufficient-evidence`. Different text alone is never proof of contradiction or drift. Output remains derived review evidence with zero mutation authority.

This slice does not scan the repository automatically and does not apply or authorize changes.

See [Conflict and Drift Assessment](conflict-drift-assessment.md).

### Provider Context Foundation

Repository source exposes:

```text
livariant provider-context --provider claude-code --task <task.txt>
livariant provider-context --provider codex --task <task.txt>
livariant provider-context --provider <provider> --task <task.txt> --json
```

and the Runtime API `buildProviderContext()`.

Provider Context combines the coherent current Project Brain evidence with one bounded explicit external task. Task material remains `session-ephemeral` and cannot assert canonical truth, stable project identity, approval, safety state, or mutation authority.

Provider selection changes projection target only. Copied or provider-returned packets are not trusted canonical input later. The feature does not automatically inject context into Claude Code or Codex and adds no provider transport or persistent provider write.

See [Provider Context Foundation](provider-context-foundation.md).

### Stable Project Identity Foundation

Current post-RC3 source uses Project Brain schema 2 with one required canonical UUID in `projectBrain.projectId`.

Fresh schema-2 initialization generates the identity locally from trusted Runtime randomness. Existing schema-1 Project Brains receive identity only through the explicit supported `1 -> 2` lifecycle migration. Reads do not silently mint or repair identity, and malformed schema-2 identity fails closed.

The ID identifies one logical Project Brain lineage, not one physical checkout, machine, provider session, or user session. Moving or copying a Project Brain does not turn it into unique physical identity or mutation authority.

See [Stable Project Identity Foundation](stable-project-identity-foundation.md).

### Proposal-bound Authorization Foundation

Current post-RC3 source also exposes:

```text
livariant prepare --input <candidate.json>
livariant prepare --input <candidate.json> --json
livariant authorize --input <actionable-proposal.json>
livariant authorize --input <actionable-proposal.json> --json
```

`prepare` creates a structurally separate Actionable Proposal bound to exact logical project identity, material Project Brain baseline, normalized mutation scope, and deterministic material digest. It does not authorize or apply the change.

`authorize` is a separate explicit local user-presence operation. The supported CLI requires an interactive TTY and exact challenge confirmation. Project fields, provider claims, copied packets, matching identity, environment flags, or conversation history cannot substitute for that event.

Recorded Authority uses matching project-local lifecycle/audit evidence and independent machine-local evidence outside project control. Both bind the same authorization ID, Actionable Proposal, project identity, baseline, and mutation scope. Missing, malformed, or contradictory evidence fails closed.

The lifecycle distinguishes `authorized`, `applying`, `completed`, `failed-recovery-required`, and `invalidated`. Consumption locking prevents concurrent replay. Terminal Authority cannot become reusable approval by replaying copied records.

`prepare` and `authorize` themselves make zero semantic mutations.

See [Proposal-bound Authorization Foundation](proposal-bound-authorization.md).

### Semantic Apply

Current post-RC3 source exposes:

```text
livariant apply --authorization <authorization-id> --input <actionable-proposal.json>
livariant apply --authorization <authorization-id> --input <actionable-proposal.json> --json
```

and the Runtime API `applyActionableProposal()`.

Semantic Apply supports only decision add, decision supersede, confirmed-goal add, and confirmed-knowledge add. Review-only Semantic Proposal JSON and raw candidate JSON are not substitutes for an Actionable Proposal.

A fresh apply revalidates exact proposal identity, stable logical project identity, material baseline, scope, project-local authorization evidence, and matching machine-local Authority. Authority is consumed to `applying` before semantic mutation begins.

The implementation reuses existing semantic writers and preserves managed-path confinement, regular-file/symlink safety, exact-original concurrency protection, atomic promotion, and writer verification. Immediately before promotion the exact authorized baseline is revalidated.

Normal same-process completion also proves the **exact managed delta**: every unaffected managed Project Brain input must remain byte-identical to the current invocation's trusted pre-state, the exact authorized semantic target must verify, and the complete verified managed post-state must remain stable until terminal Authority completion. Those pre/post bytes remain volatile and do not become a new recovery trust substrate.

Crash-time proof remains deliberately narrower. After a process boundary the volatile exact-delta evidence is unavailable. Changed-baseline/post-mutation split states therefore remain fail-closed/recovery-required unless separately accepted durable complete post-state evidence exists. A desired statement merely being present is not enough to infer crash-time success.

The apply CLI also avoids overclaiming a zero-write result when the exact authorization may already be in an active or recovery-required lifecycle; it reports recovery uncertainty explicitly.

See [Semantic Apply](semantic-apply.md).

### Agent-Assisted Semantic Maintenance

Current post-RC3 source adds the provider-neutral composition surface:

```text
livariant maintain --input <candidate.json>
livariant maintain --input <candidate.json> --json
livariant maintain --input <candidate.json> --authorization <authorization-id>
livariant maintain --input <candidate.json> --authorization <authorization-id> --json
```

and the Runtime API `maintainSemanticProjectState()`.

`maintain` coordinates existing primitives for exactly one explicit candidate. It can return structured `review-required`, `authorization-required`, `blocked`, `completed`, or `completed-context-blocked` states.

Without an explicit authorization ID, it never consumes matching Authority implicitly. An eligible candidate returns the exact reconstructed Actionable Proposal and requires the separate existing `livariant authorize` user-presence path. The command does not create Authority and does not run a TTY authorization challenge internally.

With an explicit authorization ID, the ID is only a selector for existing Authority. The current candidate is rebuilt from current canonical state, and only the existing Semantic Apply path may consume the exact matching Authority. All WP-008/WP-009 replay, recovery, locking, baseline, scope, project-identity, and exact-delta rules remain authoritative.

After successful apply, Livariant rebuilds a fresh Project Context Snapshot from canonical post-state. If mutation completed but that fresh context is blocked, the result is `completed-context-blocked`: the mutation remains terminal and non-replayable, while Livariant refuses to claim a clean refreshed context.

This composition adds no automatic candidate discovery, provider transport/injection, provider-specific approval, standing/wildcard authorization, arbitrary repository writes, new semantic domains, batch mutation, or Project Lexicon rename behavior.

See [Agent-Assisted Semantic Maintenance](semantic-maintenance.md).

### Provider Roundtrip Evidence Intake

Current post-RC3 source also exposes the local return half of Provider Context:

```text
livariant provider-return --context <provider-context.json> --input <provider-return.json>
livariant provider-return --context <provider-context.json> --input <provider-return.json> --json
livariant provider-return --context <provider-context.json> --input <provider-return.json> --authorization <authorization-id> --json
```

and the Runtime API `processProviderReturn()`.

Both supplied files are external untrusted input. Livariant strictly parses one ready Provider Context copy and one provider-return packet, recomputes deterministic packet/task correlation, then freshly reconstructs current canonical Project Brain identity and material baseline before interpreting a returned candidate.

Packet IDs, task/baseline echoes, stable project identity echoes, and schema-valid copied Provider Context evidence are **correlation only**. They do not prove historical Livariant issuance, provider consumption, canonical truth, approval, or Authority. A fabricated but self-consistent packet pair cannot gain capabilities stronger than supplying the same typed candidate directly to `maintain`.

If current material Project Brain state moved, the return is `stale-context`; it is not silently rebound to the newer baseline. Other correlation mismatches are `mismatched-context`. A blocked current Project Brain remains blocked.

A coherent return may contain `null` or one existing-schema candidate. Without an explicit authorization ID, matching existing Authority is never consumed implicitly. With an explicit authorization ID, the value is only a selector for the existing proposal-bound Authorization/Semantic Apply path.

The roundtrip also carries the freshly verified expected project identity/material baseline into `maintain` as invocation-local coherence constraints, so a state change before proposal reconstruction blocks before Actionable Proposal preparation, Authority lookup/consumption, or mutation.

This surface adds no trusted issuance ledger, packet authentication, automatic provider injection/transport, provider-specific authorization, automatic free-form candidate extraction, standing approval, new semantic domain, batch mutation, or arbitrary repository write.

See [Provider Roundtrip Evidence Intake](provider-roundtrip-evidence.md).

These post-RC3 capabilities are not retroactively part of the immutable RC3 release. They become distributed release capabilities only through a later separately approved release.

The current post-RC3 repository surfaces still do **not** add:

- provider-driven, automatic, wildcard, or standing semantic mutation authorization;
- unique checkout identity or authorization transfer by copying Project Brain bytes;
- project fork, split, merge, or project-ID replacement semantics;
- automatic drift scanning or automatic drift repair;
- terminology persistence or canonical rename workflows;
- provider transport or automatic context injection;
- LLM-based semantic equivalence;
- autonomous candidate discovery;
- goal or knowledge replacement, deletion, or supersession;
- additional proposal/apply domains beyond the documented schema-version-1 set;
- batch or multi-proposal mutation transactions.

## Provider support is intentionally narrow

The published Preview supports Claude Code and Codex for Project Brain Resume handoff.

Provider applicability uses `LIVARIANT_PROVIDER_ENV`. Selecting a provider identifies the supported Resume target; it grants no execution or mutation authority.

Livariant does not claim to manage every provider feature, model-selection option, authentication mechanism, native instruction system, or provider memory surface.

The post-RC3 Context, Proposal, Drift, Stable Identity, Authorization, Semantic Apply, Semantic Maintenance, and Provider Roundtrip surfaces are provider-neutral foundations or local user-controlled operations. Provider Context is a provider-targeted read projection. Provider Roundtrip accepts provider-returned bytes only as untrusted evidence. None treats provider output or provider-side approval claims as Livariant mutation authority.

## Semantic knowledge editing

The Foundation Preview itself supports bounded repeated-use editing of durable Project Brain truth:

```text
livariant goals [list]
livariant goals add <goal> [--apply]

livariant knowledge [list]
livariant knowledge add <fact> [--apply]

livariant decisions [list]
livariant decisions add <decision> [--apply]
livariant decisions supersede <id> <replacement> [--reason <reason>] [--apply]
```

Mutation is plan-first. Without `--apply`, Livariant shows the proposed canonical change and writes nothing.

Supported writes require a valid healthy Project Brain, stay inside managed Project Brain boundaries, reject unsafe topology, use atomic replacement with exact-original concurrency checks, and verify persisted state before success. Duplicate additions fail instead of silently normalizing existing truth. Decision supersession preserves the old decision as history.

Livariant does not automatically watch conversations or decide which AI output should become durable project truth.

## Update and migration support

`livariant update --manifest <path>` only plans an update unless `--apply` is provided.

Applying a reviewed update also requires the matching local Runtime artifact and at least one explicit `--trusted-source`. The release manifest cannot make its own source trusted, and executable update installation additionally requires independent machine-local release authority for the exact artifact digest.

Project files, manifests, `--trusted-source`, and project-facing commands cannot create that Runtime release authority. There is intentionally no project-facing `authorize-runtime` command.

Schema-changing compatible releases use the migration lifecycle. The currently proven schema-changing path is `1 -> 2`; current post-RC3 source creates stable logical project identity inside the existing checkpoint/journal/validation/activation/recovery transaction. Unsupported migration paths fail closed.

> [!WARNING]
> Manually replacing Project Brain files, framework-managed lifecycle state, schema/version metadata, stable project identity, installed Runtime files, Runtime trust records, release-authorization records, or semantic authorization audit records is not a supported authority or update method.

## Recovery support

`livariant recover` is read-only by default. `livariant recover --apply` separately authorizes a validated rollback plan.

Automatic recovery remains unavailable when durable lifecycle evidence or the checkpoint is missing, moved, modified, or ambiguous. After verified rollback, restored Project Brain state is committed before displaced Recovery state is removed, and final checkpoint deletion remains the last irreversible cleanup step.

## No promise of heuristic repair

Livariant does not promise automatic repair of arbitrary damaged, manually rewritten, or ambiguous Project Brain state. When safe semantics cannot be established, diagnosis may deliberately stop and require human resolution.

## Local-first does not mean trust-free

Normal Project Brain use is local-first and does not require a Livariant cloud account.

Release/update authority and semantic mutation authority use independent machine-local evidence where their respective contracts require it. Project-controlled bytes cannot manufacture those trust roots for themselves.

The current Runtime implements no Livariant telemetry, automatic Project Brain upload, or automatic remote update check. See [Privacy & Network Behavior](privacy-and-network.md).

## Public distribution

The canonical repository is public at `Kryt3r/livariant`. Preview releases are distributed through GitHub Releases from that repository with expected source identity `github:Kryt3r/livariant`.

Release tooling produces a concrete Runtime tarball, a machine-readable manifest bound to the exact artifact SHA-256, and `SHA256SUMS`; CI verifies the release bundle against a clean consumer.

`v0.1.0-rc.1` and `v0.1.0-rc.2` remain historical evidence. RC2 contains pre-public text and older bundle bytes and must not be overwritten or presented as current. `v0.1.0-rc.3` is the current published Foundation Preview. Later repository changes do not alter its tag, release text, or artifacts.

No npm publication path is claimed for the current Preview.

## License, security, privacy, contributions, and support

The Preview repository includes `LICENSE`, `THIRD_PARTY_NOTICES.md`, `SECURITY.md`, `CONTRIBUTING.md`, `SUPPORT.md`, and the paired license/privacy/support documentation.

Livariant is source-available and is not offered as OSI-approved Open Source. External code contributions remain gated until contributor-rights terms compatible with the source-available and future commercial-licensing model are finalized.

GitHub Private Vulnerability Reporting, Dependabot Alerts, CodeQL, Secret Scanning, Push Protection, restrictive Actions permissions, the main ruleset, and the release-tag ruleset are enabled for the public repository.

## What Preview means

Public Preview means:

- the supported surface is deliberately limited;
- known limitations should be explicit;
- breaking changes may still occur under the documented Preview and SemVer rules;
- authority and mutation scope must not expand silently;
- supported paths should be backed by executable evidence rather than broad environment claims.

Preview support is maintainer and community support without a paid SLA unless separately agreed. The eventual 1.0 stability and compatibility contract requires its own later readiness decision.
