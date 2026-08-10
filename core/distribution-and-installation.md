---
type: core-policy
status: accepted
domain: core
language: en
owner: framework
foundation: FOUNDATION-10B
---

# Distribution & Installation Model

Framework distribution installs framework-owned release artifacts and explicit integration surfaces. It does not transfer ownership of the user's project, Project Brain, or human-owned artifacts to the framework.

> **Framework installation must never be interpreted as ownership over the project it is installed into.**

## Distribution Boundary

A framework release may contain, as applicable:

- Core policies and contracts,
- bundled Patterns,
- bundled Profiles,
- bundled Adapters,
- schemas and lifecycle metadata,
- executable Runtime or command-surface components,
- release and compatibility metadata,
- migration metadata and release documentation.

The Project Brain is project-owned canonical knowledge. It is not a disposable copy of framework release content and must not be blindly replaced during installation or update.

## Ownership Classes

Installation and update behavior must reason about durable project surfaces by ownership semantics rather than by path alone.

### Framework-Owned

Framework-owned artifacts are maintained as part of the installed framework release and may be replaced, added, removed, or migrated by an authorized framework installation or update when required by the target release.

Framework ownership must be explicit enough that the updater can distinguish these artifacts from project-owned state.

### Project-Owned

Project-owned artifacts include project code, configuration, assets, data definitions, durable project decisions, Project Brain knowledge, human-authored documentation, and other state whose meaning belongs to the project rather than to the framework distribution.

These artifacts are preserved by default and must not be overwritten merely because the framework has a preferred template or newer release.

### Generated or Projected Integration Surfaces

Some durable artifacts represent framework integration into a project without being purely framework-owned or purely project-owned.

Examples may include:

- native agent instruction files,
- generated projections derived from Project Brain knowledge,
- framework integration stubs,
- managed sections inside mixed-ownership files.

These surfaces require explicit ownership semantics for the managed portion, projection source, and reconciliation behavior.

The framework must not assume whole-file ownership when only a generated region or semantic projection is framework-managed.

> **Mixed or projected integration surfaces require finer ownership boundaries than a simple framework-versus-user file split.**

## Project Brain Ownership Is Semantic, Not Whole-File Framework Ownership

Project Brain canonical knowledge is project-owned. However, Project Brain storage may also contain narrowly scoped framework-managed lifecycle metadata such as:

- Project Brain schema or format version,
- framework release compatibility metadata,
- selected update channel,
- migration bookkeeping required for safe resume or recovery,
- references to active framework Profiles, Patterns, or Adapters where the framework contract defines those fields.

The existence of framework-managed metadata inside a Project Brain file or directory does not make the surrounding file, directory, or project knowledge framework-owned.

Ownership therefore applies to semantic fields, regions, or records where necessary, not merely to filesystem paths.

Framework lifecycle code may update framework-managed metadata only within the applicable lifecycle authority and migration contract. It must preserve adjacent project-owned knowledge and must not use metadata ownership as permission to rewrite unrelated Project Brain content.

Conversely, user modification of framework-managed lifecycle metadata may create drift or an unknown compatibility state. The framework should diagnose that condition rather than silently reclaiming whole-file ownership or replacing the Project Brain.

> **Project Brain knowledge remains project-owned even when narrowly scoped framework-managed lifecycle metadata coexists with it.**

## Installation Is Not Repository Replacement

Installing the framework must not imply permission to rewrite unrelated repository content.

Installation should apply only the smallest sufficient set of framework-owned artifacts and explicitly authorized integration changes required to establish the selected release.

Existing project content remains protected by Core Project Mutation Safety & Change Authority.

## Local-First Product Operation

The first public baseline must not require a continuously available hosted registry, account service, or cloud control plane merely to keep an already-installed local framework usable.

Remote services may improve release discovery, distribution, trust verification, hosted intelligence, or convenience, but temporary unavailability of such services must not make the local Core or Project Brain useless.

