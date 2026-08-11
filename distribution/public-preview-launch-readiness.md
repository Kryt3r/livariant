# Public Preview Launch Readiness

Status: **current private baseline passed focused acceptance; RC preparation continues; publication still requires separate explicit authorization**

This document tracks the current Public Preview launch gates against the actual canonical repository state. It is a current-facing readiness surface, not a historical preparation record.

> [!IMPORTANT]
> Repository visibility remains private until the visibility change is explicitly authorized. Green CI, a GO acceptance result, or completion of documentation alignment does not authorize tags, releases, npm publishing, or visibility changes by itself.

## Current verified baseline

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Current canonical `main`: `62576aad5f3d8fcc0466bd38d32ba4ba58d483c0` after PR #19.
- Package/release identity: `0.1.0-rc.2`.
- Post-merge Hardening CI #70: success on the canonical commit.
- Final focused acceptance recheck of the remaining Runtime release-authority and Recovery findings: **GO**.
- Historical private release: `v0.1.0-rc.1` from the pre-fix baseline; it remains historical evidence only and must not be recreated, overwritten, retagged, or represented as the current candidate.
- No `0.1.0-rc.2` tag, GitHub Release, npm publication, or repository visibility change is authorized by this readiness document.

## Security/release-authority baseline

The current accepted executable baseline includes the focused fixes through PR #19:

- Recovery checkpoint-substitution defense;
- stranded-Recovery detection;
- machine-local Runtime trust outside project authority;
- Windows shell-free Runtime installation path;
- hardened machine trust-root topology and rejection of projects under the reserved trust tree;
- fail-closed diagnostic/lifecycle behavior across reviewed trust states;
- independent exact-artifact machine-local Release Authority before executable candidate installation/attestation;
- removal of the project-facing `authorize-runtime` command and all production project-side authority creation/mutation;
- Recovery cleanup ordering that removes displaced state before deleting the last valid checkpoint.

No new Security Hardening is part of the current documentation-alignment step. Further hardening requires a concrete new finding.

## Gate summary

| Gate | Area | Current state |
| --- | --- | --- |
| A | Product-facing README and presentation | **ALIGNMENT IN PR** |
| B | License and ownership decision | **CLOSED** |
| C | Repository hygiene and publication contents | **CLOSED** |
| D | GitHub branch/change protection | **CONFIGURED — public-state re-verification required** |
| E | Security reporting and GitHub security features | **PUBLIC-STATE ACTIVATION REQUIRED** |
| F | Release protection and supply-chain policy | **CLOSED FOR CURRENT PRIVATE PREPARATION; RC2 RELEASE ACTION NOT YET AUTHORIZED** |
| G | Distribution and installation user journey | **ALIGNMENT IN PR** |
| H | Privacy and network-behavior review | **ALIGNMENT IN PR; Runtime behavior unchanged** |
| I | Contribution, support, and community surface | **BOUNDED — external code contributions remain closed** |
| J | Documentation/current-truth consistency | **IN PROGRESS — this PR is the current reconciliation** |
| K | Public-host configuration and visibility | **BLOCKED ON EXPLICIT VISIBILITY AUTHORIZATION** |
| L | Candidate-specific release/publication review | **REQUIRED AFTER AN EXPLICIT RC2 RELEASE ACTION** |

## Gate C — Repository hygiene and publication contents

**Status: CLOSED.**

The established private tracked-tree audit found no accidental maintainer-only repository, local environment, generated build output, credential file, or real secret material intended to remain private.

The deliberately tracked `.env` fixture under `tests/fixtures/existing-messy/` contains only synthetic values used to prove secret-preservation behavior. Package smoke verifies that test fixtures and compiled tests are not shipped in the packed Runtime artifact.

## Gate D — GitHub branch/change protection

**Status: CONFIGURED — public-state re-verification required.**

Configured host policy includes PR-required changes to `main`, required Ubuntu and Windows Hardening CI checks, linear history, conversation resolution, deletion/force-push protection, squash-only merge policy, and `v*` release-tag protection.

Effective host protections must be re-verified when/if repository visibility changes because public-state capabilities and enforcement evidence may differ from the current private state.

## Gate E — Security reporting and GitHub security features

**Status: PUBLIC-STATE ACTIVATION REQUIRED.**

Already established private-host posture includes `SECURITY.md`, dependency graph, Dependabot security features, constrained Actions, and SHA-pinned Actions dependencies.

After an explicitly authorized public visibility change, verify and enable the applicable public-state protections such as Secret Scanning / Push Protection and CodeQL / Code Scanning, and re-check the security-reporting path against the actually enabled host features.

