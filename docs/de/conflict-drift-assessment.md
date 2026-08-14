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

Für ein gültiges schema-2 Project Brain enthält die Bewertung dieselbe kanonische logische `stableProjectIdentity`, die aus dem verwalteten `metadata.json`-Zustand erfasst wird, der auch in die materiale Baseline eingeht. Historische schema-1 Project Brains melden bis zur ausdrücklichen Migration `stableProjectIdentity: null`.

Die stabile Identität ist material für die abgeleitete Assessment-Hülle und identifiziert die logische Project-Brain-Linie. Sie begründet weder Benutzerfreigabe noch eindeutige Checkout-Identität, Anti-Replay-Aktualität oder Mutationsautorität. Kopierte Project-Brain-Bytes können legitim dieselbe ID behalten.

Die Bewertung bleibt abgeleitete, nur lesbare Review-Evidenz und weist aus:

```text
reviewOnly: true
mutationAuthorization: false
applySupported: false
authorizationEligible: false
changesMade: 0
```

Gleichzeitige Änderungen am Project Brain verhindern ein normales erfolgreiches Ergebnis, sodass die Bewertung keine stabile Identität aus einem verwalteten Zustand mit einer Baseline aus einem anderen vermischen kann.

Siehe [Stable Project Identity Foundation](stable-project-identity-foundation.md).
