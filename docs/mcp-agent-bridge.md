# Local MCP Agent Bridge

<p align="center">
  <strong>English</strong> · <a href="de/mcp-agent-bridge.md">Deutsch</a>
</p>

Livariant provides a bounded local MCP-compatible stdio bridge for compatible coding agents.

The bridge is an adapter over existing Livariant Core capabilities. It is not a second Project Brain, proposal engine, authorization store, recovery mechanism, or semantic writer.

## Start the bridge

From the project directory:

```text
livariant mcp
```

The process communicates through MCP JSON-RPC on standard input/output. Diagnostic failures are written to standard error.

The current bridge targets MCP protocol revision `2025-11-25` over local stdio.

## Provider setup helper

Current setup guidance is available for Claude Code and Codex:

```text
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
livariant mcp setup --provider <claude-code|codex> --json
```

The helper does **not** execute the provider and does not write provider configuration. It renders provider-native commands/configuration material for the user to review and apply.

### Claude Code

The rendered local stdio registration command is:

```text
claude mcp add --transport stdio --scope local livariant -- livariant mcp
```

Claude Code remains the owner of its MCP configuration and approval behavior.

### Codex

The rendered native CLI registration command is:

```text
codex mcp add livariant -- livariant mcp
```

For explicit project-bound Codex setup, the helper can also render a `.codex/config.toml` fragment using the current project directory as `cwd`. The current allow-list contains the three Livariant MCP tools documented below. Livariant does not write the file itself.

Provider configuration syntax is external compatibility and can evolve independently of Livariant. Treat provider-native command examples as compatibility surfaces that need re-verification when providers change them.

## Current MCP tools

The current server exposes **three** bounded tools:

- `livariant_provider_context`
- `livariant_provider_return`
- `livariant_verification_trace`

None of them can create or consume mutation Authority.

### `livariant_provider_context`

This tool builds a bounded provider context for one explicit task and supported provider target.

Supported provider identifiers include:

- `codex`
- `claude-code`

The returned context is a projection of current local project state for the task. It is not mutation Authority and does not mutate Project Brain.

### `livariant_provider_return`

This tool accepts the supplied Provider Context copy plus one supported Provider Return packet and delegates to the existing provider-return processing boundary.

The supplied context and returned packet remain external untrusted evidence. Provider identity, packet ID, stable project identity, baseline, and task values are correlation material; they do not by themselves prove approval, current Project Truth, or mutation Authority.

Possible results include bounded states such as:

- `no-candidate`
- `stale-context`
- `mismatched-context`
- `candidate-received`
- `blocked`

A durable-change candidate still stops at the supported review/Authority boundary.

### `livariant_verification_trace`

This read-only tool assesses explicit requirements/claims against supplied implementation and verification evidence.

Its evidence-support states are:

```text
SUPPORTED
CONTRADICTED
UNPROVEN
```

Important boundary:

```text
SUPPORTED != DONE
Verification evidence != accepted completion
Evidence != Project Truth
```

The tool does not manufacture trustworthy verification evidence and does not grant completion or mutation Authority.

See [Verification Trace](verification-trace.md).

## Authority boundary

The MCP bridge does not turn provider output, verification output, or transport state into canonical mutation Authority.

Unknown/additional tool arguments are validated by the current tool schemas and unsupported consequential input fails closed.

A matching semantic/lifecycle Authority record is not searched for and consumed merely because an MCP call exists. Consequential mutation remains in the separate supported Authority-controlled workflow.

## Transport boundary

The Core MCP bridge is local stdio only. It does not add:

- an HTTP/TCP listener;
- Livariant-hosted remote MCP;
- cloud synchronization;
- automatic project upload;
- webhooks;
- provider account/session authentication.

The normal Livariant Core/CLI remains usable without MCP.

The Desktop Codex connection is a **separate local connector/App Server integration**. Do not confuse the Desktop live connection path with the Core stdio MCP transport described on this page.

## Input and lifecycle bounds

Each stdio JSON-RPC message is newline-delimited UTF-8 and subject to bounded parsing/validation.

The current bridge supports the bounded lifecycle needed by its tool surface:

```text
initialize
-> notifications/initialized
-> tools/list / tools/call
```

`ping` is also supported.

Unsupported/malformed/oversized input must fail closed rather than silently expanding the bridge's capability.

## Release boundary

The MCP bridge originated after the historical `v0.1.0-rc.3` Foundation Preview. That remains historical release truth, not the current product limit.

The current canonical repository and later Preview surfaces contain more MCP capability than RC3 did. Historical RC3 statements should not be rewritten to imply otherwise.
