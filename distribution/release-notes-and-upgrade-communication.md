---
type: framework-layer-policy
status: accepted
domain: distribution
language: en
owner: framework
foundation: FOUNDATION-10F
---

# Release Notes, Breaking Changes & Upgrade Communication

Framework releases must communicate material change in a form that is both understandable to humans and actionable by tooling. Release communication is part of the lifecycle contract, not optional marketing copy.

> **Every release must communicate material compatibility, migration, breaking-change, security, required-action, and known-issue information in both human-usable and machine-actionable form.**

## Human-Readable and Machine-Actionable Release Information

Each release should provide two complementary views of material change.

Human-readable release information should explain, proportionately:

- what is new,
- what was fixed,
- what is breaking,
- what migration or manual action is required,
- what security-relevant change occurred,
- what limitations or known issues remain.

Machine-actionable release metadata should expose structured facts such as:

- whether breaking changes exist,
- whether migration is required,
- which lifecycle or framework surfaces are affected,
- supported source versions or ranges,
- whether manual action is required,
- security relevance or severity where applicable,
- known incompatibilities or blockers.

Tooling must not be forced to infer lifecycle-critical facts from free-form Markdown when the release can declare them explicitly.

## Breaking Changes Must Be Explicit

Breaking changes are acceptable during pre-1.0 evolution, but they must never be hidden, softened into generic feature language, or left for users to discover through failure.

A release should explain both the existence and practical impact of a breaking change.

Useful impact categories may include:

- Framework Contract Breaking,
- Project Brain Schema Breaking,
- Adapter Contract Breaking,
- Pattern or Profile Contract Breaking,
- User Project Impact,
- Operational Breaking Change.

The categories are descriptive rather than a universal fixed taxonomy. Their purpose is to tell users which parts of the ecosystem are actually affected.

A breaking Adapter contract, for example, should not be communicated as if every user project is necessarily broken when only custom Adapter implementations require action.

## Required, Recommended, and Optional Actions

Upgrade communication must distinguish obligation from suggestion.

### Required

Actions that must be completed for the target release to operate correctly or safely within the declared compatibility contract.

### Recommended

Actions that are advisable but are not required for compatibility or successful migration.

### Optional

New capabilities, improvements, or adoption opportunities that the user may choose without implying a lifecycle requirement.

Recommendations and optional improvements must not silently become migration requirements.

## Security-Relevant Releases

Security-relevant releases require higher visibility than ordinary feature updates.

Where useful, release information should state:

- severity or materiality,
- affected framework surface,
- whether project migration is required,
- whether the vulnerable behavior remains exploitable in older versions,
- what action is strongly recommended.

Security urgency does not itself grant authority for project mutation. The normal update, migration, authority, and recovery lifecycle remains applicable.

Where an old release can no longer perform a materially sensitive operation safely, the framework may warn strongly or block that operation when supported by accepted security policy. This must not be implemented as a hidden forced project update.

## Known Issues and Preview Limitations

Known limitations should be disclosed rather than concealed behind a false impression of completeness.

This is especially important for preview releases.

Examples may include:

- untested interruption recovery on a specific platform,
- manual conflict resolution requirements for custom projections,
- unsupported migration paths,
- incomplete Adapter compatibility,
- known environment-specific defects.

A public preview may ship with documented limitations when those limitations do not violate release-readiness blockers or protected properties.

## Release Notes Travel With the Release

Material lifecycle information must not exist only on an external website or registry.

A release artifact should contain or reliably reference the release-specific information required to understand:

- version identity,
- compatibility,
- migrations,
- breaking changes,
- required manual actions,
- security notices,
- known issues.

This supports offline inspection, future reproducibility, and resilience when a registry or website is unavailable.

## Factual Risk Communication

Compatibility, migration, security, data-risk, and breaking-change information must remain factual.

Promotional language may exist separately, but must not dilute or obscure lifecycle truth.

For example, a Project Brain schema change requiring migration should be communicated as such rather than being described only as an improvement to the Project Brain experience.

> **Marketing may describe value; lifecycle communication must describe reality.**

## Relationship to Update Discovery and Planning

Update Discovery may use release metadata to explain why a target release matters and what type of impact is expected.

The Safe Update Plan may use the same metadata to identify:

- required migration steps,
- manual actions,
- checkpoint needs,
- compatibility blockers,
- affected project or framework surfaces.

Release metadata is evidence for planning. It does not replace local inspection, authority evaluation, or verification.

## Anti-Patterns

Avoid:

- release notes that list features but omit breaking changes,
- asking tooling to parse free-form prose to determine whether migration is mandatory,
- labeling required actions as recommendations,
- declaring all breaking changes as globally project-breaking without describing affected scope,
- hiding security impact behind generic wording,
- concealing known Preview limitations,
- storing lifecycle-critical release information only on a website,
- promotional phrasing that makes risk or migration requirements appear smaller than they are.

## Core Principles

> **Every release must communicate material lifecycle impact to both humans and tooling.**

> **Breaking changes may exist, but they must be explicit, scoped, and understandable.**

> **Required, recommended, and optional actions are distinct.**

> **Security urgency increases communication priority but does not bypass update authority.**

> **Known limitations are part of truthful release communication.**

> **Release marketing must never obscure compatibility, migration, security, or data-risk truth.**
