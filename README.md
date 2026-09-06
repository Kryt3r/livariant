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

AI can build software astonishingly fast.

But anyone who has worked with coding agents for more than a few sessions eventually runs into a different problem:

> The model is getting better. The project around it is still surprisingly easy to lose control of.

You start a new chat and have to explain the project again.

You switch from one agent to another and important context stays behind.

A decision you rejected three weeks ago quietly appears again.

An agent says "done" because the tests it happened to run passed, while another requirement was never checked.

Documentation says one thing, the code says another, and the next agent treats whichever one it finds first as truth.

A migration or update goes wrong and suddenly the hardest question is not "can AI fix this?" but "what was the last state we could actually trust?"

**Livariant is being built for that problem.**

It is not another coding agent. It is the layer that stays with the project while chats, models, agents, tools, and sessions change around it.

---

## The missing layer around coding agents

Today, many products already solve pieces of the problem:

| Already getting better | Still often disconnected |
| --- | --- |
| Persistent rules and memories | Which information is actually still valid? |
| Longer agent sessions | Which decisions must survive the next session? |
| Code review agents | What was only a suggestion, and what became accepted project knowledge? |
| CI and quality gates | What was really verified, and what was merely assumed? |
| More autonomous agents | What may the agent actually change without asking? |
| Provider-specific memory | What happens when you switch provider? |

That fragmentation matters more as agents become more capable.

When an AI only autocompletes a line, forgotten context is annoying.

When an agent can change dozens of files, run commands, prepare migrations, update dependencies, and work for long periods, forgotten context becomes a reliability problem.

### Livariant's idea is simple

> **Let the models do the reasoning. Let the project keep the memory, rules, evidence, decisions, and control.**

Instead of asking every provider to become the permanent brain of your project, Livariant aims to make the project itself the durable source of continuity.

So you can change the model without changing what the project knows.

Change the agent without losing the decisions that matter.

Move faster without turning every AI suggestion into unquestioned truth.

---

## What changes with Livariant

<table>
<tr>
<td width="50%" valign="top">

### Without Livariant

- Every new session starts with reconstruction.
- Important context lives inside individual chats or tools.
- Old decisions can quietly return.
- Agent output can look more authoritative than it really is.
- "Tests passed" can turn into "everything is done".
- Switching providers can mean rebuilding context again.
- Recovery after a bad change depends heavily on human memory.

</td>
<td width="50%" valign="top">

### With Livariant

- Important project knowledge has a durable home.
- Evidence and accepted project truth are kept separate.
- Decisions can stay traceable across sessions.
- An agent being able to do something is not the same as being allowed to do it.
- Verification can show what is supported, contradicted, or still unproven.
- The reliability layer belongs to the project, not one provider.
- Updates, migrations, and recovery can follow explicit project state.

</td>
</tr>
</table>

Livariant does not try to make AI perfect.

**It tries to make imperfect AI much safer to use on software that needs to survive longer than one chat.**

---

## What Livariant already offers

Livariant is still in early development, but the product already has working foundations rather than being only a concept.

### Project continuity

A local, project-owned Project Brain gives important goals, decisions, knowledge, and context a place that is independent from a single chat or model.

### Evidence before truth

Agent output, discovered information, findings, and external knowledge do not automatically become accepted project truth just because an LLM produced or found them.

### Safer change boundaries

Livariant separates "the agent can do this" from "the agent is allowed to do this" and protects consequential operations behind explicit authority boundaries.

### Verification that can still say "we do not know"

Verification Trace can classify supplied relationships between requirements, implementation, and evidence as `SUPPORTED`, `CONTRADICTED`, or `UNPROVEN` instead of forcing a false green result.

### Continuity across agents

Livariant already provides local MCP foundations, provider context/return flows, setup paths for Claude Code and Codex, and a deeper local Desktop connection path for Codex.

### Recovery and lifecycle foundations

Initialization, updates, migrations, checkpoints, recovery, runtime trust, and release authority are treated as separate reliability concerns rather than one generic "update" action.

