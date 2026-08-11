---
type: framework-lifecycle-policy
status: accepted
domain: distribution
language: en
owner: framework
foundation: FOUNDATION-10-HARDENING
---

# Release Integrity & Trust

A supported distribution path may transport framework releases through different package managers, installers, archives, registries, or hosting providers, but update application must establish that the concrete artifacts being applied correspond to the intended release identity and that executable artifact authority is independent from the project requesting execution.

> **A release name is not enough. Supported executable update application requires both verifiable binding between the intended release identity and the artifact bytes and pre-existing release authority for those exact bytes from a trust domain outside project authority.**

## Trust Boundary

Release discovery metadata is external evidence. Artifact download is also an external trust boundary. Project-controlled inputs are not permitted to bootstrap the authority that later permits their own executable Runtime candidate to run.

Before applying an executable release, the framework must establish, proportionately to the distribution mechanism:

- which release source or trust context supplied the candidate,
- the intended canonical framework version,
- the concrete artifact or package identity,
- integrity evidence that binds the artifact to that release identity,
- pre-existing independent machine-local authority for the exact executable artifact digest,
- whether the evidence is sufficient for the selected supported distribution path.

Technical availability of a package or archive does not by itself make it a trusted framework release. A manifest, repository file, CLI argument, or other project-controlled input also does not become release authority merely because it is internally consistent.

## Independent Release Authority

For the current executable Preview boundary, the exact artifact SHA-256 must already be authorized by independent machine-local release policy outside project authority before installation or candidate Runtime attestation proceeds.

Production Livariant code may assert this pre-existing authority but project-facing CLI/API must not create or mutate it. The project-facing `authorize-runtime` command is intentionally absent.

This separates two questions that must not be collapsed:

1. **Does this artifact match the intended release identity and trusted-source evidence?**
2. **Has an independent machine-local authority already permitted these exact executable bytes to cross the pre-trust execution boundary?**

A positive answer to the first question does not manufacture the answer to the second.

## Minimum Integrity Requirement

Every supported update-application path must provide an integrity mechanism appropriate to its transport.

Examples may include:

- registry-provided package integrity verified by the package client,
- a cryptographic digest obtained from trusted release metadata and checked against the downloaded artifact,
- a signed artifact or signed release manifest,
- another mechanism that provides equivalent evidence that the artifact bytes match the intended release.

A checksum stored only inside the same untrusted artifact it is supposed to verify is not sufficient evidence by itself.

The first Public Preview does not require the framework to operate its own PKI, transparency log, or hosted signing service. It does require the supported release path to have a real integrity story and an authority boundary independent from project-controlled input rather than unauthenticated or self-authorized file replacement.

## Authenticity, Integrity, and Authority Are Related but Distinct

Integrity answers whether artifact bytes match an expected value. Authenticity answers why that expected value should be trusted as belonging to the framework release. Release authority answers whether those exact executable bytes are permitted to cross the machine-local pre-trust execution boundary.

The framework must not describe a bare self-reported checksum as full release authenticity, and it must not treat project-supplied authenticity or integrity evidence as permission to create its own execution authority.

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

The updater must verify relevant identity/integrity evidence and assert pre-existing independent exact-artifact authority before candidate Runtime code is executed. For the current Preview boundary, absence of that authority stops the executable update before npm installation or candidate Runtime attestation.

If integrity or authority cannot be established, update application stops. Failure to verify or authorize an artifact is not permission to fall back to an unchecked or self-authorized copy.

## Release Source Changes

Changing the configured release source, registry, repository, mirror, or equivalent trust context can materially alter the supply-chain trust boundary.

A supported updater must not silently switch to a different release source merely because the preferred source is unavailable.

Fallback sources require an accepted trust relationship and must preserve the same release identity, integrity, and independent-authority requirements.

## Replay and Downgrade Safety

Stale metadata, mirrors, caches, or replayed release information must not silently turn a normal update into an unintended downgrade.

If the selected target is older than the established active release, or otherwise represents a downgrade in the applicable release ordering, the framework must classify that explicitly and apply downgrade-specific compatibility, authority, and migration reasoning.

A channel change is not implicit authorization to downgrade.

Explicitly selecting an older version may be supported, but it is not ordinary update discovery and must not bypass protected-state, release-authority, or migration requirements.

## Offline and Local-First Operation

An already-installed local framework must remain usable when remote release infrastructure is unavailable.

Offline installation or update may be supported when the user possesses a release artifact together with sufficient trusted metadata to establish its identity and integrity under a supported path and the exact artifact already has the required independent machine-local release authority.

Offline availability does not justify skipping verification or collapsing project input into execution authority.

## Failure Behavior

Update application must stop when:

- the candidate release identity cannot be established,
- artifact integrity verification fails,
- the artifact does not match the intended release manifest,
- exact executable artifact authority is absent,
- the release source changed unexpectedly,
- required trust metadata is missing or inconsistent,
- a normal update resolves to an unexplained downgrade or replayed release.

These failures route toward diagnosis, source/authority correction, or explicit independent release process. They do not authorize unverified or project-self-authorized installation.

## Anti-Patterns

Avoid:

- downloading a release archive and trusting its filename alone,
- accepting a checksum only because it was bundled inside the unchecked archive,
- allowing project files or project-facing CLI/API to create the release authority later used to execute their candidate Runtime,
- executing candidate Runtime code before exact-artifact authority is established,
- silently changing registries or mirrors when the configured source fails,
- treating package-manager availability as proof of framework authenticity,
- disabling verification after a failed integrity check,
- silently applying an older release because cached metadata presented it as current,
- making continued local project use depend on online trust infrastructure.

## Core Principles

> **Supported update application must verify that concrete artifacts correspond to the intended canonical release identity.**

> **Executable candidate bytes require independent machine-local release authority that project input cannot manufacture through Livariant.**

> **Integrity evidence must come from a trust context stronger than the unchecked artifact alone.**

> **Distribution transports may differ, but none may bypass release identity, integrity verification, or the pre-trust execution-authority boundary.**

> **Unexpected source changes, failed verification, absent authority, and unintended downgrade or replay conditions stop application rather than trigger insecure fallback.**
