---
type: public-preview-documentation-review
status: accepted
phase: rc-preparation
scope: user-journey
language: en
owner: framework
updated: 2026-08-11
---

# Public Preview Documentation & User-Journey Review

This review evaluates whether a new user can understand and safely exercise the current executable Livariant baseline without relying on private development history.

## Current reviewed baseline

- Canonical repository: `Kryt3r/livariant`.
- Repository visibility: private.
- Canonical `main`: `62576aad5f3d8fcc0466bd38d32ba4ba58d483c0` after PR #19.
- Package/release identity: `0.1.0-rc.2`.
- Post-merge Hardening CI #70: success.
- Final focused acceptance recheck of the remaining Runtime release-authority and Recovery findings: **GO**.

This review does not authorize a tag, GitHub Release, npm publication, or repository visibility change.

## Documentation set

The public/current-facing documentation includes:

- `README.md` and `README.de.md` — product problem, current scope, architecture, safety, and entry points;
- `docs/quickstart.md` and `docs/de/quickstart.md` — discovery/init/status/doctor/resume/update/recovery path;
- `docs/existing-projects.md` — preservation-first adoption;
- `docs/architecture-and-safety.md` — ownership, authority, failure, update, migration, and provider boundaries;
- `docs/provider-handoff.md` — Claude Code/Codex Resume handoff contract;
- `docs/lifecycle-guide.md` and `docs/de/lifecycle-guide.md` — exact update, migration, interruption, recovery, and manual-replacement guidance;
- `docs/preview-scope.md` — supported Preview claims and explicit limitations;
- `docs/privacy-and-network.md` — local-first and update/network boundaries;
- accepted distribution contracts that define installation, upgrade, release integrity, and current launch readiness.

## Supported end-to-end user journey

The executable packaged surface now supports:

```text
install packed Livariant artifact
→ inspect version/status
→ inspect initialization without mutation
→ explicitly initialize
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

Project-controlled input must not be able to create the machine-local Release Authority later relied upon for its own Runtime execution. The project-facing `authorize-runtime` command has been removed and must not appear in current user guidance.

## Documentation gate assessment

### Why / problem statement — GREEN

The README explains the continuity problem and Livariant's role without requiring Foundation history.

### Quickstart — GREEN for the current executable candidate

The English and German Quickstarts use the actual installed `livariant` namespace and document inspection-first initialization, Resume, update planning/application, independent Release Authority, and recovery. They do not invent a public registry installation command.

### Existing-project guide — GREEN

The guide matches executable preservation-first adoption behavior, including malformed evidence, secrets, native agent files, re-init protection, and filesystem boundaries.

### Architecture / ownership / safety — GREEN

The public guide presents the relevant ownership and authority model at user level, including machine-local Runtime trust, independent exact-artifact Release Authority, the pre-trust execution boundary, and the separation between project data and execution authority.

### Provider handoff — GREEN for the supported Preview surface

The guide accurately limits support to Project Brain Resume handoff for Claude Code and Codex. Public provider environment evidence uses `LIVARIANT_PROVIDER_ENV`, and adapter capability never becomes mutation or Runtime execution authority.

### Update / migration / recovery — GREEN

The installed CLI exposes one coherent safe lifecycle surface:

```text
livariant update --manifest <path>
livariant update --manifest <path> --apply --artifact <path> --trusted-source <source-id>
livariant recover
livariant recover --apply
```

Planning and diagnosis remain read-only by default. Schema-changing compatible releases are routed by `update` through the supported migration contract rather than requiring a manual migration shortcut.

For executable update, the exact artifact SHA-256 must already be authorized through an independent machine-local release process outside project authority. Manifest contents, `--trusted-source`, project files, and project-facing Livariant CLI/API cannot create that authority. Missing authority fails closed before npm installation or candidate Runtime attestation.

Recovery documentation also reflects the accepted cleanup order: restore/commit the verified Project Brain first, remove displaced Recovery state before the final valid checkpoint, and delete that checkpoint only as the final irreversible cleanup step.

### Manual-replacement warning — GREEN

Warnings cover Project Brain/lifecycle files as well as Runtime trust and Release-Authorization state; manual replacement is not presented as a supported lifecycle shortcut.

### Version awareness — GREEN for the current supported baseline

The repository package identity is `0.1.0-rc.2`. Historical `v0.1.0-rc.1` evidence remains historical and must not be presented as the current fixed candidate. Release-specific compatibility remains carried by release descriptors rather than static prose.

## Product identity

Current documentation and executable package identity are aligned:

```text
Product: Livariant
Package/runtime: livariant
CLI: livariant
Version identity: 0.1.0-rc.2
Provider environment evidence: LIVARIANT_PROVIDER_ENV
```

Historical/internal framework identifiers may remain in accepted design history when their historical role is explicit.

## Remaining distribution boundary

Documentation readiness is distinct from publishing an actual release.

Livariant is proven packable and testable as a clean consumer, but the current repository remains private and no new `0.1.0-rc.2` tag, GitHub Release, or npm publication is authorized by this documentation review. Those are separate release-gate actions.

## Current documentation readiness

**DOCUMENTATION / USER-JOURNEY GATE: GREEN for the current accepted `0.1.0-rc.2` baseline, subject to the documentation-alignment PR itself passing required CI.**

No new Runtime/Security Hardening is implied by this documentation work. A further hardening change requires a concrete finding.

## Core rule

> Public documentation must describe the product that actually exists. Current Truth Surfaces must preserve the independent Release-Authority and Recovery invariants of the accepted executable baseline without turning historical evidence into current release state.
