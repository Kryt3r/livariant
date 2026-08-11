# Architektur & Sicherheit

Das Framework trennt dauerhafte Projektwahrheit, wiederverwendbare Framework-Regeln, umgebungsspezifische Übersetzung und Runtime-Autorität, damit bequeme Werkzeuge nicht stillschweigend zu Projekteigentümern werden.

## Logische Ebenen

Die akzeptierte Architektur besteht aus fünf primären Ebenen:

1. **Core** — universelle Framework-Governance und Sicherheitsregeln.
2. **Patterns** — wiederverwendbare Architektur- und Produktmuster.
3. **Profiles** — domänenspezifische Leitlinien und Einschränkungen.
4. **Adapters** — umgebungsspezifische Capability-Erkennung und Übersetzung.
5. **Project Brain** — projekt-eigenes kanonisches Wissen und Lifecycle-Identität für ein konkretes Projekt.

Die ausführbare Runtime koordiniert diese Ebenen. Ein Adapter wird nicht allein deshalb autoritativ, weil er technisch eine Aktion ausführen kann.

## Das Project Brain ist kanonisch

Das Project Brain ist die dauerhafte Quelle der Wahrheit für Projektkontext. Resume-Ausgaben, Provider-Projektionen, temporäre Pläne, Tool-Beobachtungen und verstecktes Provider-Memory sind abgeleitete oder externe Evidenz — keine konkurrierenden kanonischen Speicher.

Eine providerspezifische Resume-Projektion kann für Claude Code und Codex unterschiedlich aussehen und dennoch denselben kanonischen Zustand repräsentieren.

## Vorhandensein ist nicht Aktualität

Kanonische Wahrheit garantiert nicht, dass jedes projekt-eigene Artefakt diese Wahrheit weiterhin korrekt widerspiegelt.

README, Quickstart, Architekturzusammenfassung, Provider-Instruktionsdatei, Beispiel oder Release-Guide können Aussagen enthalten, die beim Schreiben korrekt waren, aber nach späteren Produkt-, Policy-, CLI-, Provider-, Lifecycle-, Lizenz- oder Architekturentscheidungen veraltet sind.

Livariant bezeichnet dies als **Knowledge Drift**.

> [!IMPORTANT]
> **Vorhandensein ist nicht Aktualität.** Dass eine Aussage in einer legitimen projekt-eigenen Datei steht, beweist nicht, dass sie noch aktuell ist.

Das Framework unterscheidet:

- **kanonische aktuelle Wahrheit** — autoritatives aktuelles Wissen für seine Domäne;
- **abhängige aktuelle Wahrheit** — aktuelle Oberflächen, die mit kanonischer Wahrheit konsistent bleiben müssen;
- **historische Wahrheit** — Aufzeichnungen, die frühere Zustände oder Entscheidungen absichtlich bewahren;
- **ephemere Projektionen** — temporärer Kontext, der aus kanonischer Wahrheit abgeleitet wird.

Wenn sich kanonische Wahrheit ändert, sollten betroffene abhängige aktuelle Oberflächen identifiziert und geprüft werden. Historische Aufzeichnungen sollten in der Regel historisch bleiben und nicht nur deshalb umgeschrieben werden, um alte Begriffe zu entfernen.

Auch Erkennung erzeugt keine Autorität: Das Identifizieren eines veralteten Dokuments autorisiert Livariant nicht, es umzuschreiben.

Der kanonische semantische Vertrag steht in [`core/knowledge-drift-and-truth-surfaces.md`](../../core/knowledge-drift-and-truth-surfaces.md).

## Fähigkeit ist nicht Autorität

Eine wiederkehrende Framework-Regel lautet:

> Die technische Fähigkeit, etwas zu verändern, bedeutet nicht, dass die Runtime dazu autorisiert ist.

Unterstützte Mutationen benötigen deshalb explizite Autorität an der Runtime-Grenze. Das gilt für Initialisierung, kanonische Entscheidungsänderungen, Framework-Updates, Migrationen und Recovery.

