# Semantic Proposal Core

Diese Post-RC3-Repository-Funktion erzeugt aus einem ausdrücklich gelieferten Project-Brain-Entscheidungskandidaten ein read-only Review-Proposal.

## Befehle

```text
livariant propose --input <candidate.json>
livariant propose --input <candidate.json> --json
```

Die erste unterstützte Domäne ist `project-decision` mit den Kandidatenarten `add` und `supersede`.

Candidate-Dateien verwenden Schema-Version 1 und werden als externe Eingabe behandelt. Das Feld `origin` wird als nicht verifizierte Herkunftsbehauptung ausgewiesen.

Ein Proposal ist an dieselbe materiale Project-Brain-Baseline gebunden wie der Project Context Snapshot. Änderungen am Project Brain während der Erzeugung führen zu einem blockierten Ergebnis.

Jedes Proposal dieses ersten Schemas ist nur für das Review bestimmt und macht keine Änderungen:

```text
reviewOnly: true
applySupported: false
changesMade: 0
```

Exakte Duplikate aktiver Entscheidungen können erkannt werden. Abweichender Entscheidungstext wird von diesem ersten Slice nicht als semantisch vereinbar behauptet. Supersede-Kandidaten müssen genau eine strukturierte aktive Decision-ID benennen.

Die Eingabegrenzen liegen bei 64 KiB für die Candidate-Datei, 4 KiB für die vorgeschlagene Aussage und 8 KiB für die Begründung.

Eine erfolgreich erzeugte Proposal-Ausgabe endet mit Status `0`. Ungültige Candidate-Eingaben und blockierte Erzeugung verwenden von null verschiedene Statuswerte und unterscheidbare JSON-Ergebniszustände.

Dieser Slice ergänzt kein Proposal Apply, kein automatisches Drift-Scanning, keine Terminologie-Persistenz, keinen Provider-Transport, keine stabile Projektidentität, keinen LLM-basierten semantischen Vergleich und keine breiteren Proposal-Domänen.

`v0.1.0-rc.3` bleibt unverändert. Diese Funktion ist Post-RC3-Repository-Entwicklung, bis ein späteres Release separat freigegeben wird.
