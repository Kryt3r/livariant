# Public Preview Launch Readiness

Status: **private candidate is pre-public ready; visibility change still requires explicit authorization**

This document tracks the current Public Preview launch gates against the actual canonical repository state. It is a current-facing readiness surface, not a historical preparation record.

> [!IMPORTANT]
> Repository visibility remains private until the visibility change is explicitly authorized. Green CI or a completed readiness review does not change visibility by itself.

## Current verified baseline

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Current `main`: `4cd1a0065c15c3cc50ca5128667aef8a195b70b7` after PR #9.
- Post-merge Hardening CI #40: Ubuntu + Windows success, including current-truth consistency, hardening tests, clean-consumer package smoke, and manifest-bound release-bundle smoke.
- RC version: `0.1.0-rc.1`.
- Release channel: `preview`.
- RC tag: `v0.1.0-rc.1`.
- RC source commit: `f8b5b7afa646b9532d9c47ef46843ff821c722f6`.
- RC artifact SHA-256: `ea7fb30a057ef14277ea4d6d4e2e363ba487a079a998ee74afb51e2ced1506d5`.
- The existing private RC is evidence and must not be recreated or overwritten casually.

## Gate summary

| Gate | Area | Current state |
| --- | --- | --- |
| A | Product-facing README and presentation | **CLOSED** |
| B | License and ownership decision | **CLOSED** |
| C | Repository hygiene and publication contents | **CLOSED** |
| D | GitHub branch/change protection | **CONFIGURED — public-state re-verification required** |
| E | Security reporting and GitHub security features | **PUBLIC-STATE ACTIVATION REQUIRED** |
| F | Release protection and supply-chain policy | **CLOSED WITH DOCUMENTED RC EXCEPTION** |
| G | Distribution and installation user journey | **CLOSED FOR PRE-PUBLIC** |
| H | Privacy and network-behavior review | **CLOSED FOR PRE-PUBLIC** |
| I | Contribution, support, and community surface | **BOUNDED — external code contributions remain closed** |
| J | Documentation/current-truth consistency | **CLOSED WITH AUTOMATED REGRESSION GUARD** |
| K | Public-host configuration and visibility | **READY FOR EXPLICIT VISIBILITY DECISION** |
| L | Final Public Preview release review | **REQUIRED AFTER PUBLIC-HOST ACTIVATION** |

## Gate C — Repository hygiene and publication contents

**Status: CLOSED.**

The final private tracked-tree audit found no accidental maintainer-only repository, local environment, generated build output, credential file, or real secret material intended to remain private.

The deliberately tracked `.env` fixture under `tests/fixtures/existing-messy/` contains only synthetic values used to prove secret-preservation behavior:

```text
DATABASE_PASSWORD=fixture-secret-do-not-ingest
API_TOKEN=fixture-token-do-not-ingest
```

It is test evidence, not a credential leak. Package smoke also verifies that test fixtures and compiled tests are not shipped in the packed Runtime artifact.

## Gate D — GitHub branch/change protection

**Status: CONFIGURED — public-state re-verification required.**

Configured host policy includes PR-required changes to `main`, required Ubuntu and Windows Hardening CI checks, linear history, conversation resolution, deletion/force-push protection, squash-only merge policy, and `v*` release-tag protection.

The repository uses GitHub Rulesets rather than classic branch protection. Effective Rulesets and required checks must be re-verified immediately after the repository becomes public because the private-repository plan/integration does not currently expose complete Ruleset verification evidence.

## Gate E — Security reporting and GitHub security features

**Status: PUBLIC-STATE ACTIVATION REQUIRED.**

Already established:

- `SECURITY.md` defines the intended private reporting model;
- dependency graph enabled;
- Dependabot alerts enabled;
- Dependabot security updates enabled;
- grouped security updates enabled;
- Dependabot malware alerts enabled;
- Actions are constrained and pinned to full commit SHAs.

Immediately after the repository becomes public, enable and verify Secret Scanning, Push Protection, CodeQL / Code Scanning where GitHub makes them available, and the intended private vulnerability-reporting path. Re-read `SECURITY.md` against the actually enabled reporting mechanism before treating Public Preview launch as complete.

## Gate F — Release protection and supply-chain policy

**Status: CLOSED WITH DOCUMENTED RC EXCEPTION.**

