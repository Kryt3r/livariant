# Public Preview Scope & Limitations

This page explains what the current Livariant Preview candidate supports and where the boundaries are.

It is not a marketing feature list. Its purpose is to make the supported surface clear enough that users know what they can rely on and what they should not assume.

## Supported executable baseline

The hardened baseline has executable evidence for:

- fresh and existing projects;
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

The package, Runtime, and installed CLI command all use the name `livariant`.

The current CI support claim is deliberately limited to the environments exercised by the release pipeline: Ubuntu and Windows with Node.js 24. The package itself declares Node.js `>=20`.

## Provider support is intentionally narrow

The current Preview supports Claude Code and Codex for Project Brain Resume handoff.

Provider applicability uses `LIVARIANT_PROVIDER_ENV`. Selecting a provider explicitly tells Livariant which supported Resume environment you are targeting. It does not grant execution or mutation authority.

Livariant does not claim to manage every provider feature, tool, model-selection option, authentication mechanism, or native instruction system.

## Knowledge editing is not yet part of the executable CLI

The broader Framework design includes guided semantic operations for changing project goals, decisions, and knowledge. Those operations are not yet exposed by the `0.1.0-rc.2` CLI.

The current executable command surface is:

```text
init
status
doctor
resume
update
recover
version
```

This means the Preview can bootstrap Project Brain state, inspect and diagnose it, render Resume context, and manage the supported lifecycle. It does not yet provide first-class commands such as `goals`, `decisions`, or `knowledge` for proposing and applying ongoing semantic knowledge changes.

Do not assume that future natural-language or provider-native knowledge-editing behavior already exists in RC2. The Framework contracts describe that direction, but the executable support claim remains limited to the commands above.

## Update and migration support

`livariant update --manifest <path>` only plans an update unless `--apply` is provided.

Applying a reviewed update also requires:

- `--apply`;
- the matching local Runtime artifact;
- at least one explicit `--trusted-source` value.

The release manifest cannot make its own source trusted. The artifact bytes must still match the identity and SHA-256 bound by the selected release descriptor.

Executable updates have another requirement. The exact artifact SHA-256 must already be authorized by independent machine-local release policy outside project authority.

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

The intended Preview distribution path is GitHub Releases from the canonical Livariant repository, using the expected source identity:

```text
github:Kryt3r/livariant
```

Release tooling produces:

- a concrete Runtime tarball;
- a machine-readable manifest bound to the exact artifact SHA-256;
- `SHA256SUMS`.

CI verifies the release bundle against a clean consumer.

The repository remains private until the separate public-visibility gate is explicitly approved. The public documentation therefore does not assume that repository visibility is a Runtime safety property and does not invent an npm-registry distribution path that does not exist.

The historical private `v0.1.0-rc.1` release remains validation evidence from the pre-fix baseline. It must not be recreated, overwritten, retagged, or presented as the current candidate.

The current repository package identity is `0.1.0-rc.2`. Tag creation, GitHub Release publication, npm publication, and repository visibility changes each require separate explicit approval.

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

Host-side security features that are not available in the current private state remain public-gate items. They are not claimed as current coverage before they are actually enabled and verified.

## What Preview means

Public Preview means:

- the supported surface is deliberately limited;
- known limitations should be stated explicitly;
- breaking changes may still occur under the documented Preview and SemVer rules;
- authority and project mutation scope must not expand silently;
- supported paths should be backed by executable evidence rather than broad environment claims.

Preview support is maintainer and community support without a paid SLA unless separately agreed.

The eventual 1.0 stability and compatibility contract requires its own later readiness decision.

## Remaining public-visibility work

Before the repository itself is made public and the Preview is announced broadly, the release process still needs to:

1. finish the current private human-documentation and repository acceptance pass;
2. rebuild and verify the final candidate after packaged public text is stable;
3. receive explicit approval to change `Kryt3r/livariant` from private to public;
4. enable and verify applicable public-state host protections;
5. verify release and tag protection plus the intended immutable release flow;
6. publish only an explicitly approved manifest-bound Preview bundle from the exact canonical candidate;
7. verify published artifact identity, source identity, and checksums;
8. run the final public-release readiness check against the exact published candidate.
