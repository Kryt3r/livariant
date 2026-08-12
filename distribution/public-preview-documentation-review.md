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

This review evaluates whether a new user can understand and safely exercise the current Livariant RC2 candidate without relying on private development history.

## Current reviewed state

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Current infrastructure `main`: `00a19b940b290eca9602a83c890ff1408a327ac0`.
- Post-merge Hardening CI #80: success on that current `main`.
- Bound RC2 product/documentation source candidate: `69d555c3f5850536e04cd0bf869bd058ba6406c2`.
- Package/release identity: `0.1.0-rc.2`.
- Final focused acceptance recheck of the remaining Runtime release-authority and Recovery findings: **GO**.
- Verified concrete RC2 tarball: `livariant-0.1.0-rc.2.tgz`.
- Verified tarball SHA-256: `a50a925ac62399f0e0a648e31551efc9565888120fad22030348ac7178ea1b0b`.
- Build RC Bundle run #2: success, including exact-source checkout, full verification, independent digest/manifest/checksum verification, and digest-keyed cache persistence.

Later `main` changes after `69d555c3...` are release-infrastructure-only and do not redefine the selected RC2 package source.

This review does not authorize a tag, GitHub Release, npm publication, or repository visibility change.

## Documentation set

The public/current-facing documentation includes:

- `README.md` and `README.de.md`;
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

## Supported executable journey after Livariant is available

The current packaged surface supports:

```text
obtain/install a supported Livariant package artifact
→ inspect version/status
→ inspect initialization without mutation
→ explicitly initialize/adopt the project
→ diagnose state
→ resume provider-neutral context
→ perform bounded Claude Code/Codex Resume handoff
→ inspect update plan without mutation
→ supply matching local artifact + trusted-source evidence
→ require pre-existing independent machine-local authority for the exact artifact digest
→ only then allow supported executable update / candidate Runtime attestation
→ route schema-changing releases through migration
→ inspect interrupted migration recovery
→ explicitly apply validated recovery
```

Project-controlled input cannot create the machine-local Release Authority later relied upon for its own Runtime execution. The project-facing `authorize-runtime` command is absent.

## Documentation gate assessment

### Why / problem statement — GREEN

The README explains the continuity problem and Livariant's role without requiring Foundation history.

### Quickstart after CLI availability — GREEN

The English and German Quickstarts accurately document the currently installed `livariant` CLI surface: inspection-first initialization, Resume, update planning/application, independent Release Authority, and Recovery.

They do not invent a public registry installation command.

### First-install / “how do I get Livariant into my existing project?” journey — OPEN

A real onboarding gap remains before Public Preview publication.

The current Quickstart begins after the `livariant` CLI is already available. It does not yet give a new user a complete, concrete path from an existing local Claude Code, Codex, or other development project to a usable Livariant setup.

Current RC2 must not be described as a Claude Code or Codex plugin. The implemented architecture is provider-neutral Livariant Core/CLI + Project Brain with a bounded Resume handoff.

Before Public Preview publication, user-facing installation guidance must truthfully explain the supported RC2 distribution path, platform prerequisites, how the CLI becomes available, where commands are run relative to an existing project, and the distinction between installing Livariant and using a coding-agent host.

This is a documentation/onboarding gap, not a Runtime Security finding. It does not authorize new Runtime hardening or a Post-Preview Desktop/MCP implementation.

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

### Version and concrete candidate identity — GREEN

The selected RC2 source and concrete package bytes are now recorded:

```text
Version: 0.1.0-rc.2
Source: 69d555c3f5850536e04cd0bf869bd058ba6406c2
Artifact: livariant-0.1.0-rc.2.tgz
SHA-256: a50a925ac62399f0e0a648e31551efc9565888120fad22030348ac7178ea1b0b
```

Historical `v0.1.0-rc.1` remains historical pre-fix evidence and must not be presented as the current candidate.

## Product identity

Current documentation and executable package identity remain aligned:

```text
Product: Livariant
Package/runtime: livariant
CLI: livariant
Version identity: 0.1.0-rc.2
Provider environment evidence: LIVARIANT_PROVIDER_ENV
```

## Current documentation readiness

**DOCUMENTATION / USER-JOURNEY GATE: PARTIALLY OPEN.**

The current executable behavior and safety/lifecycle documentation are aligned and the concrete RC2 package is verified. The remaining blocker for a complete first-user journey is the missing first-install/onboarding path described above.

No new Runtime/Security Hardening is implied by this documentation gap. A further hardening change requires a concrete finding.

## Core rule

> Public documentation must describe the product that actually exists. It must explain how a new user reaches the supported executable surface without inventing provider-plugin behavior or a distribution mechanism that does not exist.
