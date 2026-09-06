# Provider Handoff

<p align="center">
  <strong>English</strong> · <a href="de/provider-handoff.md">Deutsch</a>
</p>

Livariant's current provider integration is broader than the original Resume-only Preview surface. Core now includes Project Brain Resume, bounded Provider Context/Return evidence flow, local MCP integration, and Verification Trace. The Desktop also has a separate live local Codex connection path.

These surfaces share one rule:

```text
Provider != Connection Method != Capability != Role != Authority
```

## Project Brain remains the continuity source

Livariant does not copy hidden provider memory from one agent to another.

Instead, provider-facing context is reconstructed from current project-owned state:

```text
Project Brain
-> bounded current context
   -> Claude Code projection / MCP context
   -> Codex projection / MCP context / Desktop connection
```

Formatting can differ by provider while the underlying project meaning remains tied to the same current Project Brain baseline.

Provider-local memory, `CLAUDE.md`, `AGENTS.md`, and agent output can all be useful evidence or instructions, but they do not replace canonical Project Brain truth merely because a provider uses them.

## Resume handoff

The explicit Resume surface remains available for Claude Code and Codex.

Examples:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

For Windows PowerShell:

```powershell
$env:LIVARIANT_PROVIDER_ENV = "codex"
livariant resume --provider codex
```

A provider-targeted Resume path requires matching environment evidence. Provider selection proves applicability for that capability, not mutation Authority.

## Provider Context and Return

The current Core can build bounded task-specific Provider Context and later process one correlated Provider Return.

The return remains external untrusted evidence. Matching provider, packet, project identity, baseline, and task values establish correlation, not approval or Project Truth.

Possible outcomes include review-required, authorization-required, stale/mismatched context, no candidate, or blocked states depending on the current evidence.

## MCP handoff

The local stdio MCP bridge currently exposes:

- `livariant_provider_context`
- `livariant_provider_return`
- `livariant_verification_trace`

MCP transports context/evidence. It does not create or consume canonical mutation Authority merely because an agent called a tool.

See [Local MCP Agent Bridge](mcp-agent-bridge.md).

## Desktop Codex connection

The Desktop has a separate local live Codex connection path through the bounded connector-host/App Server integration.

That connection can persist accepted connection intent and restore it on later application start subject to the executable identity/trust checks implemented by the host.

A successful connection still does not grant mutation Authority or turn provider output into Project Truth.

Additional Desktop providers/connection methods remain planned extensions unless separately implemented and qualified.

## Durable semantic change

Older documentation showed direct semantic writer commands followed by a bare `--apply` as though that were the complete current Authority story. That is no longer the right model for protected consequential semantic mutation.

The current canonical path is proposal/Authority bound. Semantic Apply consumes the exact authorized Actionable Proposal:

```text
livariant apply --authorization <authorization-id> --input <actionable-proposal.json>
```

Supported semantic operations remain bounded to the implemented Project Brain domains. Provider output, MCP context, matching text, or prior chat approval cannot manufacture the required protected Authority.

See [Semantic Apply](semantic-apply.md) and [Semantic Maintenance](semantic-maintenance.md).

## Stale provider context

Provider context is temporary evidence/projection. If the Project Brain baseline changes, old context cannot silently promote stale decisions or facts back into canonical truth.

Current provider-return/semantic flows re-check the relevant project identity/baseline/material before consequential use. Stale or mismatched context narrows or blocks the path instead of being trusted by presence.

## What Livariant does not claim

Livariant does not currently claim to:

- synchronize hidden provider memory;
- manage every Claude Code or Codex feature;
- control provider authentication/model selection;
- turn provider output directly into Project Truth;
- let a provider grant itself mutation Authority;
- provide hosted remote MCP;
- support every provider in Desktop.

The project owns continuity. Providers receive bounded working context around it.
