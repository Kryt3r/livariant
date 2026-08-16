# Historisches Sicherheits-Regressionsregister

Dieses Register ordnet wichtige, bereits geschlossene Livariant-Sicherheitsfindings und Angriffsklassen deterministischer Regressionsevidenz im kanonischen Repository zu.

Das Register ist **Evidenz, keine Authority**. Ein Eintrag bedeutet, dass Livariant aktuell eine konkrete Regressionspruefung fuer die genannte Angriffsklasse besitzt. Er behauptet weder vollstaendige Sicherheitsabdeckung noch beweist er, dass verwandte Fehlerklassen unmoeglich sind.

## Abdeckungsregeln

- Jeder geschuetzte Eintrag muss auf deterministische Repository-Evidenz verweisen.
- Wird ein Regressionstest entfernt, umbenannt oder prueft die Angriffsklasse nicht mehr, muss dieses Register in derselben Aenderung aktualisiert werden.
- Historische Findings bleiben historisch. Dieses Register schreibt ihre urspruengliche Schwere oder Review-Historie nicht um.
- Erfolgreiche CI autorisiert weder Merge noch Release oder Veroeffentlichung.

## Register v1

| Historisches Finding / Angriffsklasse | Geschuetzte Flaeche | Deterministische Regressionsevidenz | Aktuelle Invariante |
| --- | --- | --- | --- |
| Recovery Checkpoint Substitution | Identitaet von Migrations-/Recovery-Checkpoints im Lifecycle | `tests/recovery.test.ts`: `tampered operation identity cannot substitute the active Project Brain as a checkpoint` | Recovery schlaegt geschlossen fehl, wenn Identitaets-/Pfadmaterial des Migrationsjournals substituiert wird. |
| Stranded Recovery State | Zustandsuebergaenge des Lifecycle-Recovery | `tests/recovery.test.ts`: `hard interruption between recovery swap renames remains fail-closed and blocks fresh init`; `tests/recovery-cleanup-boundary.test.ts` | Gestrandete Lifecycle-Artefakte bleiben recovery-required und koennen nicht als frischer Initialisierungszustand fehlinterpretiert werden. |
| Runtime-Trust-/Authority-Substitution | maschinenlokale Runtime-Trust-Grenze | `tests/runtime-project-trust-boundary.test.ts`: `project-local Runtime evidence cannot authorize code execution before machine-local trust`; `tests/pretrust-runtime-authorization.test.ts` | Projektlokale Runtime-Evidenz kann keinen maschinenlokalen Execution Trust erzeugen. |
| Windows-`cmd.exe`-/Metazeichen-Risiko bei Runtime-Installation | Prozessstart fuer Runtime-/Package-Installation | `tests/windows-runtime-paths.test.ts`: Verbot der Shell-Weiterleitung plus Windows-Faelle fuer literale Metazeichen | npm-/Runtime-Installation bleibt shell-frei und Windows-Metazeichen werden als literale Pfaddaten behandelt. |
| Proposal-/Authority-Replay oder -Substitution | proposal-bound Authorization und Semantic Apply | `tests/proposal-authorization.test.ts`; `tests/semantic-apply-reconciliation.test.ts` | Authorization bleibt an Proposal/Baseline gebunden und kann nicht auf anderes semantisches Material oder einen anderen Zustand wiederverwendet oder substituiert werden. |
| Materialgebundene Understanding-Adoption-Substitution | Auswahl von Guided-Understanding-Kandidaten | `tests/understanding-adoption.test.ts` | Kandidatenauswahl bleibt an exaktes Kandidatenmaterial gebunden und nicht nur an Topic-/Target-Labels. |
| Gefaelschte Understanding-Kandidatenidentitaet | Core-API fuer kontrollierte Adoption | `tests/understanding-adoption.test.ts` | Core berechnet die Kandidaten-Materialidentitaet neu, statt vom Aufrufer gelieferte Identitaetsbehauptungen zu vertrauen. |
| Umgehung des kanonischen Semantic Parsers durch reviewed candidate evidence | kontrollierte Adoption in Semantic-Proposal-Vorbereitung | `tests/understanding-adoption.test.ts`; `tests/semantic-proposal.test.ts` | Ausgewaehltes Review-Material muss die kanonische Semantic-Candidate-Validierung durchlaufen, bevor ein Actionable Proposal vorbereitet werden kann. |

## Pflege

Wenn ein zukuenftiges Security-/Correctness-Finding akzeptiert und behoben wird, darf es hier nur aufgenommen werden, wenn eine deterministische Regressionspruefung existiert und die Zuordnung konkret genug fuer eine Pruefung ist.

Kann ein wichtiges historisches Finding keiner deterministischen Regressionsevidenz zugeordnet werden, muss diese Luecke festgehalten werden, statt Schutz zu behaupten.
