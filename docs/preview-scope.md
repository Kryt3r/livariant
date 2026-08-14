# Public Preview Scope & Limitations

This page separates the **published Foundation Preview release** from newer repository development so users can see exactly what is released and what is only present in post-RC3 source.

It is not a marketing feature list. Its purpose is to state the supported surface and its boundaries without turning planned or unreleased work into a release claim.

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

Development after RC3 adds bounded Active Project Intelligence read surfaces that remain unreleased until a later separately approved release.

### Project Context Snapshot

The repository implementation exposes:

```text
livariant context
livariant context --json
```

and the Runtime API `buildProjectContextSnapshot()`.

The snapshot is read-only. It exposes confirmed Project Brain context, unresolved unknowns, explicit authority classes, a deterministic material Project Brain baseline, and an explicit `clear` or `blocked` safety state. It also states structurally that the snapshot is derived output rather than mutation authorization.

Blocked machine-facing output is distinguishable from clean success with a non-zero CLI status. Concurrent managed Project Brain changes during snapshot construction fail closed instead of producing a mixed clean snapshot.

The snapshot exposes a current project locator but does not invent a stable durable project identity. `stableProjectIdentity` remains `null` in this first contract.

See [Project Context Snapshot](project-context-snapshot.md).

### Semantic Proposal Core

The repository also exposes the bounded read-only proposal surface:

```text
livariant propose --input <candidate.json>
livariant propose --input <candidate.json> --json
```

and the Runtime API `buildSemanticProposal()`.

Schema version 1 currently supports:

- `project-decision` with `add` and `supersede`;
- `project-goal` with `add`;
- `project-knowledge` with `add`.

Candidate JSON is external untrusted input. Its `origin` field is only an unverified origin claim, never approval or mutation authority.

Every current proposal is permanently review-only. It exposes `reviewOnly: true`, `applySupported: false`, `authorizationEligible: false`, and `changesMade: 0`. Proposal identity is deterministic and bound to the same material Project Brain baseline semantics used by Project Context Snapshot. Concurrent managed-state changes fail closed.

Exact active decision, confirmed-goal, and confirmed-knowledge duplicates can be identified. Different text is not declared semantically compatible or conflict-free by this bounded implementation. Decision supersede candidates must name exactly one structured active decision ID. Goal and knowledge proposals are add-only in this slice.

Goal duplicate detection uses only the confirmed-goal region. A matching bullet outside that region is surfaced separately rather than promoted to confirmed goal authority. Knowledge duplicate detection uses confirmed project knowledge only. A matching `Known unknowns` entry is surfaced as an unresolved-state scope conflict rather than treated as a confirmed fact.

See [Semantic Proposal Core](semantic-proposal-core.md).

### Conflict and Drift Assessment

The repository additionally exposes an explicit read-only assessment surface:

```text
livariant drift --input <observation.json>
livariant drift --input <observation.json> --json
```

and the Runtime API `buildConflictDriftAssessment()`.

Schema version 1 accepts one explicit observation in the `project-decision`, `project-goal`, or `project-knowledge` domain. Supported evidence classes are `dependent-current`, `historical`, and `provider-observation`.

The current trusted diagnosis subset is `consistent`, `confirmed-drift`, `historical-match`, `authority-ambiguous`, and `insufficient-evidence`. Different text alone is never treated as proof of drift or contradiction. A strong decision relationship requires an exact structured decision identity where the diagnosis depends on that identity.

Assessment output is derived review evidence only. It exposes `reviewOnly: true`, `mutationAuthorization: false`, `applySupported: false`, `authorizationEligible: false`, and `changesMade: 0`. It is bound to the same coherent material Project Brain baseline used by the other Active Project Intelligence read surfaces. Concurrent managed-state changes fail closed.

This slice does not scan the repository automatically and does not apply or authorize any change.

See [Conflict and Drift Assessment](conflict-drift-assessment.md).

### Provider Context Foundation

