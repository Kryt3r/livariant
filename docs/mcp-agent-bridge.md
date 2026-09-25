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

The bridge targets MCP protocol revision `2025-11-25` over local stdio.

## Native setup helper

WP-013 adds read-only setup rendering for the currently supported local MCP paths:

```text
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
livariant mcp setup --provider <claude-code|codex> --json
```

The setup helper **does not execute Claude Code or Codex and does not write provider configuration**. It only renders provider-native commands/configuration material for the user to review and apply.

### Claude Code

The rendered native local stdio registration command is:

```text
claude mcp add --transport stdio --scope local livariant -- livariant mcp
```

Run it from the Livariant project directory. Verify with:

```text
claude mcp get livariant
claude mcp list
```

Claude Code remains the owner of its MCP configuration and approval behavior.

### Codex

The rendered native CLI registration command is:

```text
codex mcp add livariant -- livariant mcp
```

Verify with:

```text
codex mcp list
```

For an explicit project-bound Codex setup, the helper also renders a `.codex/config.toml` fragment using the current project directory as `cwd` and allow-listing exactly the two Livariant MCP tools. Livariant does not write this file.

Codex CLI, the Codex IDE extension and supported desktop clients share Codex MCP configuration according to the provider's current configuration model.

Provider setup syntax was checked against current vendor documentation on 2026-08-16. Provider configuration syntax is external and may evolve independently of Livariant.

## Agent workflow guidance

The MCP initialize response now tells compatible agents how to use the bounded workflow:

```text
request Livariant Provider Context for one explicit task
-> work from the returned bounded projection
-> return the supplied context plus one supported typed durable-change candidate or no candidate
-> stop at review / authorization-required / blocked / no-candidate
```

The instructions explicitly state that MCP cannot create, discover, select or consume proposal-bound Authorization and cannot perform canonical semantic mutation.

## Exposed tools

Exactly two tools are exposed.

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

The tool delegates to `processProviderReturn()` with no authorization selector, but the MCP adapter adds a stricter transport/session boundary before that core call.

A ready Provider Context used for `livariant_provider_return` must be the exact context copy previously issued by the same running MCP session. The session marks that issuance consumed before processing the return, so replay requires a fresh `livariant_provider_context` call. A ready context copied from another MCP session, an altered copy, or an already-consumed issuance fails closed.

This same-session check proves only MCP-session issuance/freshness for the bounded roundtrip. The context and returned provider evidence still do not prove approval, canonical mutation authority, or independent truth. Core `processProviderReturn()` remains a separate general correlation/evidence surface outside this MCP-session guarantee.

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

A matching proposal-bound Authorization that already exists elsewhere is not searched for or consumed by this bridge. A candidate returned through MCP therefore cannot perform canonical semantic mutation.

To perform an authorized semantic mutation, users continue to use the separate existing local Authorization / Semantic Apply workflow outside this MCP surface.

## Transport boundary

The bridge is local stdio only.

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

No MCP task execution, prompts, resources, sampling, HTTP authorization, server-to-client requests, or remote transport are introduced.

## Release boundary

This capability is repository development after the immutable `v0.1.0-rc.3` Foundation Preview.

RC3 does not contain the MCP Agent Bridge or WP-013 native setup UX. A later release requires separate explicit release authorization.


## Project and provider-session binding

Livariant Desktop project selection is a presentation/navigation choice and does not route MCP work.

Each running MCP bridge instance is bound to the project path from which that bridge is running. Livariant reconstructs canonical Project Brain context from that project path and adds a fresh MCP-session UUID to ready Provider Context packet identity. Provider Return still requires the exact same-session, single-use context copy.

This permits multiple sessions of the same provider to work on the same or different projects without requiring Livariant Desktop to be open or showing the matching project.

For Codex, Livariant can also query persisted App Server thread metadata later. Provider-owned thread `id`, `sessionId`, and captured `cwd` are used as evidence to reconcile saved Codex threads against all registered Livariant project roots. Exact/descendant cwd matches are project-attributed; unknown or mixed-project sessions remain unattributed/ambiguous. This retrospective mapping is evidence only and grants no Project Truth or Authority.


### Provider-native conversation correlation

When an MCP client supplies bounded provider-native conversation metadata, Livariant can make the session binding more specific. Current Codex injects a `threadId` into MCP tool-call `_meta`. Livariant carries that value as `providerThreadId` inside the ephemeral Provider Context session binding and includes it in packet identity.

A Provider Return for such a context must arrive through the same running Livariant MCP session **and** with the same provider-native thread id. Two Codex threads sharing one MCP server therefore receive distinct Provider Context packet identities.

Provider-native thread metadata remains correlation evidence only. It is not Project Truth, user approval, authentication, or mutation Authority.
