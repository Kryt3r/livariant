# Provider Context Foundation

Provider Context is a post-RC3 read-only repository capability that prepares a provider-facing packet from the current Project Brain and one explicit temporary task.

Supported providers:

- `claude-code`
- `codex`

## CLI

```bash
livariant provider-context --provider claude-code --task task.txt
livariant provider-context --provider codex --task task.txt --json
```

Runtime API: `buildProviderContext()`.

The packet reuses the coherent Project Brain evidence and material baseline from Project Context Snapshot. Task input remains separate evidence with authority class `session-ephemeral`.
