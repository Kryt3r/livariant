# Architektur & Sicherheit

Livariant trennt Projektwissen, wiederverwendbare Framework-Regeln, provider-spezifische Übersetzung und Runtime-Autorität. Das Ziel ist einfach: Ein nützliches Tool soll nicht stillschweigend zum Eigentümer des Projekts werden.

Diese Seite erklärt das tiefere Modell hinter diesem Prinzip. Für die ersten Schritte mit Livariant musst du nicht jeden Abschnitt im Detail verstehen.

## Die wichtigsten Ebenen

Livariant hat fünf zentrale logische Ebenen:

1. **Core**: allgemeine Governance- und Sicherheitsregeln des Frameworks.
2. **Patterns**: wiederverwendbare Architektur- und Produktmuster.
3. **Profiles**: domänenspezifische Leitlinien und Einschränkungen.
4. **Adapters**: Erkennung und Übersetzung umgebungsspezifischer Fähigkeiten.
5. **Project Brain**: projekt-eigenes Wissen und Lifecycle-Identität für ein konkretes Projekt.

Die ausführbare Runtime koordiniert diese Ebenen. Ein Adapter wird nicht allein deshalb autoritativ, weil er technisch eine Aktion ausführen kann.

## Das Project Brain ist der dauerhafte Projektstand

Das Project Brain enthält den Projektkontext, den Livariant als kanonisch behandelt. Resume-Ausgaben, Provider-Projektionen, temporäre Pläne, Tool-Beobachtungen und verstecktes Provider-Memory können hilfreich sein, sind aber keine konkurrierenden kanonischen Speicher.

Zum Beispiel können Claude Code und Codex unterschiedlich formatierte Resume-Ausgaben bekommen und trotzdem denselben Project-Brain-Zustand beschreiben.

## Vorhandensein ist nicht Aktualität

Eine Datei kann zum Projekt gehören und trotzdem veraltete Informationen enthalten.

README, Quickstart, Architekturzusammenfassung, Provider-Instruktionsdatei, Beispiel oder Release-Guide können beim Schreiben korrekt gewesen sein und nach einer späteren Produkt-, Policy-, CLI-, Provider-, Lifecycle-, Lizenz- oder Architekturentscheidung veralten.

Livariant nennt das **Knowledge Drift**.

> [!IMPORTANT]
> **Vorhandensein ist nicht Aktualität.** Dass eine Aussage in einer legitimen projekt-eigenen Datei steht, beweist nicht, dass sie noch aktuell ist.

Livariant unterscheidet vier Arten von Information:

- **kanonische aktuelle Wahrheit**: das autoritative aktuelle Wissen für seine Domäne;
- **abhängige aktuelle Wahrheit**: aktuelle Inhalte, die mit der kanonischen Wahrheit übereinstimmen müssen;
- **historische Wahrheit**: Aufzeichnungen, die bewusst einen früheren Zustand oder eine frühere Entscheidung bewahren;
- **ephemere Projektionen**: temporärer Kontext, der aus kanonischer Wahrheit erzeugt wird.

Wenn sich die kanonische Wahrheit ändert, sollten abhängige aktuelle Inhalte identifiziert und geprüft werden. Historische Aufzeichnungen bleiben normalerweise historisch, statt nur zur Entfernung alter Begriffe umgeschrieben zu werden.

Das Erkennen veralteter Inhalte erzeugt keine Berechtigung, sie zu verändern. Erkennung und Autorität bleiben getrennt.

Der kanonische semantische Vertrag steht in [`core/knowledge-drift-and-truth-surfaces.md`](../../core/knowledge-drift-and-truth-surfaces.md).

## Fähigkeit ist nicht Autorität

Ein Grundsatz zieht sich durch Livariant:

> Die technische Fähigkeit, etwas zu verändern, bedeutet nicht, dass die Runtime dazu autorisiert ist.

Unterstützte Änderungen benötigen explizite Autorität an der Runtime-Grenze. Das gilt für Initialisierung, kanonische Entscheidungsänderungen, Framework-Updates, Migrationen und Wiederherstellung.

Dasselbe gilt für ausführbares Release-Vertrauen. Projektinput darf ein Release beschreiben oder ein Update anfordern, aber seine eigenen Bytes nicht selbst zur Ausführungsautorität machen.