Dasselbe Prinzip gilt für ausführbares Release-Vertrauen: Projektinput darf ein Release beschreiben oder ein Update anfordern, aber seine eigenen Bytes nicht selbst zu Execution Authority erklären.

## Bestehende Projekte sind standardmäßig geschützt

Das Mutationsmodell ist preservation-first:

```text
prüfen
→ Absicht und Umfang erklären
→ Auswirkung/Risiko bestimmen
→ bei Bedarf wiederherstellbare Ausgangsbasis schaffen
→ autorisieren
→ kleinstmögliche ausreichende Mutation durchführen
→ verifizieren
```

Bestehende projekt-eigene Dateien werden nicht normalisiert, nur weil das Framework eine andere Struktur bevorzugen würde.

## Bei Mehrdeutigkeit fail-closed

Beispiele für Zustände, die das Verhalten einschränken statt automatische Reparatur auszulösen:

- beschädigtes oder unvollständiges Project Brain,
- ungültige Lifecycle-Journals,
- ungelöste unterbrochene Migrationen,
- symlink-basierte verwaltete Schreibflächen,
- nicht unterstützte Migrationspfade,
- unerwartete Release-Quellen oder Artefaktidentitäten,
- fehlende unabhängige machine-local Artefakt-Autorität,
- Integritätsdrift der installierten Runtime,
- mehrdeutige oder veraltete Kompatibilitätsevidenz.

`doctor` ist absichtlich diagnostisch und read-only.

## Update-Vertrauen und Aktivierung

Ein verifiziertes Release-Artefakt ist nicht automatisch autorisiert, kompatibel, installiert, für Ausführung vertrauenswürdig oder aktiv.

Der implementierte Lifecycle hält diese Konzepte getrennt:

```text
Release-Identität
→ Artefakt-/Quellintegrität
→ Kompatibilität
→ explizite --apply-Autorisierung
→ bereits vorhandene unabhängige machine-local Artefakt-Autorität
→ Runtime-Installation ohne Lifecycle-Skripte
→ Verifikation der Release-Evidenz
→ Messung des installierten Package-Trees
→ Aufbau und erneute Prüfung des machine-local Runtime-Trusts
→ Candidate-Runtime-Attestation/-Ausführung
→ Lifecycle-Validierung
→ kanonischer Project-Brain-Release-Pin
```

Projektkontrollierter Input kann den unabhängigen Release-Authority-Record weder über die Livariant-CLI noch über die produktive API erzeugen. Einen projektseitigen `authorize-runtime`-Befehl gibt es absichtlich nicht.

Der Framework-Pin im Project Brain ist die kanonische Aktivierungsentscheidung. Eine vorbereitete Runtime auf der Festplatte kann sich nicht selbst aktivieren.

## Migration und Recovery

Schema-ändernde Updates verwenden dauerhafte Migrationsevidenz und Checkpoint-Integrität. Unterbrochene nicht replay-sichere Arbeit darf nicht einfach erneut ausgeführt werden, nur weil derselbe Befehl wiederholt wurde.

Recovery ist eine separat autorisierte Lifecycle-Operation. Checkpoints werden vor Restore an Pfad und Inhaltsintegrität gebunden geprüft. Sobald ein Rollback das wiederhergestellte Project Brain erzeugt und validiert hat, darf Cleanup diesen festgeschriebenen Restore nicht rückgängig machen: displaced State wird entfernt, bevor der letzte gültige Checkpoint gelöscht wird; ein später Cleanup-Fehler bewahrt sowohl das wiederhergestellte Brain als auch den Checkpoint.

## Provider-Grenze

Die aktuelle Preview-Adapteroberfläche unterstützt Project-Brain-Resume-Handoff für Claude Code und Codex. Adapter melden Umgebungsevidenz und Kompatibilität für diese Capability; sie verleihen sich selbst keine Projekt-Autorität und verändern keine nativen Provider-Instruktionsdateien.

Zukünftige Adapter-Capabilities benötigen eigene Conformance- und adversariale Evidenz, bevor sie als unterstützt gelten.
