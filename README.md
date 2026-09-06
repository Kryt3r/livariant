<img width="1851" height="737" alt="Livariant" src="https://github.com/user-attachments/assets/e5e1c73b-b4fd-4df4-8b0a-1d278ac12d3e" />

<p align="center">
  <strong>English</strong> · <a href="README.de.md">Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/Kryt3r/livariant/releases/tag/desktop-preview-0.1.0-rc.28-ec2916979c19"><img alt="Desktop Preview" src="https://img.shields.io/badge/Desktop%20Preview-0.1.0--rc.28-0ea5e9" /></a>
  <img alt="Windows x64" src="https://img.shields.io/badge/Desktop-Windows%20x64-2563eb" />
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-PolyForm%20Perimeter-7c3aed" /></a>
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-default-06b6d4" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-supported-a855f7" />
</p>

# Livariant

**LLM-assisted development is fast. Long-running software work exposes the parts a chat does not reliably preserve: context, decisions, evidence, change authority, documentation, and recovery state.**

Livariant is a local-first reliability and governance layer for AI-assisted software development. It gives the **project** durable context and explicit rules for what is evidence, what is accepted project truth, what may change, what has actually been verified, and what must fail closed.

## The problem Livariant addresses

Vibe-coding and coding agents can work extremely well until a project becomes larger, older, or more consequential. Then predictable failure modes appear:

- **context gets lost** across chats, agents, providers, and long sessions;
- **decisions contradict each other** or old assumptions quietly return;
- **plausible AI output becomes a project change** without a clear authority boundary;
- **"done" is asserted more strongly than the available evidence supports**;
- **documentation and project knowledge drift** away from what the software actually does;
- **handoffs, updates, migrations, and recovery** become inconsistent or hard to reconstruct.

Livariant does not try to make an LLM infallible. It makes the surrounding project state harder to corrupt accidentally.

## What Livariant does today

| Failure mode | Current Livariant response |
| --- | --- |
| Context loss | A project-owned **Project Brain**, bounded Project Context snapshots, provider handoff/context-return surfaces, and stable project identity. |
| Contradictory or stale knowledge | Semantic proposal, drift/conflict assessment, controlled understanding/adoption, and semantic maintenance foundations. |
| Unintended consequential changes | Explicit **Authority** boundaries, plan-first flows, Guardian-protected consequential authority, and fail-closed handling of ambiguous/stale trust state. |
| Unsupported "done" claims | **Verification Trace** classifies supplied requirement/implementation/evidence relationships as `SUPPORTED`, `CONTRADICTED`, or `UNPROVEN`. |
| External/agent material becoming truth too easily | Provider output, findings, external knowledge, and other derived material remain **Evidence** until the supported review/adoption path accepts something as Project Truth. |
| Lifecycle/recovery mistakes | Separate initialization, update, migration, checkpoint, recovery, Runtime-trust, and release-authorization boundaries. |

These are implemented foundations with deliberately bounded scope. Livariant does **not** claim universal code correctness, automatic trustworthy evidence generation, unrestricted autonomous mutation, or perfect detection of every contradiction.

## Desktop app — the main graphical surface

The Livariant Desktop app is the central graphical interface for normal day-to-day use. The current published Desktop Preview is **`0.1.0-rc.28` for Windows x64**.

> [!WARNING]
> **Early Development / Preview**
>
> Livariant is still in an early development phase. The Desktop app is usable as a Preview, but workflows, compatibility, and individual surfaces can still change. Do not treat Preview behavior as a Stable-release guarantee. The Windows installer also does not yet have the final production Authenticode publisher-signing/reputation setup, so Windows may show publisher/SmartScreen warnings depending on system policy and reputation.

Current Desktop areas include:

- **Project Truth / First Steps** — a curated workspace for project purpose, direction, rules, gaps, proposals, and manual review. The current renderer includes foundation/session-state behavior here; it must not be confused with fully persistent Project Brain mutation.
- **Connections** — local provider/agent connection management around the currently implemented Codex connection boundary, including persisted connection intent and restore behavior.
- **Diagnostics** — truthful local diagnostics/efficiency evidence with explicit time ranges and the permanent distinction `Observed != Avoided != Estimated`.
- **Updates** — signed Desktop update discovery, localized EN/DE patch notes, real download state, and an explicitly authorized install/restart flow.
- **Settings** — application language plus connection/system configuration and runtime identity/health information.

### Current Desktop screenshots

The repository does not currently contain a canonical set of Desktop screenshot assets. This documentation refresh will only add screenshots that are verified to represent the accepted current Desktop visual baseline; no mock or invented screenshot will be presented as product evidence.

### Small roadmap — planned, not already implemented

The next product direction is intentionally narrower than a giant feature list:

1. finish the active **Desktop security/performance hardening** work;
2. complete the normal **existing-project adoption** path so real projects can be onboarded without special treatment;
3. deepen persistent **First Steps / Project Truth** integration while preserving `Evidence -> Review -> Project Truth` and single-mutation-authority boundaries;
4. extend provider/connection support beyond the currently implemented connection surface;
5. begin **Livariant-on-Livariant self-hosting** only after the normal adoption path works, starting with Read / Observe / Propose rather than mutation authority.

Roadmap items are direction, not current capability or release promises.

## The core model

Livariant separates concepts that AI-assisted workflows often blur together:

```text
Inspect / observe
      ↓
Evidence + bounded context
      ↓
Understand / assess / propose
      ↓
Review + explicit Authority where required
      ↓
Mutate
      ↓
Verify
```

