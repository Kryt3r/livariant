# Livariant Five-Minute Quickstart

<p align="center">
  <strong>English</strong> · <a href="de/quickstart.md">Deutsch</a>
</p>

The quickest current path into Livariant is the **Windows x64 Desktop Preview**. The CLI remains available for lower-level and provider-independent workflows, but it is no longer the right first impression for a normal Desktop user.

> [!WARNING]
> **Early Development / Preview**
>
> Livariant Desktop is still a Preview. Current workflows can change before Stable. The current Windows installer also does not yet have the final production Authenticode publisher-signing/reputation setup, so Windows may show publisher or SmartScreen warnings.

## 1. Get the current Desktop Preview

Current published Desktop Preview:

```text
Version: 0.1.0-rc.28
Platform: Windows x64
Exact source: ec2916979c1911a56203878d7102570ab71cd13c
Installer: Livariant_0.1.0-rc.28_x64-setup.exe
SHA-256: 2897e2bf7940b8d222b382bd6c3548861cd8dd5bbfbcca097783f08f6a21579d
```

Use the immutable [Desktop Preview rc.28 release](https://github.com/Kryt3r/livariant/releases/tag/desktop-preview-0.1.0-rc.28-ec2916979c19).

Verify that you are using that exact release identity rather than a similarly named file from another source. The preview release also provides the updater signature and machine-readable update metadata.

## 2. Install and open Livariant

Run the verified Windows x64 installer. Livariant installs as a current-user Desktop application with its bundled runtime.

After launch, the app can show its current Desktop/Core/runtime identity and health state. A working renderer is not itself a root of trust; consequential security/Authority decisions remain behind the host/Core/protected boundaries.

## 3. Understand the main Desktop areas

The current app is organized around a small set of primary surfaces:

- **Project Truth / First Steps** — project purpose, direction, rules, gaps, proposals, and review. Current renderer/session-state behavior is a foundation and must not be read as fully persistent Project Brain mutation.
- **Connections** — inspect/configure the currently implemented local Codex connection surface. Connection intent can be persisted and used for restore behavior, but connection is still not Authority.
- **Diagnostics** — inspect local Diagnostics/efficiency evidence over explicit periods. `Observed`, `Avoided`, and `Estimated` are intentionally different evidence classes.
- **Updates** — check the configured signed Desktop update feed, read localized release notes, download a compatible update, and explicitly authorize installation/restart.
- **Settings** — switch Deutsch/English and inspect connection/system configuration.

## 4. Connect a supported coding agent

The Desktop currently has the deeper live connection path for **Codex**.

Livariant Core also exposes provider-native MCP setup guidance for Claude Code and Codex:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

Those CLI setup commands render guidance and perform no provider-configuration writes themselves.

Current bounded MCP tools include:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

Provider output and MCP transport do not grant mutation Authority and do not become Project Truth merely because they reached Livariant.

## 5. The core reliability rule

A useful mental model is:

```text
Evidence
  -> understand / assess / propose
  -> review / authorize where required
  -> mutate
  -> verify
```

Important boundaries:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
SUPPORTED != DONE
Verification evidence != accepted completion
```

For example, Verification Trace can classify supplied requirement/implementation/evidence relationships as:

```text
SUPPORTED
CONTRADICTED
UNPROVEN
```

That classification describes evidence support; it does not silently accept completion.

## 6. Existing projects and Project Brain

Livariant is preservation-first. A project does not need a special starter template.

The durable local Project Brain model is:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Existing project files, provider instructions, external notes, agent output, findings, and reconstructed context remain evidence/candidate material until the supported review/adoption path accepts something as Project Truth.

The normal existing-project Desktop adoption flow is still being completed. Do not treat the current Project Truth renderer workspace as a finished persistent adoption UI.

## 7. CLI / protected lifecycle workflows

The CLI remains the lower-level control surface for provider-independent inspection, MCP setup, lifecycle operations, Guardian/protected Authority flows, status/doctor, and related advanced use.

The historical published CLI Public Preview is `v0.1.0-rc.4`. It remains immutable historical release evidence and does **not** retroactively contain later Desktop work.

Current repository Core/CLI development is newer than RC4, but repository presence is not release publication. For manual/advanced installation and protected Guardian details, use [Installation & First Project](installation.md).

## What to read next

- [Installation & First Project](installation.md)
- [Public Preview Scope & Limitations](preview-scope.md)
- [Architecture & Safety](architecture-and-safety.md)
- [First-Run Composition](first-run.md)
- [Existing Projects](existing-projects.md)
- [Local MCP Agent Bridge](mcp-agent-bridge.md)
- [Provider Handoff](provider-handoff.md)
- [Verification Trace](verification-trace.md)
- [Privacy & Network Behavior](privacy-and-network.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
