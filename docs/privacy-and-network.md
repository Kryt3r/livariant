# Privacy & Network Behavior

<p align="center">
  <strong>English</strong> · <a href="de/privacy-and-network.md">Deutsch</a>
</p>

Livariant is local-first by default. This page separates local project behavior, Desktop update traffic, local connector traffic, and external AI-provider behavior.

## No Livariant usage telemetry in the current product

Livariant does not currently implement its own:

- analytics or usage telemetry;
- advertising identifiers;
- Livariant cloud-account tracking;
- automatic upload of Project Brain contents;
- automatic upload of raw prompts or arbitrary project files for Diagnostics.

Project Brain, local Diagnostics evidence, connection intent, and normal project inspection stay local unless a separate supported feature explicitly crosses a network boundary.

This statement is about Livariant itself. Operating-system components, GitHub, package managers used in an advanced CLI workflow, and external AI providers have their own network/privacy behavior.

## External AI providers are a separate boundary

Livariant can prepare bounded provider context locally. Sending that context to Claude Code, Codex, or another external provider means the provider's application, account settings, retention policy, and terms apply.

Provider output returning to Livariant remains evidence/candidate material until the supported review/adoption/Authority path accepts something more strongly.

Livariant does not treat a provider connection as consent to upload the entire project or Project Brain.

## Desktop Connections

The current Desktop has a live local Codex connection path through a bounded local connector host / App Server integration.

Connection intent can be stored locally so an accepted connection can be restored on a later app start. That persistence stores connection state/identity information, not Project Truth and not mutation Authority.

The external Codex client/service may itself communicate over the network according to its own authentication, account, model, and privacy settings. That provider traffic is separate from Livariant telemetry.

## Desktop update behavior

The current Desktop **does** support remote update discovery. Older documentation that said Livariant had no remote update checks described the earlier CLI-only update model and is no longer globally true.

When the user invokes the Desktop update flow, Livariant checks its configured HTTPS updater endpoint for signed update metadata. The current update path uses:

- a fixed updater endpoint/channel configuration;
- a fixed updater public key;
- signed update metadata/artifacts;
- localized EN/DE release notes carried in the update metadata;
- real download callbacks/progress state when a trustworthy total is available;
- explicit user authorization before installation/restart.

Update availability is not installation Authority. The renderer cannot choose an arbitrary update URL or executable path.

The current Desktop update model should not be described as silent autonomous project mutation. An executable application update and a project lifecycle mutation are separate domains.

## CLI / protected Runtime update behavior

Livariant Core also contains the lower-level CLI lifecycle/update model. That path works with explicit local release manifest/artifact material and protected Runtime/release Authority boundaries.

A typical plan-first CLI update remains conceptually separate from Desktop updater discovery:

```bash
livariant update --manifest ./release-manifest.json
```

Consequential apply still requires the supported exact-artifact/source/Authority checks. Project files, provider output, or a caller-controlled `--trusted-source` value cannot manufacture protected release/Runtime Authority.

The existence of the Desktop updater does not weaken those Core/Guardian boundaries.

## Project Brain and Diagnostics are project data

Project Brain can contain project identity, goals, decisions, knowledge, and unresolved questions. Diagnostics can contain local technical evidence and provenance.

Treat both as project/user data. Livariant does not need to ingest obvious secret files merely to make these stores richer, and Diagnostics must not capture raw prompt/project contents by default merely to measure efficiency.

You remain responsible for what you deliberately record in Project Brain and what context you later choose to send to an external provider.

## Current network/privacy summary

For the current Preview:

- no Livariant cloud account is required for normal local project use;
- Livariant usage telemetry is not currently implemented;
- Project Brain is not automatically uploaded by Livariant;
- Diagnostics does not capture raw project prompts/content by default;
- Desktop can contact the configured signed updater endpoint when the update flow is invoked;
- Desktop local connector state can be persisted for restore, but connection state is not Project Truth or Authority;
- provider traffic and provider retention remain separate external-provider concerns;
- CLI protected Runtime/release Authority remains separate from Desktop update discovery.

## Future network features need their own review

Hosted synchronization, Livariant accounts/cloud storage, telemetry, remote project indexing, or other new network services would create new privacy/trust boundaries. They are not authorized or described by this page merely because they are possible roadmap ideas.

Any such feature needs explicit data-flow, default, consent, retention, security, and disable/reversal documentation before it becomes supported behavior.