Permanent boundaries include:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Verification evidence != accepted completion
Persistence != Trust
Presence != Currency
Ambiguous consequential state -> Fail Closed
```

The practical consequence is simple: a model can suggest, infer, inspect, or even technically possess a capability without that becoming permission to rewrite canonical project state.

## Project-owned continuity

Livariant's local Project Brain provides durable project context that does not belong to one chat or one model:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Supporting foundations include Project Context snapshots, provider context/return evidence, external-knowledge evidence, guided understanding/review, semantic proposal/drift assessment, findings, and Verification Trace.

A copied sentence, provider result, stale context packet, external note, or stored finding is not automatically Project Truth merely because it exists.

## Agent and MCP integration

Livariant includes a local stdio MCP bridge for compatible coding agents. Current bounded tools include:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

The CLI can also render explicit provider setup guidance for Claude Code and Codex:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

Those commands do not silently rewrite provider configuration. MCP transport also does not create mutation Authority or turn provider output into Project Truth.

The Desktop connection surface currently has a deeper implemented local Codex connection path. Additional providers and connection methods remain future extensions unless separately implemented and qualified.

## Safety and trust principles

Livariant is preservation-first:

- consequential mutation is explicit;
- capability and Authority are separate;
- stale, substituted, ambiguous, or malformed consequential trust state fails closed;
- historical evidence is not silently rewritten;
- external knowledge and provider output remain evidence until reviewed/adopted;
- update availability is not install authorization;
- verification evidence is not automatically accepted completion;
- Project Brain state is local by default;
- Livariant usage telemetry is not currently implemented.

If project context is sent to an external AI provider, that provider's terms, retention settings, and security model apply.

## Install / Quickstart

### Normal Windows Desktop path

The current published graphical Preview is:

- **Desktop:** `0.1.0-rc.28`
- **Platform:** Windows x64
- **Exact published source:** `ec2916979c1911a56203878d7102570ab71cd13c`
- **Installer:** `Livariant_0.1.0-rc.28_x64-setup.exe`
- **Installer SHA-256:** `2897e2bf7940b8d222b382bd6c3548861cd8dd5bbfbcca097783f08f6a21579d`

Download it from the immutable [Desktop Preview rc.28 release](https://github.com/Kryt3r/livariant/releases/tag/desktop-preview-0.1.0-rc.28-ec2916979c19), verify the release identity, install it, and open Livariant.

Then use the app to inspect its current runtime state, configure a supported connection, work through Project Truth / First Steps, inspect Diagnostics, and use the explicit update flow when a signed compatible update is available.

See [Installation](docs/installation.md) and the [Five-Minute Quickstart](docs/quickstart.md) for the full current flow and limitations.

### CLI / advanced control surfaces

Livariant Core and CLI remain important for provider-independent inspection, MCP setup, lifecycle operations, Guardian/protected-authority workflows, and lower-level diagnostics. The historical `v0.1.0-rc.4` CLI Public Preview is an immutable older release surface; it is **not** the current Desktop Preview and later Desktop capabilities are not retroactively part of RC4.

## Current Preview boundaries

The current product is a Preview. In particular, Livariant does not currently claim:

- Stable-release compatibility guarantees;
- a complete persistent Project Truth editor in the Desktop renderer;
- every provider or every provider connection method;
- universal automatic requirement discovery;
- automatic creation of independently trustworthy verification evidence;
- universal correctness verification for arbitrary code;
- automatic repair of every drift/conflict;
- unrestricted autonomous repository mutation;
- broad multi-agent orchestration or a third-party plugin marketplace;
- exact provider-billed token/cost savings from proxy measurements.

See [Public Preview Scope & Limitations](docs/preview-scope.md).

## Documentation

Start here:

1. [Installation & First Project](docs/installation.md)
2. [Five-Minute Quickstart](docs/quickstart.md)
3. [Public Preview Scope & Limitations](docs/preview-scope.md)
4. [Architecture & Safety](docs/architecture-and-safety.md)
5. [First-Run Composition](docs/first-run.md)
6. [Existing Projects](docs/existing-projects.md)
7. [Local MCP Agent Bridge](docs/mcp-agent-bridge.md)
8. [Provider Handoff](docs/provider-handoff.md)
9. [Verification Trace](docs/verification-trace.md)
10. [Privacy & Network Behavior](docs/privacy-and-network.md)
11. [Updates, Migrations & Recovery](docs/lifecycle-guide.md)

German documentation starts at [README.de.md](README.de.md).

## Architecture and technical details

Livariant currently combines:

- a TypeScript/Node.js Core and CLI;
- a Tauri 2 Desktop application with a Rust host and host WebView frontend;
- protected Guardian/Authority boundaries for consequential operations;
- a local stdio MCP bridge;
- project-local Project Brain state;
- provenance-aware evidence and verification contracts;
- signed Desktop updater metadata and release identity.

The Desktop renderer is not a root of trust and does not create an alternate project truth store. Platform-specific process, filesystem, updater, installer, and protected-authority behavior stays behind explicit host/Core boundaries.

See [Architecture & Safety](docs/architecture-and-safety.md) for the deeper model.

## Licensing, security, and contributions

Livariant is source-available, not OSI-approved Open Source. It is licensed under the [PolyForm Perimeter License 1.0.1](LICENSE).

Do not post suspected vulnerability details in a public issue. Follow [SECURITY.md](SECURITY.md).

External code contributions are currently gated while contributor-rights terms compatible with the source-available and future commercial-licensing model are finalized. Bug reports, documentation feedback, questions, and design discussion are welcome.

- [Licensing](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

**Livariant does not require the AI to be perfect. It requires consequential project state to remain reviewable, attributable, and explicitly controlled when the AI is not.**