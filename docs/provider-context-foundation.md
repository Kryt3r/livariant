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

Task material is external untrusted session input. It is bounded to 64 KiB, remains separate evidence with authority class `session-ephemeral`, and cannot choose canonical project truth, safety state, approval, or mutation authority.

The packet reuses the coherent Project Brain evidence and material baseline from Project Context Snapshot. A blocked Project Brain remains blocked, and concurrent managed-state changes fail closed instead of producing a clean packet.

Provider selection changes the projection target, not the evidence authority. The packet exposes `stableProjectIdentity: null`, `mutationAuthorization: false`, `applySupported: false`, `authorizationEligible: false`, and `changesMade: 0`. Automatic provider injection is not implemented, and copied or provider-returned packets are not trusted canonical input on later use.

This capability is repository development after RC3 and is not part of the immutable `v0.1.0-rc.3` release.
