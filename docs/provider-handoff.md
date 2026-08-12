# Provider Handoff

The current Preview supports one clear provider integration: **Project Brain Resume handoff** for Claude Code and Codex.

Livariant does not try to take over every feature of either provider. Its job here is narrower. It turns the current Project Brain state into useful context for the coding agent you choose to use.

## What gets handed over

Livariant does not copy hidden memory from one provider to another.

Instead, each provider receives fresh Resume context generated from the Project Brain:

```text
Project Brain
-> canonical ResumeContext
   -> Claude Code projection
   -> Codex projection
```

The wording or formatting can differ between providers. The underlying project meaning must stay the same.

Confirmed goals, active decisions, known facts, unresolved unknowns, and available project identity can be part of that Resume context. Superseded decisions stay in history but are not presented as current truth.

## Why this matters

Imagine that you make an important architecture decision while working with Claude Code. If that decision should survive the current chat, you first record it as project truth through Livariant:

```bash
livariant decisions add "Use approach A for authentication"
```

The first command only shows the planned change. After reviewing it, apply it deliberately:

```bash
livariant decisions add "Use approach A for authentication" --apply
```

Later, you start a separate Codex session. Codex does not need access to Claude Code's hidden session memory. Livariant creates new Codex-friendly Resume context from the same Project Brain state.

The project remains the source of continuity, not one provider's private memory.

The same pattern applies to durable goals and confirmed project facts:

```bash
livariant goals add "Complete the authentication migration"
livariant knowledge add "Authentication currently uses approach A"
```

Review first, then add `--apply` to the command you want to commit.

## Selecting the provider explicitly

Livariant requires explicit evidence for the provider environment you are targeting.

Linux or macOS:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

For Windows PowerShell, set the environment variable first:

```powershell
$env:LIVARIANT_PROVIDER_ENV = "claude-code"
livariant resume --provider claude-code
```

A provider-targeted handoff without matching environment evidence fails closed instead of pretending that the environment is compatible.

Selecting a provider proves applicability for the Resume capability. It does not grant mutation authority.

The bundled Preview adapter identities are:

```text
livariant.claude-code.resume
livariant.codex.resume
```

## A complete handoff example

A normal supported transition looks like this:

1. You work on the project with Claude Code.
2. A goal, fact, or decision becomes important enough to keep beyond the current chat.
3. You plan the Project Brain change with `goals`, `knowledge`, or `decisions`.
4. You review it and repeat the command with `--apply`.
5. The Claude Code session ends.
6. No hidden Claude session memory is copied to Codex.
7. You start Codex in the same project directory.
8. Livariant creates a Codex-specific Resume projection from the current Project Brain.
9. Codex receives the current decisions, known facts, goals, unresolved questions, and lifecycle context that Livariant exposes for Resume.

The executable hardening suite tests this across isolated processes with different provider-local hidden-memory values.

## `CLAUDE.md` and `AGENTS.md`

`CLAUDE.md` and `AGENTS.md` can still be useful project files, but they are not the Project Brain.

The current Resume adapters do not overwrite them. If those files contain text that conflicts with canonical Project Brain state, they do not replace Project Brain truth in the supported Resume path.

Future native-instruction integration would create a new mutation surface. It would need its own authorization, preservation, conformance, and adversarial tests before Livariant could claim that behavior as supported.

## What happens when old Resume context becomes stale

Resume output is temporary context. Receiving it does not give a provider write-back authority over the Project Brain.

If a Project Brain decision changes later, including an explicit supersession, old Resume output cannot promote the earlier decision back into canonical truth.

To replace an accepted decision while keeping its history, list the decisions, choose the relevant ID, and plan a supersession:

```bash
livariant decisions
livariant decisions supersede <decision-id> "Use approach B for authentication" --reason "Architecture changed"
```

Review the plan, then repeat it with `--apply` if it is correct.

The next Resume output is generated from the current Project Brain state.
