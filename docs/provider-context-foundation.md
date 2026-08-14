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

Task material is external untrusted session input. It is bounded to 64 KiB, remains separate evidence with authority class `session-ephemeral`, and cannot choose canonical project truth, stable project identity, safety state, approval, or mutation authority.

The packet reuses the coherent Project Brain evidence and material baseline from Project Context Snapshot. A blocked Project Brain remains blocked, and concurrent managed-state changes fail closed instead of producing a clean packet.

For a valid schema-2 Project Brain, the packet exposes the same canonical logical `stableProjectIdentity` captured by Project Context Snapshot. Historical schema-1 projects continue to expose `stableProjectIdentity: null` until an explicit supported migration creates the identity. Provider selection changes the projection target, not the identity or evidence authority.

The stable ID identifies a logical Project Brain lineage, not a unique provider session, checkout, machine, or authorization event. A copied Project Brain can legitimately retain the same ID. Provider task text cannot choose or override it.

The packet continues to expose:

```text
mutationAuthorization: false
applySupported: false
authorizationEligible: false
changesMade: 0
```

Automatic provider injection is not implemented, and copied or provider-returned packets are not trusted canonical input on later use. Equality of `stableProjectIdentity` does not make a returned packet trusted or authorize mutation.

See [Stable Project Identity Foundation](stable-project-identity-foundation.md).

This capability is repository development after RC3 and is not part of the immutable `v0.1.0-rc.3` release.
