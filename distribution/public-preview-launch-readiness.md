# Public Preview Launch Readiness

Status: **All current product, security, documentation, and onboarding gates are closed; final RC2 source rebinding to the current canonical main remains before any publication action.**

This document tracks the current Public Preview launch gates against the actual canonical repository state. It is a current-facing readiness surface, not a historical preparation record.

> [!IMPORTANT]
> Repository visibility remains private until explicitly authorized. Green CI, acceptance GO, or a verified RC2 bundle does not authorize tags, releases, npm publishing, or visibility changes by itself.

## Current verified state

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Current canonical `main`: `686670fc2343f3ca02e01c1233f17103a71c35de` after PR #25.
- Post-merge Hardening CI #84: success on this exact current `main`, including Ubuntu and Windows global tarball-install smoke coverage.
- Package/release identity: `0.1.0-rc.2`.
- Final focused acceptance recheck of remaining Runtime Release-Authority and Recovery findings: **GO**.
- Previously verified RC2 bundle source: `69d555c3f5850536e04cd0bf869bd058ba6406c2`.
- Previously verified concrete bundle: `livariant-0.1.0-rc.2.tgz`.
- Previously verified SHA-256: `a50a925ac62399f0e0a648e31551efc9565888120fad22030348ac7178ea1b0b`.
- Build RC Bundle run #2 succeeded from that source, including exact-source checkout, full verification, independent digest/manifest/checksum verification, and digest-keyed Actions-cache persistence.
- Historical private release `v0.1.0-rc.1` remains immutable pre-fix evidence and is not the current candidate.

Since the previous bundle was bound, PR #24 reconciled final readiness truth surfaces and PR #25 closed the first-install/onboarding gap and added global tarball-install smoke coverage. Those changes do not intentionally change Runtime semantics, but they are part of the final Public Preview repository state. Therefore the final RC2 tag/source binding should be re-established from the current canonical `main` rather than leaving the release tag on the older pre-onboarding source.

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
| D | GitHub branch/change protection | **CONFIGURED — public-state re-verification required after visibility change** |
| E | Security reporting and GitHub security features | **PUBLIC-STATE ACTIVATION REQUIRED after visibility change** |
| F | Release protection and supply-chain policy | **CLOSED FOR PRE-RELEASE; final current-main bundle binding required** |
| G | Distribution and first-install user journey | **CLOSED — documented and CI-verified on Ubuntu/Windows** |
| H | Privacy and network-behavior review | **CLOSED FOR CURRENT RUNTIME** |
| I | Contribution, support, and community surface | **BOUNDED — external code contributions remain closed** |
| J | Documentation/current-truth consistency | **CLOSED after PR #24/#25 and CI #82/#84; this final reconciliation must itself pass CI** |
| K | Public-host configuration and visibility | **BLOCKED ONLY ON EXPLICIT VISIBILITY AUTHORIZATION** |
| L | Candidate-specific release/publication review | **FINAL CURRENT-MAIN BUNDLE REBIND REQUIRED; published-bytes check follows release authorization** |

## Gate F — Release protection and supply-chain policy

**Status: CLOSED FOR PRE-RELEASE; final current-main bundle binding required.**

The earlier concrete RC2 candidate was built and independently checked:

```text
Source: 69d555c3f5850536e04cd0bf869bd058ba6406c2
Artifact: livariant-0.1.0-rc.2.tgz
SHA-256: a50a925ac62399f0e0a648e31551efc9565888120fad22030348ac7178ea1b0b
```

Because current `main` now includes final required Preview documentation and global installation verification, one final exact-source build must be run from:

```text
686670fc2343f3ca02e01c1233f17103a71c35de
```

Expected outcome: the packed Runtime tarball should remain byte-identical and retain SHA-256 `a50a925ac62399f0e0a648e31551efc9565888120fad22030348ac7178ea1b0b`. This expectation must be verified, not assumed. If the digest differs, stop and investigate the concrete difference before any tag/release action.

