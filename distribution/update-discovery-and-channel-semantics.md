---
type: framework-layer-policy
status: accepted
domain: distribution
language: en
owner: framework
foundation: FOUNDATION-10C
---

# Update Discovery & Channel Semantics

Update discovery is read-only evidence gathering. Availability, compatibility, authorization, and application are separate states.

> **Discovering that an update exists does not authorize installation or migration. Update channels constrain which releases are considered, not whether they may be applied.**

## Purpose

The framework needs a provider-independent way to detect newer releases, explain their relevance, and prepare later update planning without silently mutating project or framework state.

Update discovery must therefore remain observational until a separate authorized update flow begins.

## Discovery Inputs

An update check may inspect and compare:

- the installed framework release version,
- the configured distribution channel,
- available release metadata,
- candidate target versions,
- release type and pre-release identity,
- declared compatibility information,
- migration metadata availability,
- declared breaking changes, deprecations, security notices, or support-state information,
- and relevant local installation metadata.

Discovery may also identify that the current installation state is incomplete, locally modified, unsupported, or otherwise requires additional inspection before a safe update can be planned.

## Discovery Is Read-Only

A normal update check must not:

- install release artifacts,
- rewrite framework-owned files,
- mutate Project Brain knowledge,
- regenerate project integration surfaces,
- apply migrations,
- change the configured channel,
- alter project dependencies,
- or otherwise create durable project or environment mutations.

A user instruction such as "check for updates" authorizes discovery only unless broader change authority is explicitly established.

## Distinct Update States

The framework must distinguish at least the following concepts:

### Installed

The concrete release currently installed or otherwise active for the project/environment.

### Available

A release exists that the current discovery policy considers newer, different, or otherwise relevant.

### Compatible

Available metadata and local evidence indicate that the candidate release can likely be used with the current framework/project state, subject to required migrations or conditions.

Compatibility is a claim requiring evidence. Remote metadata alone does not make it true.

### Migration Required

The candidate update changes framework or Project Brain contracts in a way that requires an explicit migration step or project-state transformation.

### Breaking

The candidate release intentionally changes an existing compatibility contract.

Breaking does not mean forbidden. It means the impact must be explicit and handled by the migration, authorization, and verification lifecycle.

### Authorized for Application

Applicable human, project, governance, and Runtime authority permit the bounded update operation.

### Applied

The release change has actually been executed and verified.

These states must not collapse into a single boolean such as `update_available=true` followed by automatic installation.

## Distribution Channels

The baseline channels are:

- `stable`
- `preview`
- `development`

A channel is a release-selection policy, not a version identity and not an authorization grant.

### Stable

The stable channel should consider releases carrying the strongest currently offered compatibility and release-quality guarantees.

Stable installations must not normally receive preview or development builds as routine update candidates.

### Preview

The preview channel may consider public pre-release builds intended for real-world evaluation before stable promotion.

A preview installation may also identify an applicable later stable release when that stable release represents a valid progression from the installed line.

### Development

The development channel may consider fast-moving development releases or snapshots intended for active framework testing and contributor workflows.

Development releases carry fewer stability guarantees and may change more frequently.

## Channel Changes

Changing channel changes which release risk and stability class the installation is willing to consider.

Channel changes are therefore explicit configuration decisions rather than incidental installer behavior.

Moves such as:

- `stable -> preview`,
- `preview -> development`,
- or equivalent transitions toward less stable release classes

must not happen silently.

Moves toward a more stable channel are also not automatically equivalent to a safe downgrade or migration. If the current installed release is newer or structurally incompatible with the target channel's available releases, the framework must surface that condition rather than pretending that a channel switch alone restores compatibility.

## Update Notifications

The framework should communicate update availability proportionately rather than turning every interaction into update pressure.

Reasonable discovery surfaces may include:

- an explicit update check,
- framework status output,
- periodic low-friction startup checks where supported,
- compatibility or support-state warnings,
- security-relevant notices when the installed release is materially affected.

A useful update notice should explain enough context to support a decision, for example:

```text
A new preview release is available: 0.3.0-preview.1

Contains:
- 2 new capabilities
- 1 Project Brain migration
- breaking Adapter contract change

No changes have been applied.
```

The exact presentation is product-specific; the semantic requirement is that notification remains informative and non-mutating.

## Remote Metadata Is Evidence, Not Authority

Release feeds, package registries, Git hosting metadata, update services, or future framework registries are external trust surfaces.

They may provide evidence that a release exists, but their claims about:

- version identity,
- compatibility,
- security,
- migration requirements,
- integrity,
- or recommended action

must not automatically become trusted local truth or change authority.

Before application, the update lifecycle must separately validate applicable integrity, compatibility, migration, and authorization requirements.

## Forced Updates

The local framework core should not use forced self-updates as the default lifecycle model.

A newer release may be recommended strongly, especially for important security or support reasons, but update availability alone does not override human ownership.

Where an old release becomes unsafe or unsupported, safer behavior may include:

- explicit warnings,
- degraded or blocked execution for operations that would violate protected properties,
- clear upgrade requirements,
- or refusal to perform specific high-risk actions.

The framework should not silently rewrite the project merely because a newer release exists.

## Semantic Update Intent

The human interface should expose a provider-independent semantic `update` intent.

Its meaning is:

> Discover and, when separately authorized, plan or apply a framework update.

The semantic intent must not imply that invoking `update` always performs immediate installation.

Adapters and product surfaces may expose more specific invocation forms such as update checks, planning, application, or target-version selection, but those mechanisms must preserve the same framework semantics.

The public command namespace remains product-defined. Development examples must not make `pb` a permanent product decision.

## Anti-Patterns

Avoid:

- auto-installing after a read-only update check,
- treating channel membership as installation authority,
- silently switching release channels,
- trusting remote compatibility claims without local validation,
- forcing routine updates merely because a newer release exists,
- representing preview/stable/development as separate incompatible version systems,
- hiding breaking changes behind a generic "update available" notice,
- allowing Adapter-specific CLI behavior to redefine the meaning of update discovery.

## Core Principles

> **Update discovery is read-only evidence gathering.**

> **Availability, compatibility, migration requirement, authorization, and application are separate states.**

> **Channels determine which releases are considered; they do not grant authority to install them.**

> **Remote release metadata is evidence, not automatic local truth or governance authority.**

> **A newer framework release does not justify a surprise project mutation.**
