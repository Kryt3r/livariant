<img width="1376" height="682" alt="image" src="https://github.com/user-attachments/assets/16f5afee-a10a-4c79-8bc9-89d23135e0e9" />

# Livariant — Public Preview Preparation

**Livariant** is a tool-agnostic Living Software Framework for long-term AI-assisted software development.

AI coding sessions are good at solving the task in front of them. Long-lived software projects need something else as well: persistent project truth, explicit decisions, architecture continuity, safety boundaries, recovery semantics, and a way to move between coding agents without making hidden provider memory the project itself.

Livariant provides that continuity through a project-owned **Project Brain** plus a Runtime that keeps authority, lifecycle state, provider translation, updates, migrations, and recovery separate from canonical project knowledge.

## What problem does it solve?

Without durable project context, AI-assisted development tends to accumulate drift:

- decisions disappear between sessions,
- old assumptions return as if they were current,
- one coding agent knows things another does not,
- provider-native memory becomes an accidental source of truth,
- updates or repairs become manual file replacement,
- existing projects get normalized instead of understood,
- technical write access is mistaken for permission to change the project.

Livariant is designed around the opposite model:

```text
Project-owned canonical knowledge
+ explicit authority
+ provider-independent Resume semantics
+ preservation-first mutation
+ integrity-bound lifecycle operations
+ fail-closed diagnosis and recovery
```

## Five-minute path

Start with the [Five-Minute Quickstart](docs/quickstart.md).

The executable CLI namespace is now:

```bash
livariant version
livariant status
livariant doctor
livariant init
livariant init --apply
livariant resume
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
livariant update --manifest <release-manifest.json>
livariant recover
```

Mutation remains explicit. `init`, `update`, and `recover` inspect or plan without mutation unless their documented `--apply` form is used.

## Existing projects are first-class

Livariant is discovery-first and preservation-first. It does not require an existing repository to be rewritten into a preferred template before adoption.

Read: [Existing Project Guide](docs/existing-projects.md)

## Project Brain

Initialization creates the minimal canonical Project Brain:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Project Brain knowledge is project-owned. Framework lifecycle metadata is narrowly scoped and does not turn the whole Brain into framework-owned state.

Resume output, provider projections, native agent instruction files, temporary plans, and hidden model/provider memory are not competing canonical sources of truth.

## Claude Code and Codex

The current hardened Preview surface supports **Project Brain Resume handoff** between Claude Code and Codex through separate Preview adapters.

This support is intentionally narrow: it proves provider-specific environment detection, capability/compatibility evidence, canonical Resume reconstruction, hidden-memory independence, and non-mutation of human-owned instruction files. It does not claim full control of every Claude Code or Codex capability.

Read: [Provider Handoff](docs/provider-handoff.md)

## Safety model

The central safety rule is simple:

> **Capability is not authority.**

The Runtime requires explicit authorization for project-affecting mutation. Existing files are protected by default; ambiguity narrows behavior instead of triggering heuristic repair.

The executable baseline includes adversarial evidence for symlink/path escape, stale decision truth, interrupted migrations, checkpoint tampering, release artifact tampering, installed-runtime drift, provider instruction conflicts, unsupported migrations, concurrent project-owned mutation during update activation, and missing update trust evidence.

Read: [Architecture & Safety](docs/architecture-and-safety.md)

## Updates, migrations, and recovery

The installed CLI exposes the hardened lifecycle engine.

Plan an update from a supplied release manifest:

```bash
livariant update --manifest ./release-manifest.json
```

Apply only after reviewing the plan and possessing the matching artifact from a source you explicitly trust:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

Schema-changing releases are detected by the same `update` command and routed through the supported migration lifecycle. There is no separate normal-path `migrate` shortcut.

Recovery is separately inspected and authorized:

```bash
livariant recover
livariant recover --apply
```

**Do not manually replace Project Brain or framework-managed lifecycle state as a substitute for these commands.**

Read: [Updates, Migrations & Recovery](docs/lifecycle-guide.md)

## Public Preview distribution

The accepted first Preview distribution path is **GitHub Releases from the canonical public Livariant repository**.

Release bundles are built from concrete package bytes and contain:

- the packed `livariant` Runtime tarball,
- `release-manifest.json` binding version/channel/schema/source/artifact/SHA-256,
- `SHA256SUMS`,
- human-readable release notes at publication time.

The canonical Livariant repository now exists at `Kryt3r/livariant` and remains private during Preview preparation. The source identity `github:Kryt3r/livariant` becomes an active public release source only after the repository is made public and the corresponding release materials are actually published.

Read: [Public Distribution Source](distribution/public-distribution-source.md)

## Product identity

The accepted product identity is:

```text
Product: Livariant
Package/runtime identity: livariant
Public CLI namespace: livariant
```

The preliminary naming review and its legal boundary are recorded in [`distribution/product-naming-decision.md`](distribution/product-naming-decision.md). The review is not a formal trademark clearance, and the framework architecture must remain rename-safe if a future rights conflict ever requires a branding change.

## Licensing

Livariant is **source-available, not OSI-approved Open Source**.

The default license is the [PolyForm Perimeter License 1.0.1](LICENSE). It is intended to allow broad use, modification, and distribution for permitted purposes — including using Livariant in commercial software-development work — while protecting Livariant against being used to provide others with a competing substitute for Livariant itself.

Separate commercial terms may be offered for uses outside the default license or for organizations that need separately negotiated rights.

External code contributions are temporarily gated until contributor terms compatible with the source-available and future commercial-licensing model are finalized.

Read the practical licensing explanation in [`LICENSING.md`](LICENSING.md). The `LICENSE` file remains authoritative.

## Privacy, security, contributions, and support

- [Licensing](LICENSING.md)
- [License, Warranty & Liability](docs/license-and-warranty.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)
- [Privacy & Network Behavior](docs/privacy-and-network.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Public Preview Support & Stability](docs/preview-support-and-stability.md)

The current Runtime has no Livariant telemetry, no automatic Project Brain upload, and no automatic remote update check. Public Preview support is maintainer/community support without a paid SLA unless separately agreed.

## Public Preview readiness

The Deep Hardening & Consistency Review has executable evidence for all eight FOUNDATION-10 required scenarios:

1. fresh project,
2. existing small project,
3. existing messy project,
4. Claude Code ↔ Codex Resume transition,
5. normal framework-only update,
6. migration update,
7. interrupted update,
8. failed-migration recovery.

The hardened package is built, packed, installed into a clean consumer project, and executed in CI. CI also builds a manifest-bound release bundle and verifies that its checksum and release manifest bind the exact artifact installed by a clean consumer.

The repository-side legal/public baseline is documented. Remaining launch gates are operational and presentation-focused: finalize public-facing repository presentation and documentation, establish contributor terms, enable/verify host-side security and release protections, publish the intended public candidate, and perform the final Public Preview review against that candidate.

Read: [Public Preview Scope & Limitations](docs/preview-scope.md) and [Public Release Baseline Review](distribution/public-release-baseline-review.md).

## Architecture

The accepted logical layers are:

1. **Core** — universal governance and safety rules.
2. **Patterns** — reusable architecture/product patterns.
3. **Profiles** — domain-specific rules and constraints.
4. **Adapters** — environment-specific capability discovery and translation.
5. **Project Brain** — canonical state for a concrete project.

The executable Runtime coordinates these layers without allowing provider capability to redefine project authority.

For deeper framework contracts, see [`core/charter.md`](core/charter.md) and [`core/framework-architecture.md`](core/framework-architecture.md).

## Documentation

- [Five-Minute Quickstart](docs/quickstart.md)
- [Existing Project Guide](docs/existing-projects.md)
- [Architecture & Safety](docs/architecture-and-safety.md)
- [Provider Handoff](docs/provider-handoff.md)
- [Updates, Migrations & Recovery](docs/lifecycle-guide.md)
- [Privacy & Network Behavior](docs/privacy-and-network.md)
- [Public Preview Support & Stability](docs/preview-support-and-stability.md)
- [Public Preview Scope & Limitations](docs/preview-scope.md)

## Development status

Livariant is in **Public Preview preparation**, not Foundation design. The product, package/runtime identity, installed CLI namespace, user journey, and private RC baseline are aligned. Remaining work is public-launch preparation and final Public Preview verification, not new Foundation architecture.