Creating `v0.1.0-rc.2`, a GitHub Release, npm publication, or otherwise publishing candidate bytes remains a separate action requiring explicit authorization.

## Gate G — Distribution and first-install user journey

**Status: CLOSED.**

PR #25 established one explicit Public Preview installation path:

```text
canonical GitHub Release
→ verify SHA-256
→ install the verified .tgz as machine/user tooling with npm
→ verify `livariant version`
→ open the existing project root
→ inspect with status / doctor / init
→ explicitly initialize with init --apply
→ optionally use the bounded Claude Code / Codex Resume handoff
```

Current guidance explicitly states that Livariant RC2 is not a Claude Code/Codex plugin and is not installed as a dependency of the target project's `package.json`. The npm registry is not the Preview distribution source; npm is used locally to install the verified release tarball.

Hardening CI #83 verified this global tarball-install path on Ubuntu and Windows before merge. Post-merge Hardening CI #84 passed on current `main`.

## Gate H — Privacy and network behavior

**Status: CLOSED FOR CURRENT RUNTIME.**

The accepted baseline has no automatic Livariant telemetry, Project Brain upload, Livariant cloud-account requirement, automatic remote update check, or Runtime network-fetch implementation.

Any later network, telemetry, registry, sync, hosted account, remote authority-provisioning, or automatic-update feature reopens this gate.

## Gate I — Contribution, support, and community surface

**Status: BOUNDED.**

Issues and Discussions may be used for bug reports, documentation feedback, and design discussion. External code contributions remain closed for incorporation until contributor-rights/CLA or equivalent terms are finalized.

## Gate J — Documentation/current-truth consistency

**Status: CLOSED subject to this final reconciliation passing required CI.**

PR #24 reconciled the candidate/readiness truth surfaces and PR #25 closed the missing first-install journey in both English and German. Required current-truth and Hardening CI passed through post-merge CI #84.

This document is the final reconciliation to the current canonical main and must itself pass the same required checks before being merged.

## Gate K — Public-host configuration and visibility

**Status: BLOCKED ONLY ON EXPLICIT VISIBILITY AUTHORIZATION.**

The repository remains private. No documentation, CI, bundle, or acceptance result changes that fact.

Only after a separate explicit visibility authorization may the public-host/security activation and unauthenticated-view verification sequence begin.

## Gate L — Candidate-specific release/publication review

**Status: FINAL CURRENT-MAIN BUNDLE REBIND REQUIRED.**

Before any tag/release action:

1. build the RC2 bundle from exact current `main` `686670fc2343f3ca02e01c1233f17103a71c35de`;
2. verify package version, source ID, channel, schema and compatibility parameters;
3. independently verify the tarball SHA-256, release manifest, and `SHA256SUMS`;
4. require the tarball SHA-256 to equal the previously verified digest unless a concrete reviewed reason explains a change;
5. record the resulting exact source/digest binding.

If an `0.1.0-rc.2` tag/release is then separately authorized, verify at minimum:

- tag points to the newly bound exact current source commit;
- released tarball SHA-256 equals the recorded final digest;
- release manifest and `SHA256SUMS` match those exact bytes;
- clean-consumer behavior for the exact published bytes;
- required CI evidence;
- user documentation and known limitations;
- security-reporting and licensing surfaces;
- absence of unresolved Critical/Major release blockers.

## Current next order

1. merge this final readiness reconciliation only after required CI passes;
2. verify post-merge `main` CI;
3. run `Build RC Bundle` against the resulting exact canonical `main` commit and record the final source/digest binding;
4. perform the short final pre-tag identity check;
5. stop before tag creation, GitHub Release creation, npm publication, or PRIVATE → PUBLIC unless separately and explicitly authorized.

The Project Lexicon / Provisional Naming and broader Desktop/MCP/Marketplace direction remain post-Preview work and are not claimed as executable RC2 capabilities.
