# Proposal-gebundene Autorisierung und Replay-Schutz

Proposal-gebundene Autorisierung ist eine Post-RC3-Grundlage von Active Project Intelligence. Sie erteilt eng begrenzte Autorität für genau eine spätere semantische Mutation, ohne Provider-Text, kopierte Proposals, projektlokale Dateien oder alte Freigaben in eine dauerhafte Erlaubnis zu verwandeln.

Diese Fähigkeit ist Repository-Entwicklung nach dem unveränderlichen Foundation-Preview-Release `v0.1.0-rc.3`.

## Aktuelle Oberfläche

Die aktuelle Repository-Implementierung ergänzt zwei begrenzte Befehle:

```text
livariant prepare --input <candidate.json>
livariant prepare --input <candidate.json> --json

livariant authorize --input <actionable-proposal.json>
livariant authorize --input <actionable-proposal.json> --json
```

Die Runtime-APIs stellen die entsprechenden Actionable-Proposal- und Autorisierungsprimitive bereit.

`prepare` und `authorize` führen **keine** semantische Mutation am Project Brain aus. Semantic Apply ist ein eigener späterer Slice.

## Review-only-Proposals bleiben nicht ausführbar

Der bestehende Semantic Proposal Core bleibt unverändert und dauerhaft review-only. Bestehende Proposal-Ausgabe weist weiterhin aus:

```text
reviewOnly: true
mutationAuthorization: false
applySupported: false
authorizationEligible: false
changesMade: 0
```

Eine review-only `proposalId`, ein Digest, eine stabile Projektidentität, eine Herkunftsbehauptung oder eine passende Baseline können nicht nachträglich als Autorisierung umgedeutet werden.

## Actionable Proposal

`livariant prepare` verwendet dasselbe begrenzte Candidate-Schema wie der Semantic Proposal Core und rekonstruiert den aktuellen vertrauenswürdigen Project-Brain-Zustand.

Wenn das Projekt gesund ist und Schema 2 eine gültige stabile logische Projektidentität liefert, kann Livariant eine **eigenständige Actionable-Proposal-Hülle** erzeugen.

Sie bindet:

- genau eine stabile logische Project-Brain-Identität;
- genau eine materiale Project-Brain-Baseline;
- genau einen Candidate;
- genau eine unterstützte semantische Domäne und Operation;
- eine exakte Zielidentität, wenn die Operation eine benötigt;
- den normalisierten materialen Mutationsumfang;
- eine deterministische Proposal-Identität und einen SHA-256-Material-Digest.

Das Actionable Proposal weist aus:

```text
authorizationEligible: true
mutationAuthorization: false
applySupported: false
authorizationRequired: true
changesMade: 0
```

Es kann für eine Autorisierung geprüft werden, ist aber selbst keine Autorität.

## Ausdrückliche Autorisierung

`livariant authorize` akzeptiert eine Actionable-Proposal-Datei, parst sie strikt, prüft ihren Digest und **rekonstruiert das Proposal anschließend erneut aus dem aktuellen kanonischen Project-Brain-Zustand**.

Die Autorisierung wird verweigert, wenn der aktuelle vertrauenswürdige Zustand nicht mehr exakt dieselbe Projektidentität, Baseline, Proposal-Identität, denselben Proposal-Digest oder Mutationsumfang reproduziert.

Ein gespeichertes Actionable Proposal wird dadurch veraltet, sobald sich materiale Project-Brain-Wahrheit ändert.

Provider-Text, Candidate-Felder, Task-Dateien, projektkontrollierte Eingaben, kopierte Pakete oder Aussagen wie „der Benutzer hat das bereits freigegeben“ können nicht selbst Autorität erzeugen.

## Dual-Evidence-Trust-Grenze

Projektkontrollierte Bytes dürfen nicht der Trust Root für ihre eigene Mutationsautorität sein.

Ein Repository kann Dateien unter `.project-brain` verändern oder herstellen. Deshalb genügt ein gültig aussehender projektlokaler Authorization Record niemals allein.

Livariant verwendet zwei übereinstimmende Evidence-Flächen:

