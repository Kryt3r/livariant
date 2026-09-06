# Livariant Desktop

This directory contains the current Tauri 2 Desktop application for Livariant.

The Desktop is no longer just a placeholder shell: it is the central graphical normal-user surface for the current Windows Preview. It still remains a **Preview** and does not replace Livariant Core, Project Brain, Guardian, or protected Authority boundaries with renderer-owned state.

## Current published Preview

The canonical published Desktop Preview at this documentation reconciliation is:

```text
Version: 0.1.0-rc.28
Platform: Windows x64
Exact source: ec2916979c1911a56203878d7102570ab71cd13c
Tag: desktop-preview-0.1.0-rc.28-ec2916979c19
```

The current repository may contain later unreleased changes. Repository state is not publication.

## Current Desktop surfaces

### Project Truth / First Steps

The current renderer provides a curated workspace around project purpose, direction, rules, gaps, proposals, source presentation, and explicit review.

Important boundary: the current workspace still contains renderer/session-state foundation behavior. It must not invent a second Project Truth store or claim fully persistent Project Brain mutation until the supported bridge/Authority path exists.

### Connections

The Desktop contains the live local connection surface around the currently implemented Codex connector boundary. It uses the bounded local connector-host/App Server path, supports persisted connection intent, and can restore an accepted connection on later app start subject to the executable/trust checks implemented by the host.

Permanent rule:

```text
Provider != Connection Method != Capability != Role != Authority
Connection != Authority
```

Additional providers/connection methods are future extensions unless separately implemented and qualified.

### Diagnostics

Diagnostics reads retained local evidence and preserves:

```text
Observed != Avoided != Estimated
```

The UI supports explicit time-range selection and must show missing/unavailable evidence honestly rather than fabricating historical usage, savings, trends, or provider attribution.

Diagnostics collection does not require raw prompt/project-content capture by default.

### Updates

The Desktop has a real signed updater flow with:

- fixed configured update feed/public key;
- signed release metadata/artifacts;
- localized EN/DE release notes;
- real download state;
- explicit install/restart authorization;
- no invented progress values.

The renderer cannot choose arbitrary update URLs or executable paths. Update availability is not installation Authority.

### Settings and localization

Settings currently includes General, Connections, and System sections. The app provides Deutsch/English switching with local preference persistence, while machine identifiers, command names, and security semantics remain language-independent.

## Runtime/security boundary

The Desktop uses a Rust/Tauri host plus a framework-light TypeScript/CSS renderer.

The renderer is **not** a root of trust. Consequential process, filesystem, updater, Runtime identity, connector, and Authority decisions remain behind host/Core/protected boundaries.

Current hardening includes, among other controls:

- production CSP/navigation restrictions;
- narrow Tauri capability exposure;
- validated IPC arguments;
- shell-free Codex execution;
- persisted accepted Codex executable identity;
- deterministic locked Desktop dependency inputs;
- fixed updater endpoint/key configuration;
- escaped/text-based rendering for untrusted dynamic content where required.

Runtime health is a coherence/integrity signal, not an independent post-install cryptographic anti-tamper proof.

## Early-development status

The Desktop is still under active hardening and product integration. Current near-term direction is:

1. complete security/performance hardening;
2. finish normal existing-project adoption;
3. deepen persistent First Steps / Project Truth integration without bypassing Evidence -> Review -> Project Truth and Mutation Authority;
4. extend provider/connection support deliberately;
5. later begin Livariant-on-Livariant self-hosting with Read / Observe / Propose first.

These are roadmap items, not already-delivered Desktop capabilities.

The accepted WP-051 visual baseline is intentionally preserved unless explicitly reopened.

## Development

From `apps/desktop`:

```bash
npm ci
npm run tauri:dev
```

Production/release-oriented Desktop builds use the locked dependency inputs and Tauri build pipeline defined by the repository:

```bash
npm run tauri:build
```

Do not treat a local development build as a published/qualified Preview artifact.

## Scope boundary

Do not silently turn renderer convenience into canonical mutation Authority, invent Diagnostics/update state, or advertise planned marketplace/cloud/self-hosting/provider work as current capability.

For current public user documentation, start at the repository root [README](../../README.md) and [docs/preview-scope.md](../../docs/preview-scope.md).
