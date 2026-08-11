---
type: POLICY
status: accepted
owner: framework-director
created: 2026-08-09
updated: 2026-08-11
foundation: FOUNDATION-10A
---

# Versioning and Migrations

The Project Brain Framework is treated as a software product, not as static documentation.

It has explicit release identity, versions, distribution channels, breaking changes, deprecations, changelogs, compatibility metadata, and migration guidance.

> **A Framework release has one canonical Semantic Version identity. Distribution channel, Framework release version, and Project Brain schema version are separate dimensions and must not be conflated.**

## Canonical Framework release identity

Each published Framework release has exactly one canonical Semantic Version identity.

The Framework release version identifies the coherent released Framework baseline, including the applicable Core contracts and the set of Patterns, Profiles, Adapters, schemas, policies, and release metadata shipped as part of that baseline.

FOUNDATION-10 does not introduce independent public release trains for every Framework layer. Patterns, Profiles, Adapters, or other components may retain their own internal version or evolution metadata where their accepted contracts require it, but this does not replace the canonical Framework release version.

This avoids premature package-level version fragmentation before there is demonstrated product need for independently distributed components.

## Semantic Versioning policy

Framework release versions use the form:

```text
MAJOR.MINOR.PATCH
```

Published version progression must be deliberate and attributable to an actual release. Version numbers are not advanced arbitrarily merely to signal maturity or importance.

A release does not need to publish every theoretically possible intermediate PATCH version. For example, `0.1.0` may be followed directly by `0.2.0` when the next published release warrants a MINOR increment. However, published version identity must remain chronologically and semantically coherent.

### Pre-1.0 evolution

Before `1.0.0`, the Framework remains in public contract formation and uses `0.x.y` versions.

For `0.x.y` releases:

- PATCH increments represent corrections, compatible refinements, documentation or policy clarification, and other changes that do not intentionally break the currently published preview contract,
- MINOR increments represent meaningful new capabilities or contract evolution and may include intentional breaking changes before `1.0.0`,
- intentional breaking changes must still be explicitly identified, documented, accompanied by migration or compatibility guidance where applicable, and never hidden merely because the Framework is pre-1.0,
- `1.0.0` is not an automatic consequence of any arbitrary breaking change; it is a deliberate declaration that the Framework contract is mature enough for the stronger post-1.0 compatibility model.

Examples:

```text
0.3.0 -> 0.3.1   compatible correction
0.3.1 -> 0.4.0   meaningful capability or pre-1.0 contract evolution
0.9.x -> 1.0.0   deliberate transition to the stable public compatibility contract
```

### Post-1.0 compatibility

Starting with `1.0.0`, normal Semantic Versioning compatibility semantics apply:

- PATCH — backward-compatible fixes and refinements,
- MINOR — backward-compatible capabilities and additions,
- MAJOR — breaking public Framework-contract changes.

When a higher-order component increments, lower-order components reset in the normal Semantic Versioning manner. For example:

```text
0.4.7 -> 0.5.0
1.8.4 -> 2.0.0
```

## Pre-release identifiers

Pre-release builds may use standard Semantic Versioning pre-release identifiers when a concrete release line needs staged publication.

Examples include:

```text
0.1.0-preview.1
0.1.0-preview.2
```

Such identifiers are part of the concrete release identity. A vague state such as "the preview version" is not sufficient to identify an installed Framework baseline.

Development builds may additionally retain source commit, build, or equivalent provenance where necessary to make an otherwise non-final build reproducible and diagnosable.

## Distribution channels are not versions

The Framework defines three baseline distribution channels:

- `stable` — releases offered under the highest currently supported stability expectations,
- `preview` — public pre-release or preview releases intended for real-world evaluation before stable promotion,
- `development` — active development snapshots or builds intended for internal or explicitly opted-in testing.

A distribution channel controls which releases are eligible to be discovered or offered to a user. It does not replace the concrete Framework release version and does not become a second versioning scheme.

Conceptually:

```text
Framework version
-> exact installed or offered release identity

Distribution channel
-> release stream from which eligible updates are selected
```

Changing channel therefore changes update eligibility, not the historical identity of the currently installed Framework release.

## Framework version, Project Brain schema, and channel separation

A project may need to record at least three distinct lifecycle facts:

- the Framework release version it is based on,
- the Project Brain schema or format version applicable to its canonical knowledge representation,
- the selected distribution channel used for update discovery.

These values must not be collapsed into one field.

A Framework PATCH or MINOR release may leave the Project Brain schema unchanged. Conversely, a schema migration may be required by a specific Framework release transition. Treating release version and schema version as identical would create unnecessary migrations and obscure actual compatibility requirements.

Illustrative metadata may eventually resemble:

```yaml
framework:
  version: 0.1.0-preview.2
  channel: preview

project_brain:
  schema_version: 1
```

The exact physical manifest format is not fixed by this section. The semantic separation is required.

## Project pinning

Concrete Project Brains must be able to identify the Framework release baseline they are based on.

This release identity supports compatibility reasoning, update discovery, migration planning, reproducibility, diagnostics, and safe resume across agents and environments.

Project pinning does not grant permission to update. Discovery of a newer Framework version remains separate from authorization to mutate project state.

## Branding and command namespace independence

The accepted current product identity is **Livariant**, with package/runtime and CLI namespace `livariant`.

Lifecycle metadata must not make framework semantics depend on that branding. A future product rename must not require semantic migration of Framework or Project Brain lifecycle metadata unless a real compatibility change independently requires it.

Current product-facing examples should use the canonical `livariant` namespace. Historical records may preserve earlier development namespaces when their historical role is explicit.

## Migration principle

Framework evolution must not silently invalidate existing Project Brains.

When an update changes required structure, behavior, policy, metadata, Adapter contracts, or project obligations, migration guidance is provided.

Migration guidance must state:

- source version or range,
- target version,
- what changed,
- what is breaking,
- what is deprecated,
- required actions,
- optional improvements,
- verification steps.

Detailed migration metadata, compatibility evaluation, update planning, rollback, and application behavior are defined by later FOUNDATION-10 lifecycle work.

## Future automation

A product-facing command surface may assist lifecycle operations, but command capabilities must derive from canonical Framework contracts rather than inventing parallel rules.

Candidate semantic operations include initialization, diagnostics, migration, update discovery, and compatibility inspection. The current Livariant CLI exposes supported operations through the `livariant` namespace, while the semantic contracts remain provider- and branding-independent.

## Change history

The repository commit history and release notes should tell a coherent story of Framework evolution. Commit messages should be scoped and descriptive rather than generic.

## Core Principles

> **A Framework release has one canonical Semantic Version identity.**

> **Version progression is deliberate and semantically meaningful rather than arbitrary.**

> **Before `1.0.0`, MINOR releases may contain explicitly documented breaking contract evolution; `1.0.0` remains a deliberate stability milestone.**

> **After `1.0.0`, breaking public Framework-contract changes require a MAJOR version increment.**

> **Distribution channel, Framework release version, and Project Brain schema version are separate lifecycle dimensions.**

> **A newer available release does not itself grant authority to update project state.**