### Truthful diagnostics

Diagnostics deliberately separates what was actually observed from what was avoided or merely estimated. Livariant should not invent impressive-looking savings numbers just to make itself look useful.

---

## The Desktop app is where this becomes usable

Livariant is not intended to remain a collection of CLI commands and engineering concepts.

The Desktop app is being built as the normal way to work with Livariant: connect projects and agents, understand project state, review what matters, inspect diagnostics, manage settings, and handle updates through one graphical surface.

> [!WARNING]
> **Early Development / Preview**
>
> Livariant is still under active development. The Desktop app is usable as a Preview, but important workflows are still being completed and individual surfaces may change before the first public product release. The Windows installer also does not yet have final production publisher signing/reputation, so Windows may show SmartScreen or publisher warnings depending on system policy and reputation.

Current Desktop areas include:

| Area | What it is for |
| --- | --- |
| **Project Truth / First Steps** | Understand project purpose, direction, rules, gaps, and proposals. Persistent Project Brain editing is not fully complete yet. |
| **Connections** | Manage supported local agent/provider connections and restore connection intent where supported. |
| **Diagnostics** | Inspect local reliability and efficiency evidence without mixing observed facts with estimates. |
| **Updates** | Discover signed updates, read localized release notes, follow real download progress, and explicitly authorize install/restart. |
| **Settings** | Manage language, connection/system configuration, and runtime identity/health information. |

### Screenshots

Current Desktop screenshots will be added here once the verified visual set is available.

---

## What the first public release is meant to deliver

This is the user-facing target, not an internal engineering task list and not a claim that every item is complete today.

### 1. Bring an existing project with you

Connect a real software project without rebuilding it around Livariant. Livariant should inspect what already exists, preserve the project's ownership of its own files, and help turn scattered context into deliberate project knowledge.

### 2. Stop rebuilding context every few sessions

Goals, important decisions, constraints, known facts, unresolved questions, and relevant history should survive chats and working sessions.

### 3. Switch agents without resetting the project

Use supported coding agents and providers without making one provider's private memory the only place where the project still makes sense.

### 4. Know what the project knows and why

Keep generated material, findings, external information, assumptions, and accepted project truth distinguishable instead of letting everything collapse into one pile of "context".

### 5. Catch contradictions before they quietly become the new normal

Surface stale or conflicting knowledge so it can be reviewed, replaced, or rejected deliberately rather than silently overwriting previous decisions.

### 6. Give agents freedom where it is cheap and boundaries where mistakes are expensive

Routine low-risk work should stay lightweight. Consequential changes should become more explicit as their impact grows.

### 7. Make "done" mean more than confidence

Connect requirements, implementation, and verification evidence so the system can still say "unproven" when proof is missing.

### 8. Recover without guessing

Updates, migrations, interruptions, and unsafe states should leave enough trusted project state to understand what happened and how to return to a known-good point.

### 9. Keep the whole thing understandable from one Desktop app

The normal user should not need to become an expert in Livariant's internals just to benefit from them.

### 10. Stay local-first by default

Normal local use should not require a Livariant cloud account or automatic upload of Project Brain state.

---

## Reliability without turning development into bureaucracy

There is an obvious way for a reliability tool like Livariant to fail:

> It could make every tiny change feel like filling out paperwork.

That would destroy the speed and flow that make coding agents useful in the first place.

Livariant therefore aims for a risk-based experience:

- routine and read-only work should stay lightweight;
- uncertainty should become visible when it actually matters;
- higher-risk changes should receive stronger checks;
- hard safety boundaries should not disappear just because they are inconvenient.

**The goal is not more process. The goal is more confidence per interruption.**

---

## Why provider-neutral matters

A model provider naturally wants to make its own agent better.

Livariant has a different job.

Its job is to keep your project's continuity useful even if tomorrow you use a different model, another coding agent, or several tools side by side.

That independence is important because the valuable asset is not the current chat history.