## Bestehende Projekte sind standardmäßig geschützt

Livariant verwendet ein preservation-first Mutationsmodell:

```text
prüfen
-> Absicht und Umfang erklären
-> Auswirkung und Risiko bestimmen
-> bei Bedarf eine wiederherstellbare Ausgangsbasis schaffen
-> autorisieren
-> die kleinste ausreichende Änderung durchführen
-> verifizieren
```

Bestehende projekt-eigene Dateien werden nicht normalisiert, nur weil Livariant eine andere Struktur bevorzugen würde.

## Unklarer Zustand wird nicht erraten

Kann Livariant nicht nachweisen, dass ein Zustand sicher und unterstützt ist, wird das Verhalten eingeschränkt, statt den Fehler automatisch zu übergehen.

Beispiele sind:

- beschädigtes oder unvollständiges Project Brain;
- ungültige Lifecycle-Journals;
- ungelöste unterbrochene Migrationen;
- Symlinks auf verwalteten Schreibflächen;
- nicht unterstützte Migrationspfade;
- unerwartete Release-Quellen oder Artefaktidentitäten;
- fehlende unabhängige rechnerlokale Artefakt-Autorität;
- Integritätsdrift der installierten Runtime;
- mehrdeutige oder veraltete Kompatibilitätsevidenz.

`doctor` ist absichtlich diagnostisch und read-only. Der Befehl meldet das Problem, statt es still zu reparieren.

## Update-Vertrauen und Aktivierung

Ein gültiges Release-Artefakt ist nicht automatisch autorisiert, kompatibel, installiert, für Ausführung vertrauenswürdig oder aktiv.

Livariant prüft diese Punkte getrennt:

```text
Release-Identität
-> Artefakt- und Quellintegrität
-> Kompatibilität
-> explizite --apply-Autorisierung
-> bereits vorhandene unabhängige rechnerlokale Artefakt-Autorität
-> Runtime-Installation ohne Lifecycle-Skripte
-> Verifikation der Release-Evidenz
-> Messung des installierten Package-Trees
-> Aufbau und erneute Prüfung des rechnerlokalen Runtime-Trusts
-> Candidate-Runtime-Attestation und Ausführung
-> Lifecycle-Validierung
-> kanonischer Project-Brain-Release-Pin
```

Projektkontrollierter Input kann den unabhängigen Release-Authority-Record weder über die Livariant-CLI noch über die produktive API erzeugen. Einen projektseitigen `authorize-runtime`-Befehl gibt es absichtlich nicht.

Der Framework-Pin im Project Brain ist die kanonische Aktivierungsentscheidung. Eine vorbereitete Runtime auf der Festplatte kann sich nicht selbst aktivieren.

## Migration und Wiederherstellung

Schema-ändernde Updates verwenden dauerhafte Migrationsevidenz und auf Integrität geprüfte Checkpoints. Unterbrochene Arbeit, die nicht sicher wiederholt werden kann, darf nicht einfach erneut ausgeführt werden, nur weil derselbe Befehl noch einmal gestartet wurde.

Wiederherstellung ist eine separat autorisierte Lifecycle-Operation. Vor einem Restore prüft Livariant sowohl die Pfadbindung als auch die Inhaltsintegrität des Checkpoints.

Hat ein Rollback das wiederhergestellte Project Brain erzeugt und validiert, darf die anschließende Bereinigung diesen erfolgreichen Restore nicht wieder zerstören. Verdrängter Zustand wird entfernt, bevor der letzte gültige Checkpoint gelöscht wird. Scheitert die späte Bereinigung, bleiben das wiederhergestellte Project Brain und der Checkpoint erhalten.

## Provider-Grenze

Die aktuelle Preview unterstützt Project-Brain-Resume-Handoff für Claude Code und Codex.

Adapter können Umgebungsevidenz und Kompatibilität für diese Fähigkeit melden. Sie verleihen sich selbst keine Projekt-Autorität und schreiben native Provider-Instruktionsdateien nicht stillschweigend um.

Zukünftige Adapter-Fähigkeiten benötigen eigene Conformance- und adversariale Evidenz, bevor sie als unterstützt gelten.
