---
foundation: FOUNDATION-10H
status: accepted
scope: distribution-lifecycle
---

# Public Preview Readiness Contract

## Purpose

Public Preview readiness is an evidence threshold, not a claim of perfection. A preview may ship with known limitations, but it must not ship with unresolved failures that violate protected project ownership, authority boundaries, migration safety, or data integrity.

## Preview Readiness Gates

Before a Public Preview may be released, the framework must have evidence that it can be installed, initialized, resumed across supported providers, updated, migrated, interrupted, recovered, and understood without requiring hidden conversational context or violating protected project state.

At minimum, Public Preview readiness requires:

- no unresolved Critical or Major FOUNDATION-10 finding;
- no known data-loss path in supported installation, update, or migration flows;
- no known authority-escalation path in supported lifecycle flows;
- existing projects remain protected during initialization, adoption, update, and migration;
- interrupted updates are recoverable or explicitly blocked in a diagnosable recovery state;
- framework release version, Project Brain schema version, and update channel can be identified correctly;
- release, compatibility, migration, required-action, and known-issue information is available to both humans and tooling;
- unsafe manual replacement is clearly documented as unsupported, while the supported lifecycle remains the obvious default path.

## Required Scenario Evidence

Release hardening for the first Public Preview must exercise at least:

1. a fresh project;
2. an existing small project;
3. an existing messy or partially structured project;
4. cross-provider resume, including a Claude-to-Codex or equivalent provider transition;
5. a normal framework-only update;
6. an update requiring migration;
7. an interrupted update;
8. recovery after a failed migration.

These are release gates, not optional demonstrations.

## Required Adversarial Evidence

The hardening phase must deliberately test for at least:

- data loss;
- scope escalation;
- stale Project Brain knowledge;
- conflicting instructions;
- broken initialization;
- interrupted update application;
- incompatible or incomplete migration paths;
- manually replaced or drifted framework/project integration state.

A successful result means the protected property survives, the operation is safely blocked, or the framework enters an explicit recovery/diagnostic state. Silent guessing, destructive repair cascades, and unsupported mutation are failures.

## Provider Independence Gate

Provider independence is a behavioral requirement, not only a policy statement.

Before Public Preview, at least one practical provider-transition scenario must demonstrate that:

- one agent/provider can initialize or work on a project;
- the session can end without hidden provider state becoming authoritative;
- another supported agent/provider can resume from canonical project state;
- the Project Brain remains the authoritative continuity surface;
- no provider-specific hidden memory is required for correctness.

## Documentation Gate

A Public Preview must not depend on private chat history for correct use. At minimum, usable public documentation must exist for:

- a short Quickstart;
- why the framework exists and what problem it solves;
- adopting an existing project;
- architecture and ownership boundaries;
- the safety and authority model;
- installation, update, migration, recovery, and unsupported manual replacement behavior.

Documentation must be version-aware where lifecycle instructions can differ between releases.

## Legal and Public-Release Baseline

Before Public Preview, the release-readiness process must separately review and resolve the public baseline for:

- framework licensing;
- third-party licenses and notices;
- warranty/liability presentation;
- privacy implications of any network, telemetry, registry, or update-check behavior;
- security reporting and disclosure guidance;
- contribution rules and contribution rights;
- product name, trademark, and branding considerations;
- clear preview support, compatibility, and stability expectations.

This review must distinguish actual legal requirements from technical or community best practices. Technical data-loss and update warnings belong in the normal technical documentation and must not be hidden inside legal text.

## Known Limitations

Known limitations may ship when they are explicit, bounded, and do not violate protected framework properties.

For example, a preview may require manual diagnostic recovery for a narrowly unsupported installer failure mode. It may not knowingly ship a migration path that can silently delete project-owned state.

In short:

> Known limitations may ship; unresolved safety, authority, migration, or data-integrity failures may not.

## Scope Freeze After FOUNDATION-10

FOUNDATION-10 is the final planned Foundation before Public Preview hardening.

After FOUNDATION-10, new ideas must not automatically expand the framework architecture. New work must be classified as one of:

- a Public Preview blocker;
- an accepted and documented preview limitation;
- post-preview work.

The next phase is release hardening, not Foundation expansion.

## Core Rule

> Public Preview readiness requires evidence that the framework can be installed, initialized, resumed across providers, updated, migrated, interrupted, recovered, and understood without violating protected project ownership or authority boundaries. Known limitations may ship; unresolved safety, data-integrity, migration, or authority failures may not.
