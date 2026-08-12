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
- Final bound RC2 source: `b27fb5e8c786728ee7714bd535d9fe0fa2603984`.
- Post-merge Hardening CI #86: success on that exact source.
- Package/release identity: `0.1.0-rc.2`.
- Final focused acceptance recheck of the remaining Runtime release-authority and Recovery findings: **GO**.
- Final verified RC2 tarball: `livariant-0.1.0-rc.2.tgz`.
- Final verified tarball SHA-256: `d040677806549e9d2a46bbb458984696b4a9d199d9d599bdf77e63e8bd6c662f`.
- Build RC Bundle run #3: success, including exact-source checkout, full verification, independent digest/manifest/checksum verification, package smoke, global tarball-install verification, and digest-keyed cache persistence.

The final digest differs from the earlier pre-onboarding candidate because the required README/onboarding documentation is included by npm in the packed tarball. Direct source comparison found no `src/` or `package.json` changes between the earlier source and the final bound source.

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
- accepted distribution contracts for installation, upgrade, release integrity, and launch readiness.

## Supported end-to-end first-user journey

```text
obtain the canonical GitHub Release tarball
→ verify its SHA-256
→ install the verified .tgz as machine/user tooling with npm
→ verify `livariant version`
→ enter the existing project root
→ inspect status / doctor / init without mutation
→ explicitly initialize/adopt the project
→ diagnose state
→ resume provider-neutral context
→ optionally perform bounded Claude Code/Codex Resume handoff
→ inspect update plan without mutation
→ supply matching local artifact + trusted-source evidence
→ require pre-existing independent machine-local authority for the exact artifact digest
→ only then allow supported executable update / candidate Runtime attestation
→ route schema-changing releases through migration
→ inspect interrupted migration recovery
→ explicitly apply validated recovery
```

Livariant RC2 is not documented as a Claude Code/Codex plugin and is not installed into the target project's `package.json`. The npm registry is not the Public Preview distribution source; npm is used locally as the installer for the verified GitHub Release tarball.

Project-controlled input cannot create the machine-local Release Authority later relied upon for its own Runtime execution. The project-facing `authorize-runtime` command is absent.

## Documentation gate assessment

### Why / problem statement — GREEN

The README explains the continuity problem and Livariant's role without requiring Foundation history.

### First install / acquisition — GREEN

The English and German installation guidance covers Node.js prerequisites, canonical GitHub Release acquisition, SHA-256 verification, global machine/user tooling installation from the verified `.tgz`, `livariant version`, entry into an existing project root, provider-plugin boundaries, and Windows PowerShell differences where relevant.

The global tarball-install path is executable evidence: Hardening CI #83 verified it on Ubuntu and Windows before merge, post-merge CI #84 passed, and final Build RC Bundle run #3 passed package/global-install smoke from the final source.

### Quickstart — GREEN

The English and German Quickstarts connect installation to inspection-first initialization, Resume, update planning/application, independent Release Authority, and Recovery.

### Existing-project guide — GREEN

The guide matches preservation-first adoption behavior, including malformed evidence, secrets, native agent files, re-init protection, and filesystem boundaries.

### Architecture / ownership / safety — GREEN

The public guide reflects machine-local Runtime trust, independent exact-artifact Release Authority, the pre-trust execution boundary, and the separation between project data and execution authority.

### Provider handoff — GREEN for the supported Preview surface

Provider guidance accurately limits current support to Project Brain Resume handoff for Claude Code and Codex. Adapter capability does not become mutation or Runtime execution authority.

### Update / migration / recovery — GREEN

Planning and diagnosis remain read-only by default. Schema-changing compatible releases route through the supported migration contract. Executable update requires pre-existing independent exact-artifact authority outside project control, and Recovery guidance reflects the accepted cleanup ordering.

### Manual-replacement warning — GREEN

Warnings cover Project Brain/lifecycle files and Runtime trust/Release-Authorization state. Manual replacement is not presented as a supported lifecycle shortcut.

### Version and final candidate identity — GREEN

```text
Version: 0.1.0-rc.2
Source: b27fb5e8c786728ee7714bd535d9fe0fa2603984
Artifact: livariant-0.1.0-rc.2.tgz
SHA-256: d040677806549e9d2a46bbb458984696b4a9d199d9d599bdf77e63e8bd6c662f
```

Historical `v0.1.0-rc.1` remains historical pre-fix evidence and must not be presented as the current candidate.

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

A new user has one explicit, test-backed path from canonical release acquisition through installation, existing-project adoption, provider Resume handoff, update, and Recovery. No provider-plugin or npm-registry capability is invented.

The final RC2 source/digest identity is now known and verified. Remaining work consists only of separately authorized tag/release/visibility actions and their post-publication verification.

No new Runtime/Security Hardening is implied. A further hardening change requires a concrete finding.

## Core rule

> Public documentation must describe the product that actually exists and give a new user a complete safe path to the supported executable surface without inventing distribution or provider capabilities.
