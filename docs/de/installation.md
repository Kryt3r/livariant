# Livariant installieren und einem Projekt hinzufügen

Livariant wird einmal als lokales Kommandozeilen-Tool auf deinem Rechner installiert. Danach verwendest du es direkt im Hauptordner des Projekts, das du mit KI weiterentwickelst.

Livariant wird nicht in Claude Code, Codex oder einen anderen Coding-Agent installiert. Es wird im aktuellen Preview-Weg auch nicht als Abhängigkeit in die `package.json` deines Projekts eingetragen.

## Was du brauchst

- Node.js 20 oder neuer;
- npm aus deiner Node.js-Installation;
- eine lokale Kopie deines Projekts;
- die Livariant-Release-Dateien aus dem kanonischen GitHub Release von `Kryt3r/livariant`, sobald der Preview-Kandidat veröffentlicht ist.

Das Release-Bundle enthält mindestens:

```text
livariant-<version>.tgz
release-manifest.json
SHA256SUMS
```

Für `0.1.0-rc.2` heißt das Paket:

```text
livariant-0.1.0-rc.2.tgz
```

> [!IMPORTANT]
> Lade die Release-Dateien nur aus dem kanonischen Livariant-GitHub-Release. Installiere keinen Tarball aus einem unbekannten Repository, Chat-Anhang, Mirror oder einer beliebigen Paketquelle nur deshalb, weil die Datei `livariant` heißt.

## 1. Download prüfen

Bevor du ausführbaren Code installierst, vergleichst du den SHA-256 des Tarballs mit den Werten in `SHA256SUMS` und `release-manifest.json`.

### Linux

Im Ordner mit den heruntergeladenen Release-Dateien:

```bash
sha256sum livariant-0.1.0-rc.2.tgz
cat SHA256SUMS
```

Die Hashwerte müssen exakt übereinstimmen.

### macOS

```bash
shasum -a 256 livariant-0.1.0-rc.2.tgz
cat SHA256SUMS
```

Die Hashwerte müssen exakt übereinstimmen.

### Windows PowerShell

```powershell
(Get-FileHash .\livariant-0.1.0-rc.2.tgz -Algorithm SHA256).Hash.ToLower()
Get-Content .\SHA256SUMS
```

Die Hashwerte müssen exakt übereinstimmen.

Wenn sie nicht übereinstimmen, installiere den Tarball nicht.

## 2. Livariant installieren

Im Ordner mit dem geprüften Tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.2.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-0.1.0-rc.2.tgz
```

Damit wird der Befehl `livariant` für deinen Rechner oder Benutzer installiert.

Noch passiert nichts mit deinem Projekt. Livariant wird weder automatisch initialisiert noch in `package.json` oder `node_modules` des Zielprojekts eingetragen.

> [!NOTE]
> Falls npm nicht in sein globales Installationsverzeichnis schreiben darf, richte einen benutzerbeschreibbaren npm-Prefix oder eine passende Node.js-Installation ein. Kopiere Livariant nicht als Workaround manuell in das Projekt oder in verwaltete Runtime- und Trust-Verzeichnisse.

## 3. Installation prüfen

```bash
livariant version
```

Für diesen Preview-Kandidaten muss die Ausgabe Livariant `0.1.0-rc.2` auf dem Channel `preview` erkennen lassen.

Wenn dein Terminal den Befehl `livariant` nicht findet, öffne zuerst ein neues Terminal. Prüfe danach, ob das globale npm-Bin-Verzeichnis in deinem `PATH` liegt.

## 4. Dein Projekt öffnen

Livariant arbeitet mit dem Projektordner auf deinem Rechner. Es verbindet sich für die grundlegende Nutzung nicht mit deinem Claude-, OpenAI- oder Editor-Account.

Wenn dein Projekt bereits lokal existiert, öffne ein Terminal in seinem Hauptordner.

Beispiel unter Linux oder macOS:

```bash
cd /pfad/zu/deinem-projekt
```

Unter Windows PowerShell:

```powershell
Set-Location C:\pfad\zu\deinem-projekt
```

Liegt dein Projekt bisher nur auf GitHub oder einem anderen Git-Host, klone es zuerst wie gewohnt und wechsle danach in den Projektordner.

Wenn du Claude Code oder Codex dort bereits verwendest, ist das genau derselbe Ordner. Für diese Tools gibt es in der aktuellen Preview keinen zusätzlichen Livariant-Plugin-Schritt.

## 5. Projekt zuerst prüfen

Im Projektordner:

```bash
livariant status
livariant doctor
livariant init
```

Diese Befehle helfen dir, den aktuellen Zustand zu verstehen, bevor Livariant verwalteten Projektzustand anlegt.

`livariant init` ohne `--apply` zeigt nur den geplanten Initialisierungsschritt. Der Befehl verändert das Projekt noch nicht.

Gerade bei einem bestehenden Projekt solltest du diesen Plan lesen. Livariant soll das vorhandene Projekt übernehmen, nicht es in eine bevorzugte Vorlage umbauen.

## 6. Project Brain bewusst anlegen

Wenn der Plan korrekt aussieht:

```bash
livariant init --apply
```

Danach prüfst du das Ergebnis:

```bash
livariant status
livariant doctor
livariant resume
```

Das Projekt enthält jetzt den minimalen `.project-brain/`-Zustand, den Livariant verwaltet.

## 7. Dauerhafte Projektwahrheit im Alltag festhalten

Die Initialisierung ist nur der Anfang. Wenn ein Ziel, ein bestätigter Fakt oder eine akzeptierte Entscheidung die aktuelle KI-Sitzung überdauern soll, hältst du das über Livariant fest, statt es nur im Chatverlauf zu lassen.

Die aktuellen Werte kannst du so ansehen:

```bash
livariant goals
livariant knowledge
livariant decisions
```

Mutierende Befehle sind plan-first. Diese Beispiele zeigen zunächst nur, was geändert würde:

```bash
livariant goals add "Erste sichere Public Preview veröffentlichen"
livariant knowledge add "Die Preview wird über GitHub Releases verteilt"
livariant decisions add "GitHub Releases für die Preview verwenden"
```

Wenn der Plan stimmt, wiederholst du den gewünschten Befehl mit `--apply`:

```bash
livariant goals add "Erste sichere Public Preview veröffentlichen" --apply
livariant knowledge add "Die Preview wird über GitHub Releases verteilt" --apply
livariant decisions add "GitHub Releases für die Preview verwenden" --apply
```

Ändert sich eine akzeptierte Entscheidung später, lässt du dir zuerst die Decision-ID anzeigen und löst die alte Entscheidung gezielt ab. Die frühere Entscheidung wird nicht aus der Historie gelöscht:

```bash
livariant decisions
livariant decisions supersede <decision-id> "Signierte Release-Infrastruktur verwenden" --reason "Distributionsmodell geändert"
```

Auch dieser Supersede-Befehl ist zunächst nur ein Plan. Erst mit `--apply` wird die Änderung geschrieben.

Livariant prüft vor semantischen Änderungen den Project-Brain-Zustand, schützt verwaltete Pfade, lehnt eine Änderung ab, wenn sich der projekt-eigene Ausgangszustand zwischenzeitlich verändert hat, und verifiziert den gespeicherten Wert vor einer Erfolgsmeldung.

## 8. Mit Claude Code oder Codex weiterarbeiten

Die aktuelle Preview kann Project-Brain-Kontext für Claude Code oder Codex als Resume-Handoff ausgeben. Livariant ist dabei kein natives Plugin und schreibt keine provider-eigenen Instruktionsdateien stillschweigend um.

### Claude Code unter Linux / macOS

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
```

