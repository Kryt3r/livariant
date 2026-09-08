# Project-Source-Center-Präsentation

Das Project Source Center ist eine nur lesende Desktop-Präsentationsschicht für konfigurierte Projekt-Repositories und kanonische Adoption-Review-Lifecycle-Daten.

Es entdeckt keine Repositories, entscheidet keine Project Truth, vergibt keine Authority und verändert keine projekt-eigenen Dateien. Es stellt bereits konfigurierte Source-Registry-Zustände und optionale explizite Source-Beobachtungen dar.

## Quellenmodell

Ein Projekt enthält genau ein Hauptrepository plus null oder mehr zusätzliche Repositories. Beschreibungen zusätzlicher Repositories bleiben ausschließlich semantischer Kontext.

Die Präsentation zeigt – sofern Evidence vorhanden ist:

- Haupt-/Zusatzrolle;
- Repository-Identität und optionale Remote-URL;
- Pflichtbeschreibung zusätzlicher Repositories;
- optionale lokale Checkout-Bindung;
- Erreichbarkeit;
- Branch-/Revision-Identität;
- Beobachtungszeitpunkt;
- Hinweise auf stale/nicht erreichbare Zustände.

Fehlt eine Beobachtung, bleibt die Erreichbarkeit `unknown` und Branch/Revision/Zeitpunkt bleiben unbekannt. Die Präsentation darf keinen gesunden oder aktuellen Zustand erfinden.

Doppelte Beobachtungen und Beobachtungen zu nicht konfigurierten Repositories schlagen fail-closed fehl.

## Review-Integration

Die Source-Center-Präsentation kann die bestehende kanonische `AdoptionDesktopPresentation` einbetten. Dadurch bleibt der bereits qualifizierte Existing-Project-Adoption-Lifecycle für Findings, Evidence, explizite Entscheidungen, Proposal-, Authorization-, Apply- sowie stale/ersetzte Zustände erhalten.

Das Project Source Center ist keine zweite Adoption-Engine und interpretiert diese Lifecycle-Zustände nicht neu.

## Grenzen

- Repository-Beschreibung != Project Truth;
- Repository-Beschreibung != Authority;
- Source-Beobachtung != Project Truth;
- Source-Beobachtung != Authority;
- Desktop-Review-Präsentation != Authority;
- keine versteckte Konfliktauflösung;
- keine Projektmutation.
