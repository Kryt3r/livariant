---
type: public-distribution-policy
status: accepted
phase: public-preview-preparation
owner: framework
---

# Public Preview Distribution Source

## Decision

The first Livariant Public Preview will use **GitHub Releases on the canonical public Livariant repository** as the primary release-distribution and release-identity context.

This is intentionally separate from the Runtime's local update mechanics: the Runtime consumes a release manifest and artifact supplied locally, then verifies the release identity and artifact digest before application. Distribution is responsible for publishing those materials through an accepted trust context.

## Canonical source identity

Public GitHub release sources use the source-id form:

```text
github:<owner>/<repository>
```

For the intended first public Livariant repository, the expected canonical identity is:

```text
github:Kryt3r/livariant
```

**Operational release gate:** the canonical repository now exists as `Kryt3r/livariant` and remains private during Preview preparation. The expected public source identity must not be presented as active until that repository is public and the corresponding release materials are actually published there.

The `sourceId` embedded in a release manifest does not make itself trusted. The user/installer must still select the corresponding trusted source context separately when applying a local release bundle.

## Release assets

A supported Public Preview GitHub Release should publish, at minimum:

- the packed Livariant Runtime tarball;
- the machine-readable release manifest that binds version, channel, Project Brain schema compatibility, source identity, artifact identity, and SHA-256;
- human-readable release notes including compatibility, migration requirements, known issues, and required actions.

Release notes are communication. The machine-readable manifest is lifecycle evidence. Neither replaces artifact verification.

## Release construction

Release assets should be built from a specific reviewed commit/tag through the repository release workflow or an equivalently reviewable process.

The release bundle must calculate the artifact SHA-256 from the concrete packed tarball bytes and write that digest into the release manifest. A digest supplied only by the unchecked artifact itself is not sufficient trust evidence.

## GitHub host protections

Before the first public Preview release, the canonical repository should be configured to use applicable GitHub release-protection features, including immutable releases when available for the repository/account configuration.

GitHub documents immutable releases as locking the release assets and associated Git tag after publication. This is an additional supply-chain control; Livariant's own SHA-256/release-identity verification remains required.

Artifact provenance/attestations should be enabled when the canonical repository visibility/plan supports them. Their availability is a host capability and must not be falsely claimed before verified.

## Release publishing sequence

The intended sequence is:

```text
reviewed commit
→ release/RC version chosen
→ full Hardening CI green
→ packed Livariant artifact produced
→ artifact digest calculated
→ release manifest generated from exact artifact
→ release notes reviewed
→ draft GitHub Release assembled with all assets
→ release published
→ published assets/source identity verified
```

No release asset should be replaced in place to “fix” a published release. A corrected build receives a new version/release identity.

## npm

npm may be added later as a secondary distribution channel. It is not required for the first Public Preview.

If npm publishing is introduced, trusted publishing/OIDC and provenance should be preferred over long-lived publish tokens when the repository and npm package configuration support it. Adding npm must not weaken the canonical release-identity, compatibility, authority, or migration semantics.

## Offline use

Users may download a release manifest and tarball from the canonical release and then apply them offline/local-first. Offline application does not remove integrity verification or source-trust requirements.

## Current readiness

The distribution architecture is ready for a canonical GitHub Releases source. The remaining host-side prerequisites before a real Public Preview are:

1. establish the canonical public `Kryt3r/livariant` repository;
2. verify its private security-reporting path;
3. configure applicable release/tag protections;
4. generate and publish the first RC/release bundle from the selected commit;
5. verify the published source identity and assets before announcing the Preview.
