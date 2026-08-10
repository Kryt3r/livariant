# Public Preview Scope & Limitations

This document states what the first Livariant Public Preview is intended to claim — and what it is not.

## Supported executable baseline

The hardened baseline has executable evidence for fresh and existing projects, Claude Code ↔ Codex Resume handoff, stale-context protection, normal updates, the explicit schema 1 → 2 migration path, interrupted-update diagnosis, separately authorized recovery, filesystem boundaries, release/runtime integrity, drift diagnosis, and clean packaged installation.

The executable package/runtime identity and installed command are both `livariant`.

## Provider support is intentionally narrow

The first Preview supports Claude Code and Codex for Project Brain Resume handoff. Current provider applicability evidence uses `LIVARIANT_PROVIDER_ENV`. Explicit provider selection establishes environment evidence for Resume; it does not create execution or mutation authority.

Livariant does not claim full control of every provider capability, tool, model-selection feature, authentication surface, or native instruction mechanism.

## Update and migration surface

`livariant update --manifest <path>` is planning-only by default. Applying a reviewed update additionally requires `--apply`, the matching local Runtime artifact, and at least one explicit `--trusted-source` value.

The release manifest does not make its own source trusted. Artifact bytes still have to match the identity and SHA-256 bound by the selected release descriptor.

Schema-changing compatible releases use the same `livariant update` flow and are routed through the explicit migration lifecycle. The currently proven schema-changing path is 1 → 2. Unsupported migration paths fail closed.

## Recovery surface

`livariant recover` is read-only inspection by default. `livariant recover --apply` separately authorizes the validated rollback plan.

Automatic recovery remains unavailable when durable lifecycle evidence or the checkpoint is missing, moved, modified, or ambiguous.

## No heuristic repair promise

Livariant does not promise to automatically repair arbitrary damaged, manually rewritten, or ambiguous Project Brain state. Diagnosis may deliberately stop and require human resolution when safe semantics cannot be established.

## Local-first does not mean trust-free

Core Project Brain use is local-first and does not require a cloud account for normal local operation. Release/update operations still require trustworthy release evidence for the artifact being applied.

The current Runtime implements no Livariant telemetry, automatic Project Brain upload, or automatic remote update check. See `docs/privacy-and-network.md`.

## Public distribution

The accepted first Preview distribution path is GitHub Releases from the canonical public Livariant repository, with expected source identity:

```text
github:Kryt3r/livariant
```

Release tooling produces a concrete Runtime tarball, a machine-readable manifest bound to the exact artifact SHA-256, and `SHA256SUMS`. CI verifies the bundle against a clean consumer.

The source is **not active yet**: the current development repository remains private and named `Kryt3r/project-brain-framework`. Establishing/configuring the canonical public repository and publishing the first RC bundle are launch-time operational gates, not already completed release facts.

## License, security, privacy, contributions, and support

The repository-side public baseline is documented through:

- Apache-2.0 `LICENSE`;
- `THIRD_PARTY_NOTICES.md`;
- `SECURITY.md`;
- `CONTRIBUTING.md`;
- `docs/license-and-warranty.md`;
- `docs/privacy-and-network.md`;
- `docs/preview-support-and-stability.md`.

The security policy deliberately does not claim that host-side private vulnerability reporting is enabled before that setting is verified on the canonical public repository.

## Preview expectations

Public Preview means users should expect a deliberately limited supported surface, explicit known limitations, possible breaking changes under Preview/SemVer communication rules, no silent expansion of authority or project mutation scope, and evidence-backed supported paths rather than universal environment promises.

Public Preview support is maintainer/community support without a paid SLA unless separately agreed. The eventual 1.0 stability/compatibility contract requires its own later readiness decision.

## Remaining launch gates

Before announcing the first Public Preview:

1. establish the canonical public `Kryt3r/livariant` repository;
2. verify private vulnerability reporting and applicable release/tag protections;
3. choose the first RC/Preview version;
4. publish the manifest-bound bundle and release notes from that canonical source;
5. verify published artifact/source identity;
6. run the final Release Candidate readiness review against the published candidate.
