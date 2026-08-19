# Livariant installieren und mit einem Projekt verbinden

Livariant wird einmal als lokales Rechner-/Benutzer-Tool installiert und danach im Hauptordner des Projekts verwendet, das du mit KI-Unterstützung entwickelst.

CLI-Installation und Coding-Agent-Verbindung sind **getrennte Schritte**:

```text
Livariant-CLI installieren
-> Projekt öffnen
-> First Run ausführen
-> bei Bedarf bewusst initialisieren
-> Claude Code oder Codex explizit über MCP verbinden
-> normal mit dem Coding-Agenten arbeiten
```

Livariant wird für den normalen lokalen Workflow nicht einfach als Anwendungsabhängigkeit in `package.json` eingetragen und schreibt Provider-Konfiguration nicht stillschweigend um.

## Veröffentlichtes Release und aktueller Quellstand

Das aktuell veröffentlichte Release ist **`v0.1.0-rc.4` — Public-Preview-Prerelease**.

RC4 enthält Guided First Run, lokale MCP-Bridge, Verification Trace, geschützte Guardian-/Self-Integrity-Härtung sowie die weiteren Fähigkeiten des exakt qualifizierten RC4-Quellstands.

Zum Zeitpunkt der Veröffentlichung entspricht der kanonische Repository-`main` dem exakt qualifizierten RC4-Quellstand `4f547751d9d53e7325e6ea1f2401f1dea45779dc`. Künftige Repository-Entwicklung kann wieder vorauslaufen; Repository-Existenz allein ist nie eine Release-Veröffentlichung.

`v0.1.0-rc.3` bleibt unveränderliche historische Foundation-Preview-Evidenz und wird nicht rückwirkend umgeschrieben.

## Was du brauchst

- Node.js 20 oder neuer;
- npm aus deiner Node.js-Installation;
- ein lokales Softwareprojekt;
- die geprüften RC4-Release-Dateien aus dem kanonischen GitHub Release von `Kryt3r/livariant`.

Ein Release-Bundle enthält mindestens:

```text
livariant-<version>.tgz
release-manifest.json
SHA256SUMS
```

## 1. Veröffentlichten RC4-Download prüfen

Bevor du ausführbaren Release-Code installierst, vergleichst du den SHA-256 des Tarballs mit dem qualifizierten RC4-Wert und, sofern in deinem heruntergeladenen Release-Bundle vorhanden, mit `SHA256SUMS` und `release-manifest.json`.

Qualifizierter RC4-Tarball SHA-256:

```text
6a8a287e55344e22c97c543cb4a9e071d27d9e18c5ff585cab8235aaa37dce8e
```

### Linux

```bash
sha256sum livariant-0.1.0-rc.4.tgz
```

### macOS

```bash
shasum -a 256 livariant-0.1.0-rc.4.tgz
```

### Windows PowerShell

```powershell
(Get-FileHash .\livariant-0.1.0-rc.4.tgz -Algorithm SHA256).Hash.ToLower()
```

Stimmt der Wert nicht exakt überein, installiere den Tarball nicht.

> [!IMPORTANT]
> Verwende für Release-Artefakte das kanonische Livariant-GitHub-Release. Installiere keinen ausführbaren Livariant-Code aus einem unbekannten Repository, Mirror, Chat-Anhang oder einer beliebigen Paketquelle nur deshalb, weil der Dateiname korrekt aussieht.

## 2. CLI installieren

