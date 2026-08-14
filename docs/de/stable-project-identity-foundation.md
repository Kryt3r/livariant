# Stable Project Identity Foundation

Stable Project Identity ist eine Project-Brain-Grundlage nach RC3, die eine logische Project-Brain-Linie identifiziert, ohne vorzutäuschen, damit einen einzelnen physischen Checkout, eine Maschine oder eine Benutzersitzung zu identifizieren.

Diese Funktion ist Repository-Entwicklung nach dem unveränderlichen Foundation-Preview-Release `v0.1.0-rc.3`.

## Persistiertes Modell

Die aktuelle Repository-Entwicklung hebt das Project-Brain-Schema von Version `1` auf Version `2` an.

Eine gültige schema-2 `.project-brain/metadata.json` enthält genau eine erforderliche kanonische UUID:

```json
{
  "projectBrain": {
    "schemaVersion": 2,
    "projectId": "<canonical-lowercase-uuid>"
  }
}
```

Runtime-Projektionen geben diesen Wert als `stableProjectIdentity` aus.

Die Kennung ist projekt-eigene kanonische Metadaten. Sie wird lokal mit vertrauenswürdiger Runtime-Zufälligkeit erzeugt und nicht aus Projektpfad, Paketname, Git-Remote, Provider-Ausgabe, Projektinhalt, Zeitstempel allein, Maschinenname, Benutzername oder materialem Baseline-Digest abgeleitet.

Zwei unabhängig frisch initialisierte Project Brains erhalten daher unterschiedliche logische Identitäten, selbst wenn ihre übrigen Projektinhalte identisch sind.

## Frische Initialisierung

Ein frisch von der schema-2 Runtime initialisiertes Project Brain erhält genau eine Identität während der ausdrücklich autorisierten Initialisierungsmutation.

Read-Operationen erzeugen, ersetzen, reparieren oder rotieren keine Identität.

Ein schema-2 Project Brain mit fehlender oder ungültiger `projectId` schlägt geschlossen als beschädigter Zustand fehl. Livariant erzeugt beim Lesen von Status, Context, Proposals, Drift-Evidence oder Provider Context nicht stillschweigend eine Ersatzidentität.

## Bestehende Schema-1-Projekte

Schema 1 bleibt die historische Project-Brain-Form vor Einführung einer stabilen Identität.

Ein schema-1 Projekt kann weiterhin gelesen werden, ohne dass eine stabile Identität erfunden wird. Strukturierte Read-Oberflächen melden:

```text
stableProjectIdentity: null
```

bis das Projekt ausdrücklich über den unterstützten Lifecycle-Pfad migriert wird.

Der bestehende Schema-`1 -> 2`-Migrationspfad erzeugt die logische Projekt-ID innerhalb der bereits vorhandenen Checkpoint-, Journal-, Validierungs-, Aktivierungs-, Rollback- und Recovery-Transaktion. Eine fehlgeschlagene Migration rollt zum verifizierten Schema-1-Checkpoint zurück, statt eine neu erzeugte Identität autoritativ zurückzulassen.

Eine unterbrochene Migration bleibt recovery-required. Vorläufige schema-2 Bytes begründen allein keine sauber abgeschlossene Migration.

## Copy-, Move- und Clone-Semantik

Die ID identifiziert eine logische Project-Brain-Linie, nicht eine eindeutige Dateisysteminstanz.

Daher gilt:

- Verschieben oder Umbenennen eines Projektverzeichnisses rotiert die ID nicht;
- eine Änderung des Git-Remotes rotiert die ID nicht automatisch;
- eine bytegenaue Kopie eines initialisierten Project Brains behält dieselbe ID;
- zwei physische Checkouts können legitim dieselbe `stableProjectIdentity` ausgeben.

Livariant behauptet bewusst nicht, dass projekt-eigene Bytes beweisen können, von welcher Maschine oder welchem Checkout sie stammen.

Fork-, Split-, Merge- oder Identity-Replacement-Semantik ist in dieser Foundation nicht implementiert und benötigt einen getrennt geprüften Lifecycle-Vertrag.

## Read-side-Projektion

Für ein gültiges schema-2 Project Brain wird dieselbe stabile logische Identität durch die aktuellen kohärenten Active-Project-Intelligence-Read-Oberflächen projiziert:

- Project Context Snapshot;
- Semantic Proposal Core;
- Conflict and Drift Assessment;
- Provider Context Foundation.

Die Identität wird aus demselben verwalteten `metadata.json`-Zustand erfasst, der auch für die materiale Project-Brain-Baseline verwendet wird. Die bestehende Concurrent-Change-Revalidierung bleibt erhalten: Ändert sich der verwaltete Zustand während der Erzeugung eines Ergebnisses, schlägt die Operation geschlossen fehl, statt Identität und Baseline verschiedener Zustände zu vermischen.

Bei Semantic Proposals und Drift Assessments ist die stabile Projektidentität Teil des abgeleiteten materialen Ergebnisses. Dadurch wird das Ergebnis weder ausführbar noch zu einer vertrauenswürdigen Autorität.

## Authority-Grenze

`projectId` ist kein Geheimnis und kein Autorisierungsmechanismus.

Ein Repository kann seine eigene ID lesen oder kopieren, und kopierte Project-Brain-Bytes behalten sie absichtlich. Identitätsgleichheit beweist daher keines der folgenden Dinge:

- Zustimmung des Benutzers;
- Mutationsautorisierung;
- Anti-Replay-Aktualität;
- eindeutige Checkout-Identität;
- machine-local Trust;
- Checkpoint-Integrität;
- Runtime- oder Release-Integrität;
- Vertrauenswürdigkeit eines vom Provider zurückgegebenen Pakets.

Die aktuellen Proposal-/Provider-Oberflächen bleiben strukturell nicht autorisierend:

```text
mutationAuthorization: false
applySupported: false
authorizationEligible: false
changesMade: 0
```

Eine spätere proposal-bound Authorization muss, falls sie implementiert wird, einen getrennt geprüften vertrauenswürdigen Autorisierungs-Event/-Kanal verwenden und zusätzlich Material wie exaktes Proposal, Scope, Baseline, Projektidentität und die vom späteren Vertrag verlangte Anti-Replay-Evidence binden.

## Zurückgegebene und kopierte Projektionen

Ein Snapshot, Proposal, Assessment oder Provider-Paket mit stabiler Projekt-ID bleibt abgeleitete Ausgabe.

Das Kopieren dieser Ausgabe, ihre Rückgabe durch einen Provider oder die spätere Vorlage derselben ID erhebt das Paket nicht zu kanonischer Project-Brain-Wahrheit. Materiale Aktionen müssen den aktuellen kanonischen Zustand erneut lesen und revalidieren.

## Release-Grenze

Diese Funktion wird nicht rückwirkend Bestandteil von `v0.1.0-rc.3`.

RC3 bleibt unveränderliche historische Release-Evidence. Ein späteres verteiltes Release mit schema-2 Stable Project Identity benötigt einen eigenen, separat freigegebenen Release-Prozess.