1. **Projektlokale Lifecycle-/Audit-Evidence** unter `.project-brain/.authorizations`. Sie hält die exakte Bindung, den Lifecycle-State, Unterbrechungsevidence und terminale Historie fest.
2. **Unabhängige machine-local Authority** im Livariant-Trust-State des Betriebssystembenutzers außerhalb des Projektverzeichnisses. Der machine-local Receipt bindet dieselbe Authorization-ID, stabile Projektidentität, Actionable-Proposal-Identität/-Digest, denselben Scope und dieselbe Baseline.

Eine spätere Apply-Operation darf Authority nur verbrauchen, wenn beide Flächen vorhanden, gültig, eindeutig und material identisch sind.

Der machine-local Authorization Root wird gegen die physischen User-Home- und Projektpfade geprüft, sodass projektkontrollierte Pfadüberschneidung oder Symlink-Substitution Repository-State nicht in machine-local Authority verwandeln können.

## Copy- und Checkout-Semantik

Stable Project Identity identifiziert weiterhin eine logische Project-Brain-Linie und keinen eindeutigen physischen Checkout.

Das Kopieren eines Project Brain kopiert seine projektlokalen Audit-Bytes, aber keine machine-local Authority auf eine andere Maschine.

Auf derselben Maschine können zwei physische Kopien mit derselben logischen Project-Brain-Identität auf denselben eng begrenzten machine-local Authorization Receipt verweisen. Deshalb schützt ein atomarer machine-local Transition-Lock den Beginn des Verbrauchs, sodass zwei parallele Consumer nicht beide dieselbe Autorisierung wiederverwenden können.

Daraus folgt keine Behauptung, Livariant besitze eine eindeutige Checkout-Identität.

## Authorization-Lifecycle

Der Lifecycle unterscheidet:

```text
preparing
authorized
applying
completed
failed-recovery-required
invalidated
```

`preparing` ist der projektlokale Zustand während der Erzeugung der Dual Evidence. Er autorisiert kein Apply.

Ein `authorized` Record darf später nur nach erneuter Prüfung von Actionable Proposal, aktueller Baseline, Projektidentität, projektlokaler Audit-Evidence und machine-local Authority zu `applying` wechseln.

Der machine-local Receipt wird unter einem atomaren Lock zuerst verbraucht. Dadurch ist Replay bereits nicht mehr verfügbar, bevor eine semantische Mutation beginnen kann.

Ein erfolgreiches späteres Apply endet terminal als `completed`. Ein fehlgeschlagenes oder mehrdeutiges Apply wird `failed-recovery-required`. Auch ausdrückliche Invalidierung ist terminal.

Terminale Authorization darf nicht still zu `authorized` zurückgesetzt oder für eine weitere Mutation wiederverwendet werden.

## Unterbrochener und mehrdeutiger Zustand

Eine partielle Autorisierungserzeugung oder Lifecycle-Transition bricht geschlossen ab.

Beispiele:

- projektlokaler `preparing`-State ohne passenden machine-local Receipt;
- projektlokale `authorized`-Evidence ohne passende machine-local Authority;
- machine-local Authority ohne passende projektlokale Lifecycle-Evidence;
- materiale Bindungsabweichung zwischen beiden Flächen;
- ein nach Unterbrechung verbliebener machine-local Consumption-Lock;
- aktive und terminale Projektevidence, die sich widersprechen.

Livariant nimmt nicht an, dass eine Seite die andere überschreiben soll. Wo nötig, muss ein unterstützter späterer Recovery-Pfad die Lifecycle-Ambiguität auflösen.

## Keine semantische Mutation in diesem Slice

WP-008 erzeugt und verwaltet ausschließlich Authority-State.

Das aktuelle Autorisierungsergebnis kann melden, dass passende Authority existiert, aber:

```text
applySupported: false
semanticChangesMade: 0
```

Die tatsächliche semantische Project-Brain-Mutation gehört zu Semantic Apply und muss den exakten Authorization-Lifecycle sicher verbrauchen.

## Release-Grenze

Proposal-gebundene Autorisierung wird nicht rückwirkend Bestandteil von `v0.1.0-rc.3`.

RC3 bleibt unveränderliche historische Release-Evidence. Eine spätere verteilte Version mit dieser Fähigkeit benötigt einen separat freigegebenen Release-Prozess.