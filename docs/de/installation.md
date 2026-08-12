# Livariant installieren und einem Projekt hinzufügen

Livariant wird als **lokales Tooling auf dem Rechner** installiert und anschließend im Root des Projekts verwendet, das du damit verwalten möchtest. Es wird nicht *in* Claude Code, Codex oder einen anderen Coding-Agenten installiert. Der unterstützte Preview-Installationsweg fügt Livariant außerdem nicht als Abhängigkeit zur `package.json` deines Projekts hinzu.

Der aktuelle Public-Preview-Distributionsweg ist ein Livariant-Release-Tarball aus dem kanonischen GitHub Release zusammen mit Release-Manifest und Prüfsummen.

## Was du brauchst

- Node.js 20 oder neuer;
- npm aus deiner Node.js-Installation;
- eine lokale Kopie des Projekts, das du mit Livariant verwenden möchtest;
- die Livariant-Preview-Release-Dateien aus dem kanonischen GitHub Release von `Kryt3r/livariant`, sobald dieses Release veröffentlicht ist.

Das Release-Bundle enthält mindestens:

```text
livariant-<version>.tgz
release-manifest.json
SHA256SUMS
```

Für `0.1.0-rc.2` lautet der Paketname:

```text
livariant-0.1.0-rc.2.tgz
```

> [!IMPORTANT]
> Beziehe die Release-Dateien aus dem kanonischen Livariant-GitHub-Release. Installiere keinen Tarball aus einem unbekannten Projekt, Chat-Anhang, Mirror oder beliebigen Package-Quelle nur deshalb, weil die Datei `livariant` heißt.

## 1. Heruntergeladenen Tarball prüfen

Vergleiche vor der Installation von ausführbarem Tooling den SHA-256 des Tarballs mit dem Wert in `SHA256SUMS` und `release-manifest.json`.

### Linux

Im Ordner mit den heruntergeladenen Release-Dateien:

```bash
sha256sum livariant-0.1.0-rc.2.tgz
cat SHA256SUMS
```

Die Digests müssen exakt übereinstimmen.

### macOS

```bash
shasum -a 256 livariant-0.1.0-rc.2.tgz
cat SHA256SUMS
```

Die Digests müssen exakt übereinstimmen.

### Windows PowerShell

```powershell
(Get-FileHash .\livariant-0.1.0-rc.2.tgz -Algorithm SHA256).Hash.ToLower()
Get-Content .\SHA256SUMS
```

Die Digests müssen exakt übereinstimmen.

Wenn sie nicht übereinstimmen: **Abbrechen und den Tarball nicht installieren.**

## 2. Livariant-CLI aus dem geprüften Release-Tarball installieren