The RC is manifest/checksum bound, its source commit and artifact digest are recorded, `v*` protection is configured, future release immutability is enabled, and CI verifies release-bundle behavior.

`v0.1.0-rc.1` predates release-immutability activation and remains `immutable: false` in GitHub. It must not be recreated or overwritten. This historical exception does not authorize mutable future releases.

## Gate G — Distribution and installation user journey

**Status: CLOSED FOR PRE-PUBLIC.**

The public documentation defines the supported release-artifact path, inspect/apply initialization, existing-project adoption, bounded Claude Code/Codex Resume handoff, manifest/artifact/trusted-source updates, automatic schema migration routing through the supported lifecycle, and inspect/apply recovery.

The final clean-consumer verification runs from a fresh temporary project and successfully:

1. packs the Livariant package,
2. installs that packed artifact locally,
3. executes `livariant version`,
4. initializes a Project Brain,
5. produces a capability-bounded Codex Resume handoff,
6. exercises read-only update discovery,
7. exercises recovery inspection,
8. verifies the installed `livariant` CLI identity.

This passed on Ubuntu and Windows in Hardening CI #40.

## Gate H — Privacy and network behavior

**Status: CLOSED FOR PRE-PUBLIC.**

The final candidate re-verification found no automatic telemetry, Project Brain upload, Livariant cloud-account requirement, automatic remote update check, or Runtime network-fetch implementation.

The supported update path consumes a local release manifest and local artifact. The current packed Runtime declares no runtime dependencies. Provider handoff renders local projections; separately operated provider/client behavior remains outside Livariant's Runtime boundary.

Any later network, telemetry, registry, sync, hosted account, or automatic-update feature reopens this gate and requires a new privacy/trust review.

## Gate I — Contribution, support, and community surface

**Status: BOUNDED.**

Issues and Discussions may be used for bug reports, documentation feedback, and design discussion. External code contributions remain closed for incorporation until contributor-rights/CLA or equivalent terms are finalized.

That unresolved contributor-rights question does not block public read-only repository visibility while external code incorporation remains explicitly closed.

## Gate J — Documentation/current-truth consistency

**Status: CLOSED WITH AUTOMATED REGRESSION GUARD.**

PRs #6, #7, and #9 corrected current-facing drift and established the rule:

> **Presence is not currency.**

`npm run test:public-docs` now checks public documentation plus selected accepted/current normative contracts for superseded identity and preparation-state claims while preserving legitimate historical evidence. The expanded check passed on Ubuntu and Windows in PR CI #39 and post-merge CI #40.

## Gate K — Public-host configuration and visibility

**Status: READY FOR EXPLICIT VISIBILITY DECISION.**

The bounded pre-public technical work is complete:

- final tracked-tree/publication audit complete;
- final clean-consumer verification complete;
- final privacy/network verification complete;
- current-truth audit complete;
- final private candidate blocker review found no unresolved Critical/Major safety, authority, migration, recovery, data-integrity, release-integrity, or publication blocker;
- no open GitHub issues currently represent a launch blocker.

Repository visibility must still change only as an explicit standalone action.

After that action, immediately:

1. verify effective Rulesets, required checks, tag protection, merge policy, Actions permissions, and release settings;
2. enable/test the public-state security features in Gate E;
3. configure the selected Social Preview image where appropriate;
4. verify README, license, documentation, releases, and repository presentation as an unauthenticated viewer.

## Gate L — Final Public Preview release review

**Status: REQUIRED AFTER PUBLIC-HOST ACTIVATION.**

After the public-host/security checks are complete, perform one final review against the actual public candidate and verify version/channel/schema/source identity, CI evidence, package/release-bundle evidence, artifact integrity, user documentation, known limitations, security-reporting path, licensing/notices, and absence of unresolved Critical/Major blockers.

Only that final accepted public-state review authorizes calling the launch complete.

## Current next order

1. merge this final private readiness status update after required CI passes;
2. verify its post-merge `main` CI;
3. wait for explicit authorization to change `Kryt3r/livariant` from private to public;
4. perform the immediate public-host/security verification and activation sequence;
5. perform unauthenticated public-view verification;
6. perform and accept the final Public Preview release review.

The Project Lexicon / Provisional Naming capability remains valuable post-gate work and is not required for this Public Preview launch.