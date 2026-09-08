# First-Run-Onboarding-Zustand

Der First-Run-Ablauf der Livariant-Desktop-App ist Produktzustand und kein Installer-Zustand. Der Installer darf die Anwendung starten, aber der Onboarding-Fortschritt gehört Livariant und kann später fortgesetzt oder erneut geöffnet werden.

Der kanonische Onboarding-Zustand verwendet die bestehenden Fragen aus dem Project-Understanding-Review und die Project-Source-Registry wieder, statt eine zweite First-Run- oder Repository-Engine zu erzeugen.

## Zustandsmodell

Der Onboarding-Lifecycle wird so dargestellt:

`welcome -> project -> understanding -> sources -> providers -> health -> complete`

Eine UI darf zwischen diesen Schritten navigieren, ohne Fortschritt in Authority oder Project Truth umzuwandeln.

Fragen zum Projektverständnis beginnen als `open`. Nutzer können sie beantworten oder explizit als `skipped` markieren. Überspringen speichert keine abgeleitete Standardantwort und macht aus einem unbekannten Punkt kein bekanntes Projektwissen. Eine übersprungene Frage kann später erneut bearbeitet werden.

Eine teilweise Einrichtung ist gültig. Provider-Einrichtung darf verschoben werden und optionale Projektverständnis-Fragen dürfen offen oder übersprungen bleiben. Der Health-Schritt ist eine nur lesende Zusammenfassung und kein Authorization-Gate.

## Projekt- und Quellen-Einrichtung

Projektidentität/lokaler Root und Repository-Identität bleiben getrennte Konzepte. Die Repository-Einrichtung delegiert an die kanonische Project-Source-Registry:

- genau ein Hauptrepository;
- null oder mehr zusätzliche Repositories;
- jedes zusätzliche Repository benötigt eine nicht leere Zweckbeschreibung;
- Repository-Beschreibungen liefern nur Kontext und vergeben weder Trust noch Authority;
- lokale Checkout-Bindings bleiben von der Remote-Repository-Identität getrennt.

GitHub-Authentifizierung/OAuth und umfassendes Repository-Management gehören bewusst nicht in diesen Zustandsvertrag.

## Grenzen

Der Onboarding-Vertrag hält ausdrücklich fest:

- unbeantwortete Frage != Standardantwort;
- übersprungene Frage != bekannte Tatsache;
- Onboarding-Evidence != Project Truth;
- Repository-Beschreibung != Authority;
- Onboarding autorisiert keine Mutation;
- Onboarding verändert keine projekt-eigenen Dateien.

Die zukünftige Desktop-UI soll diesen Zustand darstellen, statt diese Semantik im Renderer erneut zu implementieren.
