# Public Preview Scope & Limitations

This document states what the current Livariant Public Preview claims — and what it does not.

## Supported executable baseline

The hardened baseline has executable evidence for fresh and existing projects, Claude Code ↔ Codex Resume handoff, stale-context protection, normal updates, the explicit schema 1 → 2 migration path, interrupted-update diagnosis, separately authorized recovery, filesystem boundaries, release/runtime integrity, drift diagnosis, and clean packaged installation.

The executable package/runtime identity and installed command are both `livariant`.

The current CI support claim is intentionally limited to the environments exercised by the release pipeline: Ubuntu and Windows with Node.js 24. The package declares Node.js `>=20`.

## Provider support is intentionally narrow

The current Preview supports Claude Code and Codex for Project Brain Resume handoff. Current provider applicability evidence uses `LIVARIANT_PROVIDER_ENV`. Explicit provider selection establishes environment evidence for Resume; it does not create execution or mutation authority.

Livariant does not claim full control of every provider capability, tool, model-selection feature, authentication surface, or native instruction mechanism.

## Update and migration surface

`livariant update --manifest <path>` is planning-only by default. Applying a reviewed update additionally requires `--apply`, the matching local Runtime artifact, and at least one explicit `--trusted-source` value.

The release manifest does not make its own source trusted. Artifact bytes still have to match the identity and SHA-256 bound by the selected release descriptor.

Schema-changing compatible releases use the same `livariant update` flow and are routed through the explicit migration lifecycle. The currently proven schema-changing path is 1 → 2. Unsupported migration paths fail closed.

> [!WARNING]
> Manual replacement of Project Brain files, framework-managed lifecycle state, schema/version metadata, or installed Runtime files is not a supported update mechanism. It bypasses the authority, compatibility, integrity, checkpoint, activation, and recovery guarantees of the lifecycle.

## Recovery surface

`livariant recover` is read-only inspection by default. `livariant recover --apply` separately authorizes the validated rollback plan.

Automatic recovery remains unavailable when durable lifecycle evidence or the checkpoint is missing, moved, modified, or ambiguous.

## No heuristic repair promise

Livariant does not promise to automatically repair arbitrary damaged, manually rewritten, or ambiguous Project Brain state. Diagnosis may deliberately stop and require human resolution when safe semantics cannot be established.

## Local-first does not mean trust-free

Core Project Brain use is local-first and does not require a cloud account for normal local operation. Release/update operations still require trustworthy release evidence for the artifact being applied.

The current Runtime implements no Livariant telemetry, automatic Project Brain upload, or automatic remote update check. See `docs/privacy-and-network.md`.

## Public distribution

The intended public Preview distribution path is GitHub Releases from the canonical Livariant repository, with expected source identity:

```text
github:Kryt3r/livariant
```

Release tooling produces a concrete Runtime tarball, a machine-readable manifest bound to the exact artifact SHA-256, and `SHA256SUMS`. CI verifies the bundle against a clean consumer.

The repository may remain private until the explicit public-visibility gate is approved. Public-facing documentation therefore does not rely on a package-manager installation path or on repository visibility as a Runtime safety assumption.

A private release candidate already exists for validation. It is policy-frozen and must not be recreated or overwritten merely to prepare the public Preview. GitHub reports this historical RC itself as `immutable: false` because it predates activation of release immutability; future releases follow the configured immutable-release policy.

## License, security, privacy, contributions, and support

The repository-side Preview baseline is documented through:

- PolyForm Perimeter License 1.0.1 in `LICENSE`;
- `THIRD_PARTY_NOTICES.md`;
- `SECURITY.md`;
- `CONTRIBUTING.md`;
- `docs/license-and-warranty.md`;
- `docs/privacy-and-network.md`;
- `docs/preview-support-and-stability.md`.

Livariant is source-available and is not offered as OSI-approved Open Source.

External code contributions remain gated until contributor-rights terms compatible with the source-available and future commercial-licensing model are finalized.

Host-side security features that are unavailable for the current private repository plan are public-gate items rather than claims of current coverage.

## Preview expectations

Public Preview means users should expect a deliberately limited supported surface, explicit known limitations, possible breaking changes under Preview/SemVer communication rules, no silent expansion of authority or project mutation scope, and evidence-backed supported paths rather than universal environment promises.

Public Preview support is maintainer/community support without a paid SLA unless separately agreed. The eventual 1.0 stability/compatibility contract requires its own later readiness decision.

## Remaining public-visibility gates

Before the repository itself is made public and the Preview is announced broadly:

1. receive explicit approval to change `Kryt3r/livariant` from private to public;
2. enable and verify the host protections that become available at the public gate, including Secret Scanning / Push Protection and CodeQL where applicable;
3. verify release/tag protections and the intended immutable release flow;
4. publish or promote only an approved manifest-bound Preview bundle from the canonical source without recreating the existing private RC artifact;
5. verify published artifact/source identity and checksums;
6. run the final public-release readiness review against the exact published candidate.
