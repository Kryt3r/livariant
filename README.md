<img width="1851" height="737" alt="image" src="https://github.com/user-attachments/assets/e5e1c73b-b4fd-4df4-8b0a-1d278ac12d3e" />

<p align="center">
  <strong>English</strong> · <a href="README.de.md">Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/Kryt3r/livariant/releases/tag/v0.1.0-rc.4"><img alt="CLI Public Preview" src="https://img.shields.io/badge/CLI%20preview-v0.1.0--rc.4-0ea5e9" /></a>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-%E2%89%A520-339933?logo=nodedotjs&logoColor=white" />
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-PolyForm%20Perimeter-7c3aed" /></a>
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-default-06b6d4" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-supported-a855f7" />
</p>

# Livariant

**AI coding agents can be wrong. Livariant is built so their mistakes do not silently become project truth.**

**Preserve what is true. Control what changes. Verify what is actually proven. Recover when things go wrong.**

Coding agents can lose context, act on stale assumptions, contradict earlier decisions, overstate completion, or turn plausible inference into durable project mistakes. Livariant does not try to make one model infallible. It gives the **project itself** durable truth, explicit Authority boundaries, verification evidence, and recovery semantics that survive individual chats, agents, tools, and providers.

> **The AI may be wrong. Your project should not automatically inherit the mistake.**

## The core idea

Livariant sits between AI-assisted development and durable project state:

```text
AI / coding agent
      ↓
Evidence and bounded context
      ↓
Livariant
      ↓
Project Truth / Verification / Authority / Recovery boundaries
      ↓
Durable project state
```

Its permanent rules include:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Verification evidence != accepted completion
Persistence != Trust
Presence != Currency
Ambiguous consequential state -> Fail Closed
```

## What the user experience is becoming

Current development is designed for an **agent-native** workflow rather than a command-heavy daily routine.

For a fresh supported machine, the remediated first-use path is deliberately staged:

```text
verify exact qualified release artifacts
-> install ordinary Livariant CLI
-> provision protected Stage-A release material
-> bootstrap Guardian from protected Stage-B bytes
-> verify Guardian ready
-> open project
-> livariant first-run
-> initialize deliberately if needed
-> explicitly connect Claude Code or Codex through MCP
-> work normally with the coding agent
```

The ordinary global CLI and the protected Guardian bootstrap source have separate trust roles. The CLI remains important for setup, diagnosis, direct inspection, explicit control, and provider-independent workflows, but it does not become a root of trust merely because it is globally installed.

After an MCP-capable coding agent is connected, the user does **not** need to type a Livariant command into every normal interaction. For example, the user can simply ask the coding agent to implement a feature and verify the requested outcomes. The agent can call Livariant through MCP and return the result in the normal conversation.

## The current reliability moment

Current development exposes a read-only MCP tool:

`livariant_verification_trace`

It evaluates explicit requirements or acceptance criteria, implementation claims, and supplied verification evidence using the same deterministic Verification Trace semantics as the core/CLI assessor.

Conceptually:

```text
requirement / acceptance criterion
        +
implementation claim
        +
verification evidence
        ↓
Livariant
        ↓
