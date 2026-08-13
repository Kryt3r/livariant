# Provider Context Foundation

Provider Context ist eine read-only Repository-Funktion nach RC3, die aus dem aktuellen Project Brain und einer expliziten temporären Aufgabe ein providerbezogenes Kontextpaket erzeugt.

Unterstützte Provider:

- `claude-code`
- `codex`

## CLI

```bash
livariant provider-context --provider claude-code --task task.txt
livariant provider-context --provider codex --task task.txt --json
```

Runtime-API: `buildProviderContext()`.

Das Paket verwendet dieselbe kohärente Project-Brain-Evidence und materielle Baseline wie Project Context Snapshot. Die Task-Eingabe bleibt getrennte Evidence mit Authority-Klasse `session-ephemeral`.
