---
type: public-preview-documentation-review
status: accepted
phase: public-preview-preparation
scope: user-journey
language: en
owner: framework
---

# Public Preview Documentation & User-Journey Review

This review evaluates whether a new user can understand and safely exercise the current executable Livariant baseline without relying on private development history.

## Documentation set

The public-facing documentation includes:

- `README.md` — product problem, current scope, architecture, safety, and entry points;
- `docs/quickstart.md` — discovery/init/status/doctor/resume/update/recovery path;
- `docs/existing-projects.md` — preservation-first adoption;
- `docs/architecture-and-safety.md` — ownership, authority, failure, update, migration, and provider boundaries;
- `docs/provider-handoff.md` — Claude Code/Codex Resume handoff contract;
- `docs/lifecycle-guide.md` — exact update, migration, interruption, recovery, and manual-replacement guidance;
- `docs/preview-scope.md` — supported Preview claims and explicit limitations.

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
→ explicitly apply a release with separate trusted-source evidence
→ route schema-changing releases through migration
→ inspect interrupted migration recovery
→ explicitly apply validated recovery
```

Focused CLI tests exercise update and recovery through separate CLI processes. The clean-consumer package smoke exercises the installed `livariant` binary and verifies lifecycle inspection commands are present in the distributable package.

## Documentation gate assessment

### Why / problem statement — GREEN

The README explains the continuity problem and Livariant's role without requiring Foundation history.

### Five-minute Quickstart — GREEN for the executable Preview candidate

The Quickstart uses the actual installed `livariant` namespace and documents inspection-first initialization, Resume, update planning/application, and recovery. It does not invent a public registry installation command before a distribution source has been selected.

### Existing-project guide — GREEN

The guide matches executable preservation-first adoption behavior, including malformed evidence, secrets, native agent files, re-init protection, and filesystem boundaries.

### Architecture / ownership / safety — GREEN

The public guide presents the relevant ownership and authority model at user level while deeper Foundation contracts remain available for maintainers.

### Provider handoff — GREEN for the supported Preview surface

The guide accurately limits support to Project Brain Resume handoff for Claude Code and Codex. Public provider environment evidence uses `LIVARIANT_PROVIDER_ENV`, and adapter capability never becomes mutation authority.

### Update / migration / recovery — GREEN

The installed CLI now exposes one coherent safe lifecycle surface:

```text
livariant update --manifest <path>
livariant update --manifest <path> --apply --artifact <path> --trusted-source <source-id>
livariant recover
livariant recover --apply
```

Planning and diagnosis remain read-only by default. Schema-changing compatible releases are routed by `update` through the supported migration contract rather than requiring a manual migration shortcut.

The apply path retains explicit authorization, exact release/artifact identity, SHA-256 verification, separately supplied trusted-source evidence, installed Runtime attestation/integrity, migration checkpoints, durable interruption evidence, and validated recovery.

### Manual-replacement warning — GREEN

The warning appears where users perform lifecycle actions, rather than only in legal documentation.

### Version awareness — GREEN for the current supported baseline

The lifecycle guide states the currently proven schema migration scope and shows version/source/artifact information during planning. Release-specific compatibility remains carried by release descriptors rather than static prose.

## Product identity

Public documentation and executable package identity are aligned:

```text
Product: Livariant
Package/runtime: livariant
CLI: livariant
Provider environment evidence: LIVARIANT_PROVIDER_ENV
```

Historical/internal framework identifiers may remain in accepted design history or internal implementation plumbing when they are not a public user dependency.

## Remaining distribution boundary

The documentation gate is distinct from selecting and publishing the actual public release source.

Livariant is proven packable and installable into a clean consumer environment, but Public Preview still requires a finalized public distribution location/trust context. Until that is selected, documentation must not invent a registry or download endpoint.

## Current documentation readiness

**DOCUMENTATION / USER-JOURNEY GATE: GREEN for the executable Preview candidate.**

The remaining work is public-release readiness rather than a missing user lifecycle surface: distribution publication, legal/public baseline, support/stability communication, and Release Candidate review.

## Core rule

> Public documentation must describe the product that actually exists. Livariant's documented lifecycle path now corresponds to the installed executable surface, while publication details remain explicitly separate until a real release source is selected.
