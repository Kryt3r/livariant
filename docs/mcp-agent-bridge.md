# Local MCP Agent Bridge

Status: post-RC3 repository development

Livariant provides a bounded local MCP-compatible stdio bridge for compatible coding agents.

The bridge is an adapter over existing Active Project Intelligence primitives. It is not a second Project Brain, proposal engine, authorization store, recovery mechanism, or semantic writer.

## Start the bridge

From the Livariant project directory:

```text
livariant mcp
```

The process communicates only through MCP JSON-RPC messages on standard input/output. Diagnostic failures are written to standard error.

WP-012 targets the stable MCP protocol revision `2025-11-25` over local stdio.

## Exposed tools

Exactly two tools are exposed in this foundation.

### `livariant_provider_context`

Input:

```json
{
  "provider": "codex",
  "task": "Review the current project and report one durable-change candidate if needed"
}
```

Supported providers remain those already supported by Provider Context:

- `codex`
- `claude-code`

The tool delegates directly to `buildProviderContext()`.

It reconstructs current local Project Brain context and returns the existing bounded Provider Context packet. It does not create mutation authority and does not mutate Project Brain.

### `livariant_provider_return`

Input:

```json
{
  "context": { "...": "the supplied ready Provider Context packet" },
  "providerReturn": { "...": "one existing-schema Provider Return packet" }
}
```

The tool delegates directly to `processProviderReturn()` with no authorization selector.

The supplied context and returned packet remain external untrusted evidence. Provider, packet ID, stable Project Identity, baseline and task values are correlation material only; they do not prove prior issuance, approval, trusted current truth, or mutation authority.

Possible results remain the existing Provider Return / maintenance states, including:

- `no-candidate`
- `stale-context`
- `mismatched-context`
- `candidate-received` with review/authorization-required maintenance state
- `blocked`

## Authority boundary

The MCP surface does **not** accept:

- `authorization`
- `authorizationId`
- approval flags
- mutation permission
- provider-specific write privileges

Unknown or additional MCP tool arguments fail closed.

A matching proposal-bound Authorization that already exists elsewhere is not searched for or consumed by this bridge. A candidate returned through MCP therefore cannot perform canonical semantic mutation in WP-012.

To perform an authorized semantic mutation, users continue to use the separate existing local Authorization / Semantic Apply workflow outside this MCP foundation.

## Transport boundary

WP-012 is local stdio only.

It does not add:

- HTTP or TCP listeners
- remote MCP hosting
- cloud synchronization
- automatic provider process control
- automatic project upload
- webhooks
- provider account/session authentication

The normal Livariant Core and CLI remain usable without MCP.

## Input bounds

Each stdio JSON-RPC message is newline-delimited UTF-8 and is subject to a bounded message size before JSON parsing.

Provider Context task material and Provider Return/context-copy data are still validated by their existing Core bounds after transport parsing.

Oversized, malformed, partial, unknown-method and unknown-tool input fails closed.

## MCP lifecycle

The bridge implements the bounded lifecycle needed by the current tool surface:

```text
initialize
-> notifications/initialized
-> tools/list / tools/call
```

`ping` is also supported.

No MCP task execution, prompts, resources, sampling, HTTP authorization, server-to-client requests, or remote transport are introduced by WP-012.

## Release boundary

This capability is repository development after the immutable `v0.1.0-rc.3` Foundation Preview.

RC3 does not contain the MCP Agent Bridge. A later release requires separate explicit release authorization.
