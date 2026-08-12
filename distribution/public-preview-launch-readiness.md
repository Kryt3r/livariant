# Public Preview Launch Readiness

Status: **RC2 candidate built and verified; Public Preview readiness still blocked on first-install/onboarding documentation and separate publication authorization**

This document tracks the current Public Preview launch gates against the actual canonical repository state. It is a current-facing readiness surface, not a historical preparation record.

> [!IMPORTANT]
> Repository visibility remains private until explicitly authorized. Green CI, acceptance GO, or a verified RC2 bundle does not authorize tags, releases, npm publishing, or visibility changes by itself.

## Current verified state

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Current infrastructure `main`: `00a19b940b290eca9602a83c890ff1408a327ac0`.
- Post-merge Hardening CI #80: success on current `main`.
- Bound RC2 source candidate: `69d555c3f5850536e04cd0bf869bd058ba6406c2`.
- Package/release identity: `0.1.0-rc.2`.
- Final focused acceptance recheck of remaining Runtime Release-Authority and Recovery findings: **GO**.
- Verified concrete bundle: `livariant-0.1.0-rc.2.tgz`.
- Verified SHA-256: `a50a925ac62399f0e0a648e31551efc9565888120fad22030348ac7178ea1b0b`.
- Build RC Bundle run #2: success, including exact-source checkout, full verification, independent digest/manifest/checksum verification, and digest-keyed Actions-cache persistence.
- Cache identity: `livariant-rc2-69d555c3f5850536e04cd0bf869bd058ba6406c2-a50a925ac62399f0e0a648e31551efc9565888120fad22030348ac7178ea1b0b`.
- Historical private release `v0.1.0-rc.1` remains immutable pre-fix evidence and is not the current candidate.

Later current-`main` changes after `69d555c3...` are release-infrastructure-only and do not redefine the selected RC2 package source.

## Security / release-authority baseline

The accepted executable baseline includes the focused fixes through PR #19:

- Recovery checkpoint-substitution defense;
- stranded-Recovery detection;
- machine-local Runtime trust outside project authority;
- Windows shell-free Runtime installation;
- hardened machine trust-root topology;
- fail-closed diagnostic/lifecycle behavior across reviewed trust states;
- independent exact-artifact machine-local Release Authority before executable candidate installation/attestation;
- removal of project-facing `authorize-runtime` and production project-side authority creation/mutation;
- Recovery cleanup ordering that preserves the last valid checkpoint until final cleanup.

No new Security Hardening is authorized without a concrete finding.

## Gate summary

| Gate | Area | Current state |
| --- | --- | --- |
| A | Product-facing README and presentation | **CLOSED** |
| B | License and ownership decision | **CLOSED** |
| C | Repository hygiene and publication contents | **CLOSED** |
| D | GitHub branch/change protection | **CONFIGURED — public-state re-verification required** |
| E | Security reporting and GitHub security features | **PUBLIC-STATE ACTIVATION REQUIRED** |
| F | Release protection and supply-chain policy | **RC2 BUNDLE VERIFIED; RELEASE ACTION NOT AUTHORIZED** |
| G | Distribution and first-install user journey | **OPEN — first-install/onboarding path missing** |
| H | Privacy and network-behavior review | **CLOSED FOR CURRENT RUNTIME** |
| I | Contribution, support, and community surface | **BOUNDED — external code contributions remain closed** |
| J | Documentation/current-truth consistency | **RECONCILIATION IN PROGRESS** |
| K | Public-host configuration and visibility | **BLOCKED ON EXPLICIT VISIBILITY AUTHORIZATION** |
| L | Candidate-specific release/publication review | **PRE-TAG CANDIDATE IDENTITY VERIFIED; PUBLISHED-BYTES CHECK REQUIRES RELEASE AUTHORIZATION** |

## Gate C — Repository hygiene and publication contents

**Status: CLOSED.**

The established tracked-tree audit found no accidental maintainer-only repository, local environment, generated build output, credential file, or real secret material intended to remain private. Synthetic test fixtures remain explicitly bounded and package smoke verifies that test fixtures and compiled tests are not shipped in the Runtime package.

## Gate D — GitHub branch/change protection

**Status: CONFIGURED — public-state re-verification required.**

Configured host policy includes PR-required changes to `main`, required Ubuntu and Windows Hardening CI checks, linear history, conversation resolution, deletion/force-push protection, squash-only merge policy, and `v*` release-tag protection.

Effective protections must be re-verified if repository visibility changes.

## Gate E — Security reporting and GitHub security features

**Status: PUBLIC-STATE ACTIVATION REQUIRED.**

Already established private-host posture includes `SECURITY.md`, dependency graph, Dependabot security features, constrained Actions, and SHA-pinned Actions dependencies.

