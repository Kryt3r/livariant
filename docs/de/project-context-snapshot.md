# Project Context Snapshot

Der Project Context Snapshot ist eine read-only Active-Project-Intelligence-Oberfläche, die den aktuellen Project-Brain-Zustand als strukturierten Kontext mit Herkunfts- und Authority-Informationen bereitstellt.

## Befehle

```bash
livariant context
livariant context --json
```

Der Standardbefehl ist für die menschliche Prüfung gedacht. `--json` stellt dieselben Sicherheits- und Authority-Unterscheidungen als strukturierte Daten für Tools und spätere Agent-Integrationen bereit.

## Inhalt eines sauberen Snapshots

Ein sauberer Snapshot enthält:

- den aktuellen Projekt-Locator;
- die stabile logische Project-Brain-Identität, wenn das aktuelle Schema eine bereitstellt;
- die Livariant-Framework-Version;
- eine deterministische materiale Project-Brain-Baseline;
- bestätigte Projektidentitäts-Evidence;
- bestätigte Ziele;
- aktive akzeptierte Entscheidungen;
- bekannte Fakten;
- offene Unklarheiten;
- explizite Authority-Klassen für projizierte Einträge;
- Projection-Metadaten, die klarstellen, dass der Snapshot abgeleitete Ausgabe und keine Mutation-Autorisierung ist;
- `Changes made: 0`.

Bestätigtes Project-Brain-Material wird als `canonical-project` gekennzeichnet. Offene Unklarheiten bleiben `unresolved-project` und werden durch die Darstellung nicht zu Fakten hochgestuft.

## Materiale Baseline

Die Snapshot-Baseline verwendet eine deterministische SHA-256-Identität über die verwalteten Project-Brain-Eingaben, aus denen der Snapshot erzeugt wurde.

Die Digest-Eingabe ist versioniert, domain-separiert, eindeutig gerahmt und deterministisch sortiert. Sie bindet die Namen der verwalteten Eingaben, ihre exakten Bytes und die für die Interpretation relevante Project-Brain-Schema-Version. Da `metadata.json` Bestandteil der verwalteten Baseline ist, wird eine schema-2 `projectId` kohärent aus demselben Zustand erfasst.

Erzeugungszeit, Darstellung, Provider-Rendering und der absolute Projektpfad bestimmen die materiale Baseline nicht.

Zwei unveränderte Reads behalten deshalb dieselbe materiale Baseline, auch wenn ihre Erzeugungszeit unterschiedlich ist. Eine materiale Änderung am verwalteten Project Brain ändert die Baseline.

## Schutz vor parallelen Änderungen

Livariant gibt keinen sauberen Snapshot zurück, wenn sich das verwaltete Project Brain während der Snapshot-Erzeugung ändert.

Kanonischer Inhalt, materiale Baseline und stabile Projektidentität werden aus demselben erfassten Zustand abgeleitet. Vor einem sauberen Ergebnis werden die verwalteten Eingaben erneut geprüft. Wurden sie parallel geändert, ist das Ergebnis blockiert und muss aus einem frischen Zustand neu erzeugt werden.

## Blockierter Zustand

Wenn das Project Brain fehlt, beschädigt, mehrdeutig, recovery-required oder aus einem anderen Grund nicht sicher als sauberer aktueller Kontext projiziert werden kann, liefert Livariant ein blockiertes Ergebnis, statt Teilinformationen als vertrauenswürdigen aktuellen Kontext darzustellen.

Ein schema-2 Project Brain mit fehlender oder ungültiger `projectId` ist beschädigter Zustand. Eine Read-Operation erzeugt oder repariert die Kennung nicht stillschweigend.

Für maschinenlesbare Nutzung enthält blockiertes JSON ausdrücklich `safetyState: "blocked"` und die CLI beendet sich mit einem von null verschiedenen Status. Ein interner Runtime-Fehler bleibt davon als eigener Fehlerpfad unterscheidbar.

In der menschlichen Ausgabe steht der blockierende Zustand vor den Diagnoseinformationen.

## Projekt-Locator und stabile logische Identität sind verschieden

`projectLocator` ist der Dateisystemort, aus dem der Snapshot erzeugt wurde. Er ist keine dauerhafte Identität.

Die aktuelle Repository-Entwicklung unterstützt eine getrennte stabile logische Project-Brain-Identität:

- Schema 2 verlangt genau eine kanonische UUID und gibt sie als `stableProjectIdentity` aus;
- Schema 1 ist das historische Schema vor Einführung der Identität und meldet bis zu einer ausdrücklich unterstützten Migration `stableProjectIdentity: null`;
- Verschieben oder Umbenennen eines Projektverzeichnisses rotiert die logische ID nicht;
- eine bytegenaue Kopie eines Project Brains behält dieselbe logische ID.

Die ID identifiziert daher eine logische Project-Brain-Linie, nicht einen eindeutigen Checkout oder eine Maschine.

Siehe [Stable Project Identity Foundation](stable-project-identity-foundation.md).

## Trust-Grenze

Ein Project Context Snapshot ist abgeleitete Ausgabe.

Weder der Snapshot noch seine stabile Projekt-ID:

- autorisiert eine Mutation;
- erzeugt oder verbraucht eine Freigabe;
- beweist Anti-Replay-Aktualität oder eindeutige Checkout-Identität;
- macht zurückgelieferte Provider-Kopien vertrauenswürdig;
- erhebt Provider-Text zu kanonischer Wahrheit;
- persistiert Terminologie oder Concept-IDs;
- repariert Drift automatisch;
- injiziert Kontext automatisch in Claude Code, Codex oder andere Provider.

Eine spätere materiale Aktion muss den aktuellen kanonischen Zustand erneut lesen und revalidieren, statt einen alten oder zurückgegebenen Snapshot oder bloße ID-Gleichheit als dauerhafte Autorität zu behandeln.

## Verhältnis zu `resume`

`livariant resume` bleibt die aktuelle Provider-Handoff-Oberfläche für Claude Code und Codex.

`livariant context` ist die strukturierte Projektwahrheits-Projektion. Sie legt die read-side Baseline-, Identitäts- und Sicherheitsgrenze fest, die Semantic Change Proposals, Drift-Analyse und Provider Context verwenden können, ohne Mutationsautorität zu erhalten.

Stable Project Identity und die anderen Active-Project-Intelligence-Oberflächen nach RC3 sind Repository-Entwicklung und werden nicht rückwirkend Bestandteil des unveränderlichen Releases `v0.1.0-rc.3`.
