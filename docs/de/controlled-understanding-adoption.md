# Kontrollierte Übernahme des Startverständnisses

`livariant adopt-understanding` verbindet ausgewählte Eingaben aus dem Guided Project Understanding Review mit Livariants bereits gehärtetem Proposal- und Authorization-Pfad.

Der Befehl übernimmt **nicht** das gesamte Review, behandelt Review-Eingaben nicht als Project Truth und verändert Project Brain nicht selbstständig.

## Unterstützter v1-Ablauf

```text
aktuelle Projekt-Discovery
-> Guided-Understanding-Review-Eingabe
-> explizite Candidate-Auswahl
-> Actionable Proposal
-> separates `authorize`
-> separates `apply`
-> verifizierte Project-Brain-Änderung
```

Befehl:

```text
livariant adopt-understanding --input <review.json> --select <candidate-target> [--json]
```

Die Review-Eingabe verwendet dasselbe begrenzte Schema wie `livariant understand --input`.

V1 unterstützt absichtlich nur zwei eindeutig abbildbare Response-Ziele:

- `unknown:project-goals` -> `project-goal`;
- `unknown:project-purpose` -> `project-knowledge`.

Korrekturen, Antworten zur aktuellen Produktrichtung, technischen Richtung, Regeln und anderes mehrdeutiges Material bleiben Candidate Evidence. Livariant rät daraus keine kanonische Domäne.

Für das ausgewählte Ziel muss exakt eine aktuelle Response vorhanden sein. Fehlende oder doppelte Responses werden fail-closed abgelehnt.

## Trust-Grenze

Die Auswahl drückt Nutzerabsicht aus; sie ist **keine** Mutation Authority.

Der Befehl rekonstruiert die aktuelle Bootstrap Discovery und das Guided Understanding Review aus dem aktuellen Projekt plus der angegebenen Review-Eingabe. Danach wird die ausgewählte unterstützte Aussage durch die bestehende Semantic-Proposal-/Actionable-Proposal-Mechanik geleitet.

Das entstehende Actionable Proposal benötigt weiterhin den vorhandenen proposalgebundenen Authorization- und Apply-Pfad. Es wird keine passende Authority implizit gesucht oder verbraucht.

`adopt-understanding` führt keinen direkten Project-Brain-Writer und keine neue Authority-Klasse ein.

## Externes Wissen

Dieser Befehl verbindet, importiert, indexiert oder synchronisiert kein externes Second Brain. Zukünftige External-Knowledge-Source-Adapter bleiben Evidence-Quellen und dürfen diese kontrollierte Adoption-Grenze nicht umgehen.

## Release-Grenze

Diese Fähigkeit existiert nur in kanonischen Repository-Ständen, in denen sie enthalten ist. Der immutable Release `v0.1.0-rc.3` liegt zeitlich davor.
