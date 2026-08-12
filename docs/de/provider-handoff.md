# Provider-Handoff

Die aktuelle Preview unterstützt eine klar begrenzte Provider-Integration: **Project-Brain-Resume-Handoff** für Claude Code und Codex.

Livariant versucht dabei nicht, jede Funktion dieser Tools zu kontrollieren. Die Aufgabe ist kleiner und klarer: Livariant erzeugt aus dem aktuellen Project Brain passenden Kontext für den Coding-Agent, den du gerade verwenden möchtest.

## Was weitergegeben wird

Livariant kopiert kein verstecktes Sitzungsmemory von einem Provider zum anderen.

Stattdessen bekommt jeder Provider neuen Resume-Kontext, der aus dem Project Brain erzeugt wird:

```text
Project Brain
-> kanonischer ResumeContext
   -> Claude-Code-Projektion
   -> Codex-Projektion
```

Formulierung und Darstellung dürfen sich unterscheiden. Die zugrunde liegende Projektbedeutung muss gleich bleiben.

Bestätigte Ziele, aktive Entscheidungen, bekannte Fakten, offene Unklarheiten und verfügbare Projektidentität können Teil dieses Resume-Kontexts sein. Abgelöste Entscheidungen bleiben in der Historie, werden aber nicht mehr als aktuelle Wahrheit ausgegeben.

## Warum das wichtig ist

Angenommen, du triffst mit Claude Code eine wichtige Architekturentscheidung. Wenn diese Entscheidung die aktuelle Sitzung überdauern soll, hältst du sie zuerst über Livariant als Projektwahrheit fest:

```bash
livariant decisions add "Ansatz A für die Authentifizierung verwenden"
```

Der erste Befehl zeigt nur die geplante Änderung. Wenn sie korrekt ist, wendest du sie bewusst an:

```bash
livariant decisions add "Ansatz A für die Authentifizierung verwenden" --apply
```

Später startest du eine getrennte Codex-Sitzung. Codex braucht dafür keinen Zugriff auf das versteckte Memory der alten Claude-Code-Sitzung. Livariant erzeugt neuen, für Codex passenden Resume-Kontext aus demselben Project Brain.

Damit bleibt das Projekt selbst die Quelle der Kontinuität und nicht das private Gedächtnis eines einzelnen Providers.

Dasselbe Prinzip gilt für dauerhafte Ziele und bestätigte Projektfakten:

```bash
livariant goals add "Authentifizierungs-Migration abschließen"
livariant knowledge add "Die Authentifizierung verwendet aktuell Ansatz A"
```

Prüfe zuerst den Plan und füge erst danach `--apply` zu dem Befehl hinzu, den du wirklich schreiben möchtest.

## Provider bewusst auswählen

Livariant verlangt explizite Evidenz dafür, welche Provider-Umgebung du gerade ansprechen möchtest.

Unter Linux oder macOS:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

Unter Windows PowerShell setzt du die Umgebungsvariable zuerst:

```powershell
$env:LIVARIANT_PROVIDER_ENV = "claude-code"
livariant resume --provider claude-code
```

Fehlt die passende Umgebungsevidenz, bricht ein provider-spezifischer Handoff geschlossen ab, statt Kompatibilität nur anzunehmen.

Die Auswahl eines Providers belegt die Anwendbarkeit der Resume-Funktion. Sie erzeugt keine Mutationsautorität.

Die gebündelten Preview-Adapteridentitäten sind:

```text
livariant.claude-code.resume
livariant.codex.resume
```

## Ein vollständiges Handoff-Beispiel

Ein normaler unterstützter Übergang sieht so aus:

1. Du arbeitest mit Claude Code am Projekt.
2. Ein Ziel, Fakt oder eine Entscheidung wird wichtig genug, um über den aktuellen Chat hinaus erhalten zu bleiben.
3. Du planst die Project-Brain-Änderung mit `goals`, `knowledge` oder `decisions`.
4. Du prüfst den Plan und wiederholst den Befehl mit `--apply`.
5. Die Claude-Code-Sitzung endet.
6. Kein verstecktes Claude-Memory wird zu Codex kopiert.
7. Du startest Codex im selben Projektordner.
8. Livariant erzeugt eine Codex-spezifische Resume-Projektion aus dem aktuellen Project Brain.
9. Codex erhält die aktuellen Entscheidungen, bekannten Fakten, Ziele, offenen Fragen und den Lifecycle-Kontext, den Livariant für Resume bereitstellt.

Die ausführbare Hardening-Suite testet diesen Ablauf in getrennten Prozessen mit unterschiedlichen provider-lokalen Hidden-Memory-Werten.

## `CLAUDE.md` und `AGENTS.md`

`CLAUDE.md` und `AGENTS.md` können weiterhin nützliche Projektdateien sein, sind aber nicht das Project Brain.

Die aktuellen Resume-Adapter überschreiben diese Dateien nicht. Enthalten sie Text, der dem kanonischen Project-Brain-Zustand widerspricht, ersetzt dieser Text im unterstützten Resume-Pfad nicht die Project-Brain-Wahrheit.

Eine zukünftige native Integration solcher Instruktionsdateien würde eine neue Mutationsoberfläche schaffen. Dafür wären eigene Autorisierungs-, Preservation-, Conformance- und adversariale Tests nötig, bevor Livariant dieses Verhalten als unterstützt bezeichnen könnte.

## Wenn alter Resume-Kontext veraltet

Resume-Ausgabe ist temporärer Kontext. Nur weil ein Provider diese Ausgabe erhalten hat, bekommt er dadurch keine Write-back-Autorität für das Project Brain.

Ändert sich eine Project-Brain-Entscheidung später, einschließlich einer expliziten Ablösung durch eine neue Entscheidung, kann alter Resume-Kontext den früheren Zustand nicht wieder zur kanonischen Wahrheit machen.

Um eine akzeptierte Entscheidung abzulösen und ihre Historie zu erhalten, lässt du dir zuerst die Entscheidungen anzeigen, wählst die passende ID und planst die Ablösung:

```bash
livariant decisions
livariant decisions supersede <decision-id> "Ansatz B für die Authentifizierung verwenden" --reason "Architektur geändert"
```

Prüfe den Plan und wiederhole den Befehl mit `--apply`, wenn er korrekt ist.

Die nächste Resume-Ausgabe wird immer aus dem aktuellen Project-Brain-Zustand erzeugt.
