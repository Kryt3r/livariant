---
type: framework-lifecycle-policy
status: accepted
domain: distribution
language: en
owner: framework
foundation: FOUNDATION-10G
---

# Installation & Upgrade Documentation Contract

Public installation and upgrade guidance is part of the framework safety surface. The supported path must be easier to discover and follow than unsafe manual mutation.

> **Installation, existing-project adoption, upgrading, and recovery require version-aware documentation that clearly separates framework tooling updates from project migrations and prominently warns against manual replacement of managed project state.**

## One Clear Supported Path

Public documentation must present one clearly recommended installation path and one clearly recommended update path.

Alternative distribution mechanisms may exist, but users should not need to infer which sequence is considered safe.

The recommended installation flow should communicate, at an appropriate level:

```text
Install framework tooling
→ initialize or connect the project
→ inspect the resulting state
→ begin using the framework
```

The recommended update flow should communicate:

```text
Check for an update
→ review compatibility and impact
→ use the supported updater
→ run required migration and validation
→ confirm completion
```

The exact product command namespace is not fixed by this policy.

## Prominent Manual-Replacement Warning

The installation and upgrade guidance must prominently warn users not to replace an existing Project Brain, framework-managed project integration, or other managed project state by manually copying files from a newer release.

The guidance must clearly communicate that project-affecting framework changes must pass through a supported framework update path so ownership, compatibility, authority, migration, checkpoint, recovery, and validation semantics remain intact.

A warning hidden only in an FAQ, legal notice, or troubleshooting appendix is insufficient.

## Package Manager Guidance

If a package manager such as npm is used as a distribution mechanism, documentation must explain what the package-manager operation updates and what it does not safely migrate by itself.

Where framework tooling can be upgraded separately from project state, the documentation must make that distinction explicit.

Users should not reasonably infer that updating a package is equivalent to safely migrating every Project Brain or managed integration in an existing project.

## Fresh Project and Existing Project Are Distinct Paths

The framework must document both:

- a fresh-project path,
- an existing-project path.

Existing-project adoption is not a secondary edge case. It must reflect the framework's discovery-first, preservation-first initialization model.

The existing-project guide must not encourage users to copy templates over established project state merely to make the project conform to a preferred starting structure.

## Upgrade Guide Responsibilities

A usable upgrade guide should help the user understand how to:

- determine the installed framework version,
- discover available updates,
- identify the applicable channel and target release,
- review breaking changes and migration requirements,
- understand material update effects,
- establish or confirm a suitable checkpoint where required,
- apply the supported update,
- validate the result,
- recognize incomplete or interrupted update state,
- enter the documented recovery path when necessary.

The user should not need to understand the internal lifecycle state machine in order to follow the safe path.

## Recovery Is Normal Lifecycle Documentation

Interrupted or failed updates are expected lifecycle states and must have a documented recovery path.

Recovery guidance should warn users against trying to repair an interrupted update by manually overwriting managed project files.

The supported recovery path should begin with diagnosis of the actual installation and migration state, for example through the framework's diagnostic or recovery surface, before additional mutation is attempted.

## Version-Aware Documentation

Installation, upgrade, migration, and recovery documentation must be version-aware.

A user must be able to determine whether guidance applies to:

- the installed framework version,
- the intended target version,
- or the specific upgrade path between them.

Public documentation must avoid presenting a newer migration procedure as universally applicable to older framework versions when that could produce incompatible or destructive changes.

## Product Naming Independence

The documentation contract must not make the temporary development namespace `pb` a permanent technical dependency.

Development examples may use a clearly identified placeholder namespace until the product identity is accepted.

Branding changes must not require redesigning the lifecycle, migration, or ownership semantics.

## Technical Safety Communication and Legal Documentation

Technical warnings about update safety, data loss risk, supported migration paths, manual replacement, backup or checkpoint requirements, and recovery behavior belong directly in the relevant technical guides.

They must not be hidden solely inside legal or warranty language.

Separate public-release legal and governance documentation may cover topics such as:

- framework licensing,
- third-party licenses and notices,
- warranty and liability positioning,
- privacy implications of networked features,
- security reporting,
- contribution terms,
- trademark and naming matters,
- public-preview guarantees and limitations.

Those concerns remain part of release readiness but do not replace concrete technical safety instructions.

## Accessibility and Progressive Detail

Documentation should prioritize a simple safe path for users who do not know the framework internals while still providing deeper references for users who need lifecycle, migration, or architecture detail.

The framework should not require users to become migration-system experts merely to update safely.

## Anti-Patterns

Avoid:

- presenting multiple equally prominent installation paths without identifying the supported default,
- documenting `npm update` or equivalent as if it automatically proves project migration safety,
- placing the manual-replacement warning only in obscure troubleshooting or legal text,
- using fresh-project instructions for established projects without discovery and preservation semantics,
- documenting only the happy path and leaving interrupted updates undefined,
- publishing upgrade instructions without version applicability,
- hard-coding the temporary `pb` namespace into durable lifecycle requirements,
- assuming technical safety can be delegated to disclaimers.

## Core Principles

> **The supported path must be easier to discover and follow than unsafe manual mutation.**

> **Framework tooling updates and project migrations are distinct concepts and must be documented as such.**

> **Fresh-project setup, existing-project adoption, upgrade, and recovery are all first-class documentation paths.**

> **Version-aware guidance is required wherever the wrong procedure could produce incompatibility, data loss, or inconsistent lifecycle state.**

> **Technical safety warnings belong where the user performs the risky action, not only in legal text.**
