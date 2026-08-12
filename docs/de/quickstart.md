# Livariant Fünf-Minuten-Schnellstart

<p align="center">
  <a href="../quickstart.md">English</a> · <strong>Deutsch</strong>
</p>

Wenn du Livariant gerade erst kennenlernst, reicht für den Anfang diese Idee: Dein Projekt bekommt mit dem **Project Brain** einen eigenen, dauerhaften Wissensstand. So musst du wichtigen Kontext nicht nur in Chatverläufen oder im Gedächtnis eines einzelnen KI-Tools aufbewahren.

Dieser Schnellstart zeigt dir den kürzesten sicheren Weg von der Installation bis zum ersten Resume-Kontext.

## Voraussetzungen

Du brauchst:

- Node.js 20 oder neuer;
- ein lokales Projektverzeichnis;
- den geprüften Livariant-Release-Tarball des aktuellen Preview-Kandidaten, sobald dieser veröffentlicht ist.

Paket und CLI-Befehl heißen `livariant`.

## 0. Livariant installieren

Livariant wird nicht in Claude Code oder Codex installiert. Du installierst die CLI einmal auf deinem Rechner und verwendest sie danach im Projektordner.

Im Ordner mit dem geprüften Release-Tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.2.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-0.1.0-rc.2.tgz
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

## 4. Kontext für eine neue Arbeitssitzung erzeugen

Provider-neutral:

```bash
livariant resume
```

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

Ein normaler Arbeitsbeginn kann so aussehen:

```bash
livariant status
livariant resume
```

Wenn etwas unklar wirkt:

```bash
livariant doctor
```

Du verwendest Resume-Kontext, um einer neuen KI-Sitzung den aktuellen Projektstand zu geben. Dauerhafte Entscheidungen und bestätigtes Projektwissen sollten im Project Brain festgehalten werden, statt nur in einem einzelnen Chat zu bleiben.

## 5. Update zuerst planen

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

## 6. Unterbrochene Migration wiederherstellen

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

## 7. Sicherheitsgrenze erhalten

Ersetze `.project-brain/` nicht mit Dateien aus einer anderen Livariant-Version und kopiere keine neuere Runtime manuell in framework-verwalteten Lifecycle-Speicher, um ein Update vorzutäuschen.

Der unterstützte Lifecycle prüft Release-Identität, Artefaktintegrität, unabhängige Release-Authority, Migrations-Checkpoints, installierte Runtime-Integrität, Aktivierungszustand und Recovery-Evidenz, bevor geschützter Zustand aktiv wird.

## Danach lesen

- [Installation & erstes Projekt](installation.md)
- [Bestehende Projekte](existing-projects.md)
- [Provider-Handoff](provider-handoff.md)
- [Updates, Migrationen & Wiederherstellung](lifecycle-guide.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
- [Public-Preview-Umfang & Einschränkungen](preview-scope.md)
