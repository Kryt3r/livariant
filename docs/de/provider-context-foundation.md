# Provider Context Foundation

Provider Context ist eine read-only Repository-Funktion nach RC3, die aus dem aktuellen Project Brain und einer ausdrücklich angegebenen temporären Aufgabe ein providerbezogenes Kontextpaket erzeugt.

Unterstützte Provider:

- `claude-code`
- `codex`

## CLI

```bash
livariant provider-context --provider claude-code --task task.txt
livariant provider-context --provider codex --task task.txt --json
```

Runtime-API: `buildProviderContext()`.

Task-Material ist externe, nicht vertrauenswürdige Session-Eingabe. Es ist auf 64 KiB begrenzt, bleibt getrennte Evidence mit Authority-Klasse `session-ephemeral` und kann weder kanonische Projektwahrheit noch Safety-State, Zustimmung oder Mutationsautorität bestimmen.

Das Paket verwendet dieselbe kohärente Project-Brain-Evidence und materiale Baseline wie Project Context Snapshot. Ein blockiertes Project Brain bleibt blockiert; parallele Änderungen am verwalteten Zustand brechen geschlossen ab, statt ein sauberes Paket zu erzeugen.

Die Provider-Auswahl ändert das Projektionsziel, nicht die Evidence-Authority. Das Paket weist `stableProjectIdentity: null`, `mutationAuthorization: false`, `applySupported: false`, `authorizationEligible: false` und `changesMade: 0` aus. Automatische Provider-Injektion ist nicht implementiert, und kopierte oder vom Provider zurückgegebene Pakete werden bei späterer Verwendung nicht als vertrauenswürdige kanonische Eingabe behandelt.

Diese Funktion ist Repository-Entwicklung nach RC3 und nicht Bestandteil des unveränderlichen Releases `v0.1.0-rc.3`.
