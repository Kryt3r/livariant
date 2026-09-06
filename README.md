<img width="1851" height="737" alt="Livariant" src="https://github.com/user-attachments/assets/e5e1c73b-b4fd-4df4-8b0a-1d278ac12d3e" />

<p align="center">
  <strong>English</strong> · <a href="README.de.md">Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/Kryt3r/livariant/releases"><img alt="Desktop Preview" src="https://img.shields.io/badge/Desktop-Preview-0ea5e9" /></a>
  <img alt="Windows x64" src="https://img.shields.io/badge/Desktop-Windows%20x64-2563eb" />
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-PolyForm%20Perimeter-7c3aed" /></a>
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-default-06b6d4" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-supported-a855f7" />
</p>

# Livariant

**Coding agents are getting better at doing more work. The harder problem is keeping a real software project trustworthy while they do it.**

Over a long-running project, LLM-assisted development repeatedly runs into the same structural weaknesses:

- context disappears between sessions, tools, and providers;
- old decisions return after they were already replaced;
- plausible inference can be mistaken for accepted project knowledge;
- an agent may be technically capable of changing something without being authorized to change it;
- "done" can be reported more confidently than the available verification evidence supports;
- documentation, architecture notes, and working assumptions drift away from the actual product;
- updates, migrations, failures, and interrupted work become difficult to reconstruct safely;
- switching models or agents often means rebuilding context from scratch.

These are not theoretical edge cases. They become more important as coding agents move from suggesting a few lines to changing many files, running tools, preparing migrations, and working for longer periods with less supervision.

**Livariant is being built as a provider-neutral reliability and governance layer around AI-assisted software development.** It does not try to make one model infallible. It gives the project durable state and explicit boundaries for what is evidence, what is accepted truth, what may change, what was actually verified, and what must stop when the state is ambiguous.

## The market already solves parts of this

Livariant is not based on the claim that nobody noticed these problems.

Current tools already address individual pieces:

- editor and agent products provide persistent project rules and instructions;
- repository-memory systems retain facts, preferences, and development history across sessions;
- review products inspect AI-generated changes;
- quality and security platforms add gates around generated code;
- orchestration and agent frameworks improve tool use and task execution.

