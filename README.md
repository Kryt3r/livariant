<img width="1376" height="682" alt="Livariant — Living software framework for coherent AI-assisted development" src="https://github.com/user-attachments/assets/16f5afee-a10a-4c79-8bc9-89d23135e0e9" />

# Livariant

**A living software framework for coherent AI-assisted development across coding agents, tools, and sessions.**

AI coding agents are good at solving the task in front of them. Long-lived software projects need something more durable: project truth that survives sessions, explicit decisions, architecture continuity, safety boundaries, recoverable lifecycle operations, and a way to move between coding agents without making hidden provider memory the project itself.

Livariant provides that continuity through a project-owned **Project Brain** and a local Runtime that keeps canonical project knowledge separate from provider-specific context, lifecycle state, updates, migrations, and recovery.

> **Capability is not authority.** Livariant treats technical write access and permission to change a project as different things.

## Why Livariant?

Without durable project context, AI-assisted development tends to drift:

- decisions disappear between sessions;
- superseded assumptions return as if they were current;
- one coding agent knows things another does not;
- provider-native memory becomes an accidental source of truth;
- existing projects are normalized instead of understood;
- updates and repairs become manual file replacement;
- technical capability is mistaken for authorization.

Livariant is designed around the opposite model:

```text
project-owned canonical knowledge
+ explicit authority
+ provider-independent resume semantics
+ preservation-first mutation
+ integrity-bound lifecycle operations
+ fail-closed diagnosis and recovery
```

## Core idea: the Project Brain

Livariant gives a project a small, explicit source of truth under `.project-brain/`:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

The Project Brain belongs to the project. Resume output, provider projections, temporary plans, native agent instruction files, and hidden model/provider memory are not competing canonical sources of truth.

Livariant can therefore reconstruct useful project context for a supported coding environment without depending on a previous provider session still remembering it.

## Five-minute path

Start with the [Five-Minute Quickstart](docs/quickstart.md).

The Preview CLI exposes:

```bash
livariant version
livariant status
livariant doctor
livariant init
livariant init --apply
livariant resume
livariant update --manifest <release-manifest.json>
livariant recover
```

Mutation remains explicit. Inspection and planning come first; supported project-affecting operations require their documented authorization step such as `--apply`.

For an existing project, the normal starting point is:

```bash
livariant status
livariant doctor
livariant init
```

Review what Livariant discovered, then initialize deliberately:

```bash
livariant init --apply
```

Livariant is **discovery-first and preservation-first**. Existing projects do not have to be rewritten into a Livariant template before adoption.

Read the [Existing Project Guide](docs/existing-projects.md).

## Claude Code and Codex

The current Preview supports **Project Brain Resume handoff** for Claude Code and Codex through separate adapters.

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

This support is deliberately narrow. Livariant reconstructs provider-specific resume context from canonical Project Brain state; it does not claim to manage every Claude Code or Codex feature, authentication method, model option, tool invocation, or native instruction mechanism.

Read [Provider Handoff](docs/provider-handoff.md).

## Safety model

Livariant separates **capability** from **authority**.

The Runtime requires explicit authorization for project-affecting mutation. Existing project-owned files are protected by default, and ambiguous state narrows behavior toward diagnosis rather than heuristic repair.

The current hardened baseline includes executable coverage for areas such as path/symlink escape, stale decision truth, interrupted migrations, checkpoint tampering, release-artifact tampering, installed-runtime drift, provider instruction conflicts, unsupported migrations, concurrent project-owned mutation during activation, and missing update trust evidence.

Read [Architecture & Safety](docs/architecture-and-safety.md).

## Updates, migrations, and recovery

Updates are inspected before they are applied:

```bash
livariant update --manifest ./release-manifest.json
```

Applying an update requires the matching artifact and an explicitly selected trusted source identity:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

Schema-changing releases are routed through the supported migration lifecycle by the same update path. Recovery is a separate operation:

```bash
livariant recover
livariant recover --apply
```

Livariant does not treat a failed or interrupted migration as permission to blindly replay unsafe work.