The repository also exposes a provider-targeted read-only projection surface:

```text
livariant provider-context --provider claude-code --task <task.txt>
livariant provider-context --provider codex --task <task.txt>
livariant provider-context --provider <provider> --task <task.txt> --json
```

and the Runtime API `buildProviderContext()`.

Provider Context combines the same coherent current Project Brain evidence with one explicit external task. Task material is bounded to 64 KiB, remains `session-ephemeral`, and cannot assert canonical project truth, approval, safety state, or mutation authority.

The packet preserves the Project Brain safety floor, exposes `stableProjectIdentity: null`, `mutationAuthorization: false`, `applySupported: false`, `authorizationEligible: false`, and `changesMade: 0`, and fails closed on concurrent managed-state change. Provider selection changes the projection target only; copied or provider-returned packets are not trusted canonical input on later use.

This slice does not automatically inject context into Claude Code or Codex and adds no provider transport or persistent provider write.

See [Provider Context Foundation](provider-context-foundation.md).

These post-RC3 capabilities are not retroactively part of the immutable RC3 release. They become distributed release capabilities only through a later separately approved release.

The current post-RC3 repository surfaces do **not** add:

- proposal application or mutation authorization;
- automatic drift scanning or resolution;
- terminology persistence or lifecycle mutation;
- provider transport or automatic context injection;
- a durable stable project identity;
- LLM-based semantic comparison;
- autonomous candidate discovery;
- goal or knowledge replacement, deletion, or supersession;
- additional proposal domains beyond the explicitly documented schema-version-1 set.

Those surfaces remain later work unless and until separately implemented and verified.

## Provider support is intentionally narrow

The published Preview supports Claude Code and Codex for Project Brain Resume handoff.

Provider applicability uses `LIVARIANT_PROVIDER_ENV`. Selecting a provider tells Livariant which supported Resume environment you are targeting. It does not grant execution or mutation authority.

Livariant does not claim to manage every provider feature, model-selection option, authentication mechanism, native instruction system, or provider memory surface.

The post-RC3 Project Context Snapshot, Semantic Proposal Core, and Conflict and Drift Assessment are provider-neutral structured output. Provider Context is a provider-targeted projection for Claude Code and Codex. None of these surfaces automatically injects itself into a provider or grants provider-side mutation authority.

## Semantic knowledge editing

The Foundation Preview supports bounded repeated-use editing of durable Project Brain truth.

Supported editing operations are:

```text
livariant goals [list]
livariant goals add <goal> [--apply]

livariant knowledge [list]
livariant knowledge add <fact> [--apply]

livariant decisions [list]
livariant decisions add <decision> [--apply]
livariant decisions supersede <id> <replacement> [--reason <reason>] [--apply]
```

Mutation is plan-first. Without `--apply`, Livariant shows the proposed canonical change and makes no write.

Applying a supported change requires a valid, healthy Project Brain. Managed writes stay behind the Project Brain storage boundary, reject unsafe managed-file topology, use atomic replacement with exact-original optimistic concurrency checks, and verify persisted state before success is reported.

Simple duplicate additions fail instead of silently normalizing existing truth. Decision supersession preserves the old decision as historical truth and creates a new active decision identity.

`livariant resume` includes confirmed goals, active decisions, known facts, unresolved unknowns, and available project identity. Claude Code and Codex Resume projections use that canonical state as well.

Livariant does not automatically watch conversations or decide which AI output should become durable project truth. The user still chooses which confirmed project state to record.

## Update and migration support

`livariant update --manifest <path>` only plans an update unless `--apply` is provided.

Applying a reviewed update also requires:

- `--apply`;
- the matching local Runtime artifact;
- at least one explicit `--trusted-source` value.

The release manifest cannot make its own source trusted. Artifact bytes must match the identity and SHA-256 bound by the selected release descriptor.

Executable updates have an additional requirement: the exact artifact SHA-256 must already be authorized by independent machine-local release policy outside project authority.

