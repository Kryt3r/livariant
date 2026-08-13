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
- die Livariant-Framework-Version;
- eine deterministische materiale Project-Brain-Baseline;
- bestätigte Projektidentität;
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

Die Digest-Eingabe ist versioniert, domain-separiert, eindeutig gerahmt und deterministisch sortiert. Sie bindet die Namen der verwalteten Eingaben, ihre exakten Bytes und die für die Interpretation relevante Project-Brain-Schema-Version.

Erzeugungszeit, Darstellung, Provider-Rendering und der absolute Projektpfad bestimmen die materiale Baseline nicht.

Zwei unveränderte Reads behalten deshalb dieselbe materiale Baseline, auch wenn ihre Erzeugungszeit unterschiedlich ist. Eine materiale Änderung am verwalteten Project Brain ändert die Baseline.

## Schutz vor parallelen Änderungen

Livariant gibt keinen sauberen Snapshot zurück, wenn sich das verwaltete Project Brain während der Snapshot-Erzeugung ändert.

Kanonischer Inhalt und Baseline werden aus demselben erfassten Zustand abgeleitet. Vor einem sauberen Ergebnis werden die verwalteten Eingaben erneut geprüft. Wurden sie parallel geändert, ist das Ergebnis blockiert und muss aus einem frischen Zustand neu erzeugt werden.

## Blockierter Zustand

Wenn das Project Brain fehlt, beschädigt, mehrdeutig, recovery-required oder aus einem anderen Grund nicht sicher als sauberer aktueller Kontext projiziert werden kann, liefert Livariant ein blockiertes Ergebnis, statt Teilinformationen als vertrauenswürdigen aktuellen Kontext darzustellen.

Für maschinenlesbare Nutzung enthält blockiertes JSON ausdrücklich `safetyState: "blocked"` und die CLI beendet sich mit einem von null verschiedenen Status. Ein interner Runtime-Fehler bleibt davon als eigener Fehlerpfad unterscheidbar.

In der menschlichen Ausgabe steht der blockierende Zustand vor den Diagnoseinformationen.

## Projekt-Locator ist keine dauerhafte Projektidentität

Der aktuelle Snapshot zeigt den Projektort, aus dem er erzeugt wurde. Das ist jedoch keine stabile dauerhafte Projektidentität.

Der erste Snapshot-Vertrag meldet deshalb bewusst:

```text
stableProjectIdentity: null
```

Ein verschobenes oder kopiertes Projekt erhält nicht einfach eine erfundene Identität, nur weil Livariant es lesen kann. Eine spätere dauerhafte projektübergreifende Identität benötigt einen eigenen geprüften Storage- und Migrationsvertrag.

## Trust-Grenze

Ein Project Context Snapshot ist abgeleitete Ausgabe.

Er:

- autorisiert keine Mutation;
- erzeugt oder verbraucht keine Freigabe;
- macht zurückgelieferte Provider-Kopien nicht vertrauenswürdig;
- erhebt Provider-Text nicht zu kanonischer Wahrheit;
- persistiert keine Terminologie oder Concept-IDs;
- repariert Drift nicht automatisch;
- injiziert Kontext nicht automatisch in Claude Code, Codex oder andere Provider.

Eine spätere materiale Aktion muss den aktuellen kanonischen Zustand neu lesen und revalidieren, statt einen alten oder zurückgelieferten Snapshot als dauerhafte Autorität zu behandeln.

## Verhältnis zu `resume`

`livariant resume` bleibt die aktuelle Provider-Handoff-Oberfläche für Claude Code und Codex.

`livariant context` ist die strukturierte Projektwahrheits-Projektion. Sie legt die read-side Baseline- und Sicherheitsgrenze fest, auf der spätere Semantic Change Proposals, Drift-Analyse und reichere Provider-Integrationen aufbauen können.

Diese späteren Funktionen gelten nicht allein deshalb als verfügbar, weil der Project Context Snapshot existiert.
