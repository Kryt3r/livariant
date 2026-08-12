# Public Preview Launch Readiness

Status: **All current pre-release product, security, documentation, onboarding, privacy, community, and current-truth gates are closed. Final RC2 source/digest identity is bound; publication still requires separate explicit authorization.**

This document tracks the current Public Preview launch gates against the actual canonical repository state. It is a current-facing readiness surface, not a historical preparation record.

> [!IMPORTANT]
> Repository visibility remains private until explicitly authorized. Green CI, acceptance GO, or a verified RC2 bundle does not authorize tags, releases, npm publishing, or visibility changes by itself.

## Current verified state

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Final bound RC2 source: `124b6022a469667495b0c0093a0c6f574bb85481`.
- Post-merge Hardening CI #150: success on that exact source.
- Package/release identity: `0.1.0-rc.2`.
- Final focused acceptance recheck of remaining Runtime Release-Authority and Recovery findings: **GO**.
- End-to-end Product Utility blocker H-04: **CLOSED** by PR #29 and post-merge Hardening CI #133.
- Public human-documentation and repository acceptance: **CLOSED** by PR #28, Hardening CI #149, manual GitHub Discussions/Issues host verification, and post-merge Hardening CI #150.
- Final verified artifact: `livariant-0.1.0-rc.2.tgz`.
- Final verified SHA-256: `984d6976df3bfd7c5f5c5683099045e5412c5705db8b9c7a69081435a01645b1`.
- Build RC Bundle run #4: success from the exact final source, including source validation, exact checkout, public/current Truth-Surface verification, build, 93 executable hardening tests, package smoke, release-bundle smoke, independent digest/manifest/checksum verification, and digest-keyed Actions-cache persistence.
- Final cache identity: `livariant-rc2-124b6022a469667495b0c0093a0c6f574bb85481-984d6976df3bfd7c5f5c5683099045e5412c5705db8b9c7a69081435a01645b1`.
- Historical private release `v0.1.0-rc.1` remains immutable pre-fix evidence and is not the current candidate.

The final digest supersedes earlier RC2 bundle digests because the final candidate now includes both the semantic repeated-use Project Brain editing capability and the completed public documentation/community pass. This is therefore a new exact source/artifact binding, not a documentation-only re-label of an older bundle.

## Security / release-authority baseline

The accepted executable baseline includes:

- Recovery checkpoint-substitution defense;
- stranded-Recovery detection;
- machine-local Runtime trust outside project authority;
- Windows shell-free Runtime installation;
- hardened machine trust-root topology;
- fail-closed diagnostic/lifecycle behavior across reviewed trust states;
- independent exact-artifact machine-local Release Authority before executable candidate installation/attestation;
- removal of project-facing `authorize-runtime` and production project-side authority creation/mutation;
- Recovery cleanup ordering that preserves the last valid checkpoint until final cleanup;
- plan-first semantic Project Brain editing for goals, knowledge, and decisions;
- explicit mutation authorization and `--apply` boundaries;
- preservation of unrelated human-authored canonical content;
- optimistic concurrency protection for semantic writes;
- symlink rejection on managed semantic-write surfaces;
- decision supersession that preserves historical truth while changing active Resume truth;
- centralized semantic persistence through `ProjectBrainStore` with post-write verification.

No new Security Hardening is authorized without a concrete finding.

## Gate summary

| Gate | Area | Current state |
| --- | --- | --- |
| A | Product-facing README and presentation | **CLOSED** |
| B | License and ownership decision | **CLOSED** |
| C | Repository hygiene and publication contents | **CLOSED** |
| D | GitHub branch/change protection | **CONFIGURED - re-verify after visibility change** |
| E | Security reporting and GitHub security features | **PUBLIC-STATE ACTIVATION REQUIRED after visibility change** |
| F | Release protection and supply-chain policy | **CLOSED FOR PRE-RELEASE** |
| G | Distribution and first-install user journey | **CLOSED - documented and CI-verified** |
| H | Privacy and network-behavior review | **CLOSED FOR CURRENT RUNTIME** |
| I | Contribution, support, and community surface | **CLOSED FOR PREVIEW - external code contributions remain gated** |
| J | Documentation/current-truth consistency | **CLOSED subject to this final identity update passing CI** |
| K | Public-host configuration and visibility | **BLOCKED ONLY ON EXPLICIT VISIBILITY AUTHORIZATION** |
| L | Candidate-specific release/publication review | **PRE-TAG IDENTITY CLOSED; published-bytes verification follows release authorization** |
| M | End-to-end Product Utility | **CLOSED** |

