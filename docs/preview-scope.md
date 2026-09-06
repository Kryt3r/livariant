# Public Preview Scope & Limitations

<p align="center">
  <strong>English</strong> · <a href="de/preview-scope.md">Deutsch</a>
</p>

This page states the scope of the **currently published Livariant Desktop Preview** and separates it from historical CLI releases and from roadmap work.

## Current published Desktop Preview

```text
Version: 0.1.0-rc.28
Platform: Windows x64
Exact source: ec2916979c1911a56203878d7102570ab71cd13c
Tag: desktop-preview-0.1.0-rc.28-ec2916979c19
Installer: Livariant_0.1.0-rc.28_x64-setup.exe
Installer SHA-256: 2897e2bf7940b8d222b382bd6c3548861cd8dd5bbfbcca097783f08f6a21579d
```

The release is an immutable GitHub prerelease and is **not Stable**.

The repository may contain changes newer than this published source. Repository presence, a merged PR, or a matching version string does not publish a new release.

## Early-development boundary

Livariant Desktop is still in an early development phase. Current Preview behavior is real product behavior, but individual workflows, supported providers, UI surfaces, performance characteristics, and compatibility may still change before Stable.

The Windows Preview installer also does not yet have the final production Authenticode publisher-signing/reputation setup. Depending on Windows policy and reputation, users may see publisher or SmartScreen warnings. This is a distribution-signing residual, not evidence that Guardian/runtime Authority has failed or succeeded.

## What the current Desktop Preview includes

### Desktop shell and Project Truth / First Steps

The current Desktop application is the normal-user graphical surface and includes the accepted Livariant shell plus:

- Project Truth / First Steps workspace;
- Connections;
- Diagnostics;
- Updates;
- Settings with Deutsch/English application language;
- Desktop/Core/runtime identity and health presentation.

The Project Truth renderer currently includes curated/session-state foundation behavior for purpose, direction, rules, knowledge gaps, proposals, source/review presentation, and explicit review actions. It must **not** be described as a finished persistent Project Brain editor or as an alternate canonical truth store.

### Connections

The Desktop has a live local **Codex** connection path using the bounded connector-host/App Server architecture. Current development includes persisted connection intent and automatic restore behavior that is tied to the previously accepted executable identity.

Permanent boundaries remain:

```text
Provider != Connection Method != Capability != Role != Authority
Connection != Authority
```

The broader connector model is intentionally extensible, but additional providers or connection methods are not current Desktop capability merely because the architecture can represent them.

### Diagnostics & efficiency evidence

The Desktop includes Diagnostics based on retained local evidence. Supported presentation distinguishes:

```text
Observed != Avoided != Estimated
```

Current ranges include bounded presets such as `1d`, `7d`, `30d`, `90d`, and all retained history. Missing evidence must remain missing rather than being invented. Diagnostics does not capture raw project prompts/content by default.

Performance measurements gathered during development are engineering evidence; they are not universal end-user resource or savings guarantees.

### Desktop updates

The Desktop includes a real signed updater path with:

- a fixed HTTPS update feed and updater public key;
- signed release/update metadata;
- localized EN/DE release notes;
- real download state;
- explicit user authorization before installation;
- install/restart presentation that does not fabricate progress.

Update discovery/availability is not installation Authority. A Preview release is not Stable merely because the updater can discover it.

### Core / project-owned continuity

The current codebase also contains the project-owned reliability foundations that Desktop and agent workflows build on, including:

- Project Brain durable context/goals/decisions/knowledge/metadata;
- stable logical/physical project identity boundaries;
- Project Context Snapshot;
- semantic proposal and conflict/drift assessment;
- provider context/return evidence intake;
- provider-neutral semantic maintenance;
- Guided Project Understanding Review and controlled adoption;
- External Knowledge evidence foundations;
- Autonomy Profiles;
- Evidence-backed Findings;
- Requirement -> Implementation -> Verification Trace;
- lifecycle/update/migration/recovery safeguards;
- Guardian-protected consequential Authority domains;
- local stdio MCP bridge.

Current behavior for any one capability is always defined by canonical product code/tests, not by this overview alone.

## Historical CLI Public Preview

`v0.1.0-rc.4` remains an immutable historical **CLI Public Preview**. It is a separate older release surface and must not be presented as though it contained later Desktop releases, later remediation, or current Desktop UI behavior.

Its historical installation limitations and exact RC4 behavior remain relevant only when someone intentionally uses or audits that artifact.

## Provider support

Livariant Core exposes MCP setup guidance for **Claude Code** and **Codex**, and the current bounded MCP bridge includes tools such as:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

The current Desktop live connection path is deeper for **Codex**. Do not infer full Desktop support for every provider from Core's provider-neutral contracts.

Provider output is evidence/candidate material. It does not become Project Truth or mutation Authority merely because it arrived through MCP or a Desktop connection.

## Platform scope

Current published Desktop Preview:

- Windows x64.

Core/CLI and protected Guardian paths have broader platform-specific implementation history, but that does not make the current Desktop Preview a Linux/macOS Desktop release.

A future Desktop platform release requires its own qualified distribution/installation evidence.

## What the current Preview does not claim

Livariant does **not** currently claim:

- Stable-release compatibility guarantees;
- final production Windows publisher signing/reputation;
- a finished persistent Project Truth editor in Desktop;
- a complete normal existing-project adoption UI/path;
- every provider, authentication method, model-selection option, or provider-native feature;
- universal automatic requirement discovery;
- automatic manufacture of independently trustworthy verification evidence;
- universal correctness verification for arbitrary code;
- automatic repair of every drift/conflict;
- unrestricted autonomous repository mutation;
- broad multi-agent orchestration/concurrent-agent containment as a finished user feature;
- a general third-party plugin/marketplace execution model;
- exact provider-billed token/cost savings from proxy measurements;
- Stable Livariant-on-Livariant self-hosting.

## Planned direction — not current capability

Current near-term direction is:

1. finish Desktop security/performance hardening;
2. complete the normal existing-project adoption path;
3. deepen persistent First Steps / Project Truth integration under Evidence/Review/Authority boundaries;
4. extend provider/connection support deliberately;
5. begin Livariant-on-Livariant self-hosting only after normal adoption works, initially Read / Observe / Propose.

This is roadmap direction, not a release promise.

## Where to start

- [Installation & First Project](installation.md)
- [Five-Minute Quickstart](quickstart.md)
- [Architecture & Safety](architecture-and-safety.md)
- [Privacy & Network Behavior](privacy-and-network.md)
- [Updates, Migrations & Recovery](lifecycle-guide.md)
