# Livariant Fünf-Minuten-Schnellstart

<p align="center">
  <a href="../quickstart.md">English</a> · <strong>Deutsch</strong>
</p>

Wenn du Livariant gerade erst kennenlernst, reicht für den Anfang diese Idee: Dein Projekt bekommt mit dem **Project Brain** einen eigenen, dauerhaften Wissensstand. So musst du wichtigen Kontext nicht nur in Chatverläufen oder im Gedächtnis eines einzelnen KI-Tools aufbewahren.

Dieser Schnellstart zeigt dir den kürzesten sicheren Weg von der Installation über den ersten Einsatz bis zur wiederholten Nutzung im Alltag.

## Voraussetzungen

Du brauchst:

- Node.js 20 oder neuer;
- ein lokales Projektverzeichnis;
- den geprüften Livariant-Release-Tarball für `0.1.0-rc.3`, sobald RC3 veröffentlicht ist.

Paket und CLI-Befehl heißen `livariant`.

Das bestehende unveränderliche GitHub Release `v0.1.0-rc.2` ist historische Pre-Public-Release-Evidenz und nicht der aktuelle Kandidat.

## 0. Livariant installieren

Livariant wird nicht in Claude Code oder Codex installiert. Du installierst die CLI einmal auf deinem Rechner und verwendest sie danach im Projektordner.