### Claude Code unter Windows PowerShell

```powershell
$env:LIVARIANT_PROVIDER_ENV = "claude-code"
livariant resume --provider claude-code
```

### Codex unter Linux / macOS

```bash
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

### Codex unter Windows PowerShell

```powershell
$env:LIVARIANT_PROVIDER_ENV = "codex"
livariant resume --provider codex
```

Die Resume-Ausgabe ist temporärer Kontext für die aktuelle Arbeitssitzung. Das Project Brain bleibt der dauerhafte Projektstand. Bestätigte Ziele, aktive Entscheidungen und bekanntes Projektwissen, die über Livariant festgehalten wurden, stehen dem unterstützten Resume-Pfad zur Verfügung.

## Was die Installation tut und was nicht

```text
geprüften GitHub-Release-Tarball herunterladen
        |
        v
Livariant-CLI installieren
        |
        v
Projektordner öffnen
        |
        v
mit status / doctor / init prüfen
        |
        v
init --apply bewusst ausführen
        |
        v
bestätigte Projektwahrheit im Arbeitsverlauf festhalten
        |
        v
Resume-Kontext über unterstützte KI-Sitzungen hinweg verwenden
```

Die CLI-Installation:

- initialisiert kein Projekt automatisch;
- verändert nicht automatisch `CLAUDE.md`, `AGENTS.md` oder Provider-Memory;
- beobachtet keine KI-Gespräche und entscheidet nicht automatisch, was Projektwahrheit wird;
- gibt einem Coding-Provider keine Projekt- oder Runtime-Autorität;
- migriert ein vorhandenes Project Brain nicht allein deshalb, weil das CLI-Paket aktualisiert wurde;
- autorisiert keine zukünftigen ausführbaren Runtime-Update-Artefakte.

## Spätere Updates sind ein eigener Vorgang

Ein neueres Livariant-CLI-Paket zu installieren ist nicht dasselbe wie ein vorhandenes Project Brain zu migrieren oder eine neue Runtime zu autorisieren.

Für bestehende Projekte verwendest du den unterstützten `update`-, Migrations- und Recovery-Ablauf aus [Updates, Migrationen & Wiederherstellung](lifecycle-guide.md).

Ersetze `.project-brain/`, verwalteten Runtime-State, Runtime-Trust-Evidenz oder Release-Authorization-Evidenz nicht manuell.

## Danach lesen

- [Fünf-Minuten-Schnellstart](quickstart.md)
- [Bestehende Projekte](existing-projects.md)
- [Provider-Handoff](provider-handoff.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
- [Updates, Migrationen & Wiederherstellung](lifecycle-guide.md)
