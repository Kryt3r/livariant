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

## Your project should not forget just because your chat did.

Coding agents are getting more capable. Yet the next chat often starts with reconstruction, old decisions quietly return, and "the tests are green" can turn into "done" faster than the available evidence really supports.

The more an agent can change on its own, the more this matters.

> **Livariant is not another coding agent. It is the reliability layer that stays with the project while chats, models, agents, and tools change.**

The goal: move faster with AI without losing project knowledge, control, and traceability to individual sessions or providers.

---

## What Livariant changes

Many current tools improve one part of the problem: memory, rules, review, CI, quality gates, or agent orchestration.

Livariant treats these questions as **one connected system**:

| Instead of... | Livariant aims to... |
| --- | --- |
| rebuilding context again and again | keep important project knowledge with the project |
| treating every AI statement like truth | keep Evidence separate from accepted Project Truth |
| confusing "the agent can" with "the agent may" | put consequential changes behind explicit Authority boundaries |
| reading "tests passed" as "everything is complete" | show what is supported, contradicted, or still unproven |
| losing project understanding when switching providers | keep continuity as provider-neutral as practical |
| guessing after failures | make updates, migrations, and recovery easier to reconstruct |

**Let the models reason and work. Let the project keep the memory, rules, evidence, decisions, and control.**

---

## What already exists today

Livariant is still in early development, but working foundations already exist for:

- **Project Continuity** through a local, project-owned Project Brain;
- **Evidence before Truth**, so agent output does not automatically become project knowledge;
- **Authority boundaries** for consequential changes;
- **Verification Trace** with `SUPPORTED`, `CONTRADICTED`, and `UNPROVEN`;
- **agent/provider continuity** through MCP foundations and current Claude Code/Codex paths;
- **lifecycle and recovery** for initialization, updates, migrations, and unsafe states;
- **truthful Diagnostics** that do not mix observed, avoided, and estimated values.

Livariant does not claim to make AI infallible or to automatically prove arbitrary code correct.

---

## Desktop first

The Desktop app is being built as the normal way to use Livariant: understand project state, connect agents, review what matters, inspect diagnostics, manage settings, and handle updates without first learning Livariant as a CLI system.

> [!WARNING]
> **Early Development / Preview**
>
> Livariant is still under active development. Important workflows are still being completed and individual surfaces may change before the first public product release. The Windows installer also does not yet have final production publisher signing/reputation, so Windows may show SmartScreen or publisher warnings.

Current Desktop areas: **Project Truth / First Steps**, **Connections**, **Diagnostics**, **Updates**, and **Settings**.

<details>
<summary><strong>Show current Desktop screenshots</strong></summary>

<br/>

The gallery shows the current **Project Truth**, **Connections**, **Diagnostics**, **Updates**, and **Settings** surfaces.

<p align="center">
  <img src="docs/assets/screenshots/desktop/en/gallery.svg" alt="Current Livariant Desktop screenshots in English" width="900" />
</p>

</details>

---

## Target for the first public release

By the first public product release, a user should want Livariant because it solves something tangible in day-to-day AI development:

- connect an existing project without rebuilding it around Livariant;
- keep important context and decisions across sessions;
- switch between supported agents without mentally resetting the project;
- surface stale or conflicting knowledge and resolve it deliberately;
- keep low-risk work lightweight while putting stronger boundaries around consequential changes;
- make "done" depend more on traceable verification;
- recover from updates, migrations, or interruptions without guessing which state can still be trusted;
- use the system primarily through a clear Desktop app and remain local-first by default.

**The goal is not more process. The goal is more confidence per interruption.**

---

<details>
<summary><strong>Why Livariant if memory, review, and quality tools already exist?</strong></summary>

Livariant is not based on the claim that nobody else sees these problems. Persistent rules, repository memory, AI-code review, and quality gates are all becoming more important.

Examples include [Cursor Rules](https://docs.cursor.com/context/rules), [GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory), [projectmem](https://projectmem.dev/), [Sonar AI Code Assurance](https://www.sonarsource.com/solutions/ai-code-assurance/), and [CodeRabbit](https://www.coderabbit.ai/).

Livariant's thesis is that memory alone does not solve Authority, review does not automatically create Project Truth, CI does not replace continuity, and provider-specific memory remains provider-specific when the provider changes.

The opportunity is therefore not another isolated feature, but a shared reliability layer around the project itself.

</details>

<details>
<summary><strong>Technical foundations</strong></summary>

Livariant deliberately keeps several concepts separate:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Verification evidence != accepted completion
Persistence != Trust
Presence != Currency
```

The local Project Brain belongs to the project. A local stdio MCP bridge currently exposes, among others, `livariant_provider_context`, `livariant_provider_return`, and `livariant_verification_trace`. The Desktop app uses Tauri 2 with a Rust host; the renderer is not a root of trust.

See [Architecture & Safety](docs/architecture-and-safety.md) for more.

</details>

<details>
<summary><strong>Current Preview boundaries and longer-term direction</strong></summary>

Livariant does not currently claim universal code correctness verification, automatically trustworthy evidence, perfect conflict detection, unrestricted autonomous repository mutation, or support for every provider.

Longer-term, the same model may expand into richer failure memory, engineering intelligence, independent review/critic layers, broader provider support, privacy-preserving aggregated reliability evidence, and eventually controlled Livariant-on-Livariant self-hosting.

See [Public Preview Scope & Limitations](docs/preview-scope.md) for the exact current boundaries.

</details>

---

## Documentation

Want the short path first? Start with the Quickstart. Want the trust model or lifecycle details? Go deeper from there.

| Guide | What it covers |
| --- | --- |
| [Five-Minute Quickstart](docs/quickstart.md) | the shortest path to first use |
| [Installation & First Project](docs/installation.md) | installation, setup, and first project flow |
| [Public Preview Scope & Limitations](docs/preview-scope.md) | what the Preview does and does not promise |
| [Architecture & Safety](docs/architecture-and-safety.md) | trust model, Authority boundaries, and architecture |
| [Existing Projects](docs/existing-projects.md) | adopting a real existing project safely |
| [Local MCP Agent Bridge](docs/mcp-agent-bridge.md) | MCP integration and current agent-facing tools |
| [Provider Handoff](docs/provider-handoff.md) | provider continuity and context handoff |
| [Privacy & Network Behavior](docs/privacy-and-network.md) | local-first behavior, provider boundaries, and network use |
| [Updates, Migrations & Recovery](docs/lifecycle-guide.md) | lifecycle changes and recovery behavior |

---

## Try it

For normal Desktop use, download the **latest qualified Desktop Preview** from [GitHub Releases](https://github.com/Kryt3r/livariant/releases).

Then continue with [Installation & First Project](docs/installation.md) or the [Five-Minute Quickstart](docs/quickstart.md).

---

## License, security, and contributions

Livariant is source-available under the [PolyForm Perimeter License 1.0.1](LICENSE). Please do not post suspected security issues publicly; follow [SECURITY.md](SECURITY.md).

External code contributions are currently gated; bug reports, documentation feedback, questions, and design discussion are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

<p align="center">
  <strong>Livariant is not trying to make one AI perfect.<br/>It is trying to keep your project reliable when the AI is not.</strong>
</p>