After an explicitly authorized public visibility change, verify applicable public-state protections such as Secret Scanning / Push Protection and CodeQL / Code Scanning, then re-check the security-reporting path against actually enabled host features.

## Gate F — Release protection and supply-chain policy

**Status: RC2 BUNDLE VERIFIED; RELEASE ACTION NOT AUTHORIZED.**

The concrete RC2 candidate has been built from the exact bound source and independently checked against its manifest and checksum surfaces.

```text
Source: 69d555c3f5850536e04cd0bf869bd058ba6406c2
Artifact: livariant-0.1.0-rc.2.tgz
SHA-256: a50a925ac62399f0e0a648e31551efc9565888120fad22030348ac7178ea1b0b
```

The bundle is persisted in a digest-keyed Actions cache. Any later restore or publication step must re-hash the exact tarball and require the SHA-256 above before use.

Creating `v0.1.0-rc.2`, a GitHub Release, an npm publication, or otherwise publishing candidate bytes remains a separate action requiring explicit authorization.

## Gate G — Distribution and first-install user journey

**Status: OPEN — first-install/onboarding path missing.**

The current Quickstart accurately documents Livariant after the CLI is available, but it does not yet explain the complete journey from an existing project to a usable Livariant installation.

Before Public Preview publication, user-facing documentation must truthfully explain:

- the supported RC2 distribution/acquisition path;
- platform prerequisites;
- how the `livariant` CLI becomes available;
- where the user runs Livariant relative to an existing project;
- how existing Claude Code, Codex, or other agent-host workflows relate to Livariant;
- that Livariant RC2 is not installed as a Claude Code/Codex plugin;
- how to verify installation before `status`, `doctor`, `init`, and Resume usage.

This is an onboarding/documentation blocker for a coherent Public Preview user journey, not a Runtime Security finding. It does not authorize implementation of the Post-Preview Desktop/MCP direction in RC2.

## Gate H — Privacy and network behavior

**Status: CLOSED FOR CURRENT RUNTIME.**

The accepted baseline has no automatic Livariant telemetry, Project Brain upload, Livariant cloud-account requirement, automatic remote update check, or Runtime network-fetch implementation.

Any later network, telemetry, registry, sync, hosted account, remote authority-provisioning, or automatic-update feature reopens this gate.

## Gate I — Contribution, support, and community surface

**Status: BOUNDED.**

Issues and Discussions may be used for bug reports, documentation feedback, and design discussion. External code contributions remain closed for incorporation until contributor-rights/CLA or equivalent terms are finalized.

## Gate J — Documentation/current-truth consistency

**Status: RECONCILIATION IN PROGRESS.**

Current-facing release-readiness surfaces are being reconciled from the earlier documentation-alignment phase to the concrete verified RC2 candidate and current release-infrastructure evidence.

Required current-truth and Hardening CI must pass on this reconciliation and resulting merge before Gate J closes again.

## Gate K — Public-host configuration and visibility

**Status: BLOCKED ON EXPLICIT VISIBILITY AUTHORIZATION.**

The repository remains private. No documentation, CI, bundle, or acceptance result changes that fact.

Only after a separate explicit visibility authorization may the public-host/security activation and unauthenticated-view verification sequence begin.

## Gate L — Candidate-specific release/publication review

**Status: PRE-TAG CANDIDATE IDENTITY VERIFIED; PUBLISHED-BYTES CHECK REQUIRES RELEASE AUTHORIZATION.**

Before tag/release, the selected source and concrete bundle identity are now known and independently checked.

If an `0.1.0-rc.2` tag/release is later separately authorized, verify at minimum:

- tag points to the intended exact source commit under the chosen release policy;
- restored/released tarball SHA-256 is exactly `a50a925ac62399f0e0a648e31551efc9565888120fad22030348ac7178ea1b0b`;
- release manifest and `SHA256SUMS` match those exact bytes;
- clean-consumer behavior for the exact published bytes;
- required CI evidence;
- user documentation and known limitations;
- security-reporting and licensing surfaces;
- absence of unresolved Critical/Major release blockers.

## Current next order

1. finish and merge this final current-truth/readiness reconciliation with required CI;
2. close the first-install/onboarding documentation gap using only the actually supported RC2 distribution path;
3. run required CI and post-merge verification for that documentation work;
4. perform the final focused pre-release readiness check against the exact bound candidate;
5. stop before tag creation, GitHub Release creation, npm publication, or PRIVATE → PUBLIC unless separately and explicitly authorized.

The Project Lexicon / Provisional Naming and broader Desktop/MCP/Marketplace direction remain post-Preview work and are not claimed as executable RC2 capabilities.