Im Ordner mit dem geprüften Tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.4.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-0.1.0-rc.4.tgz
```

Danach:

```bash
livariant version
```

Die Installation initialisiert kein Projekt und trägt Livariant nicht in `package.json` oder `node_modules` des Zielprojekts ein.

Wenn der Befehl nicht gefunden wird, öffne ein neues Terminal und prüfe, ob das globale npm-Bin-Verzeichnis in `PATH` liegt. Nutze lieber einen benutzerbeschreibbaren npm-Prefix, statt Livariant manuell in Projekt-, Runtime- oder Trust-Verzeichnisse zu kopieren.

## 3. Projekt öffnen

Verwende den Hauptordner des Projekts, an dem du ohnehin arbeitest.

Linux/macOS:

```bash
cd /pfad/zu/deinem-projekt
```

Windows PowerShell:

```powershell
Set-Location C:\pfad\zu\deinem-projekt
```

Livariant arbeitet preservation-first: Es soll ein bestehendes Projekt prüfen und übernehmen, ohne es still in eine bevorzugte Vorlage umzubauen.

## 4. First Run verwenden

Der geführte Public-Preview-Einstieg ist:

```bash
livariant first-run
```

First Run kombiniert read-only Project Discovery, Initialisierungsbewertung, Autonomy-Profile-Wahl, optionale External-Knowledge-Evidenz, Guided Project Understanding Review und optionale Provider-Setup-Hinweise.

Er endet mit `Changes made: 0` und initialisiert das Projekt nicht still, persistiert kein Autonomy Profile automatisch, übernimmt keine Evidenz, konfiguriert keinen Provider und vergibt keine Authority.

Für deterministische Nutzung:

```bash
livariant first-run --language Deutsch
```

Wenn du bereits weißt, welchen unterstützten Provider du verbinden möchtest, kann First Run den Setup-Pfad direkt sichtbar machen:

```bash
livariant first-run --language Deutsch --provider claude-code
livariant first-run --language Deutsch --provider codex
```

Mehr unter [First-Run Composition](first-run.md).

## 5. Bei Bedarf bewusst initialisieren

Wenn das Projekt ein Project Brain benötigt, prüfst du zuerst den Initialisierungsplan:

```bash
livariant init
```

Erst nach Prüfung gehst du über den unterstützten expliziten Autorisierungspfad weiter. First Run selbst führt die Initialisierung niemals aus.

Nach erfolgreicher unterstützter Initialisierung sind unter anderem diese read-only Checks nützlich:

```bash
livariant status
livariant doctor
livariant context
livariant resume
```

## 6. Claude Code oder Codex explizit über MCP verbinden

Die Livariant-Installation konfiguriert deinen Coding-Agenten **nicht** automatisch.

RC4 kann den nativen Setup-Pfad ausgeben:

### Claude Code

```bash
livariant mcp setup --provider claude-code
```

### Codex

```bash
livariant mcp setup --provider codex
```

Dieser Befehl liefert provider-spezifische Registrierungs-/Konfigurationshinweise und führt selbst **null Provider-Konfigurationsänderungen** aus. Du bzw. der Provider wendet den angezeigten Schritt über dessen eigene Konfigurationsoberfläche an.

Sobald der Provider mit `livariant mcp` verbunden ist, kann der Agent Livariants MCP-Tools und Server-Instructions während der normalen MCP-Sitzung erkennen.

Aktuelle begrenzte MCP-Fähigkeiten sind:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

Damit kann die normale Nutzung agent-native sein: Du arbeitest in natürlicher Sprache mit dem Coding-Agenten, und dieser kann Livariant-Tools bei Bedarf aufrufen. Du musst nicht für jede normale Interaktion manuell einen Livariant-CLI-Befehl tippen.

Die CLI bleibt die direkte Kontroll- und Diagnoseoberfläche, wenn du sie ausdrücklich verwenden möchtest.

## 7. Verification Trace im Agent-Workflow

Mit verbundener MCP-Bridge kann ein MCP-fähiger Coding-Agent folgendes Tool aufrufen:

`livariant_verification_trace`

Es verwendet dieselbe explizite Verification-Trace-v1-Struktur wie Core-/CLI-Assessor und liefert deterministische Zustände:

```text
SUPPORTED
CONTRADICTED
UNPROVEN
```

Das ist Evidenzabdeckung, keine akzeptierte Completion.

Die Grenzen bleiben:

```text
Evidence != Truth
Verification Evidence != akzeptierte Completion
SUPPORTED != DONE
MCP-Transport != unabhängiges Vertrauen
Capability != Authority
```

Livariant entdeckt aktuell nicht automatisch jede Anforderung und erzeugt nicht automatisch vertrauenswürdige Verification Evidence.

Mehr unter [Verification Trace](verification-trace.md).

## Was Installation und MCP-Setup nicht tun

Sie:

- initialisieren Projekte nicht automatisch;
- schreiben `CLAUDE.md`, `AGENTS.md` oder Provider-Memory nicht still um;
- beobachten nicht jedes KI-Gespräch und entscheiden nicht automatisch, was Project Truth wird;
- vergeben keine Mutation-, Runtime-, Guardian- oder Release-Authority an einen Provider;
- behandeln Agent-Evidenz nicht automatisch als vertrauenswürdig, nur weil sie über MCP kam;
- migrieren kein Project Brain allein deshalb, weil das CLI-Paket geändert wurde;
- veröffentlichen oder autorisieren keinen zukünftigen Livariant-Release.

## Spätere Updates sind getrennt

Ein neueres Livariant-CLI-Paket zu installieren ist nicht dasselbe wie Project-Brain-State zu migrieren, eine neue Runtime zu aktivieren oder Release-/Runtime-Authority zu vergeben.

Verwende die unterstützten Update-, Migrations- und Recovery-Flows aus [Updates, Migrationen & Wiederherstellung](lifecycle-guide.md). Ersetze `.project-brain/`, verwalteten Runtime-State, Guardian-State, Runtime-Trust-Evidenz oder Release-Authorization-Evidenz nicht manuell.

## Danach lesen

- [Fünf-Minuten-Schnellstart](quickstart.md)
- [First-Run Composition](first-run.md)
- [Verification Trace](verification-trace.md)
- [Bestehende Projekte](existing-projects.md)
- [Provider-Handoff](provider-handoff.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
