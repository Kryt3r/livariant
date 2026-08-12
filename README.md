<img width="1376" height="682" alt="Livariant | Living software framework for coherent AI-assisted development" src="https://github.com/user-attachments/assets/16f5afee-a10a-4c79-8bc9-89d23135e0e9" />

<p align="center">
  <strong>English</strong> · <a href="README.de.md">Deutsch</a>
</p>

# Livariant

**A living software framework that helps AI-assisted software projects keep their knowledge, decisions, and direction across sessions and tools.**

If you use AI to build software, you may already know the problem Livariant is designed to solve.

You explain your project to an AI coding tool. The work goes well. A few days later you start a new session, switch to another tool, or return after a long break. Important context is missing. Old decisions come back. You repeat explanations. One agent understands the project differently from another. Eventually, parts of the project's history exist only in chat logs or in your head.

Livariant gives that knowledge a durable place inside the project itself.

You do not need to be an AI expert to use Livariant. If you are starting with tools such as Claude Code or Codex, Livariant is meant to help you keep the project understandable as those AI sessions come and go.

## What Livariant helps with

Livariant is useful when you want to:

- keep important project decisions available after an AI session ends;
- stop explaining the same architecture and goals again and again;
- switch between supported coding agents without treating one provider's memory as the project record;
- preserve known facts and unresolved questions in a form the project owns;
- inspect changes before Livariant writes project-managed state;
- update or recover Livariant without replacing managed files by hand.

A simple example:

```text
Monday
You decide with Claude Code that authentication will use approach A.
That decision is recorded in the Project Brain.

Friday
You open a new Codex session.
Livariant reconstructs the relevant project context from the Project Brain.
Codex does not need the old Claude Code chat to know that approach A is the accepted decision.
```

Livariant does not make an AI model remember everything. It gives the project a persistent record that AI tools can use when you choose to hand that context to them.

## What the Project Brain is

Livariant calls its project-owned knowledge store the **Project Brain**.

In plain language, it is a small set of files inside your project that records things such as the project's identity, goals, accepted decisions, known facts, and Livariant lifecycle metadata.

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

The Project Brain belongs to your project. It does not belong to Claude Code, Codex, a particular model, or a hidden Livariant cloud service.

Chat history, provider memory, temporary plans, `CLAUDE.md`, `AGENTS.md`, and other provider-specific files may still be useful, but Livariant does not treat them as competing canonical project truth.

## Table of contents

