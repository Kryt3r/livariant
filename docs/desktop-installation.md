# Livariant Desktop — Windows Installation & First Use

This guide is for the **Windows Desktop** product surface. The Core/CLI and protected Guardian installation path are separate and remain documented in [Installation & First Project](installation.md).

## Current published Desktop Preview

The current immutable published Desktop Preview is:

- version: `0.1.0-rc.29`;
- tag: `desktop-preview-0.1.0-rc.29-bbfd076f0710`;
- exact source: `bbfd076f07103026688611f4e5438c8a58687e83`;
- Windows installer: `Livariant_0.1.0-rc.29_x64-setup.exe`;
- installer SHA-256: `12065505aac7b3c620e3cb0396b66aa6cc620bdb168bc184bd63a09b57ed8199`.

Release page:

https://github.com/Kryt3r/livariant/releases/tag/desktop-preview-0.1.0-rc.29-bbfd076f0710

Repository `main` is newer than this immutable Preview. Newer source code, merge state or CI results do not change the already-published rc.29 artifact.

## 1. Download the exact installer

Download `Livariant_0.1.0-rc.29_x64-setup.exe` from the release page above.

Do not substitute GitHub's automatically generated source-code archives for the Windows installer.

## 2. Verify the installer digest

In PowerShell:

```powershell
Get-FileHash .\Livariant_0.1.0-rc.29_x64-setup.exe -Algorithm SHA256
```

For the immutable Preview above, the value must be:

```text
12065505aac7b3c620e3cb0396b66aa6cc620bdb168bc184bd63a09b57ed8199
```

If the digest differs, stop.

The release also contains the Tauri updater signature file used by the supported signed update path.

## Windows publisher warning

The current Preview does not yet have the final Authenticode publisher-signing path planned for the first official public release. Windows may therefore present an **Unknown publisher / SmartScreen** warning even when the downloaded bytes match the published digest.

Updater signature verification and Windows publisher identity are separate trust layers.

Do not treat a warning as something Livariant can safely bypass for you. If the source, tag or digest is not exactly what you intended to test, stop.

## 3. Install

Run the verified NSIS installer.

The current Windows package uses **current-user** installation mode and does not require Livariant to become a system-wide project authority.

Installation does not:

- grant project mutation Authority;
- turn repository contents into Project Truth;
- connect GitHub automatically;
- connect an AI provider automatically;
- publish or modify a repository.

## 4. First launch

On a new Desktop state, Livariant opens its guided First Run.

The Desktop flow is separate from the CLI `livariant first-run` flow. The Desktop can guide you through:

1. choosing the project folder;
2. reviewing detected repository identity;
3. answering or skipping project-understanding questions;
4. confirming the primary repository and optional additional repositories;
5. optionally connecting supported providers;
6. reviewing setup health.

You may continue without completing every optional step and return later from Settings.

Detected data is not silently promoted to Project Truth or Authority.

## 5. GitHub is optional

You can enter repository information manually or explicitly connect GitHub.

When GitHub is connected through the Livariant GitHub App Device Flow, Livariant can discover repositories exposed to the authorized connection, including private repositories when GitHub grants access.

The current integration is read-oriented. Selecting or cloning a repository does not confirm it as Project Truth and does not grant repository-write capability.

After setup, use **Settings → Connections** to:

- reconnect or disconnect GitHub;
- inspect associated repositories;
- change a local checkout association;
- edit an additional repository's project purpose;
- switch an additional repository to **Remote only**;
- remove an additional repository association.

Removing an association does not delete the GitHub repository or the local checkout.

See [Desktop GitHub connection](desktop-github-connection.md).

## 6. AI-provider connection

The current Desktop supports the local **Codex App Server** connection path.

Claude, Gemini and Custom provider cards may be visible as **Planned**; they are not presented as working integrations in the current Preview.

Connecting a provider does not itself authorize file changes, commands, merges or releases.

## 7. Background / tray behavior

In the current Preview, closing the main window hides Livariant to the Windows tray instead of terminating the application.

Use the tray **Quit Livariant** action when you intend to exit the Desktop process completely.

Before uninstalling the current Preview, explicitly quit Livariant from the tray first.

This behavior is being audited for clearer first-use presentation before the first official public release.

## 8. Updates

Livariant does not automatically perform a remote update check.

Use **Settings → Updates → Check for updates** when you want to query the configured signed Preview channel.

The Desktop rechecks the target before installation and verifies the updater signing identity. A verified operator safety block can prevent installation of an exact target version.

See [Privacy & Network Behavior](privacy-and-network.md) for the separate automatic operator-safety polling path.

## 9. Uninstall

First quit Livariant completely from the tray.

Then use the normal Windows installed-apps/uninstall path for Livariant.

Repository files and GitHub repositories are not project-owned uninstall targets. Do not manually delete project repositories as part of uninstalling the Desktop.

Application-data retention/removal must be treated separately from project repository deletion; do not assume uninstall is a project-data eraser.

## Desktop vs Core/CLI

Livariant currently has distinct product surfaces:

- **Desktop** — Windows-first normal-user surface described on this page;
- **Core/CLI** — command-line and protected Guardian/runtime workflows documented in [Installation & First Project](installation.md).

The two surfaces share Livariant's Trust/Authority semantics but do not have the same installation or First Run UX.

## Security and privacy

- [Privacy & Network Behavior](privacy-and-network.md)
- [Architecture & Safety](architecture-and-safety.md)
- [Security Policy](../SECURITY.md)
- [Licensing](../LICENSING.md)
- [Third-Party Notices](../THIRD_PARTY_NOTICES.md)