Project files, the release manifest, `--trusted-source`, and the project-facing Livariant CLI or API cannot create or modify that authority. Production release-authorization logic is read-only and only asserts authority that already exists. There is intentionally no project-facing `authorize-runtime` command.

If exact artifact authority is missing, update stops before npm installation or candidate Runtime attestation.

Schema-changing compatible releases use the same `livariant update` flow and are routed through the migration lifecycle. The currently proven schema-changing path is `1 -> 2`. Unsupported migration paths fail closed.

> [!WARNING]
> Manually replacing Project Brain files, framework-managed lifecycle state, schema or version metadata, installed Runtime files, Runtime trust records, or release-authorization records is not a supported update method. Doing so bypasses lifecycle authority, compatibility, integrity, checkpoint, activation, and recovery guarantees.

## Recovery support

`livariant recover` is read-only by default.

`livariant recover --apply` separately authorizes a validated rollback plan.

Automatic recovery is unavailable when durable lifecycle evidence or the checkpoint is missing, moved, modified, or ambiguous.

After a verified rollback, Livariant commits the restored Project Brain first. Displaced Recovery state is removed before the final valid checkpoint is deleted. Checkpoint deletion is the last irreversible cleanup step.

If late cleanup fails, both the restored Project Brain and the valid checkpoint must remain available.

## No promise of heuristic repair

Livariant does not promise to repair arbitrary damaged, manually rewritten, or ambiguous Project Brain state automatically.

When safe semantics cannot be established, diagnosis may deliberately stop and require human resolution.

## Local-first does not mean trust-free

Normal Project Brain use is local-first and does not require a Livariant cloud account.

Release and update operations still require trustworthy release evidence plus pre-existing independent machine-local authority for the exact executable artifact.

The current Runtime implements no Livariant telemetry, automatic Project Brain upload, or automatic remote update check. See [Privacy & Network Behavior](privacy-and-network.md).

## Public distribution

The canonical repository is public at `Kryt3r/livariant`. Preview releases are distributed through GitHub Releases from that repository with the expected source identity:

```text
github:Kryt3r/livariant
```

Release tooling produces:

- a concrete Runtime tarball;
- a machine-readable manifest bound to the exact artifact SHA-256;
- `SHA256SUMS`.

CI verifies the release bundle against a clean consumer.

`v0.1.0-rc.1` and `v0.1.0-rc.2` remain historical release evidence. RC2 contains pre-public text and older bundle bytes and must not be overwritten, retagged, or presented as current.

`v0.1.0-rc.3` is the current published Foundation Preview release. Later repository changes do not modify its tag, release text, or artifacts.

No npm publication path is claimed for the current Preview.

## License, security, privacy, contributions, and support

The Preview repository includes:

- PolyForm Perimeter License 1.0.1 in `LICENSE`;
- `THIRD_PARTY_NOTICES.md`;
- `SECURITY.md`;
- `CONTRIBUTING.md`;
- `SUPPORT.md`;
- `docs/license-and-warranty.md`;
- `docs/privacy-and-network.md`;
- `docs/preview-support-and-stability.md`.

Livariant is source-available and is not offered as OSI-approved Open Source.

External code contributions remain gated until contributor-rights terms compatible with the source-available and future commercial-licensing model are finalized.

GitHub Private Vulnerability Reporting, Dependabot Alerts, CodeQL, Secret Scanning, Push Protection, restrictive Actions permissions, the main ruleset, and the release-tag ruleset are enabled for the public repository.

## What Preview means

Public Preview means:

- the supported surface is deliberately limited;
- known limitations should be stated explicitly;
- breaking changes may still occur under the documented Preview and SemVer rules;
- authority and project mutation scope must not expand silently;
- supported paths should be backed by executable evidence rather than broad environment claims.

Preview support is maintainer and community support without a paid SLA unless separately agreed.

The eventual 1.0 stability and compatibility contract requires its own later readiness decision.