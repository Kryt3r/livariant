---
type: framework-lifecycle-policy
status: accepted
domain: distribution
language: en
owner: framework
foundation: FOUNDATION-10-HARDENING
---

# Release Integrity & Trust

A supported distribution path may transport framework releases through different package managers, installers, archives, registries, or hosting providers, but update application must establish that the concrete artifacts being applied correspond to the intended release identity.

> **A release name is not enough. Supported update application requires verifiable binding between the intended release identity and the artifact bytes that will be executed or installed.**

## Trust Boundary

Release discovery metadata is external evidence. Artifact download is also an external trust boundary.

Before applying a release, the framework must establish, proportionately to the distribution mechanism:

- which release source or trust context supplied the candidate,
- the intended canonical framework version,
- the concrete artifact or package identity,
- integrity evidence that binds the artifact to that release identity,
- whether the evidence is sufficient for the selected supported distribution path.

Technical availability of a package or archive does not by itself make it a trusted framework release.

## Minimum Integrity Requirement

Every supported update-application path must provide an integrity mechanism appropriate to its transport.

Examples may include:

- registry-provided package integrity verified by the package client,
- a cryptographic digest obtained from trusted release metadata and checked against the downloaded artifact,
- a signed artifact or signed release manifest,
- another mechanism that provides equivalent evidence that the artifact bytes match the intended release.

A checksum stored only inside the same untrusted artifact it is supposed to verify is not sufficient evidence by itself.

The first Public Preview does not require the framework to operate its own PKI, transparency log, or hosted signing service. It does require the supported release path to have a real integrity story rather than unauthenticated file replacement.

## Authenticity and Integrity Are Related but Distinct

Integrity answers whether artifact bytes match an expected value. Authenticity answers why that expected value should be trusted as belonging to the framework release.

The framework must not describe a bare self-reported checksum as full release authenticity.

The concrete authenticity mechanism may initially rely on the trust model of the selected supported distribution source, such as an authenticated official repository or package registry, provided that source and its limitations are explicit.

Stronger signing, provenance, transparency, or multi-source verification may be added later without changing the core lifecycle semantics.

## Release Manifest Binding

The machine-readable release manifest must be able to bind:

- canonical framework version,
- channel or release classification,
- release contents,
- compatibility and migration metadata,
- concrete artifact identities,
- integrity evidence or references required by the supported distribution path.

The updater must verify relevant integrity evidence before executing or installing material candidate artifacts.

If integrity cannot be established, update application stops. Failure to verify an artifact is not permission to fall back to an unchecked copy.

## Release Source Changes

Changing the configured release source, registry, repository, mirror, or equivalent trust context can materially alter the supply-chain trust boundary.

A supported updater must not silently switch to a different release source merely because the preferred source is unavailable.

Fallback sources require an accepted trust relationship and must preserve the same release identity and integrity requirements.

## Replay and Downgrade Safety

Stale metadata, mirrors, caches, or replayed release information must not silently turn a normal update into an unintended downgrade.

If the selected target is older than the established active release, or otherwise represents a downgrade in the applicable release ordering, the framework must classify that explicitly and apply downgrade-specific compatibility, authority, and migration reasoning.

A channel change is not implicit authorization to downgrade.

Explicitly selecting an older version may be supported, but it is not ordinary update discovery and must not bypass protected-state or migration requirements.

## Offline and Local-First Operation

An already-installed local framework must remain usable when remote release infrastructure is unavailable.

Offline installation or update may be supported when the user possesses a release artifact together with sufficient trusted metadata to establish its identity and integrity under a supported path.

Offline availability does not justify skipping verification.

## Failure Behavior

Update application must stop when:

- the candidate release identity cannot be established,
- artifact integrity verification fails,
- the artifact does not match the intended release manifest,
- the release source changed unexpectedly,
- required trust metadata is missing or inconsistent,
- a normal update resolves to an unexplained downgrade or replayed release.

These failures route toward diagnosis, source correction, or explicit human decision. They do not authorize unverified installation.

## Anti-Patterns

Avoid:

- downloading a release archive and trusting its filename alone,
- accepting a checksum only because it was bundled inside the unchecked archive,
- silently changing registries or mirrors when the configured source fails,
- treating package-manager availability as proof of framework authenticity,
- disabling verification after a failed integrity check,
- silently applying an older release because cached metadata presented it as current,
- making continued local project use depend on online trust infrastructure.

## Core Principles

> **Supported update application must verify that concrete artifacts correspond to the intended canonical release identity.**

> **Integrity evidence must come from a trust context stronger than the unchecked artifact alone.**

> **Distribution transports may differ, but none may bypass release identity and integrity verification.**

> **Unexpected source changes, failed verification, and unintended downgrade or replay conditions stop application rather than trigger insecure fallback.**