- [Who Livariant is for](#who-livariant-is-for)
- [How Livariant works](#how-livariant-works)
- [Five-minute start](#five-minute-start)
- [What normal use looks like](#what-normal-use-looks-like)
- [Existing projects](#existing-projects)
- [Claude Code and Codex](#claude-code-and-codex)
- [Safe updates and recovery](#safe-updates-and-recovery)
- [Safety model](#safety-model)
- [Local-first privacy](#local-first-privacy)
- [Preview status](#preview-status)
- [Documentation](#documentation)
- [Licensing, security, and contributions](#licensing-security-and-contributions)

## Who Livariant is for

### If you are new to AI-assisted coding

You do not need to understand agent architecture, provider APIs, or Livariant's security model before you begin.

The basic idea is enough:

1. install the Livariant command-line tool;
2. let it inspect your project;
3. review the initialization plan;
4. explicitly create the Project Brain;
5. use `livariant resume` when you want durable project context for a new working session.

The deeper lifecycle and security documentation is there when you need it.

### If you already use Claude Code or Codex

Livariant gives those sessions a shared project-owned context without pretending their native memories are interchangeable. The current Preview supports a bounded Resume handoff for Claude Code and Codex.

### If you maintain a long-lived or complex project

Livariant also provides explicit lifecycle rules for initialization, updates, migration, integrity verification, and recovery. These rules are designed to protect existing project state and make ambiguous situations visible instead of guessing through them.

## How Livariant works

Livariant separates project knowledge from tool memory and separates technical capability from permission to change protected state.

The normal lifecycle is:

```text
Inspect -> Plan -> Authorize -> Mutate -> Verify
                                  |
                                  +-> Recover explicitly if interrupted
```

This matters because a coding tool being technically capable of writing a file does not mean every write should happen automatically.

> [!IMPORTANT]
> **Capability is not authority.** Livariant keeps inspection, planning, authorization, mutation, verification, and recovery separate on purpose.

For the deeper model, read [Architecture & Safety](docs/architecture-and-safety.md).

## Five-minute start

Requirements for the current Preview candidate:

- Node.js 20 or newer;
- a local project directory;
- the verified Livariant Preview release tarball from the canonical GitHub Release once that release is published.

Livariant is not installed inside Claude Code or Codex. Install the release tarball as machine or user tooling first:

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.2.tgz
livariant version
```

Then open the root of the project you already use with your coding tool and inspect it:

```bash
livariant status
livariant doctor
livariant init
```

`livariant init` without `--apply` does not initialize the project. It shows you the plan first.

If the plan is correct:

```bash
livariant init --apply
```

Then verify the result:

```bash
livariant status
livariant doctor
livariant resume
```

Installing the CLI does not add Livariant to the target project's `package.json` and does not initialize a project automatically.

Read [Installation & First Project](docs/installation.md) for download verification, Windows instructions, PATH help, and the complete first-project flow. The [Five-Minute Quickstart](docs/quickstart.md) is the shorter operational reference.

## What normal use looks like

After setup, you normally do not reinitialize the project every time you use an AI tool.

A typical session looks more like this:

```text
1. Open the project.
2. Check Livariant state if needed.
3. Ask Livariant for resume context.
4. Give the relevant resume output to the coding agent you are using.
5. Work on the project.
6. Keep durable project decisions and knowledge in canonical Project Brain state rather than relying on chat history alone.
```

Useful commands include:

```bash
livariant status
livariant doctor
livariant resume
```

`status` tells you what Livariant sees. `doctor` diagnoses supported health and lifecycle states without silently repairing them. `resume` renders current Project Brain context for re-entry into the project.

Livariant does not watch every conversation automatically and does not claim that every sentence from an AI session should become project truth. Durable project state is meant to stay explicit and reviewable.

## Existing projects

You do not need to start a new repository to use Livariant.

For an existing project, begin with:

```bash
livariant status
livariant doctor
livariant init
```

Review the result before applying initialization. Livariant is designed to adopt the project that already exists instead of forcing it into a preferred template. Existing project-owned files are protected by default, and ambiguous state leads to diagnosis rather than heuristic rewriting.

Read the [Existing Project Guide](docs/existing-projects.md).

## Claude Code and Codex

The current Preview supports Project Brain Resume handoff for Claude Code and Codex through separate adapters.

Linux or macOS examples:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

This is not a native Claude Code or Codex plugin. Livariant reconstructs provider-specific resume context from the Project Brain. It does not claim to manage every provider feature, model setting, authentication method, tool invocation, or native instruction mechanism.

Read [Provider Handoff](docs/provider-handoff.md).

## Safe updates and recovery

Most users do not need to understand Livariant's complete release-authority model on their first day. You do need to know one rule: do not update Livariant by manually replacing its managed state.

Inspect an update first:

```bash
livariant update --manifest ./release-manifest.json
```

After reviewing the plan, a supported executable update uses the matching artifact and explicit trust evidence:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

For executable updates, the exact artifact SHA-256 must also already be authorized by independent machine-local release policy outside project authority. Project files, the manifest, `--trusted-source`, and Livariant's project-facing CLI or API cannot create that authority. If it is missing, the update fails closed before candidate Runtime code can execute. There is no project-facing `authorize-runtime` command.

> [!WARNING]
> Do not update Livariant by replacing `.project-brain/`, copying framework-managed lifecycle files, editing schema or version metadata, dropping a newer Runtime into managed storage, or editing Runtime trust and release-authorization records by hand.

If an update or migration is interrupted, diagnose it before trying again:

```bash
livariant doctor
livariant recover
```

Apply recovery only when Livariant reports a valid supported strategy:

```bash
livariant recover --apply
```

Schema-changing releases use the supported update and migration lifecycle automatically. There is no normal-path manual `migrate` shortcut.

Read [Updates, Migrations & Recovery](docs/lifecycle-guide.md).

## Safety model

Livariant requires explicit authorization for project-affecting mutation. Existing project-owned state is protected by default. Ambiguous state leads to diagnosis instead of guessed repair.

The hardened Preview baseline includes executable coverage for path and symlink escape, stale decision truth, interrupted migrations, checkpoint tampering, release-artifact tampering, installed Runtime drift, provider instruction conflicts, unsupported migrations, concurrent project-owned mutation during activation, missing update-trust evidence, hostile trust-root topology, pre-trust Runtime execution, and project attempts to create their own release authority.

The core rule is simple:

> **Capability is not authority.**

## Local-first privacy

The current Preview Runtime is designed for local project operation:

- no Livariant analytics or usage telemetry;
- no automatic Project Brain upload;
- no Livariant cloud account required for local operation;
- no automatic remote update check;
- provider-specific Resume output is rendered locally by Livariant.

If you intentionally give Resume context to an external AI provider, that provider's handling of the context is governed by its own terms and settings.

Read [Privacy & Network Behavior](docs/privacy-and-network.md).

## Preview status

`0.1.0-rc.2` is the current Public Preview release candidate. This repository remains in pre-public preparation until the separate publication and visibility steps are explicitly authorized and completed.

The supported baseline is verified in CI on Ubuntu and Windows with Node.js 24. The package declares Node.js `>=20`, but the Preview test claim is limited to environments actually exercised by the release pipeline.

Preview means that supported behavior is evidence-backed, not that every CLI detail or internal contract is frozen before 1.0.

Known data-loss, authority-escalation, migration-integrity, or release-trust bypasses on a supported path are not treated as acceptable Preview limitations.

Read [Public Preview Support & Stability](docs/preview-support-and-stability.md) and [Public Preview Scope & Limitations](docs/preview-scope.md).

## Documentation

If you are new to Livariant, use this order:

1. [Installation & First Project](docs/installation.md)
2. [Five-Minute Quickstart](docs/quickstart.md)
3. [Existing Project Guide](docs/existing-projects.md)
4. [Provider Handoff](docs/provider-handoff.md)
5. [Updates, Migrations & Recovery](docs/lifecycle-guide.md)

For deeper details:

- [Architecture & Safety](docs/architecture-and-safety.md)
- [Privacy & Network Behavior](docs/privacy-and-network.md)
- [Public Preview Support & Stability](docs/preview-support-and-stability.md)
- [Public Preview Scope & Limitations](docs/preview-scope.md)
- [License, Warranty & Liability](docs/license-and-warranty.md)

German user documentation:

- [Deutsche Projektübersicht](README.de.md)
- [Installation & erstes Projekt](docs/de/installation.md)
- [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
- [Leitfaden für bestehende Projekte](docs/de/existing-projects.md)
- [Provider-Handoff](docs/de/provider-handoff.md)
- [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md)
- [Architektur & Sicherheit](docs/de/architecture-and-safety.md)
- [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md)
- [Public-Preview-Support & Stabilität](docs/de/preview-support-and-stability.md)
- [Public-Preview-Umfang & Einschränkungen](docs/de/preview-scope.md)
- [Lizenz, Gewährleistung & Haftung](docs/de/license-and-warranty.md)

English remains the canonical technical-contract language where deeper framework or internal contracts do not have translated counterparts. The user-facing documentation set above is mirrored in German.

## Licensing, security, and contributions

Livariant is source-available, not OSI-approved Open Source. It is licensed under the [PolyForm Perimeter License 1.0.1](LICENSE).

The license permits broad use, including use while developing commercial software, while restricting use of Livariant to provide a competing substitute for Livariant itself. Separate commercial terms may be offered when separately negotiated rights are needed.

Do not post suspected vulnerability details in a public issue. Follow [SECURITY.md](SECURITY.md).

External code contributions are currently gated until contributor-rights terms compatible with the source-available and future commercial-licensing model are finalized. Bug reports, documentation feedback, questions, and design discussion are still welcome through the public community paths that will be enabled for the Preview.

- [Licensing](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [License, Warranty & Liability](docs/license-and-warranty.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

**Livariant is built around a simple idea:** the project should own the knowledge needed to continue its work, even when the AI session changes.
