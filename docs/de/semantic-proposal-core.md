# Semantic Proposal Core

Diese Post-RC3-Repository-Funktion erzeugt aus einem ausdrücklich gelieferten Project-Brain-Kandidaten ein read-only Review-Proposal.

## Befehle

```text
livariant propose --input <candidate.json>
livariant propose --input <candidate.json> --json
```

Schema-Version 1 unterstützt aktuell:

- `project-decision` mit `add` und `supersede`;
- `project-goal` mit `add`;
- `project-knowledge` mit `add`.

Candidate-Dateien sind externe Eingaben. Das Feld `origin` wird als nicht verifizierte Herkunftsangabe ausgewiesen.

Ein Proposal ist an dieselbe materiale Project-Brain-Baseline gebunden wie der Project Context Snapshot. Änderungen am Project Brain während der Erzeugung führen zu einem blockierten Ergebnis.

Jedes aktuelle Proposal ist nur für das Review bestimmt und macht keine Änderungen:

```text
reviewOnly: true
applySupported: false
changesMade: 0
```

## Decision-Proposals

Exakte Duplikate aktiver Entscheidungen können erkannt werden. Abweichender Entscheidungstext wird von dieser begrenzten Implementierung nicht als semantisch vereinbar behauptet. Supersede-Kandidaten müssen genau eine strukturierte aktive Decision-ID benennen.

## Goal-Proposals

`project-goal` unterstützt aktuell nur `add`.

Livariant vergleicht den Kandidaten mit dem bestätigten Goal-Bereich. Ein exaktes bestätigtes Duplikat kann erkannt werden. Ein gleicher Bullet-Text außerhalb des bestätigten Goal-Bereichs wird separat ausgewiesen und nicht als bestätigtes Goal behandelt. Abweichender Goal-Text wird nicht als semantisch vereinbar behauptet.

## Knowledge-Proposals

`project-knowledge` unterstützt aktuell nur `add`.

Livariant vergleicht den Kandidaten mit bestätigtem Projektwissen. Ein exaktes bestätigtes Fact-Duplikat kann erkannt werden. Ein gleicher Eintrag unter `Known unknowns` wird als Scope-Konflikt mit ungelöstem Zustand ausgewiesen und nicht als bestätigtes Wissen behandelt. Abweichender Fact-Text wird nicht als semantisch vereinbar oder widerspruchsfrei behauptet.

Goal, Knowledge und Project Context verwenden dieselbe Interpretation der semantischen Project-Brain-Bereiche, damit sie aus denselben verwalteten Dateien keine unterschiedlichen kanonischen Bereiche ableiten.

Für Goal- und Knowledge-Kandidaten muss die vorgeschlagene Aussage ein einzeiliger skalarer Wert sein. Dieselbe Aussage unter unterschiedlichen Proposal-Domänen ist material für die Proposal-Identität.

Die Eingabegrenzen bleiben bei 64 KiB für die Candidate-Datei, 4 KiB für die vorgeschlagene Aussage und 8 KiB für die Begründung.

Eine erfolgreich erzeugte Proposal-Ausgabe endet mit Status `0`. Ungültige Candidate-Eingaben und blockierte Erzeugung verwenden von null verschiedene Statuswerte und unterscheidbare JSON-Ergebniszustände.

Diese Funktion ergänzt weiterhin kein Proposal Apply, kein automatisches Drift-Scanning, keine Terminologie-Persistenz, keinen Provider-Transport, keine stabile Projektidentität, keinen LLM-basierten semantischen Vergleich, keine autonome Kandidatenfindung, keinen Goal- oder Knowledge-Ersatz und keine Goal- oder Knowledge-Supersession.

`v0.1.0-rc.3` bleibt unverändert. Diese Fähigkeiten sind Post-RC3-Repository-Entwicklung, bis ein späteres Release separat freigegeben wird.