**The valuable asset is the accumulated understanding of the project.**

Livariant is being designed so that this understanding belongs to the project.

---

## Where the market is today

Livariant is not built on the claim that nobody else sees these problems. In fact, the opposite is encouraging: memory, repository context, review, AI-code quality gates, and agent reliability are all becoming active product areas.

Examples include [Cursor Rules](https://docs.cursor.com/context/rules), [GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory), [projectmem](https://projectmem.dev/), [Sonar AI Code Assurance](https://www.sonarsource.com/solutions/ai-code-assurance/), and AI review products such as [CodeRabbit](https://www.coderabbit.ai/).

Livariant's bet is that the next useful layer is not another isolated memory feature or another review bot, but a coherent reliability layer that connects continuity, evidence, authority, verification, recovery, and controlled autonomy around the project itself.

---

## Longer-term direction

Beyond the first public product baseline, Livariant may extend the same model with richer failure memory, continuously refreshed engineering intelligence, independent review/critic layers, privacy-preserving aggregated reliability evidence, broader provider support, and eventually controlled Livariant-on-Livariant self-hosting.

Those are future directions, not current capability claims.

---

<details>
<summary><strong>Technical foundations</strong></summary>

### Core trust model

Livariant keeps several concepts deliberately separate:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Verification evidence != accepted completion
Persistence != Trust
Presence != Currency
```

A simplified flow is:

```text
Inspect / observe
      |
      v
Evidence + bounded context
      |
      v
Understand / assess / propose
      |
      v
Review + explicit Authority where required
      |
      v
Mutate
      |
      v
Verify
```

### Project Brain

Project-owned durable context currently uses a local structure such as:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

### MCP integration

Current bounded MCP tools include:

- `livariant_provider_context`
- `livariant_provider_return`
- `livariant_verification_trace`

Setup guidance is available for Claude Code and Codex:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

MCP transport does not itself grant mutation authority or promote provider output into Project Truth.

### Architecture

Livariant currently combines a TypeScript/Node.js Core and CLI, a Tauri 2 Desktop application with a Rust host, protected authority boundaries, a local stdio MCP bridge, project-local Project Brain state, provenance-aware evidence contracts, and signed Desktop updater metadata.

See [Architecture & Safety](docs/architecture-and-safety.md) for the deeper model.

</details>

---

## Install and explore

For normal Desktop use, download the **latest qualified Desktop Preview** from [GitHub Releases](https://github.com/Kryt3r/livariant/releases).

Then continue with:

1. [Installation & First Project](docs/installation.md)
2. [Five-Minute Quickstart](docs/quickstart.md)
3. [Public Preview Scope & Limitations](docs/preview-scope.md)
4. [Architecture & Safety](docs/architecture-and-safety.md)
5. [Existing Projects](docs/existing-projects.md)
6. [Privacy & Network Behavior](docs/privacy-and-network.md)
7. [Updates, Migrations & Recovery](docs/lifecycle-guide.md)

German documentation starts at [README.de.md](README.de.md).

---

## Current Preview boundaries

Livariant does not currently claim universal code correctness verification, automatically trustworthy evidence generation, unrestricted autonomous repository mutation, perfect conflict detection, support for every provider or connection method, or Stable-release compatibility guarantees.

See [Public Preview Scope & Limitations](docs/preview-scope.md) for the exact current boundaries.

---

## Licensing, security, and contributions

Livariant is source-available, not OSI-approved Open Source. It is licensed under the [PolyForm Perimeter License 1.0.1](LICENSE).

Do not post suspected vulnerability details in a public issue. Follow [SECURITY.md](SECURITY.md).

External code contributions are currently gated while contributor-rights terms compatible with the source-available and future commercial-licensing model are finalized. Bug reports, documentation feedback, questions, and design discussion are welcome.

- [Licensing](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

<p align="center">
  <strong>Livariant is not trying to make one AI perfect.<br/>It is trying to make your project reliable even when the AI is not.</strong>
</p>
