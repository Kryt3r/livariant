# Public Preview Launch Readiness

Status: **All current pre-release product, security, documentation, onboarding, privacy, and current-truth gates are closed. Final RC2 source/digest identity is bound; publication still requires separate explicit authorization.**

This document tracks the current Public Preview launch gates against the actual canonical repository state. It is a current-facing readiness surface, not a historical preparation record.

> [!IMPORTANT]
> Repository visibility remains private until explicitly authorized. Green CI, acceptance GO, or a verified RC2 bundle does not authorize tags, releases, npm publishing, or visibility changes by itself.

## Current verified state

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Final bound RC2 source: `b27fb5e8c786728ee7714bd535d9fe0fa2603984`.
- Post-merge Hardening CI #86: success on that exact source.
- Package/release identity: `0.1.0-rc.2`.
- Final focused acceptance recheck of remaining Runtime Release-Authority and Recovery findings: **GO**.
- Final verified artifact: `livariant-0.1.0-rc.2.tgz`.
- Final verified SHA-256: `d040677806549e9d2a46bbb458984696b4a9d199d9d599bdf77e63e8bd6c662f`.
- Build RC Bundle run #3: success from the exact final source, including source validation, exact checkout, public/current Truth-Surface verification, build, executable hardening tests, package smoke, release-bundle smoke, independent digest/manifest/checksum verification, and digest-keyed Actions-cache persistence.
- Final cache identity: `livariant-rc2-b27fb5e8c786728ee7714bd535d9fe0fa2603984-d040677806549e9d2a46bbb458984696b4a9d199d9d599bdf77e63e8bd6c662f`.
- Historical private release `v0.1.0-rc.1` remains immutable pre-fix evidence and is not the current candidate.

The final digest differs from the earlier pre-onboarding RC2 bundle because `README.md` changed as part of the required first-install/onboarding work and npm includes README content in the packed tarball. The direct source comparison found no `src/` or `package.json` changes between the earlier bound source and the final source. The final bundle therefore represents the intended final Public Preview repository state without a new Runtime semantic change.

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
| D | GitHub branch/change protection | **CONFIGURED — re-verify after visibility change** |
| E | Security reporting and GitHub security features | **PUBLIC-STATE ACTIVATION REQUIRED after visibility change** |
| F | Release protection and supply-chain policy | **CLOSED FOR PRE-RELEASE** |
| G | Distribution and first-install user journey | **CLOSED — documented and CI-verified** |
| H | Privacy and network-behavior review | **CLOSED FOR CURRENT RUNTIME** |
| I | Contribution, support, and community surface | **BOUNDED — external code contributions remain closed** |
| J | Documentation/current-truth consistency | **CLOSED subject to this final identity update passing CI** |
| K | Public-host configuration and visibility | **BLOCKED ONLY ON EXPLICIT VISIBILITY AUTHORIZATION** |
| L | Candidate-specific release/publication review | **PRE-TAG IDENTITY CLOSED; published-bytes verification follows release authorization** |

## Final RC2 identity

```text
Version: 0.1.0-rc.2
Source: b27fb5e8c786728ee7714bd535d9fe0fa2603984
Artifact: livariant-0.1.0-rc.2.tgz
SHA-256: d040677806549e9d2a46bbb458984696b4a9d199d9d599bdf77e63e8bd6c662f
Source ID: github:Kryt3r/livariant
Channel: preview
Project Brain schema: 1
Compatible from: 0.1.0-rc.1
Artifact identity: runtime-node-cli
```

Build RC Bundle run #3 independently verified that the manifest SHA-256 and `SHA256SUMS` match the concrete tarball bytes and that the packed artifact is installable and executable under the canonical `livariant` CLI identity.

Creating `v0.1.0-rc.2`, a GitHub Release, an npm publication, or otherwise publishing candidate bytes remains a separate action requiring explicit authorization.

## Distribution and first-install user journey

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

## Publication / host actions still requiring authorization

The remaining work is no longer an unclosed product or RC2 technical gate. It consists of separately authorized publication and host actions:

1. create `v0.1.0-rc.2` only after explicit tag authorization;
2. assemble/publish the GitHub Release only after explicit release authorization;
3. verify that released tarball bytes hash exactly to `d040677806549e9d2a46bbb458984696b4a9d199d9d599bdf77e63e8bd6c662f` and that manifest / `SHA256SUMS` match;
4. change PRIVATE → PUBLIC only after separate explicit visibility authorization;
5. after visibility change, re-verify branch/ruleset enforcement, security-reporting path, and applicable public-state security features;
6. verify the unauthenticated public user journey and canonical source identity after publication.

The Project Lexicon / Provisional Naming and broader Desktop/MCP/Marketplace direction remain post-Preview work and are not claimed as executable RC2 capabilities.