## Gate F — Release protection and supply-chain policy

**Status: CLOSED FOR CURRENT PRIVATE PREPARATION; RC2 RELEASE ACTION NOT YET AUTHORIZED.**

The current package identity is `0.1.0-rc.2`, and release-bundle behavior is exercised by required CI. The executable update trust model now distinguishes release identity/integrity evidence from independent machine-local exact-artifact Release Authority.

The historical `v0.1.0-rc.1` predates later security fixes and cannot be reused as the current release. It must remain immutable historical evidence in practice even though GitHub records that historical release according to the settings that existed when it was created.

Creating `v0.1.0-rc.2`, creating a GitHub Release, publishing to npm, or otherwise publishing candidate bytes is a separate release action and requires explicit authorization after this documentation/Truth-Surface gate.

## Gate G — Distribution and installation user journey

**Status: ALIGNMENT IN PR.**

Current documentation must preserve the supported release-artifact path, inspect/apply initialization, existing-project adoption, bounded Claude Code/Codex Resume handoff, manifest/artifact/trusted-source update inputs, **pre-existing independent exact-artifact Release Authority**, automatic schema migration routing through the supported lifecycle, and inspect/apply recovery.

For executable update, manifest contents, `--trusted-source`, project files, and project-facing Livariant CLI/API cannot create the machine-local authority required for candidate execution. The project-facing `authorize-runtime` command no longer exists. Missing authority fails closed before npm installation or candidate Runtime attestation.

## Gate H — Privacy and network behavior

**Status: ALIGNMENT IN PR; Runtime behavior unchanged.**

The accepted baseline still has no automatic Livariant telemetry, Project Brain upload, Livariant cloud-account requirement, automatic remote update check, or Runtime network-fetch implementation.

The supported update path consumes a local release manifest and local artifact. Independent machine-local Runtime trust and release-authorization state are security state outside project authority; they are not Project Brain data and are not remotely provisioned by the current Runtime.

Any later network, telemetry, registry, sync, hosted account, remote authority-provisioning, or automatic-update feature reopens this gate and requires a new privacy/trust review.

## Gate I — Contribution, support, and community surface

**Status: BOUNDED.**

Issues and Discussions may be used for bug reports, documentation feedback, and design discussion. External code contributions remain closed for incorporation until contributor-rights/CLA or equivalent terms are finalized.

## Gate J — Documentation/current-truth consistency

**Status: IN PROGRESS — this PR is the current reconciliation.**

The repository's Truth-Surface model requires current-facing artifacts to track canonical truth while preserving legitimate historical records:

> **Presence is not currency.**

The current alignment work updates user-facing and accepted/current distribution surfaces to reflect the canonical `0.1.0-rc.2` baseline, independent Release Authority, the removed `authorize-runtime` path, the pre-trust execution boundary, and the Recovery cleanup order.

Required CI, including the current-truth regression guard, must pass on the documentation PR and resulting merge before this gate returns to CLOSED.

## Gate K — Public-host configuration and visibility

**Status: BLOCKED ON EXPLICIT VISIBILITY AUTHORIZATION.**

The repository remains private. No documentation or acceptance result changes that fact.

Only after a separate explicit visibility authorization may the public-host/security activation and unauthenticated-view verification sequence begin.

## Gate L — Candidate-specific release/publication review

**Status: REQUIRED AFTER AN EXPLICIT RC2 RELEASE ACTION.**

The current acceptance GO applies to the reviewed canonical implementation baseline. It is not a substitute for verifying the identity and bytes of a subsequently created candidate release.

If an `0.1.0-rc.2` tag/release is separately authorized, verify at minimum:

- tag → exact canonical commit;
- release manifest → exact artifact identity;
- artifact SHA-256 / `SHA256SUMS`;
- clean-consumer behavior for the exact published candidate bytes;
- required CI evidence;
- user documentation and known limitations;
- security-reporting and licensing surfaces;
- absence of unresolved Critical/Major release blockers.

## Current next order

1. finish the current Truth-Surface/documentation alignment on `docs/align-release-authority-truth`;
2. open the focused documentation PR;
3. require Ubuntu + Windows Hardening CI and current-truth consistency for that PR;
4. merge only after required review/CI, then verify post-merge `main` CI;
5. stop at the next RC-preparation gate;
6. do not create tags, Releases, npm publications, or change PRIVATE → PUBLIC without separate explicit authorization.

The Project Lexicon / Provisional Naming capability remains valuable post-Preview work and is not claimed as executable in the current release baseline.
