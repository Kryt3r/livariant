# Privacy & Network Behavior

Livariant is designed for local project use. This page separates the network behavior of the Windows Desktop, the Core/CLI, optional GitHub and AI-provider connections, and the operator/update safety channels.

## No Livariant usage telemetry

The current Livariant Runtime and Desktop do not implement:

- analytics or usage telemetry;
- crash reporting;
- advertising identifiers;
- Livariant account tracking;
- automatic upload of Project Brain contents.

Normal local project operation does not require a Livariant cloud account.

Project Brain can contain project identity, decisions, goals, knowledge and unresolved questions. Treat it as project data. Livariant does not need to ingest obvious secret files merely to make Project Brain richer, and `.env`-style secrets are not canonical Project Brain input by default.

## Desktop operator-safety polling

The Windows Desktop automatically checks Livariant's fixed operator-broadcast endpoint:

`https://broadcast.livariant.dev/v1/operator.json`

The current runtime starts the first check shortly after Desktop startup and then polls approximately every five minutes.

This request is a bounded HTTPS **GET**. The reviewed transport:

- uses a fixed endpoint rather than a renderer-supplied URL;
- does not follow redirects;
- sends no request body or project contents;
- applies response-size and network timeouts;
- accepts a broadcast only after its detached signature, signing-key identity, validity window and replay sequence pass verification.

The channel carries bounded service notices and exact-version update safety blocks. It is not a remote command channel and grants no project or mutation Authority.

A transport or verification failure does not authorize any action. As with any HTTPS connection, the remote service can observe ordinary network metadata such as the source IP address; Livariant sends no project content in this GET request body.

## GitHub connection

GitHub is optional and is connected only when you explicitly start the GitHub connection flow.

The Windows Desktop uses the Livariant GitHub App Device Flow. When connected, Livariant may make authenticated requests to GitHub to:

- identify the connected account;
- list repositories exposed to the authorized GitHub App/user connection, including private repositories when GitHub grants access;
- read supported repository metadata such as Actions, pull requests, issues or releases;
- clone a repository you explicitly choose.

Current GitHub capability is read-oriented. Connecting GitHub does not grant Livariant repository-write capability, Project Truth or project mutation Authority.

On Windows, access/refresh token material is protected with the current user's DPAPI boundary before encrypted material is persisted under Livariant app data. Plaintext tokens are not written to project-owned files.

A Git clone necessarily transfers the selected repository contents from GitHub to the local checkout you explicitly chose. Livariant does not silently clone repositories.

See [Desktop GitHub connection](desktop-github-connection.md).

## Desktop update checks

The Desktop does **not** automatically perform a remote update check.

When you explicitly choose **Check for updates**, the Desktop reads the fixed Livariant Preview update feed over HTTPS and verifies the updater signing identity before an update can be installed.

The updater rechecks the target before installation and refuses to proceed silently if the available version changed after your review. Verified operator UpdateBlock state is also checked before download/install; unreadable or malformed safety state fails closed.

The Desktop's automatic operator-safety polling described above is separate from the user-triggered update check.

## Core / CLI update behavior

The Core/CLI update path remains separate from the Desktop updater. It reads release manifests/artifacts that you explicitly provide and keeps machine-local Runtime trust / release authorization outside project Authority.

For executable CLI Runtime updates, the exact artifact still requires the accepted independent release-authorization path. Project files, a manifest or project-facing CLI input cannot manufacture that Authority.

## External AI providers

Provider-specific context is prepared locally by Livariant. Livariant does not send project context to an AI provider merely because that context exists.

When you explicitly connect/use an external provider such as Codex, that provider's application, account, privacy settings, retention policy and terms apply to data the provider receives. Provider behavior is separate from Livariant telemetry.

Connecting a provider does not itself grant Livariant or the provider permission to change project files, merge code or publish releases.

## Native notifications

Windows toast notifications are a local delivery channel. The supported update-availability path first persists the durable Livariant Notification Center record and then attempts the Windows toast on a best-effort basis. Native toast delivery does not create an additional network path or Authority.

## What stays local by default

For normal local use:

- Project Brain is not automatically uploaded by Livariant;
- diagnostics evidence/export is local and is designed to exclude raw prompts, freeform reasons, project-file contents, local paths and app credential state;
- repository associations and local checkout paths remain local Livariant state;
- provider Resume/handoff context is generated locally until you deliberately use it with an external provider.

## Future network features require a new review

Hosted synchronization, Livariant accounts, telemetry, marketplace services, remote project storage or other future network features would create new privacy/trust boundaries. They are not covered merely because they may exist later.

Before such a feature becomes supported, its data flow, defaults, user controls, retention implications and security model require separate documentation and review.

## Current privacy summary

- no Livariant usage telemetry is implemented;
- no automatic Project Brain upload exists;
- no Livariant cloud account is required for normal local use;
- Desktop operator-safety notices are fetched automatically from one fixed signed HTTPS channel;
- Desktop update discovery is user-triggered, not automatic;
- GitHub traffic occurs only after explicit connection/use and remains read-oriented in the current product;
- external AI-provider behavior is governed by that provider when you explicitly use it;
- network connectivity does not itself create Project Truth or Authority.
