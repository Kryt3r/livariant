# Public Preview Support & Stability

<p align="center">
  <strong>English</strong> · <a href="de/preview-support-and-stability.md">Deutsch</a>
</p>

The current published graphical Preview is **Livariant Desktop `0.1.0-rc.28` for Windows x64**. Preview means current supported behavior has engineering/release evidence, but Livariant is still in early development and is not under a final Stable/1.0 compatibility contract.

The historical CLI Public Preview `v0.1.0-rc.4` remains a separate immutable older release surface.

## What supported Preview paths should preserve

Even before Stable, Livariant is expected to preserve its safety/trust properties:

- project-owned state is not silently redefined by provider output or UI state;
- consequential mutation requires the supported Authority path;
- connection/capability does not become Authority;
- ambiguous, stale, substituted, or malformed consequential trust state fails closed;
- update availability is not installation authorization;
- release/update artifacts use explicit identity/integrity checks;
- migration/recovery uses explicit compatibility, checkpoint, journal, and operation-domain boundaries where applicable;
- verification evidence is not silently upgraded into accepted completion;
- historical release evidence is not rewritten to match later product behavior.

Preview does **not** mean serious safety problems are acceptable. A confirmed data-loss path, Authority bypass, release/update-trust bypass, project-truth corruption path, or equivalent supported-workflow security failure is a blocker/remediation issue, not a routine Preview limitation.

## What can still change before Stable / 1.0

Preview releases may still change:

- Desktop UI organization and interaction details;
- supported Desktop platforms;
- provider/connection methods;
- CLI details and flags;
- release/update metadata contracts;
- Project Brain schema through explicit supported migrations;
- adapter/connector capabilities;
- installation and distribution mechanics;
- performance characteristics and budgets;
- Preview compatibility ranges.

Changes must still respect preservation and Authority boundaries. "Preview" is not permission to silently reinterpret old Project Brain state, bypass a required migration, or weaken safety merely for compatibility.

User-visible behavior changes should be described in release notes together with required actions or known limitations.

## Current Desktop support scope

Published Desktop Preview support is currently:

- Windows x64;
- current-user NSIS installation;
- bundled qualified runtime;
- Project Truth / First Steps foundation workspace;
- live Codex connection surface;
- local Diagnostics evidence presentation;
- signed Desktop update discovery/install flow;
- Deutsch/English application UI.

The Project Truth renderer is not yet a finished persistent Project Brain editor, and the normal existing-project adoption flow is still being completed.

A future Linux/macOS Desktop release requires separate packaging/install evidence; broader Core/CLI platform support does not imply a Desktop release.

## Current provider scope

Livariant Core exposes provider-native MCP setup guidance for Claude Code and Codex. The current Desktop has the deeper live local connection path for Codex.

Livariant does not promise to manage every provider feature, authentication method, model-selection option, native memory/instruction mechanism, or future MCP behavior.

Additional providers/connection methods are future capability until implemented and qualified.

## Current migration/recovery scope

Only explicitly implemented and declared migration/recovery paths are supported.

The presence of generic lifecycle machinery does not mean arbitrary schema/runtime transitions are safe. Consequential lifecycle operations remain plan-first and Authority-bound where required.

If the current installation/project state is ambiguous, the safe behavior is diagnosis/recovery rather than guessed mutation.

## Windows signing/reputation limitation

The current Desktop Preview installer has exact release identity and updater-signing/integrity evidence, but it does **not** yet have the final production Authenticode publisher-signing/reputation setup.

Windows can therefore show publisher/SmartScreen warnings depending on policy/reputation. This limitation must remain visible until production signing/reputation is solved; it must not be hidden behind a generic "Preview" label.

## Getting support

Public Preview support is maintainer/community supported. There is no paid response-time SLA unless separately agreed.

Use [SUPPORT.md](../SUPPORT.md) for usage questions, bugs, documentation issues, feature ideas, or the security-reporting route.

A useful Desktop bug report normally includes:

- Livariant Desktop version and release/tag identity;
- Windows version/architecture;
- affected area (Project Truth, Connections, Diagnostics, Updates, Settings, installer, startup);
- observed behavior and expected behavior;
- minimal reproduction steps;
- whether project-owned data or connection/update state was affected.

For Core/CLI issues, also include the relevant Core/CLI version, Node.js/runtime information, command/workflow, and lifecycle state where applicable.

Do not disclose suspected vulnerability details in a public Issue. Follow [SECURITY.md](../SECURITY.md).

## What each Preview release should communicate

A public Preview release should state at least:

- exact product surface/version and platform;
- exact source/release identity;
- installation artifact and relevant verification data;
- known issues and limitations;
- meaningful user-visible changes;
- required actions where applicable;
- compatibility/migration/recovery considerations when relevant.

Desktop and Core/CLI are independently versioned surfaces; release notes must not imply that matching or non-matching RC numbers change their trust roles.

## Deprecation

Preview features may be changed or withdrawn if they cannot meet Livariant's safety, maintainability, or product-quality bar.

If a supported path is withdrawn, that should be stated explicitly rather than leaving a broken path nominally supported.

## Stable / 1.0 is a separate decision

A successful Preview does not automatically define the eventual Stable/1.0 compatibility promise.

Before Stable/1.0, a separate readiness decision must define the longer-term platform, compatibility, support, migration, distribution-signing, and release-maintenance commitments.
