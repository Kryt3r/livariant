# Kontrollierte Übernahme des Startverständnisses

`livariant adopt-understanding` verbindet ausgewählte Eingaben aus dem Guided Project Understanding Review mit Livariants bereits gehärtetem Proposal- und Authorization-Pfad.

Der Befehl übernimmt **nicht** das gesamte Review, behandelt Review-Eingaben nicht als Project Truth und verändert Project Brain nicht selbstständig.

## Unterstützter v1-Ablauf

```text
aktuelle Projekt-Discovery
-> Guided-Understanding-Review-Eingabe
-> materialgebundene Candidate-ID
-> Actionable Proposal
-> separates `authorize`
-> separates `apply`
-> verifizierte Project-Brain-Änderung
```

Befehl:

```text
livariant adopt-understanding --input <review.json> --select <candidate-id> [--json]
```

Die Review-Eingabe verwendet dasselbe begrenzte Schema wie `livariant understand --input`. Candidate Evidence trägt nun eine deterministische `candidateId`, die an Typ, Ziel, normalisierte Aussage und die Trust-Klasse `candidate-evidence` gebunden ist. Die menschliche `understand`-Ausgabe zeigt dieselbe ID.

Ändert sich die Aussage, ändert sich auch ihre Candidate-ID. Die Adoption schlägt damit fail-closed fehl, statt anderen Text unter demselben Review-Thema stillschweigend als die ausgewählte Aussage zu behandeln.

V1 unterstützt absichtlich nur zwei eindeutig abbildbare Response-Ziele:

- `unknown:project-goals` -> `project-goal`;
- `unknown:project-purpose` -> `project-knowledge`.

Korrekturen, Antworten zur aktuellen Produktrichtung, technischen Richtung, Regeln und anderes mehrdeutiges Material bleiben Candidate Evidence. Livariant rät daraus keine kanonische Domäne.

## Trust-Grenze

Die Auswahl drückt Nutzerabsicht aus; sie ist **keine** Mutation Authority.

Der Befehl rekonstruiert die aktuelle Bootstrap Discovery und das Guided Understanding Review aus dem aktuellen Projekt plus der angegebenen Review-Eingabe. Die ausgewählte Candidate-ID muss in diesem rekonstruierten Review weiterhin vorhanden sein. Danach läuft die ausgewählte Aussage erneut durch den kanonischen Semantic-Proposal-Candidate-Parser, einschließlich der bestehenden Single-Line- und Größenlimits, bevor die vorhandene Actionable-Proposal-Mechanik verwendet wird.

Das entstehende Actionable Proposal benötigt weiterhin den vorhandenen proposalgebundenen Authorization- und Apply-Pfad. Es wird keine passende Authority implizit gesucht oder verbraucht.

`adopt-understanding` führt keinen direkten Project-Brain-Writer und keine neue Authority-Klasse ein.

## Externes Wissen

Dieser Befehl verbindet, importiert, indexiert oder synchronisiert kein externes Second Brain. Zukünftige External-Knowledge-Source-Adapter bleiben Evidence-Quellen und dürfen diese kontrollierte Adoption-Grenze nicht umgehen.

## Release-Grenze

Diese Fähigkeit existiert nur in kanonischen Repository-Ständen, in denen sie enthalten ist. Der immutable Release `v0.1.0-rc.3` liegt zeitlich davor.
