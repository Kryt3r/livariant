# Leitfaden für bestehende Projekte

Du brauchst kein neues Repository, um Livariant zu nutzen. Bestehende Projekte sind ein normaler Anwendungsfall.

Livariant prüft zuerst, was bereits vorhanden ist, und soll diesen Zustand möglichst erhalten. Dein Repository wird nicht einfach umgebaut, nur damit es stärker nach einem Livariant-Projekt aussieht.

## Sicherer Übernahmeablauf

Im Hauptordner des Projekts:

```bash
livariant status
livariant doctor
livariant init
```

Diese Befehle helfen dir, das Projekt zu verstehen, bevor Livariant verwalteten Zustand anlegt.

`livariant init` ohne `--apply` ist nur Planung und verändert nichts. Lies, welche Informationen Livariant erkannt hat und welche Project-Brain-Dateien angelegt würden.

Wenn der Plan korrekt ist:

```bash
livariant init --apply
```

Die unterstützte Initialisierung ergänzt das Project Brain. Sie führt nicht automatisch folgende Dinge aus:

- Sourcecode umorganisieren;
- Konfigurationsdateien umschreiben;
- widersprüchliche Dokumentation selbstständig auflösen;
- Secrets in das Project Brain kopieren;
- vorhandene Agent-Instruktionsdateien ersetzen, nur um das Repository aufzuräumen.

> [!IMPORTANT]
> Bestehende projekt-eigene Dateien bleiben unter Kontrolle des Projekts. Nur weil Livariant eine Datei lesen kann, bekommt es dadurch keine Erlaubnis, sie umzuschreiben.

## Nach der Übernahme: nur bestätigte Projektwahrheit festhalten

Die Initialisierung bedeutet nicht, dass Livariant das Projekt ab jetzt überwacht oder selbst entscheidet, was in das Project Brain gehört. Du legst fest, was dauerhafte Projektwahrheit wird.

Den aktuellen semantischen Zustand kannst du so ansehen:

```bash
livariant goals
livariant knowledge
livariant decisions
```

Wenn etwas bestätigt ist und spätere KI-Sitzungen überdauern soll, planst du die Änderung zuerst:

```bash
livariant goals add "Während der Migration rückwärtskompatibel bleiben"
livariant knowledge add "Die bestehende API wird vom Mobile-Client verwendet"
livariant decisions add "Für die Preview die aktuelle API-Struktur beibehalten"
```

Diese Befehle schreiben nichts, bis du den ausgewählten Befehl mit `--apply` wiederholst.

Gerade bei bestehenden Projekten ist diese Trennung wichtig. Livariant soll Vermutungen aus der Repository-Prüfung nicht automatisch in Projektwahrheit verwandeln. Discovery hilft bei der sicheren Übernahme; semantische Änderungen am Project Brain bleiben explizit und autorisiert.

Ändert sich eine akzeptierte Entscheidung später, löst du sie gezielt ab, statt ihre Historie zu löschen:

```bash
livariant decisions
livariant decisions supersede <decision-id> "Neue API-Struktur übernehmen" --reason "Migration abgeschlossen"
```

Prüfe die geplante Ablösung zuerst und füge `--apply` erst hinzu, wenn sie korrekt ist.

## Was Livariant bei der Prüfung erkennen kann

Die aktuelle Baseline kann direkte Projektevidenz verwenden, zum Beispiel:

- einen Paketnamen aus gültigen Paketmetadaten;
- vorhandene Source-Verzeichnisse;
- ob das Verzeichnis ein Git-Repository ist;
- ausgewählte strukturelle Hinweise, die für die unterstützte Initialisierung relevant sind.

Livariant erfindet bewusst keine Projektziele oder Architektur aus schwachen Hinweisen.

Sind Informationen fehlerhaft oder widersprüchlich, schränkt Livariant seine Schlussfolgerungen ein. Eine beschädigte `package.json` kann zum Beispiel als nicht lesbar gemeldet werden, statt ihren Inhalt zu erraten.

Livariant darf erkennen, dass eine sensible Datei wie `.env` existiert, weil das für sichere Discovery relevant ist. Der unterstützte Initialisierungspfad kopiert deren geheime Inhalte nicht in das Project Brain.

## Vorhandene Claude-Code- und Codex-Dateien

Dateien wie `CLAUDE.md` und `AGENTS.md` bleiben projekt-eigen.

Livariant kann erkennen, dass sie existieren, überschreibt sie bei der unterstützten Übernahme aber nicht. Ihr Inhalt wird auch nicht automatisch zur kanonischen Project-Brain-Wahrheit, nur weil ein Provider ihn verwendet.

Provider-Memory und Resume-Projektionen sind nützlicher Arbeitskontext, aber keine konkurrierenden Projektarchive.

Nachdem du bestätigte Ziele, Wissen oder Entscheidungen ausdrücklich über Livariant festgehalten hast, wird ein neues `livariant resume` aus dem aktuellen Project Brain erzeugt und nicht aus veraltetem Provider-Memory.

## Nicht neu initialisieren, um etwas zu reparieren

Sobald ein gültiges Project Brain existiert, ist eine frische Initialisierung nicht mehr der normale Weg.

Ein erneutes `init --apply` darf ein vorhandenes gültiges Project Brain nicht überschreiben oder normalisieren.

Ist das Project Brain beschädigt, unvollständig, gedriftet oder wartet auf Lifecycle-Recovery, beginne mit der Diagnose:

```bash
livariant doctor
livariant recover
```

> [!CAUTION]
> Lösche oder ersetze `.project-brain/` nicht und führe danach eine neue Initialisierung als Reparatur-Shortcut aus. Dadurch können Projekthistorie verloren gehen und der unterstützte Recovery-Ablauf umgangen werden.

Recovery wird nur angewendet, wenn Livariant eine gültige unterstützte Strategie meldet:

```bash
livariant recover --apply
```

## Dateisystemgrenzen

Livariant-verwaltete Project-Brain-Dateien und Lifecycle-Verzeichnisse müssen innerhalb der autorisierten Projektgrenze bleiben.

Wird eine kanonische Project-Brain-Datei oder ein verwaltetes Lifecycle-Verzeichnis durch einen Symlink ersetzt, der Schreibzugriffe an einen anderen Ort umleiten würde, lehnt Livariant diesen Schreibpfad ab.

Damit kann Dateisystemzugriff die Autorität von Livariant nicht stillschweigend über die Project-Brain-Speichergrenze hinaus erweitern.