Representative examples include [Cursor Rules](https://docs.cursor.com/context/rules), [GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory), [projectmem](https://projectmem.dev/), [Sonar AI Code Assurance](https://www.sonarsource.com/solutions/ai-code-assurance/), and AI review products such as [CodeRabbit](https://www.coderabbit.ai/).

The opportunity Livariant is targeting is different:

> **The individual reliability problems are increasingly recognized, but they are still commonly handled as separate features, separate tools, or provider-specific state.**

Memory does not automatically solve Authority. Review does not automatically solve durable Project Truth. CI does not automatically solve context continuity. A provider-specific memory does not automatically survive a provider switch. A successful test run does not automatically prove that every requirement is satisfied. A recovery mechanism does not automatically know which project state was actually authorized.

Livariant's thesis is that these concerns become more useful when they are designed as one coherent system rather than added independently around the agent.

## What Livariant brings together

Livariant is designed around a combined reliability model:

```text
Durable Project Truth
+ Evidence and provenance
+ explicit Authority
+ provider-neutral continuity
+ Verification Trace
+ conflict and drift handling
+ controlled autonomy
+ lifecycle and recovery
+ diagnostics and observability
```

The important part is not the number of features. It is the separation between concepts that LLM workflows easily blur together:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Verification evidence != accepted completion
Persistence != Trust
Presence != Currency
```

A model can be useful, confident, connected, and technically capable while still being wrong. Livariant is designed so that none of those properties alone silently promote its output into durable project state.

## What Livariant can already do

Today, Livariant already contains working foundations for:

| Problem | Current Livariant response |
| --- | --- |
| Context loss | Project-owned **Project Brain**, bounded Project Context, provider context/return flows, and stable project identity. |
| Stale or contradictory knowledge | Semantic proposal, drift/conflict assessment, guided understanding, controlled adoption, and semantic-maintenance foundations. |
| Unintended consequential changes | Explicit **Authority** boundaries, plan-first mutation, Guardian-protected consequential authority, and fail-closed handling of stale or ambiguous trust state. |
| Unsupported "done" claims | **Verification Trace** classifies supplied requirement/implementation/evidence relationships as `SUPPORTED`, `CONTRADICTED`, or `UNPROVEN`. |
| Agent or external material becoming truth too easily | Provider output, findings, external knowledge, and derived material remain **Evidence** until an accepted review/adoption path promotes something to Project Truth. |
| Provider continuity | Local MCP integration, provider context/return surfaces, Claude Code/Codex setup paths, and a deeper current Desktop connection path for Codex. |
| Lifecycle and recovery mistakes | Separate initialization, update, migration, checkpoint, recovery, Runtime-trust, and release-authorization boundaries. |
| Observability | Local Diagnostics foundations that keep `Observed`, `Avoided`, and `Estimated` evidence explicitly separate. |

These are deliberately bounded capabilities. Livariant does **not** currently claim universal code verification, automatic trustworthy evidence generation, unrestricted autonomous mutation, perfect conflict detection, or support for every provider and workflow.

## Desktop app

The Desktop app is intended to be the main user-facing surface of Livariant rather than requiring normal users to operate the system through a command-heavy workflow.

> [!WARNING]
> **Early development / Preview**
>
> Livariant is still under active development. The Desktop app is usable as a Preview, but workflows, compatibility, and individual surfaces may still change before the first public product release. The Windows installer also does not yet have the final production Authenticode publisher-signing/reputation setup, so Windows may show publisher or SmartScreen warnings depending on policy and reputation.

Current Desktop areas include:

- **Project Truth / First Steps** - project purpose, direction, rules, gaps, proposals, and manual review. The current renderer still contains foundation/session-state behavior here and must not be mistaken for a fully persistent Project Brain editor.
- **Connections** - local provider/agent connection management around the currently implemented connection boundary, including persisted connection intent and restore behavior.
- **Diagnostics** - local reliability/efficiency evidence with explicit periods and the permanent distinction `Observed != Avoided != Estimated`.
- **Updates** - signed update discovery, localized EN/DE release notes, real download state, and an explicitly authorized install/restart flow.
- **Settings** - language, connection/system configuration, and runtime identity/health information.

### Screenshots

Current screenshots will be added here once a verified set representing the accepted Desktop visual baseline is available. Mockups or obsolete screenshots will not be presented as current product evidence.

## Target for the first public product release

This roadmap describes the **intended user-facing product baseline for the first public release**, not the order in which engineering tasks happen and not a claim that every item is complete today.

The target is for a user to be able to:

1. **Install and use Livariant primarily through the Desktop app** with a coherent onboarding, update, diagnostics, and settings experience.
2. **Connect an existing real project without restructuring it for Livariant**, inspect what already exists, and adopt project knowledge deliberately.
3. **Keep durable project context across long-running work**, so important goals, decisions, constraints, known facts, and unresolved questions do not depend on one chat window.
4. **Move between supported coding agents/providers without losing the project's reliability layer**, including persistent connection intent where supported and provider-neutral project continuity.
5. **Keep Evidence separate from Project Truth**, including agent output, findings, discovery results, and external knowledge.
6. **Review conflicting or stale project knowledge instead of silently overwriting it**, with traceable replacement/supersession semantics where supported.
7. **Use controlled autonomy rather than all-or-nothing automation**, so routine low-risk work can stay lightweight while consequential decisions still stop at explicit boundaries.
8. **Verify claims more rigorously than an agent saying "done"**, using Verification Trace and risk-appropriate verification evidence.
9. **Recover from interrupted or unsafe lifecycle state without guessing**, with explicit update, migration, checkpoint, recovery, and trust boundaries.
10. **Inspect local Diagnostics without invented savings or fabricated certainty**, including clear provenance and separation of observed, avoided, and estimated values.
11. **Remain local-first by default**, without requiring a Livariant cloud account or automatic upload of Project Brain state for normal local use.

That is the product Livariant is aiming to make useful: not another coding agent, but a durable reliability layer that can stay with the project while agents, models, sessions, and tools change around it.

## The critical product constraint: reliability without killing speed

Livariant only succeeds if the extra reliability is worth the friction.

A system that stops the user for every harmless edit, produces constant warnings, or turns a small change into a governance ceremony would defeat one of the main reasons people use coding agents in the first place.

The intended behavior is therefore **risk-based**:

- low-risk, read-only, and routine work should require as little friction as practical;
- meaningful uncertainty should become visible rather than silently ignored;
- consequential changes should become more explicit as their impact and trust requirements increase;
- hard Authority boundaries must not be weakened merely to make the workflow feel faster.

The goal is not maximum process. It is **the minimum process needed to keep the project trustworthy**.

## How Livariant works

At a high level:

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

Livariant's local Project Brain provides project-owned durable context:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

A copied sentence, provider result, stale context packet, external note, or finding is not automatically Project Truth merely because it exists.

## Agent and MCP integration

Livariant includes a local stdio MCP bridge for compatible coding agents. Current bounded tools include:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

The CLI can also render explicit setup guidance for Claude Code and Codex:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

These commands do not silently rewrite provider configuration. MCP transport also does not create mutation Authority or turn provider output into Project Truth.

## Safety and trust principles

Livariant is preservation-first:

- consequential mutation is explicit;
- capability and Authority are separate;
- stale, substituted, ambiguous, or malformed consequential trust state fails closed;
- historical evidence is not silently rewritten;
- external knowledge and provider output remain Evidence until reviewed/adopted;
- update availability is not install authorization;
- verification evidence is not automatically accepted completion;
- the Desktop renderer is not a root of trust;
- Project Brain state is local by default;
- Livariant usage telemetry is not currently implemented.

If project context is sent to an external AI provider, that provider's terms, retention settings, and security model apply.

## Installation and Quickstart

For normal Desktop use, download the **latest qualified Desktop Preview** from the [GitHub Releases](https://github.com/Kryt3r/livariant/releases) page and follow the current [Installation](docs/installation.md) and [Five-Minute Quickstart](docs/quickstart.md).

Exact release identities, supported platforms, known Preview limitations, artifact information, and historical release boundaries live in [Public Preview Scope & Limitations](docs/preview-scope.md) rather than being duplicated throughout this README.

The Core/CLI remains available for provider-independent inspection, MCP setup, lifecycle operations, Guardian/protected-authority workflows, and lower-level diagnostics.

## Current Preview boundaries

Livariant does not currently claim:

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

## Longer-term direction

Beyond the first public product baseline, Livariant may build further on the same trust model with areas such as richer failure memory, continuously refreshed engineering intelligence, independent review/critic layers, privacy-preserving aggregated real-world reliability evidence, broader provider support, and eventually controlled Livariant-on-Livariant self-hosting.

Those are future directions, not current capability claims.

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

**Livariant does not need one model to be perfect. It needs the project to remain understandable, reviewable, and recoverable when the model is not.**
