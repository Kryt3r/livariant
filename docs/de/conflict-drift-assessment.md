# Konflikt- und Drift-Bewertung

Dies ist Repository-Entwicklung nach RC3. `v0.1.0-rc.3` enthält diese Funktion nicht.

Livariant vergleicht eine ausdrücklich angegebene Beobachtung mit der aktuellen Project-Brain-Baseline, ohne Projektzustand zu verändern.

```text
livariant drift --input <observation.json>
livariant drift --input <observation.json> --json
```

Runtime-API: `buildConflictDriftAssessment()`.

Unterstützte Domänen sind `project-decision`, `project-goal` und `project-knowledge`. Unterstützte Evidenzklassen sind `dependent-current`, `historical` und `provider-observation`.

Aktuelle Diagnosen sind `consistent`, `confirmed-drift`, `historical-match`, `authority-ambiguous` und `insufficient-evidence`. Unterschiedlicher Text allein ist kein Beweis für Drift.

Die Bewertung ist abgeleitete, nur lesbare Review-Evidenz. Sie hat `changesMade: 0` und wendet keine Änderungen an. Gleichzeitige Änderungen am Project Brain verhindern ein normales erfolgreiches Ergebnis.
