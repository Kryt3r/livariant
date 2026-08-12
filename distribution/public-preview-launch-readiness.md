# Public Preview Launch Readiness

Status: **The repository is public and the public-host security baseline is active. RC3 is the current Foundation Preview candidate and still requires exact candidate verification, PR approval, merge approval, and separate tag/release authorization before publication.**

This document tracks Public Preview launch readiness against the current canonical repository state. It is a current-facing Truth Surface, not a historical preparation record.

> [!IMPORTANT]
> Repository visibility is already public. Green CI, a reviewed RC3 preparation branch, or a verified bundle does not authorize merge, tag creation, GitHub Release publication, or npm publishing by itself.

## Current verified state

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: public.
- Canonical main before the RC3 preparation PR: `c36c39ea0029187885a1a80e5d5b7fb06fb20d19`.
- Current candidate package/release identity: `0.1.0-rc.3`.
- RC3 preparation branch: `release/0.1.0-rc.3-prep`.
- Historical `v0.1.0-rc.1`: immutable pre-fix evidence and not the current candidate.
- Historical `v0.1.0-rc.2`: immutable pre-public release evidence with stale release text and older bundle bytes. It must not be overwritten or presented as the current candidate.
- PR #33 structurally removed the remaining CodeQL shell-command findings from Packaging/Test helper paths by using shell-free Node/npm CLI execution.
- Post-merge Hardening CI #159: success after PR #33.
- All five related CodeQL alerts are closed.
- Private Vulnerability Reporting: enabled.
- Dependabot Alerts: enabled.
- CodeQL: enabled.
- Secret Scanning: enabled.
- Push Protection: enabled.
- Actions permissions: restricted, with external fork PR workflows requiring approval.
- Main ruleset: active.
- Release-tag ruleset: active.
- Squash merge only: active.
- Automatic branch deletion after merge: active.
- Release immutability: active.
- GitHub Discussions, Welcome discussion, categories, Issues, and Issue Forms: configured for public use.

RC3 exists because the immutable public `v0.1.0-rc.2` release cannot be corrected in place. Its release text still describes a private pre-public state, and its release tarball is not the later verified Foundation Preview bundle. RC3 therefore receives a new release identity instead of rewriting historical evidence.

## Foundation Preview product position

RC3 is intentionally the safe foundation, not the complete future Livariant experience.

Current executable capability includes:

- project-owned canonical Project Brain state;
- plan-first semantic editing for goals, knowledge, and decisions;
- explicit `--apply` authorization boundaries;
- historical decision supersession;
- Claude Code and Codex Resume handoff from canonical state;
- hardened initialization, update, migration, Runtime trust, Release Authority, and Recovery paths;
- preservation, concurrency, path, symlink, and post-write verification protections.

The next product layer is **Active Project Intelligence**. It is future work and is not claimed as RC3 behavior. Its intended direction includes agent-assisted recognition of durable project truth, semantic change proposals, conflict and drift detection, terminology management, and a more natural workflow on top of the existing safe mutation core.

## Gate summary

| Gate | Area | Current state |
| --- | --- | --- |
| A | Product-facing README and presentation | **RC3 ALIGNMENT IN PROGRESS** |
| B | License and ownership decision | **CLOSED** |
| C | Repository hygiene and publication contents | **CLOSED** |
| D | GitHub branch/change protection | **ACTIVE** |
| E | Security reporting and GitHub security features | **ACTIVE** |
| F | Release protection and supply-chain policy | **ACTIVE FOR PREVIEW** |
| G | Distribution and first-install user journey | **RC3 ALIGNMENT IN PROGRESS** |
| H | Privacy and network-behavior review | **CLOSED FOR CURRENT RUNTIME** |
| I | Contribution, support, and community surface | **ACTIVE FOR PREVIEW** |
| J | Documentation/current-truth consistency | **RC3 ALIGNMENT IN PROGRESS** |
| K | Public-host configuration and visibility | **CLOSED** |
| L | Candidate-specific release/publication review | **OPEN FOR RC3** |
| M | End-to-end Product Utility | **CLOSED** |
| N | Foundation Preview positioning | **CLOSED, RC3 TEXT ALIGNMENT IN PROGRESS** |

## Current RC3 identity

```text
Version: 0.1.0-rc.3
Source ID: github:Kryt3r/livariant
Channel: preview
Artifact identity: runtime-node-cli
```

The final RC3 release source SHA, tarball SHA-256, manifest digest binding, and published asset checksums are intentionally not recorded yet. They only become release facts after the exact candidate is finalized and the release bundle has been built and verified.

## RC3 verification sequence

Before the RC3 preparation PR is ready for merge review, the branch must pass:

1. `npm run test:public-docs`;
2. `npm run build`;
3. `npm test`;
4. `npm run test:package`;
5. `npm run test:release-bundle`.

After those checks pass, the RC3 preparation branch may be proposed in a PR against `main`.

The PR must not be merged without explicit approval.

## Publication actions still requiring authorization

After the RC3 preparation PR is approved and merged, publication remains a separate controlled sequence:

1. establish the exact canonical RC3 release source;
2. build the final RC3 bundle from that exact source;
3. independently verify tarball SHA-256, manifest binding, `SHA256SUMS`, package installation, and executable identity;
4. receive explicit authorization before creating `v0.1.0-rc.3`;
5. receive explicit authorization before publishing the GitHub Release;
6. verify the published assets match the approved local bundle exactly;
7. verify source identity, checksums, release immutability, and the unauthenticated public installation path.

No npm publication is authorized.
