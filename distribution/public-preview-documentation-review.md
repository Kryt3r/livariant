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

This review evaluates whether a new user can understand and safely exercise the final Livariant RC2 candidate without relying on private development history.

## Current reviewed state

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Final bound RC2 source: `124b6022a469667495b0c0093a0c6f574bb85481`.
- Post-merge Hardening CI #150: success on that exact source.
- Package/release identity: `0.1.0-rc.2`.
- Final focused acceptance recheck of the remaining Runtime release-authority and Recovery findings: **GO**.
- End-to-end Product Utility blocker H-04: **CLOSED** by PR #29 and post-merge CI #133.
- Public human-documentation and repository acceptance: **CLOSED** by PR #28, CI #149, manual Discussions/Issues host verification, and post-merge CI #150.
- Final verified RC2 tarball: `livariant-0.1.0-rc.2.tgz`.
- Final verified tarball SHA-256: `984d6976df3bfd7c5f5c5683099045e5412c5705db8b9c7a69081435a01645b1`.
- Build RC Bundle run #4: success, including exact-source checkout, public-doc Truth-Surface verification, 93 executable tests, package/global-install smoke, release-bundle smoke, independent digest/manifest/checksum verification, and digest-keyed cache persistence.

This final identity supersedes earlier RC2 source/digest bindings because the candidate now includes the repeated-use semantic Project Brain editing capability and the completed human documentation/community pass.

This review does not authorize a tag, GitHub Release, npm publication, or repository visibility change.

## Documentation set

The public/current-facing documentation includes:

- `README.md` and `README.de.md`;
- English and German installation / first-project guides;
- English and German Quickstart;
- English and German existing-project adoption guidance;
- English and German Architecture & Safety;
- English and German Provider Handoff;
- English and German lifecycle/update/recovery guidance;
- English and German Preview Scope & Limitations;
- English and German Privacy & Network Behavior;
- English and German Preview Support & Stability;
- English and German License/Warranty/Liability guidance;
- accepted distribution contracts for installation, upgrade, release integrity, and launch readiness;
- support/community routing and GitHub contribution surfaces.

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
-> supply matching local artifact + trusted-source evidence
-> require pre-existing independent machine-local authority for the exact artifact digest
-> only then allow supported executable update / candidate Runtime attestation
-> route schema-changing releases through migration
-> inspect interrupted migration recovery
-> explicitly apply validated recovery
```

Livariant RC2 is not documented as a Claude Code/Codex plugin and is not installed into the target project's `package.json`. The npm registry is not the Public Preview distribution source; npm is used locally as the installer for the verified GitHub Release tarball.

Project-controlled input cannot create the machine-local Release Authority later relied upon for its own Runtime execution. The project-facing `authorize-runtime` command is absent.

## Documentation gate assessment

### Why / problem statement - GREEN

The README explains the continuity problem and Livariant's role before introducing deeper architecture. The beginner path explains how persistent project-owned knowledge helps when sessions end or coding agents change.

### First install / acquisition - GREEN

The English and German installation guidance covers Node.js prerequisites, canonical GitHub Release acquisition, SHA-256 verification, global machine/user tooling installation from the verified `.tgz`, `livariant version`, entry into an existing project root, provider-plugin boundaries, and Windows PowerShell differences where relevant.

The global tarball-install path is executable evidence and passed again in final Build RC Bundle run #4.

### Quickstart and repeated use - GREEN

The English and German Quickstarts connect installation to inspection-first initialization, semantic goal/knowledge/decision editing, Resume, provider handoff, update planning/application, independent Release Authority, and Recovery.

The repeated-use path is executable, not only documented. Final bundle verification ran 93 tests with 91 pass, 0 fail, and 2 expected platform skips on the Ubuntu bundle-build runner.

### Existing-project guide - GREEN

The guide matches preservation-first adoption behavior, including malformed evidence, secrets, native agent files, re-init protection, filesystem boundaries, and safe repeated semantic editing after adoption.

### Architecture / ownership / safety - GREEN

The public guide reflects machine-local Runtime trust, independent exact-artifact Release Authority, the pre-trust execution boundary, semantic write authorization, preservation-first mutation, concurrency protection, and the separation between project data and execution authority.

### Provider handoff - GREEN for the supported Preview surface

Provider guidance accurately limits current support to Project Brain Resume handoff for Claude Code and Codex. Adapter capability does not become mutation or Runtime execution authority. Durable goals, knowledge, and decisions flow into later provider Resume context from the canonical Project Brain rather than provider-hidden memory.

### Update / migration / recovery - GREEN

Planning and diagnosis remain read-only by default. Schema-changing compatible releases route through the supported migration contract. Executable update requires pre-existing independent exact-artifact authority outside project control, and Recovery guidance reflects the accepted cleanup ordering.

### Community / support routing - GREEN

Public routing distinguishes usage questions, ideas, reproducible bugs, documentation problems, security vulnerabilities, and currently gated code contributions. GitHub Discussions categories and required Issue labels were manually verified before the final documentation merge.

### Human-writing and navigation quality - GREEN

Public EN/DE user docs are checked for language-pair parity and local-link integrity. The agreed public punctuation/style guard is enforced by CI. Beginner explanations no longer require prior familiarity with Livariant's internal vocabulary.

### Version and final candidate identity - GREEN

```text
Version: 0.1.0-rc.2
Source: 124b6022a469667495b0c0093a0c6f574bb85481
Artifact: livariant-0.1.0-rc.2.tgz
SHA-256: 984d6976df3bfd7c5f5c5683099045e5412c5705db8b9c7a69081435a01645b1
```

Historical `v0.1.0-rc.1` remains historical pre-fix evidence and must not be presented as the current candidate. Earlier RC2 digests are superseded build evidence, not the final candidate identity.

## Product identity

```text
Product: Livariant
Package/runtime: livariant
CLI: livariant
Version identity: 0.1.0-rc.2
Provider environment evidence: LIVARIANT_PROVIDER_ENV
```

## Current documentation readiness

**DOCUMENTATION / USER-JOURNEY GATE: GREEN.**

A new user has one explicit, test-backed path from canonical release acquisition through installation, existing-project adoption, repeated Project Brain use, provider Resume handoff, update, and Recovery. No provider-plugin or npm-registry capability is invented.

The final RC2 source/digest identity is known and independently verified. Remaining work consists only of separately authorized tag/release/visibility actions and their post-publication verification.

No new Runtime/Security Hardening is implied. A further hardening change requires a concrete finding.

## Core rule

> Public documentation must describe the product that actually exists and give a new user a complete safe path to the supported executable surface without inventing distribution or provider capabilities.
