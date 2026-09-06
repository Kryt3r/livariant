# Install Livariant and connect it to a project

<p align="center">
  <strong>English</strong> · <a href="de/installation.md">Deutsch</a>
</p>

The current normal-user installation path is the **Livariant Desktop Preview for Windows x64**. The historical CLI Public Preview and the lower-level protected Guardian/Core lifecycle model are separate surfaces and should not be mixed into the first-time Desktop install flow.

> [!WARNING]
> **Early Development / Preview**
>
> Livariant Desktop is still a prerelease. Workflows and compatibility can change before Stable. The current Windows installer also does not yet have the final production Authenticode publisher-signing/reputation setup, so Windows may display publisher or SmartScreen warnings depending on policy and reputation.

## Current published Desktop Preview

```text
Version: 0.1.0-rc.28
Platform: Windows x64
Exact source: ec2916979c1911a56203878d7102570ab71cd13c
Tag: desktop-preview-0.1.0-rc.28-ec2916979c19
Installer: Livariant_0.1.0-rc.28_x64-setup.exe
Installer SHA-256: 2897e2bf7940b8d222b382bd6c3548861cd8dd5bbfbcca097783f08f6a21579d
```

Use the immutable [Desktop Preview rc.28 release](https://github.com/Kryt3r/livariant/releases/tag/desktop-preview-0.1.0-rc.28-ec2916979c19).

The release also contains the updater signature and machine-readable update metadata. A similarly named installer obtained elsewhere is not the same trust identity.

## 1. Verify the release identity

Before installation, confirm at minimum:

1. the GitHub release tag is exactly `desktop-preview-0.1.0-rc.28-ec2916979c19`;
2. the release records exact source `ec2916979c1911a56203878d7102570ab71cd13c`;
3. the installer filename is `Livariant_0.1.0-rc.28_x64-setup.exe`;
4. the installer SHA-256 is:

```text
2897e2bf7940b8d222b382bd6c3548861cd8dd5bbfbcca097783f08f6a21579d
```

PowerShell example:

```powershell
Get-FileHash .\Livariant_0.1.0-rc.28_x64-setup.exe -Algorithm SHA256
```

If the value differs, stop and do not run the installer.

The current Preview release has updater signing/integrity evidence but does not yet have the final production Windows publisher-signing/reputation setup. A SmartScreen/publisher warning therefore must not be interpreted as either proof of compromise or proof of safety; verify the release identity independently.

## 2. Install the Desktop app

Run the verified installer as your normal Windows user.

The current NSIS Desktop package uses a current-user installation model and includes the qualified bundled runtime required by the Desktop application. Normal Desktop installation does not require manually copying Livariant package bytes into protected system directories.

Do not use old RC4 CLI workarounds or historical Stage-A instructions as a substitute for the current Desktop installer.

## 3. First launch

Open Livariant after installation.

The Desktop presents current Desktop/Core/runtime identity and health information. These health surfaces are useful coherence/integrity signals, but the renderer itself is not a root of trust and Runtime health is not an independent cryptographic post-install anti-tamper proof.

The app currently exposes primary areas including:

- Project Truth / First Steps;
- Connections;
- Diagnostics;
- Updates;
- Settings.

The Project Truth / First Steps renderer still contains foundation/session-state behavior and must not be treated as a finished persistent Project Brain editor.

## 4. Connect Codex in Desktop

The current live Desktop connection path is implemented for **Codex**.

Use **Connections** to inspect the local Codex installation and connection state, then connect through the supported UI flow.

Current hardening keeps provider, connection method, capability, role, and Authority distinct. A successful connection does not grant mutation Authority.

Connection intent can be persisted so Livariant can restore an accepted connection on a later application start. Restore remains subject to the accepted executable identity/trust checks; Livariant must not silently reconnect through a different PATH-resolved executable merely because it has the same command name.

Additional providers or connection methods are future extensions unless separately implemented and qualified.

## 5. Work with Project Truth / First Steps

The current workspace helps organize project purpose, direction, rules, gaps, proposed changes, and manual review.

Important current boundary:

```text
renderer/session state != persistent Project Brain mutation
Evidence != Project Truth
Proposal != Authorization
```

The normal existing-project adoption path is still being completed. Do not assume that typing information into the current Desktop workspace silently rewrites canonical Project Brain state.

## 6. Diagnostics

Diagnostics reads retained local technical evidence and keeps the evidence classes separate:

```text
Observed != Avoided != Estimated
```

Use the explicit period controls to inspect available evidence. Missing values should remain missing rather than being invented.

Diagnostics does not need raw prompt/project-content capture by default.

## 7. Updates

The current Desktop has a real signed updater flow.

When you explicitly check for updates, Livariant can contact its configured HTTPS updater endpoint and evaluate signed update metadata. If a compatible update is available, the UI can show localized release notes and real download/install state.

Installation/restart remains an explicit user-authorized step. Update availability is not installation Authority, and the renderer cannot choose arbitrary update URLs or executable paths.

See [Updates, Migrations & Recovery](lifecycle-guide.md) for the distinction between Desktop application updates and project/Core lifecycle operations.

## 8. Language

The Desktop supports Deutsch and English application UI. The language choice is local preference state; it does not alter machine identifiers, command names, Project Truth semantics, or security/Authority rules.

## Uninstall

Use the normal Windows installed-app/uninstall surface for the Desktop application.

Do not manually delete protected Livariant security state or project `.project-brain` data merely to uninstall the Desktop UI. Application installation, protected machine state, and project-owned state are intentionally separate concerns.

If you are troubleshooting a Preview installation, preserve relevant diagnostics before removing local app state unless you deliberately want to reset that state.

## Historical CLI Public Preview

`v0.1.0-rc.4` remains an immutable historical **CLI Public Preview**. It is not the current Desktop release.

Real Windows fresh-install dogfooding found that RC4 did not publish/provision the protected Stage-A Guardian bootstrap source required for a complete fresh-machine -> protected Guardian -> first-project lifecycle path. That historical limitation remains true for the RC4 artifact and must not be bypassed by copying requester-controlled/global npm package files into protected locations.

Later repository remediation does not retroactively change RC4, and this page does not claim that a newer standalone CLI package has been publicly released merely because newer Core code exists on `main`.

## Advanced Core / CLI / Guardian workflows

Livariant Core and CLI remain relevant for:

- provider-independent status/doctor/inspection;
- MCP setup and local stdio bridge use;
- lifecycle planning/apply flows;
- protected Guardian Authority domains;
- migration/recovery operations;
- lower-level development and qualification work.

Those workflows use stricter trust/Authority contracts than the Desktop renderer. In particular:

```text
Capability != Authority
project files != protected machine Authority
artifact integrity != Runtime trust != release authorization
```

For architectural details, use [Architecture & Safety](architecture-and-safety.md) and [Updates, Migrations & Recovery](lifecycle-guide.md). Historical release-specific Stage-A/Stage-B procedures should be read as release-specific evidence, not copied into the current Desktop install path.

## Platform boundary

Current published Desktop Preview support is **Windows x64**.

Core/CLI and protected Guardian implementations have broader platform-specific history, but no Linux/macOS Desktop release should be inferred from that. A future Desktop platform needs its own qualified packaging and installation evidence.

## Next reads

- [Five-Minute Quickstart](quickstart.md)
- [Public Preview Scope & Limitations](preview-scope.md)
- [Architecture & Safety](architecture-and-safety.md)
- [Existing Projects](existing-projects.md)
- [Privacy & Network Behavior](privacy-and-network.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