## Final RC2 identity

```text
Version: 0.1.0-rc.2
Source: 124b6022a469667495b0c0093a0c6f574bb85481
Artifact: livariant-0.1.0-rc.2.tgz
SHA-256: 984d6976df3bfd7c5f5c5683099045e5412c5705db8b9c7a69081435a01645b1
Source ID: github:Kryt3r/livariant
Channel: preview
Project Brain schema: 1
Compatible from: 0.1.0-rc.1
Artifact identity: runtime-node-cli
```

Build RC Bundle run #4 independently verified that the manifest SHA-256 and `SHA256SUMS` match the concrete tarball bytes and that the packed artifact is installable and executable under the canonical `livariant` CLI identity.

Creating `v0.1.0-rc.2`, a GitHub Release, an npm publication, or otherwise publishing candidate bytes remains a separate action requiring explicit authorization.

## Distribution and normal-use journey

**Status: CLOSED.**

The supported Public Preview path is:

```text
canonical GitHub Release
-> verify SHA-256
-> install the verified .tgz as machine/user tooling with npm
-> verify livariant version
-> open the existing project root
-> inspect with status / doctor / init
-> explicitly initialize with init --apply
-> record goals, knowledge, and decisions through plan-first semantic commands
-> explicitly apply approved semantic changes
-> resume current Project Brain truth in later sessions
-> optionally use the bounded Claude Code / Codex Resume handoff
-> inspect and apply supported update/recovery flows through their explicit authority boundaries
```

Current guidance explicitly states that Livariant RC2 is not a Claude Code/Codex plugin and is not installed as a dependency of the target project's `package.json`. The npm registry is not the Preview distribution source; npm is used locally to install the verified release tarball.

## Public repository and community readiness

**Status: CLOSED FOR PRE-PUBLIC PREPARATION.**

Verified surfaces include:

- beginner-oriented README and user journey in English and German;
- EN/DE parity and local Markdown link integrity enforced by CI;
- public writing-style gate for the agreed punctuation rule;
- `SUPPORT.md`, Issue Forms, PR template, and Code of Conduct;
- Issues and Discussions enabled;
- Bug and documentation Issue Forms routed with existing labels;
- Discussions categories verified manually as Announcements, General, Ideas, Polls, Q&A, and Show and tell;
- repository topics populated;
- Projects, Wiki, Pages, and Downloads disabled for the current Preview posture;
- Hardening CI configured with per-ref concurrency and `cancel-in-progress: true` to stop stale PR runs from consuming unnecessary Actions time.

## Publication / host actions still requiring authorization

The remaining work is no longer an unclosed product or RC2 technical gate. It consists of separately authorized publication and host actions:

1. create `v0.1.0-rc.2` only after explicit tag authorization;
2. assemble/publish the GitHub Release only after explicit release authorization;
3. verify that released tarball bytes hash exactly to `984d6976df3bfd7c5f5c5683099045e5412c5705db8b9c7a69081435a01645b1` and that manifest / `SHA256SUMS` match;
4. change PRIVATE -> PUBLIC only after separate explicit visibility authorization;
5. after visibility change, re-verify branch/ruleset enforcement, security-reporting path, and applicable public-state security features;
6. verify the unauthenticated public user journey and canonical source identity after publication.

The Project Lexicon / Provisional Naming and broader Desktop/MCP/Marketplace direction remain post-Preview work and are not claimed as executable RC2 capabilities.