Im Ordner mit dem Tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.2.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-0.1.0-rc.2.tgz
```

Damit wird der Befehl `livariant` als Machine-/User-Tooling installiert. Dadurch wird **kein** Projekt initialisiert und Livariant wird nicht zur `package.json` oder zu `node_modules` des Zielprojekts hinzugefügt.

> [!NOTE]
> Wenn dein globaler npm-Prefix nicht beschreibbar ist, verwende bzw. konfiguriere eine benutzerbeschreibbare Node-/npm-Installation oder einen passenden Prefix. Umgehe ein Berechtigungsproblem nicht dadurch, Livariant-Dateien manuell in das Projekt oder in verwaltete Runtime-/Trust-Pfade zu kopieren.

## 3. Installierte CLI prüfen

```bash
livariant version
```

Für diesen Preview-Kandidaten muss die Ausgabe Livariant `0.1.0-rc.2` auf dem Channel `preview` erkennen lassen.

Wenn deine Shell `livariant` nicht findet, öffne ein neues Terminal und prüfe, ob das globale npm-Bin-Verzeichnis in deinem `PATH` liegt.

## 4. Das bestehende Claude-Code-, Codex- oder andere Projekt öffnen

Livariant arbeitet mit dem **Projektverzeichnis**, nicht mit einem Provider-Account oder einer Editor-Installation.

Existiert das Projekt bereits lokal, öffne ein Terminal in seinem Root-Verzeichnis. Liegt es nur in einem Git-Hosting, klone es zuerst über deinen normalen Git-Workflow und wechsle anschließend in den Projekt-Root.

Beispiel:

```bash
cd /pfad/zu/deinem-projekt
```

Unter Windows PowerShell:

```powershell
Set-Location C:\pfad\zu\deinem-projekt
```

Wenn du Claude Code oder Codex bereits in diesem Verzeichnis nutzt, ist das derselbe Projekt-Root. Für diese Provider gibt es in der aktuellen Preview keinen separaten Livariant-Plugin-Installationsschritt.

## 5. Projekt vor der Initialisierung prüfen

Im Projekt-Root:

```bash
livariant status
livariant doctor
livariant init
```

Damit prüfst du den aktuellen Zustand vor der Übernahme. `livariant init` ohne `--apply` ist nur Planung und verändert nichts.

Gerade bei bestehenden Projekten solltest du den Plan prüfen. Livariant ist preservation-first: Die unterstützte Initialisierung soll das Project Brain ergänzen, ohne vorhandene projekt-eigene Dateien in eine bevorzugte Struktur umzuschreiben.

## 6. Bewusst initialisieren

Wenn der Plan korrekt ist:

```bash
livariant init --apply
```

Danach prüfen:

```bash
livariant status
livariant doctor
livariant resume
```

Damit enthält dein Projekt den minimalen von Livariant verwalteten `.project-brain/`-Zustand.

## 7. Aktuellen Claude-Code- oder Codex-Resume-Handoff nutzen

Die Preview-Integration ist bewusst begrenzt: Livariant kann kanonischen Project-Brain-Kontext für den ausgewählten Provider projizieren, ist aber noch kein natives Claude-Code-/Codex-Plugin und schreibt nicht stillschweigend provider-eigene Instruction-Dateien um.

### Claude Code — Linux / macOS

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
```

### Claude Code — Windows PowerShell

```powershell
$env:LIVARIANT_PROVIDER_ENV = "claude-code"
livariant resume --provider claude-code
```

### Codex — Linux / macOS

```bash
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

### Codex — Windows PowerShell

```powershell
$env:LIVARIANT_PROVIDER_ENV = "codex"
livariant resume --provider codex
```

Die erzeugte Resume-Ausgabe ist ein temporärer Provider-Handoff. Das Project Brain bleibt kanonisch.

## Was die Installation tut — und was nicht

```text
verifizierter GitHub-Release-Tarball
        ↓
Livariant-CLI als Machine-/User-Tooling installieren
        ↓
bestehenden Projekt-Root öffnen
        ↓
mit status / doctor / init prüfen
        ↓
explizit init --apply ausführen
        ↓
Livariant normal nutzen und bei Bedarf Provider-Resume erzeugen
```

Die CLI-Installation:

- initialisiert keine Projekte automatisch;
- verändert nicht automatisch `CLAUDE.md`, `AGENTS.md` oder Provider-Memory;
- erteilt keinem Coding-Provider Mutation- oder Runtime-Ausführungsautorität;
- migriert ein vorhandenes Project Brain nicht allein dadurch, dass das CLI-Paket aktualisiert wurde;
- autorisiert keine zukünftigen ausführbaren Runtime-Update-Artefakte.

## Spätere Updates sind ein anderer Vorgang

Die Installation eines neueren Livariant-CLI-Pakets ist nicht dasselbe wie die Migration eines vorhandenen Project Brain oder die Autorisierung einer neuen Runtime. Bestehende Projekte müssen den unterstützten `update`-/Migration-/Recovery-Lifecycle aus [Updates, Migrationen & Wiederherstellung](lifecycle-guide.md) verwenden.

Ersetze `.project-brain/`, verwalteten Runtime-State, Runtime-Trust-Evidenz oder Release-Authorization-Evidenz nicht manuell.

## Danach lesen

- [Fünf-Minuten-Schnellstart](quickstart.md)
- [Bestehende Projekte](existing-projects.md)
- [Provider Handoff](provider-handoff.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
- [Updates, Migrationen & Wiederherstellung](lifecycle-guide.md)
