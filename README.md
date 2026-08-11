<img width="1376" height="682" alt="Livariant — Living software framework for coherent AI-assisted development" src="https://github.com/user-attachments/assets/16f5afee-a10a-4c79-8bc9-89d23135e0e9" />

<p align="center">
  <strong>English</strong> · <a href="README.de.md">Deutsch</a>
</p>

# Livariant

**A living software framework for coherent AI-assisted development across coding agents, tools, and sessions.**

Livariant gives long-lived software projects a persistent, project-owned source of truth — the **Project Brain** — so decisions, architecture, goals, and known project facts can survive individual AI sessions and provider changes without turning hidden model memory into project state.

> [!IMPORTANT]
> **Capability is not authority.** A tool being technically able to modify a project does not mean it is authorized to do so. Livariant keeps inspection, planning, authorization, mutation, verification, and recovery deliberately separate.

## Table of contents

- [Why Livariant?](#why-livariant)
- [How it works](#how-it-works)
- [Five-minute start](#five-minute-start)
- [Existing projects](#existing-projects)
- [Claude Code and Codex](#claude-code-and-codex)
- [Safe updates and recovery](#safe-updates-and-recovery)
- [Safety model](#safety-model)
- [Local-first privacy](#local-first-privacy)
- [Preview status](#preview-status)
- [Documentation](#documentation)
- [Licensing, security, and contributions](#licensing-security-and-contributions)

## Why Livariant?

AI coding agents are good at solving the task in front of them. Long-lived software projects need something more durable.

Without persistent project context, AI-assisted development tends to drift: decisions disappear, superseded assumptions return, different agents inherit different context, provider-native memory becomes an accidental source of truth, and updates or repairs devolve into manual file replacement.

Livariant is designed around the opposite model:

```text
project-owned canonical knowledge
+ explicit authority
+ provider-independent resume semantics
+ preservation-first mutation
+ integrity-bound lifecycle operations
+ fail-closed diagnosis and recovery
```

## How it works

The Project Brain is a small, explicit source of truth inside the project:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

It belongs to the project — not to Claude Code, Codex, a model session, or Livariant's hidden runtime state.

Provider projections, temporary plans, native agent instruction files, and hidden provider memory are **not** competing canonical sources of truth. Livariant reconstructs useful context from the Project Brain when needed.

### The lifecycle principle

```text
Inspect → Plan → Authorize → Mutate → Verify
                         ↘ Recover explicitly if interrupted
```

Read [Architecture & Safety](docs/architecture-and-safety.md) for the deeper model.

## Five-minute start

Requirements for the current Preview baseline:

- Node.js 20 or newer;
- a local project directory;
- the Livariant Preview release artifact.

Start read-only:

```bash
livariant status
livariant doctor
livariant init
```

Review what Livariant discovered. If the initialization plan is correct:

```bash
livariant init --apply
```

Then verify and resume:

```bash
livariant status
livariant doctor
livariant resume
```

> [!NOTE]
> `livariant init` without `--apply` is inspection-only. Livariant is deliberately plan-first rather than mutation-first.

Read the [Five-Minute Quickstart](docs/quickstart.md) or the [German Quickstart](docs/de/quickstart.md).

## Existing projects

Existing projects are first-class. Livariant is **discovery-first and preservation-first**: adoption does not require rewriting an existing repository into a preferred template.

The normal entry path is still:

```bash
livariant status
livariant doctor
livariant init
```

Existing project-owned files are protected by default; ambiguity narrows behavior toward inspection and diagnosis rather than heuristic rewriting.

Read the [Existing Project Guide](docs/existing-projects.md).

## Claude Code and Codex

The current Preview supports **Project Brain Resume handoff** for Claude Code and Codex through separate adapters:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

This claim is intentionally narrow. Livariant reconstructs provider-specific resume context from canonical Project Brain state; it does **not** claim to manage every provider feature, model option, tool invocation, authentication method, or native instruction mechanism.

Read [Provider Handoff](docs/provider-handoff.md).

## Safe updates and recovery

Inspect an update first:

```bash
livariant update --manifest ./release-manifest.json
```

Only after reviewing the plan, apply the matching artifact from a source you explicitly trust:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

For executable updates, that is still not sufficient by itself: the **exact artifact SHA-256 must already be authorized by an independent machine-local release policy outside project authority**. Project files, the manifest, `--trusted-source`, and Livariant's project-facing CLI/API cannot create that authority. If it is absent, update fails closed before npm installation or candidate Runtime attestation. There is intentionally no project-facing `authorize-runtime` command.

> [!WARNING]
> **Do not update Livariant by manually replacing `.project-brain/`, copying framework-managed lifecycle files, editing schema/version metadata, dropping a newer Runtime into managed storage, or editing Runtime trust/release-authorization records.**
>
> Manual replacement bypasses compatibility checks, explicit authority, release integrity, migration checkpoints, replay safety, validation, and activation semantics.

> [!CAUTION]
> If an update or migration is interrupted, **do not blindly rerun it and do not repair files by hand**. Diagnose first:
>
> ```bash
> livariant doctor
> livariant recover
> ```
>
> Apply recovery only when Livariant reports a valid supported strategy:
>
> ```bash
> livariant recover --apply
> ```

Schema-changing releases use the same `update` path and are routed through the supported migration lifecycle automatically. There is intentionally no normal-path manual `migrate` shortcut.

Read [Updates, Migrations & Recovery](docs/lifecycle-guide.md) or the [German lifecycle guide](docs/de/lifecycle-guide.md).

## Safety model

Livariant's Runtime requires explicit authorization for project-affecting mutation. Existing project-owned state is protected by default, and ambiguous state narrows toward diagnosis rather than guessed repair.

The hardened Preview baseline includes executable coverage for path/symlink escape, stale decision truth, interrupted migrations, checkpoint tampering, release-artifact tampering, installed-runtime drift, provider instruction conflicts, unsupported migrations, concurrent project-owned mutation during activation, missing update-trust evidence, hostile trust-root topology, pre-trust Runtime execution, and project attempts to create their own release authority.

The key rule remains:

> **Capability is not authority.**

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

Known bounded limitations may exist. Known data-loss, authority-escalation, migration-integrity, or release-trust bypasses on a supported path do not qualify as acceptable Preview limitations.

Read [Public Preview Support & Stability](docs/preview-support-and-stability.md) and [Public Preview Scope & Limitations](docs/preview-scope.md).

## Documentation

### English

- [Five-Minute Quickstart](docs/quickstart.md)
- [Existing Project Guide](docs/existing-projects.md)
- [Architecture & Safety](docs/architecture-and-safety.md)
- [Provider Handoff](docs/provider-handoff.md)
- [Updates, Migrations & Recovery](docs/lifecycle-guide.md)
- [Privacy & Network Behavior](docs/privacy-and-network.md)
- [Public Preview Support & Stability](docs/preview-support-and-stability.md)
- [Public Preview Scope & Limitations](docs/preview-scope.md)

### Deutsch

- [Deutsche Projektübersicht](README.de.md)
- [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
- [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md)

Additional German detail documentation will be added without changing the English canonical technical contracts.

## Licensing, security, and contributions

Livariant is **source-available, not OSI-approved Open Source** and is licensed under the [PolyForm Perimeter License 1.0.1](LICENSE).

The license is intended to permit broad use — including use in commercial software-development work — while restricting use of Livariant to provide others with a competing substitute for Livariant itself. Separate commercial terms may be offered where separately negotiated rights are needed.

Security-sensitive issues should follow [SECURITY.md](SECURITY.md) rather than being disclosed first through a public issue.

External code contributions are currently gated until contributor-rights terms compatible with the source-available and future commercial-licensing model are finalized.

- [Licensing](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [License, Warranty & Liability](docs/license-and-warranty.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

**Livariant** is built around a simple premise: AI-assisted development becomes more reliable when the project owns its memory, decisions stay explicit, and powerful tools still have to respect authority.