Im Ordner mit dem geprüften Release-Tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.3.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-0.1.0-rc.3.tgz
```

Danach prüfst du die Installation:

```bash
livariant version
```

Wechsle anschließend in den Hauptordner des Projekts, das du mit Livariant verwenden möchtest.

Die Installation trägt Livariant nicht in die `package.json` deines Projekts ein und initialisiert nichts automatisch.

Für Download-Prüfung, SHA-256, PATH-Hilfe und Windows-Details lies [Livariant installieren und einem Projekt hinzufügen](installation.md).

## 1. Projekt zuerst prüfen

Im Projektordner:

```bash
livariant status
livariant doctor
livariant init
```

`livariant init` ohne `--apply` verändert nichts. Der Befehl zeigt dir zuerst, was Livariant gefunden hat und welche Project-Brain-Dateien angelegt würden.

> [!IMPORTANT]
> Bei einem bestehenden Projekt solltest du diesen Plan lesen. Livariant soll das Projekt übernehmen, das bereits existiert, und es nicht ungefragt in eine andere Struktur umbauen.

## 2. Project Brain anlegen

Wenn der Plan korrekt aussieht:

```bash
livariant init --apply
```

Dadurch entsteht das minimale Project Brain:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Vorhandene projekt-eigene Dateien werden bei der unterstützten Initialisierung nicht einfach umgeschrieben.

## 3. Ergebnis prüfen

```bash
livariant status
livariant doctor
```

Ein gesund initialisiertes Projekt sollte das Project Brain als vorhanden und den Lifecycle als initialisiert melden.

`doctor` ist diagnostisch und read-only. Der Befehl repariert beschädigten oder unklaren Zustand nicht stillschweigend.

## 4. Projektwissen sicher festhalten

Die Preview unterstützt die wiederholte Pflege bestätigter Ziele, bestätigten Projektwissens und akzeptierter Entscheidungen.

Lies die aktuellen Werte zuerst:

```bash
livariant goals
livariant knowledge
livariant decisions
```

Wenn du ein Ziel, einen bestätigten Fakt oder eine Entscheidung hinzufügen willst, lässt du `--apply` zunächst weg. Livariant zeigt dann nur die geplante kanonische Änderung und schreibt noch nichts:

```bash
livariant goals add "Die erste sichere Public Preview veröffentlichen"
livariant knowledge add "Die Preview wird über GitHub Releases verteilt"
livariant decisions add "GitHub Releases für die Preview-Distribution verwenden"
```

Wenn der vorgeschlagene Wert stimmt, wendest du ihn ausdrücklich an:

```bash
livariant goals add "Die erste sichere Public Preview veröffentlichen" --apply
livariant knowledge add "Die Preview wird über GitHub Releases verteilt" --apply
livariant decisions add "GitHub Releases für die Preview-Distribution verwenden" --apply
```

Wenn sich eine akzeptierte Entscheidung später ändert, listest du die Entscheidungen, nimmst die ID und supersedest die alte Entscheidung, statt ihre Geschichte zu löschen:

```bash
livariant decisions
livariant decisions supersede <decision-id> "Signierte Release-Infrastruktur verwenden" --reason "Das Distributionsmodell hat sich geändert"
```

Auch dieser Befehl plant zunächst nur. Erst mit zusätzlichem `--apply` wird die Änderung ausgeführt.

Livariant prüft vor diesen Schreibvorgängen den Zustand des Project Brain, schützt die verwalteten Pfade, überschreibt keine parallel geänderten projekt-eigenen Inhalte und verifiziert den gespeicherten Wert, bevor Erfolg gemeldet wird.

## 5. Kontext für eine neue Arbeitssitzung erzeugen

Provider-neutral:

```bash
livariant resume
```

Die Resume-Ausgabe enthält bestätigte Ziele, aktive Entscheidungen, bekannte Fakten, offene Unklarheiten und vorhandene Projektidentität. Supersedete Entscheidungen bleiben als Historie erhalten, werden aber nicht als aktive Wahrheit ausgegeben.

Für Claude Code oder Codex unter Linux und macOS:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

Unter Windows PowerShell zum Beispiel:

```powershell
$env:LIVARIANT_PROVIDER_ENV = "claude-code"
livariant resume --provider claude-code
```

Die Resume-Ausgabe ist temporärer Arbeitskontext. Das Project Brain bleibt der dauerhafte Projektstand.

> [!IMPORTANT]
> Die aktuelle Claude-Code- und Codex-Unterstützung ist bewusst auf Project-Brain-Resume-Handoff begrenzt. Livariant ist kein vollständiges natives Plugin für diese Provider.

## Wie du Livariant danach normalerweise nutzt

Nach der Initialisierung führst du nicht ständig `init` erneut aus.

Ein normaler Arbeitszyklus kann so aussehen:

```text
1. Projekt öffnen.
2. Bei Bedarf status oder doctor ausführen.
3. Mit resume den aktuellen Project-Brain-Zustand in eine neue KI-Sitzung geben.
4. Am Projekt arbeiten.
5. Wenn ein Ziel, ein bestätigter Fakt oder eine akzeptierte Entscheidung dauerhaftes Projektwissen werden soll, die Änderung mit goals, knowledge oder decisions planen.
6. Den Plan prüfen und denselben Befehl mit --apply wiederholen.
7. In einer späteren Sitzung mit resume wieder den aktualisierten Projektstand verwenden.
```

Livariant beobachtet nicht automatisch jedes Gespräch und geht nicht davon aus, dass jeder Satz aus einer KI-Sitzung in das Project Brain gehört. Du entscheidest, welche bestätigte Projektwahrheit dauerhaft festgehalten wird.

## 6. Update zuerst planen

Mit einem Release-Manifest aus der vertrauenswürdigen Preview-Quelle:

```bash
livariant update --manifest ./release-manifest.json
```

Das ist nur Planung. Livariant zeigt Quelle und Zielversion, Channel, Source-ID, Artefaktidentität, SHA-256 und mögliche Auswirkungen auf Project Brain und Migration.

Nach Prüfung des Plans:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

Ein Manifest kann seine eigene `sourceId` nicht selbst vertrauenswürdig machen. `--trusted-source` ist davon getrennte Trust-Evidenz. Die Artefaktbytes müssen außerdem zum Digest im Manifest passen.

Für ausführbare Updates muss der exakte Artefakt-Digest bereits durch eine unabhängige rechnerlokale Release-Policy außerhalb des Projekts autorisiert sein. Projektdateien, Manifest, `--trusted-source` und die projektseitige Livariant-CLI können diese Autorität nicht erzeugen.

Fehlt diese Autorisierung, stoppt das Update, bevor Candidate-Runtime-Code ausgeführt werden kann. Einen projektseitigen `authorize-runtime`-Befehl gibt es nicht.

> [!WARNING]
> Ersetze `.project-brain/`, Lifecycle-State, `metadata.json`, verwaltete Runtime-Dateien oder Runtime-Trust- und Release-Authorization-Records nicht manuell, um ein Update oder eine Migration zu simulieren.

Schema-ändernde Releases werden über denselben `update`-Pfad in den unterstützten Migrations-Lifecycle geführt.

## 7. Unterbrochene Migration wiederherstellen

Beginne immer read-only:

```bash
livariant doctor
livariant recover
```

Wenn Livariant einen gültigen Checkpoint und eine unterstützte Rollback-Strategie meldet:

```bash
livariant recover --apply
```

Ein fehlender, verschobener, manipulierter oder mehrdeutiger Checkpoint wird nicht geraten. In diesem Fall bleibt automatische Wiederherstellung blockiert.

Nach einem verifizierten Rollback entfernt Livariant verdrängten Recovery-State, bevor der letzte gültige Checkpoint gelöscht wird. Ein später Fehler bei der Bereinigung darf weder das wiederhergestellte Project Brain noch diesen Checkpoint zerstören.

## 8. Sicherheitsgrenze erhalten

Ersetze `.project-brain/` nicht mit Dateien aus einer anderen Livariant-Version und kopiere keine neuere Runtime manuell in framework-verwalteten Lifecycle-Speicher, um ein Update vorzutäuschen.

Der unterstützte Lifecycle prüft Release-Identität, Artefaktintegrität, unabhängige Release-Authority, Migrations-Checkpoints, installierte Runtime-Integrität, Aktivierungszustand und Recovery-Evidenz, bevor geschützter Zustand aktiv wird.

## Danach lesen

- [Installation & erstes Projekt](installation.md)
- [Bestehende Projekte](existing-projects.md)
- [Provider-Handoff](provider-handoff.md)
- [Updates, Migrationen & Wiederherstellung](lifecycle-guide.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
- [Public-Preview-Umfang & Einschränkungen](preview-scope.md)
