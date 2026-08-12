# Public Preview Launch Readiness

Status: **All current pre-release product, security, documentation, onboarding, privacy, community, and current-truth gates are closed. The Foundation Preview RC2 release bytes are bound; publication and visibility actions still require explicit authorization.**

This document tracks Public Preview launch readiness against the current canonical repository state. It is a current-facing Truth Surface, not a historical preparation record.

> [!IMPORTANT]
> Repository visibility remains private until explicitly authorized. Green CI, acceptance GO, or a verified RC2 bundle does not authorize tags, releases, npm publishing, or visibility changes by itself.

## Current verified state

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Package/release identity: `0.1.0-rc.2`.
- Foundation Preview positioning merged by PR #31.
- Foundation Preview source used to build the exact release artifact: `31cf83656676358cf7003f95b5ad32f998b28d1f`.
- Post-merge Hardening CI #154: success on that exact source.
- Final focused acceptance recheck of the Runtime Release-Authority and Recovery findings: **GO**.
- End-to-end Product Utility blocker H-04: **CLOSED** by PR #29 and post-merge Hardening CI #133.
- Public human-documentation and repository acceptance: **CLOSED** by PR #28, Hardening CI #149, manual GitHub Discussions/Issues host verification, and post-merge Hardening CI #150.
- Foundation Preview README positioning: **CLOSED** by PR #31 and post-merge Hardening CI #154.
- Final verified artifact: `livariant-0.1.0-rc.2.tgz`.
- Final verified SHA-256: `b91d098fac1a26211600f25dbca8658d810b168fcdeedb7f40e2e576e1347d13`.
- Build RC Bundle run #5: success from the exact Foundation Preview source, including source validation, exact checkout, public/current Truth-Surface verification, build, 93 executable tests, package smoke, release-bundle smoke, independent digest/manifest/checksum verification, and digest-keyed Actions-cache persistence.
- Final cache identity: `livariant-rc2-31cf83656676358cf7003f95b5ad32f998b28d1f-b91d098fac1a26211600f25dbca8658d810b168fcdeedb7f40e2e576e1347d13`.
- Historical private release `v0.1.0-rc.1` remains immutable pre-fix evidence and is not the current candidate.

The current digest supersedes earlier RC2 bundle digests because the packaged README now presents RC2 explicitly as the Foundation Preview and distinguishes current capability from the planned Active Project Intelligence layer. The release bytes are therefore bound to the exact source above.

## Foundation Preview product position

RC2 is intentionally the safe foundation, not the complete future Livariant experience.

Current executable capability includes:

- project-owned canonical Project Brain state;
- plan-first semantic editing for goals, knowledge, and decisions;
- explicit `--apply` authorization boundaries;
- historical decision supersession;
- Claude Code and Codex Resume handoff from canonical state;
- hardened initialization, update, migration, Runtime trust, Release Authority, and Recovery paths;
- preservation, concurrency, path, symlink, and post-write verification protections.

The next product layer is **Active Project Intelligence**. It is future work and is not claimed as RC2 behavior. Its intended direction includes agent-assisted recognition of durable project truth, semantic change proposals, conflict and drift detection, and a more natural workflow on top of the existing safe mutation core.

## Gate summary

| Gate | Area | Current state |
| --- | --- | --- |
| A | Product-facing README and presentation | **CLOSED** |
| B | License and ownership decision | **CLOSED** |
| C | Repository hygiene and publication contents | **CLOSED** |
| D | GitHub branch/change protection | **CONFIGURED - re-verify after visibility change** |
| E | Security reporting and GitHub security features | **PUBLIC-STATE ACTIVATION REQUIRED after visibility change** |
| F | Release protection and supply-chain policy | **CLOSED FOR PRE-RELEASE** |
| G | Distribution and first-install user journey | **CLOSED** |
| H | Privacy and network-behavior review | **CLOSED FOR CURRENT RUNTIME** |
| I | Contribution, support, and community surface | **CLOSED FOR PREVIEW** |
| J | Documentation/current-truth consistency | **CLOSED subject to this binding update passing CI** |
| K | Public-host configuration and visibility | **BLOCKED ONLY ON EXPLICIT VISIBILITY AUTHORIZATION** |
| L | Candidate-specific release/publication review | **PRE-TAG IDENTITY CLOSED; published-bytes verification follows release authorization** |
| M | End-to-end Product Utility | **CLOSED** |
| N | Foundation Preview positioning | **CLOSED** |

## Final RC2 release identity

```text
Version: 0.1.0-rc.2
Release source: 31cf83656676358cf7003f95b5ad32f998b28d1f
Artifact: livariant-0.1.0-rc.2.tgz
SHA-256: b91d098fac1a26211600f25dbca8658d810b168fcdeedb7f40e2e576e1347d13
Source ID: github:Kryt3r/livariant
Channel: preview
Project Brain schema: 1
Compatible from: 0.1.0-rc.1
Artifact identity: runtime-node-cli
```

Build RC Bundle run #5 independently verified that the manifest SHA-256 and `SHA256SUMS` match the concrete tarball bytes and that the packed artifact is installable and executable under the canonical `livariant` CLI identity.

This Truth-Surface update is not part of the npm tarball payload. The release artifact remains bound to source `31cf83656676358cf7003f95b5ad32f998b28d1f` and digest `b91d098fac1a26211600f25dbca8658d810b168fcdeedb7f40e2e576e1347d13`.

## Publication / host actions still requiring authorization

The remaining work is publication sequencing, not an unclosed product or technical gate:

1. create `v0.1.0-rc.2` only after explicit tag authorization;
2. assemble and publish the GitHub Release only after explicit release authorization;
3. verify released tarball bytes hash exactly to `b91d098fac1a26211600f25dbca8658d810b168fcdeedb7f40e2e576e1347d13` and that manifest / `SHA256SUMS` match;
4. change PRIVATE -> PUBLIC only after explicit visibility authorization;
5. after visibility change, re-verify branch/ruleset enforcement, security-reporting path, and applicable public-state security features;
6. verify the unauthenticated public user journey and canonical source identity after publication.

No npm publication is authorized.