Read [Updates, Migrations & Recovery](docs/lifecycle-guide.md).

## Distribution and integrity

The initial Preview distribution path is **GitHub Releases**.

A Livariant release bundle contains:

- the packed `livariant` Runtime artifact;
- `release-manifest.json`, binding release identity, compatibility, source, artifact identity, and SHA-256;
- `SHA256SUMS`;
- release notes describing compatibility, required actions, and known limitations.

The Runtime verifies artifact and lifecycle evidence on supported update paths rather than treating a version string alone as sufficient trust.

See [Public Distribution Source](distribution/public-distribution-source.md).

## Local-first privacy

The current Preview Runtime is designed to remain useful as a local-first tool:

- no Livariant analytics or usage telemetry;
- no automatic Project Brain upload;
- no Livariant cloud account required for local project operation;
- no automatic remote update check;
- provider-specific Resume handoff is rendered locally by Livariant.

What an external AI provider does with context you intentionally pass to it remains governed by that provider, not by Livariant.

Read [Privacy & Network Behavior](docs/privacy-and-network.md).

## Preview status

Livariant is in **Public Preview**. The Preview is evidence-backed, but it is not a promise that every CLI detail or internal contract is frozen before 1.0.

The supported baseline is currently verified in CI on **Ubuntu and Windows with Node.js 24**. The package declares Node.js `>=20`, but the Preview test claim is intentionally limited to the environments actually exercised by the release pipeline.

The first Preview provider claim is limited to Project Brain Resume handoff for Claude Code and Codex. Supported migration paths are explicit rather than assumed to be universal.

Known Preview limitations may ship when they are bounded and documented. Known data-loss, authority-escalation, migration-integrity, or release-trust bypasses on a supported path do not qualify as acceptable Preview limitations.

Read [Public Preview Support & Stability](docs/preview-support-and-stability.md) and [Public Preview Scope & Limitations](docs/preview-scope.md).

## Licensing

Livariant is **source-available, not OSI-approved Open Source**.

Livariant is licensed under the [PolyForm Perimeter License 1.0.1](LICENSE). The license is intended to permit broad use of Livariant — including using it in commercial software-development work — while restricting use of Livariant to provide others with a competing substitute for Livariant itself.

Separate commercial terms may be offered for use cases that need separately negotiated rights.

External code contributions are currently gated until contributor-rights terms compatible with the source-available and future commercial-licensing model are finalized.

Read [LICENSING.md](LICENSING.md). The `LICENSE` file is authoritative.

## Security, support, and contributions

Security-sensitive issues should follow [SECURITY.md](SECURITY.md) rather than being disclosed first through a public issue.

Public Preview support is maintainer/community support without a paid SLA unless separately agreed.

- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [License, Warranty & Liability](docs/license-and-warranty.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)
- [Public Preview Support & Stability](docs/preview-support-and-stability.md)

## Architecture

Livariant is organized around five logical layers:

1. **Core** — universal governance and safety rules.
2. **Patterns** — reusable architecture and product patterns.
3. **Profiles** — domain-specific rules and constraints.
4. **Adapters** — environment-specific capability discovery and translation.
5. **Project Brain** — canonical state for a concrete project.

The Runtime coordinates these layers without allowing provider capability to redefine project authority.

For deeper framework contracts, see [Core Charter](core/charter.md) and [Framework Architecture](core/framework-architecture.md).

## Documentation

- [Five-Minute Quickstart](docs/quickstart.md)
- [Existing Project Guide](docs/existing-projects.md)
- [Architecture & Safety](docs/architecture-and-safety.md)
- [Provider Handoff](docs/provider-handoff.md)
- [Updates, Migrations & Recovery](docs/lifecycle-guide.md)
- [Privacy & Network Behavior](docs/privacy-and-network.md)
- [Public Preview Support & Stability](docs/preview-support-and-stability.md)
- [Public Preview Scope & Limitations](docs/preview-scope.md)

---

**Livariant** is built around a simple premise: AI-assisted development becomes more reliable when the project owns its memory, decisions stay explicit, and powerful tools still have to respect authority.