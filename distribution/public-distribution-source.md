---
type: public-distribution-policy
status: accepted
phase: public-preview
owner: framework
---

# Public Preview Distribution Source

## Decision

The Livariant Foundation Preview uses **GitHub Releases on the canonical public Livariant repository** as the primary release-distribution and release-identity context.

This is intentionally separate from the Runtime's local update mechanics: the Runtime consumes a release manifest and artifact supplied locally, then verifies the release identity and artifact digest before application. Distribution is responsible for publishing those materials through an accepted trust context.

## Canonical source identity

Public GitHub release sources use the source-id form:

```text
github:<owner>/<repository>
```

For Livariant, the canonical identity is:

```text
github:Kryt3r/livariant
```

The canonical repository is public at `Kryt3r/livariant`. The `sourceId` embedded in a release manifest still does not make itself trusted. The user or installer must select the corresponding trusted source context separately when applying a local release bundle.

## Release assets

A supported Public Preview GitHub Release should publish, at minimum:

- the packed Livariant Runtime tarball;
- the machine-readable release manifest that binds version, channel, Project Brain schema compatibility, source identity, artifact identity, and SHA-256;
- human-readable release notes including compatibility, migration requirements, known issues, and required actions.

Release notes are communication. The machine-readable manifest is lifecycle evidence. Neither replaces artifact verification.

## Release construction

Release assets should be built from a specific reviewed commit/tag through the repository release workflow or an equivalently reviewable process.

The release bundle must calculate the artifact SHA-256 from the concrete packed tarball bytes and write that digest into the release manifest. A digest supplied only by the unchecked artifact itself is not sufficient trust evidence.

## Current release line

`v0.1.0-rc.1` remains historical pre-fix release evidence.

`v0.1.0-rc.2` is immutable historical pre-public release evidence. Its public release text still describes a private pre-public state, and its release asset bytes are older than the later verified Foundation Preview bundle. It must not be edited, retagged, or replaced in place.

`0.1.0-rc.3` is the current Foundation Preview candidate and is intended to become the first clean public Foundation Preview release after the RC3 candidate passes verification and receives explicit merge, tag, and release authorization.

## GitHub host protections

The canonical public repository currently has the relevant Preview host protections enabled and verified, including:

- Private Vulnerability Reporting;
- Dependabot Alerts;
- CodeQL;
- Secret Scanning;
- Push Protection;
- restrictive GitHub Actions permissions;
- approval for external fork PR workflows;
- an active main ruleset;
- an active release-tag ruleset;
- squash merge only;
- automatic branch deletion after merge;
- release immutability.

These controls strengthen the host-side supply chain. Livariant's own SHA-256, source-identity, release-authority, compatibility, migration, and Runtime integrity checks remain required.

Artifact provenance or attestations may be added when they fit the supported release workflow. They must not be claimed as active until verified.

## Release publishing sequence

The intended sequence is:

```text
reviewed commit
-> release/RC version chosen
-> full Hardening CI green
-> packed Livariant artifact produced
-> artifact digest calculated
-> release manifest generated from exact artifact
-> release notes reviewed
-> draft GitHub Release assembled with all assets
-> explicit release authorization
-> release published
-> published assets/source identity verified
```

No release asset should be replaced in place to fix a published release. A corrected build receives a new version and release identity.

That rule is why RC2 remains untouched and RC3 receives a new release identity.

## npm

npm may be added later as a secondary distribution channel. It is not required for the Foundation Preview and is not currently authorized for publication.

If npm publishing is introduced, trusted publishing/OIDC and provenance should be preferred over long-lived publish tokens when the repository and npm package configuration support it. Adding npm must not weaken the canonical release-identity, compatibility, authority, or migration semantics.

## Offline use

Users may download a release manifest and tarball from the canonical release and then apply them offline/local-first. Offline application does not remove integrity verification or source-trust requirements.

## Current readiness

The public distribution architecture and repository host baseline are ready. RC3 still requires candidate-specific completion:

1. finish RC3 documentation and current-truth alignment;
2. pass public-doc consistency, build, executable tests, package smoke, and release-bundle smoke;
3. open and review the RC3 preparation PR against `main`;
4. merge only after explicit approval;
5. build and verify the final RC3 bundle from the exact canonical source;
6. create the tag only after explicit tag authorization;
7. publish the GitHub Release only after explicit release authorization;
8. verify the published source identity, manifest, assets, and checksums before announcing RC3.
