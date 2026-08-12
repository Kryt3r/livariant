---
type: public-preview-documentation-review
status: accepted
phase: rc-preparation
scope: user-journey
language: en
owner: framework
updated: 2026-08-12
---

# Public Preview Documentation & User-Journey Review

This review evaluates whether a new user can understand and safely exercise the Livariant Foundation Preview RC2 candidate without relying on private development history.

## Current reviewed state

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Package/release identity: `0.1.0-rc.2`.
- Foundation Preview release source: `31cf83656676358cf7003f95b5ad32f998b28d1f`.
- Post-merge Hardening CI #154: success on that exact source.
- Final focused acceptance recheck of Runtime release-authority and Recovery findings: **GO**.
- End-to-end Product Utility blocker H-04: **CLOSED** by PR #29 and post-merge CI #133.
- Public human-documentation and repository acceptance: **CLOSED** by PR #28, CI #149, manual Discussions/Issues host verification, and post-merge CI #150.
- Foundation Preview positioning: **CLOSED** by PR #31 and post-merge CI #154.
- Final verified RC2 tarball: `livariant-0.1.0-rc.2.tgz`.
- Final verified tarball SHA-256: `b91d098fac1a26211600f25dbca8658d810b168fcdeedb7f40e2e576e1347d13`.
- Build RC Bundle run #5: success, including exact-source checkout, public-doc Truth-Surface verification, 93 executable tests, package/global-install smoke, release-bundle smoke, independent digest/manifest/checksum verification, and digest-keyed cache persistence.

This identity supersedes earlier RC2 source/digest bindings because the packaged README now presents RC2 explicitly as the Foundation Preview and separates current executable capability from planned Active Project Intelligence.

This review does not authorize a tag, GitHub Release, npm publication, or repository visibility change.

## Product story and expectation setting

The public README now establishes two distinct layers.

### What exists today

RC2 provides the safe project-owned foundation:

- persistent canonical Project Brain state;
- explicit semantic editing for goals, knowledge, and decisions;
- plan-first mutation with explicit `--apply`;
- decision supersession with retained history;
- Claude Code and Codex Resume handoff;
- hardened update, migration, Runtime trust, Release Authority, and Recovery behavior;
- preservation and verification boundaries around managed state.

### Where Livariant is going

The README identifies **Active Project Intelligence** as the next product layer and clearly marks it as future work. The intended direction includes agent-assisted recognition of durable project truth, semantic change proposals, conflict and drift detection, and a more natural agent workflow built on the current safe core.

No future capability is presented as executable RC2 behavior.

## Supported end-to-end first-user and repeated-use journey

```text
obtain the canonical GitHub Release tarball
-> verify its SHA-256
-> install the verified .tgz as machine/user tooling with npm
-> verify livariant version
-> enter the existing project root
-> inspect status / doctor / init without mutation
-> explicitly initialize/adopt the project
-> record durable goals, knowledge, and decisions with plan-first commands
-> review the proposed semantic change
-> apply only with explicit --apply
-> resume current canonical context in a later session
-> optionally perform bounded Claude Code/Codex Resume handoff
-> supersede a stale decision without deleting history
-> resume again and verify the new active truth
-> inspect update plan without mutation
-> require the matching artifact and independent machine-local authority
-> apply supported update or migration only through the authorized lifecycle
-> diagnose and explicitly recover interrupted migration state
```

Livariant RC2 is not documented as a Claude Code/Codex plugin and is not installed into the target project's `package.json`. The npm registry is not the Public Preview distribution source; npm is used locally as the installer for the verified GitHub Release tarball.

## Documentation gate assessment

### Why / product value - GREEN

The README explains the continuity problem first, shows what the Foundation Preview already solves, and makes the larger Living Software Framework direction visible without blurring current and future capability.

### Beginner clarity - GREEN

A reader new to AI-assisted coding can understand what Project Brain means, why durable project truth matters, how to install Livariant, how repeated use works, and what still requires manual confirmation.

### Current capability vs roadmap - GREEN

The README explicitly separates current RC2 capability from Active Project Intelligence. Planned agent-assisted detection, conflict analysis, and natural workflow features are described as direction, not as shipped functionality.

### First install / acquisition - GREEN

English and German installation guidance covers prerequisites, canonical GitHub Release acquisition, SHA-256 verification, global installation from the verified `.tgz`, `livariant version`, existing-project entry, provider-plugin boundaries, and Windows differences where relevant.

### Quickstart and repeated use - GREEN

English and German Quickstarts connect installation to inspection-first initialization, semantic goal/knowledge/decision editing, Resume, provider handoff, update planning/application, independent Release Authority, and Recovery.

The repeated-use path is executable. Build RC Bundle run #5 executed 93 tests with 91 pass, 0 fail, and 2 expected platform skips on the Ubuntu bundle-build runner.

### Architecture / safety - GREEN

Public guidance reflects machine-local Runtime trust, independent exact-artifact Release Authority, the pre-trust execution boundary, semantic write authorization, preservation-first mutation, concurrency protection, and project-data versus execution-authority separation.

### Provider handoff - GREEN for the supported Preview surface

Provider guidance accurately limits current support to Project Brain Resume handoff for Claude Code and Codex. Adapter capability does not become mutation or Runtime execution authority.

### Community / support routing - GREEN

Public routing distinguishes usage questions, ideas, reproducible bugs, documentation problems, security vulnerabilities, and currently gated code contributions. Discussions categories and required Issue labels were manually verified.

### Human-writing and navigation quality - GREEN

Public EN/DE user docs are checked for language-pair parity and local-link integrity. The agreed public punctuation/style guard is enforced by CI. README EN/DE was shortened and refocused in PR #31.

## Final RC2 release identity

```text
Version: 0.1.0-rc.2
Release source: 31cf83656676358cf7003f95b5ad32f998b28d1f
Artifact: livariant-0.1.0-rc.2.tgz
SHA-256: b91d098fac1a26211600f25dbca8658d810b168fcdeedb7f40e2e576e1347d13
```

Historical `v0.1.0-rc.1` remains historical pre-fix evidence. Earlier RC2 digests are superseded build evidence and must not be presented as the final Foundation Preview release identity.

This review file is a release/readiness Truth Surface and is not part of the npm tarball payload, so updating the bound identity here does not change the verified artifact bytes.

## Current documentation readiness

**DOCUMENTATION / USER-JOURNEY GATE: GREEN.**

A new user has one explicit, test-backed path from canonical release acquisition through installation, existing-project adoption, repeated Project Brain use, provider Resume handoff, update, and Recovery. The README also explains why RC2 is a Foundation Preview and where Livariant is going next.

Remaining work consists only of separately authorized tag, GitHub Release, visibility, and post-public host verification actions.

No new Runtime/Security Hardening is implied. A further hardening change requires a concrete finding.

## Core rule

> Public documentation must describe the product that actually exists, give a new user a complete safe path to the supported executable surface, and clearly distinguish shipped capability from product direction.