A release should therefore remain installable from a verifiable release artifact through at least one distribution path that does not depend on a proprietary always-on service.

## Release Manifest

Each installable release must expose machine-readable release metadata sufficient to identify what is being installed and how compatibility should be evaluated.

A release manifest should be able to represent, at minimum:

```yaml
version: 0.1.0-preview.1
channel: preview

contents:
  core: ...
  patterns: ...
  profiles: ...
  adapters: ...

compatibility:
  project_brain_schema: ...
```

The exact serialization format is an implementation choice unless later standardized by another accepted contract.

The manifest must be able to bind the declared release identity to the concrete release artifacts strongly enough for integrity verification under the accepted release-trust policy.

It should remain extensible for additional trust metadata such as:

- artifact hashes or checksums,
- migration references,
- provenance,
- signatures,
- signing identity,
- package-format metadata.

FOUNDATION-10 does not require a complete public-key infrastructure or hosted signature service for the first preview, but supported update application must not rely on unauthenticated or unverifiable artifact replacement.

## Install Discovery

Installation begins with discovery rather than generation or overwrite.

Before mutating durable project state, the framework should determine, where applicable:

- whether a framework installation already exists,
- the installed framework version,
- the selected update channel,
- the Project Brain format or schema state,
- existing generated or projected integration surfaces,
- local modifications or ownership conflicts,
- whether the requested operation is a fresh install, reinstall, repair, update, or migration.

An existing installation must not be treated as a blank target merely because an install command was invoked.

## Idempotent Installation Semantics

Repeated installation of the same accepted release should be semantically stable.

Where no relevant drift or damage exists, re-running installation should not create duplicate state, regenerate project assumptions, or rewrite project-owned artifacts.

If drift, missing framework-owned artifacts, or damaged integration state is detected, the operation should be classified and surfaced appropriately rather than silently turning reinstall into repair.

Repair remains subject to the applicable authority and mutation-safety model.

## Distribution Transport Is Not Framework Semantics

The framework must not make one package manager, operating system package format, or hosting provider part of the canonical semantic contract unless there is a compelling architecture reason.

Possible transport mechanisms may include, for example:

- a language package registry,
- a standalone binary,
- a GitHub Release artifact,
- an installer,
- another verifiable package mechanism.

These transports deliver the framework release. They do not redefine ownership, authority, compatibility, migration, installation, or release-integrity semantics.

## Relationship to Adapters

Adapters may expose provider-specific mechanisms for fetching, installing, projecting, or integrating framework artifacts.

They must not redefine which project surfaces are framework-owned, project-owned, mixed-ownership, or authorized for mutation.

Technical ability to write files or invoke a package manager remains capability, not authority.

## Anti-Patterns

Avoid:

- treating the Project Brain as disposable framework package content,
- treating framework-managed metadata inside Project Brain as ownership of the surrounding Project Brain file or directory,
- assuming everything under a preferred framework directory is framework-owned without explicit semantics,
- overwriting whole mixed-ownership files when only a generated projection is managed,
- requiring a proprietary hosted service for continued local use of an already-installed framework,
- turning reinstall into silent repair,
- regenerating project assumptions during repeated installation,
- coupling canonical framework semantics to npm, pip, Homebrew, GitHub Releases, or another single transport mechanism,
- accepting unverifiable replacement artifacts merely because they came through a supported transport,
- interpreting writable project state as permission to replace it.

## Core Principles

> **Framework distribution installs framework-owned release artifacts and explicit integrations, not ownership over the user's project.**

> **Project-owned state, including Project Brain knowledge, is preserved by default.**

> **Narrowly scoped framework-managed lifecycle metadata may coexist with project-owned Project Brain knowledge without creating whole-file ownership.**

> **Generated and projected integration surfaces require explicit mixed-ownership semantics.**

> **Installation begins with discovery and should be semantically idempotent.**

> **Distribution transports deliver framework releases; they do not define framework governance, ownership, or release-integrity semantics.**

> **The local Core and Project Brain must remain useful without an always-available external service.**