SUPPORTED / CONTRADICTED / UNPROVEN
```

Example:

```text
Email login ........ SUPPORTED
Password reset ..... UNPROVEN
Rate limiting ...... CONTRADICTED
```

This is deliberately stricter than accepting an agent's "done" statement.

Important boundaries remain:

```text
SUPPORTED != DONE
verification evidence != accepted completion
agent-supplied evidence != independent trust
MCP transport != Authority
```

Livariant does **not** currently discover every requirement automatically, manufacture trustworthy evidence automatically, universally verify arbitrary code, or catch every false-DONE claim without explicit trace/evidence material.

See [Verification Trace](docs/verification-trace.md).

## First Run

The guided entry point is:

```bash
livariant first-run
```

The current First Run foundation is state-aware across both project state and protected machine readiness. It can compose:

- EN/DE interaction localization;
- read-only project discovery;
- Project Brain initialization assessment;
- protected bootstrap / Guardian readiness assessment;
- an Autonomy Profile choice;
- optional external knowledge evidence;
- Guided Project Understanding Review;
- optional Claude Code or Codex MCP setup guidance.

First Run remains read-only. It does not silently initialize the project, configure the provider, adopt evidence, persist an Autonomy Profile, provision Guardian state, or grant Authority. If protected machine prerequisites are missing or unsafe, it must not direct the user straight to lifecycle authorization/application.

See [First-Run Composition](docs/first-run.md).

## MCP connection

Installing Livariant and connecting a coding agent are separate operations.

Livariant can render provider-native setup guidance:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

Those commands perform **zero provider-configuration writes** themselves. They tell the user how to register Livariant through the provider's own MCP configuration surface.

Once connected, the MCP agent can discover current bounded tools including:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

The MCP bridge does not create or consume mutation Authority and does not convert agent output into Project Truth merely because it arrived through MCP.

## Project-owned continuity

Livariant maintains a local **Project Brain**:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

It gives the project durable state that does not belong to one chat or one AI provider. A copied sentence, returned AI result, stale context packet, external note, or reconstructed summary does not become trusted project state merely because it exists.

## Authority and safe mutation

One of Livariant's central rules is:

> **The ability to perform an action is not permission to perform it.**

Livariant separates:

```text
Inspect
-> Understand
-> Propose
-> Authorize
-> Mutate
-> Verify
```

Current development includes protected Guardian-origin Authority for consequential consumers including semantic mutation authorization, Project Brain integrity protection, Runtime trust, and release authorization.

## Existing projects first

Livariant is preservation-first and does not require a special project template.

```text
inspect
-> discover
-> understand
-> review
-> adopt deliberately
```

Existing project files, provider instructions, external notes, and AI output must not silently redefine canonical project truth.

## External knowledge stays external until deliberately adopted

Current development includes a foundation for treating supported external text/Markdown knowledge sources as separate provenance-aware evidence.

```text
external knowledge
-> read-only adapter
-> evidence
-> understanding / review
-> controlled adoption when something should become Project Truth
```

Future retrieval, relationship, graph, and token-efficiency work is intended to build on these explicit provenance/freshness boundaries rather than creating hidden second sources of truth.

## Published previews and current development

Livariant currently has **independently versioned product surfaces**. The root/Core package identity and the Desktop Preview identity are intentionally not required to share the same RC number.

### Current published Desktop Preview

The canonical published Desktop Preview is `0.1.0-rc.17`, built from exact source `6214bfe2318dc5c0dc4ae0b949146451ad4d20f6` and accepted through the updater-first Windows path.

The Desktop identity on current canonical `main` is `0.1.0-rc.18`. **rc.18 is not published yet.** It exists to perform the final installed-Windows dogfood acceptance for the active Diagnostics & Efficiency Measurement Foundation work before that work package can close.

### Historical CLI Public Preview

`v0.1.0-rc.4` remains an immutable published **CLI Public Preview**. It contains the agent-native First Run/MCP workflow, Verification Trace, Active Project Intelligence foundations, external-knowledge foundations, Autonomy Profiles, and the Guardian/Self-Integrity enforcement present in the qualified RC4 source.

RC4 was qualified from exact source `4f547751d9d53e7325e6ea1f2401f1dea45779dc`. Its installable CLI artifact SHA-256 is `6a8a287e55344e22c97c543cb4a9e071d27d9e18c5ff585cab8235aaa37dce8e`.

> [!WARNING]
> Real Windows Fresh-Install dogfooding found that the published RC4 distribution does **not** include/provision the protected Stage-A bootstrap source required before Guardian-backed first-project lifecycle authorization. Installing the RC4 `.tgz` alone therefore does not provide a complete safe fresh-machine -> first-project path. Do not bypass this by manually copying requester-controlled package files into protected system locations. See [Installation & First Project](docs/installation.md).

Later repository work does not retroactively change RC4.

### Historical RC3 Foundation Preview

`v0.1.0-rc.3` remains immutable historical Foundation Preview evidence. Later capabilities were not retroactively added to the RC3 artifact.

### Current repository `main`

Canonical product `main` is `e121edfe84061208ac5d1e3568a2c0c6c4ec3749` at this documentation reconciliation.

On that source state:

- Desktop identity is `0.1.0-rc.18`;
- root/Core package identity remains independently versioned at `0.1.0-rc.12`;
- rc.18 has not been tagged, published, or made discoverable through the updater;
- repository presence alone must never be treated as release publication.

### Current active development

The active product Work Package is **WP-047 — Diagnostics & Efficiency Measurement Foundation**. Its bounded implementation is merged; final completion still requires installed-Windows dogfood evidence for real observed usage, period behavior, durable counters, truthful missing values, attribution, and the calculation/explanation path.

The immediate release-sensitive path remains gated: CI trigger hardening must qualify and merge through its own explicit authorization boundary before an unpublished rc.18 candidate is built and verified. Publication remains a separate explicit authorization.

### Future qualified releases

A future release still requires its own exact-candidate CI/security/Self-Integrity qualification, real installed/fresh-machine evidence where required, a release decision, and explicit publication Authority.

No README statement, merge, or CI result publishes a release automatically.

## Local-first by default

Current Livariant project operation is designed around a local-first model:

- no Livariant cloud account required for normal local use;
- no automatic Project Brain upload;
- no Livariant usage telemetry in the current Runtime;
- no automatic remote update check.

If project context is sent to an external AI provider, that provider's own terms, retention settings, and security model apply.

See [Privacy & Network Behavior](docs/privacy-and-network.md).

## Start here

For installation and current development truth:

1. [Installation & First Project](docs/installation.md)
2. [Five-Minute Quickstart](docs/quickstart.md)
3. [First-Run Composition](docs/first-run.md)
4. [Verification Trace](docs/verification-trace.md)
5. [Existing Project Guide](docs/existing-projects.md)
6. [Provider Handoff](docs/provider-handoff.md)
7. [Architecture & Safety](docs/architecture-and-safety.md)
8. [Updates, Migrations & Recovery](docs/lifecycle-guide.md)

German documentation starts at [README.de.md](README.de.md).

## Licensing, security, and contributions

Livariant is source-available, not OSI-approved Open Source. It is licensed under the [PolyForm Perimeter License 1.0.1](LICENSE).

Do not post suspected vulnerability details in a public issue. Follow [SECURITY.md](SECURITY.md).

External code contributions are currently gated while contributor-rights terms compatible with the source-available and future commercial-licensing model are finalized. Bug reports, documentation feedback, questions, and design discussion are welcome.

- [Licensing](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

> **Livariant does not need the AI to be perfect. It needs the project to remain trustworthy when the AI is not.**
