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

Task-Material ist externe, nicht vertrauenswürdige Session-Eingabe. Es ist auf 64 KiB begrenzt, bleibt getrennte Evidence mit Authority-Klasse `session-ephemeral` und kann weder kanonische Projektwahrheit noch stabile Projektidentität, Safety-State, Zustimmung oder Mutationsautorität bestimmen.

Das Paket verwendet dieselbe kohärente Project-Brain-Evidence und materiale Baseline wie Project Context Snapshot. Ein blockiertes Project Brain bleibt blockiert; parallele Änderungen am verwalteten Zustand brechen geschlossen ab, statt ein sauberes Paket zu erzeugen.

Für ein gültiges schema-2 Project Brain gibt das Paket dieselbe kanonische logische `stableProjectIdentity` aus, die auch Project Context Snapshot erfasst. Historische schema-1 Projekte melden weiterhin `stableProjectIdentity: null`, bis eine ausdrücklich unterstützte Migration die Identität erzeugt. Die Provider-Auswahl ändert das Projektionsziel, nicht die Identität oder Evidence-Authority.

Die stabile ID identifiziert eine logische Project-Brain-Linie, nicht eine eindeutige Provider-Session, einen Checkout, eine Maschine oder einen Autorisierungs-Event. Ein kopiertes Project Brain kann legitim dieselbe ID behalten. Provider-Task-Text kann sie weder wählen noch überschreiben.

Das Paket weist weiterhin aus:

```text
mutationAuthorization: false
applySupported: false
authorizationEligible: false
changesMade: 0
```

Automatische Provider-Injektion ist nicht implementiert, und kopierte oder vom Provider zurückgegebene Pakete werden bei späterer Verwendung nicht als vertrauenswürdige kanonische Eingabe behandelt. Die Gleichheit von `stableProjectIdentity` macht ein zurückgegebenes Paket nicht vertrauenswürdig und autorisiert keine Mutation.

Siehe [Stable Project Identity Foundation](stable-project-identity-foundation.md).

Diese Funktion ist Repository-Entwicklung nach RC3 und nicht Bestandteil des unveränderlichen Releases `v0.1.0-rc.3`.
