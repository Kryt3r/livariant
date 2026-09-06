# Updates, Migrations & Recovery

<p align="center">
  <strong>English</strong> · <a href="de/lifecycle-guide.md">Deutsch</a>
</p>

Livariant has two different update/lifecycle domains that must not be confused:

1. **Desktop application updates** — signed updater discovery/download/install for the Windows Desktop Preview;
2. **Core/project lifecycle operations** — plan-first initialization, Runtime/framework update, migration, and recovery under the existing Guardian/Authority model.

An application update is not automatically a Project Brain mutation, and project lifecycle Authority is not automatically permission to install arbitrary executable code.

## Desktop application updates

The current Desktop has a real signed updater path.

When the user explicitly checks for updates, Livariant can query its configured HTTPS updater endpoint. Current controls include:

- fixed updater endpoint/channel configuration;
- fixed updater public key;
- signed update metadata/artifacts;
- localized EN/DE release notes;
- real download callbacks/progress state where a trustworthy total is available;
- explicit user authorization before installation/restart;
- renderer boundaries that prevent choosing arbitrary update URLs or executable paths.

The state model remains:

```text
available != authorized to install
signed artifact != Project Truth
application update != project mutation
```

The current published Desktop Preview is `0.1.0-rc.28` for Windows x64. See [Installation](installation.md) for its exact release identity.

## Desktop update UX does not weaken Authority

The Desktop can present update availability, release notes, download progress, installation preparation, completion, and restart state. Presentation is not Authority.

The install step stays explicitly user-authorized. If trustworthy total download size is unavailable, the UI must use indeterminate presentation instead of inventing a percentage.

Localized release notes are display data and are rendered through bounded parsing/escaping; they do not become executable instructions.

## Core/project lifecycle remains plan-first

Lower-level Livariant Core lifecycle operations remain separate from the Desktop updater.

For initialization, Core/framework update/migration, and recovery, the conceptual model remains:

```text
plan / inspect
-> authorize exact consequential material where required
-> apply
-> verify
```

A caller expressing `--apply` intent is not equivalent to protected lifecycle Authority.

Permanent boundaries include:

```text
Capability != Authority
Proposal != Authorization
artifact integrity != Runtime trust != release authorization
project lifecycle Authority != executable release Authority
```

## Initialization

Inspect first:

```bash
livariant init
```

Where the current supported lifecycle requires protected authorization, review the exact plan before requesting/applying it:

```bash
livariant init --authorize
livariant init --apply
```

Authority is material/project/operation bound. A state change between authorization and apply must invalidate stale authorization rather than silently reusing it.

## Core/framework update planning

The lower-level Core update path uses an explicit release manifest:

```bash
livariant update --manifest ./release-manifest.json
```

Planning does not mutate the project. It resolves/reports release identity, artifact/source information, project impact, and migration/checkpoint requirements.

A reviewed consequential update can then use the supported authorization/application path:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --authorize
```

followed by a matching apply using exact artifact/source material:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

These commands describe the Core lifecycle contract. They are **not** the normal Desktop Preview update UI and do not mean a newer standalone CLI package is currently published.

Project-controlled input, provider output, the manifest, or `--trusted-source` cannot manufacture protected release/Runtime Authority.

## Framework update vs Project Brain migration

Updating executable/framework tooling does not automatically imply a Project Brain schema migration.

When a schema migration is required, the migration path must be explicitly supported. Livariant must not guess arbitrary transformations between schemas.

Operation domains remain separated so authorization for a normal update cannot be repurposed as migration/recovery/init authorization.

## Interrupted migration/update state

An interrupted lifecycle operation is not equivalent to "nothing happened".

Livariant retains lifecycle evidence so ambiguous/incomplete state can be diagnosed. While recovery is unresolved, normal mutation/replay may be blocked rather than guessed through.

Inspect with:

```bash
livariant doctor
livariant recover
```

A valid supported recovery path can require its own exact authorization/application sequence:

```bash
livariant recover --authorize
livariant recover --apply
```

Recovery Authority is bound to the specific project/interrupted operation/checkpoint/material and cannot authorize another lifecycle domain.

## Checkpoints and recovery safety

Recovery remains conservative:

- checkpoint identity/location/material must still match;
- migration/recovery journal state must be coherent;
- ambiguous, moved, modified, stale, or substituted material fails closed;
- restored canonical Project Brain state is verified before cleanup is considered complete;
- failed cleanup must retain enough evidence to avoid presenting an ambiguous state as healthy.

## Do not repair lifecycle or protected state by hand

> [!CAUTION]
> Do not manually replace Project Brain files, Livariant-managed lifecycle state, protected Guardian/bootstrap state, Runtime trust records, or release-authorization records to force an update/recovery to complete.

Manual replacement can bypass compatibility, Authority, provenance, checkpoint, replay-safety, and integrity boundaries.

For project lifecycle state:

```bash
livariant doctor
livariant recover
```

For protected Guardian state where the relevant CLI surface is available:

```bash
livariant guardian status
```

An unsafe/ambiguous protected state is a stop condition, not permission for guessed repair.

## Historical CLI release boundary

The historical `v0.1.0-rc.4` CLI Public Preview remains immutable. Its old Windows Fresh-Install distribution limitation remains historical truth for that artifact: it did not publish/provision the protected Stage-A Guardian bootstrap source needed for a complete clean-machine protected lifecycle.

Later Core/Desktop implementation does not retroactively repair RC4, and historical Stage-A/Stage-B instructions should not be presented as the normal installation/update path for the current Desktop Preview.

## Current user path

For normal Windows users:

```text
install verified Desktop Preview
-> open Livariant
-> use Connections / Project Truth / Diagnostics
-> explicitly check for signed Desktop updates
-> explicitly authorize install/restart when desired
```

For lower-level Core/Guardian lifecycle work, use the explicit CLI contracts above and the deeper [Architecture & Safety](architecture-and-safety.md) documentation.

See also:

- [Installation & First Project](installation.md)
- [Public Preview Scope & Limitations](preview-scope.md)
- [Privacy & Network Behavior](privacy-and-network.md)
