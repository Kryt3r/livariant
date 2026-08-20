# Livariant installieren und mit einem Projekt verbinden

Livariant besitzt zwei bewusst getrennte Installationsrollen:

1. die normale globale CLI, die unter deinem Benutzerkonto läuft;
2. die releasegebundene geschützte Guardian-Bootstrap-Quelle, die ausschließlich dazu dient, die geschützte Guardian-Basis des Rechners einzurichten.

Die normale CLI ist **kein Root of Trust**. Eine globale Installation von `livariant-<version>.tgz` darf same-user/requester-controlled Paketbytes niemals allein deshalb autoritativ machen, weil sie installiert wurden.

## Veröffentlichtes Release und aktueller Remediation-Stand

Das aktuell veröffentlichte Release ist **`v0.1.0-rc.4` - Public-Preview-Prerelease**.

Der exakt qualifizierte RC4-Quellstand ist `4f547751d9d53e7325e6ea1f2401f1dea45779dc`. RC4 enthält die geschützte Guardian-Enforcement-Logik, aber echtes Fresh-Install-Dogfooding unter Windows hat gezeigt, dass sein öffentlicher Installations-/Distributionspfad die dafür benötigte geschützte Stage-A-Bootstrap-Quelle **nicht** provisioniert.

RC4 darf deshalb nicht als vollständiger Pfad von frischem Rechner -> geschütztem Guardian -> erstem Projekt beschrieben werden. Umgehe diese Grenze nicht, indem du beliebige CLI-/Paketdateien manuell nach `C:\Program Files\Livariant` oder `/opt/livariant` kopierst.

Die unten beschriebene WP-044-Remediation ist der Installationsvertrag für das **nächste qualifizierte Release, das diese Änderungen enthält**. Repository-Implementierung ist keine Veröffentlichung; bis ein solches Release ausdrücklich qualifiziert und veröffentlicht wurde, bleibt RC4 das aktuelle öffentliche Release mit der oben beschriebenen Einschränkung.

`v0.1.0-rc.3` bleibt unveränderliche historische Foundation-Preview-Evidenz und wird nicht rückwirkend umgeschrieben.

## Unterstützte geschützte Plattformen

| Plattform | Normale CLI | Protected Guardian v1 |
| --- | --- | --- |
| Windows | unterstützt | durch das WP-044-Stage-A-/Stage-B-Design unterstützt |
| Linux | unterstützt | durch das WP-044-Stage-A-/Stage-B-Design unterstützt |
| macOS | normale CLI-Oberflächen unterstützt | **von Guardian v1 nicht unterstützt** |

Eine funktionierende macOS-CLI bedeutet nicht, dass Protected-Guardian-Readiness vorliegt.

## Release-Artefakte für den remediated Pfad

Ein qualifiziertes Release mit WP-044 muss explizite Release-Assets bereitstellen, darunter:

```text
livariant-<version>.tgz
livariant-protected-bootstrap-<version>.tgz
install-livariant-bootstrap-<version>.ps1
install-livariant-bootstrap-<version>.sh
release-manifest.json
SHA256SUMS
PROTECTED-SHA256SUMS
protected-bootstrap-assets.json
```

Zusätzliche Evidenzdateien wie SBOM, RC-Metadaten, Release Decision Dossier und Attestation-bezogene Evidenz können ebenfalls vorhanden sein.

> [!IMPORTANT]
> GitHubs automatisch erzeugte Downloads **Source code (zip)** und **Source code (tar.gz)** sind weder das installierbare Livariant-CLI-Paket noch das geschützte Stage-A-Paket. Verwende ausschließlich die ausdrücklich benannten qualifizierten Release-Assets.

## Vertrauensmodell vor privilegierter Installation

Ein in einem heruntergeladenen Installer eingebetteter Hash reicht allein nicht aus: Könnte ein Angreifer sowohl den noch unprivilegierten Installer als auch das danebenliegende Archiv ersetzen, könnte er sonst beide Werte gemeinsam austauschen.

Der remediated Release-Pfad erzeugt deshalb GitHub Artifact Attestations für die installierbaren Artefakte und kritischen Release-Metadaten. Bevor Stage A mit Administrator-/root-Rechten ausgeführt wird, prüfst du die Herkunft der heruntergeladenen Artefakte mit der GitHub CLI gegen das kanonische Repository und den exakten RC-Workflow.

Für jeden ausführbaren/installierbaren Input, den du verwenden möchtest:

```bash
gh attestation verify <artefakt> \
  --repo Kryt3r/livariant \
  --signer-workflow Kryt3r/livariant/.github/workflows/rc-bundle.yml \
  --source-ref refs/heads/main \
  --source-digest <exakter-qualifizierter-source-sha> \
  --deny-self-hosted-runners
```

Mindestens geprüft werden müssen:

- `livariant-<version>.tgz`;
- `livariant-protected-bootstrap-<version>.tgz`;
- der plattformspezifische Stage-A-Installer;
- `release-manifest.json`;
- `SHA256SUMS` und `PROTECTED-SHA256SUMS`.

Fehlt die Attestation oder schlägt ihre Prüfung fehl, ist das eine Stop-Bedingung. Fahre nicht mit einer privilegierten Installation fort.

Artifact Attestation belegt Herkunft/Integrität der erzeugten Bytes; sie bedeutet nicht automatisch, dass der Code sicher ist. Livariants eigene Release-Qualifikation, Guardian-Schutzprüfungen und Authority-Grenzen bleiben getrennte Anforderungen.

## 1. Release-Prüfsummen verifizieren

Nach der Provenance-Prüfung vergleichst du den normalen CLI-Tarball mit `SHA256SUMS` und das Protected-Bootstrap-Archiv samt Installern mit `PROTECTED-SHA256SUMS`. `release-manifest.json` bindet Runtime und Protected Bootstrap an die exakte Release-Identität.

### Linux

```bash
sha256sum -c SHA256SUMS
sha256sum -c PROTECTED-SHA256SUMS
```

### Windows PowerShell

```powershell
Get-FileHash .\livariant-<version>.tgz -Algorithm SHA256
Get-FileHash .\livariant-protected-bootstrap-<version>.tgz -Algorithm SHA256
Get-FileHash .\install-livariant-bootstrap-<version>.ps1 -Algorithm SHA256
```

Vergleiche die Windows-Werte exakt mit den entsprechenden Prüfsummendateien. Bei einer Abweichung: stoppen.

## 2. Normale CLI installieren

Im Verzeichnis mit dem geprüften Runtime-Tarball:

### Linux / macOS

```bash
npm install --global --ignore-scripts ./livariant-<version>.tgz
```

### Windows PowerShell

```powershell
npm install --global --ignore-scripts .\livariant-<version>.tgz
```

Danach:

```bash
livariant version
```

Damit wird ausschließlich die normale CLI installiert. Es wird kein Projekt initialisiert, keine geschützte Guardian-Quelle provisioniert, keine Guardian-Authority erzeugt und Livariant nicht in `package.json` eines Zielprojekts eingetragen.

## 3. Maschinen-Readiness prüfen, bevor ein Projekt-Lifecycle geöffnet wird

Aus einem normalen Benutzerterminal:

```bash
livariant guardian status
```

Auf einem frischen unterstützten Rechner vor Stage A wird erwartet, dass die geschützte Bootstrap-Quelle noch nicht bereit ist. Das ist keine Erlaubnis, die Prüfung zu umgehen; es bedeutet, dass Stage A erforderlich ist.

## 4. Stage A - exakte Release-Bytes unter OS-Schutz provisionieren

Stage A ist ein separater privilegierter Installationsvorgang. Der Stage-A-Installer startet **weder** UAC noch `sudo` oder `pkexec` selbst. Nach erfolgreicher Provenance-/Prüfsummenprüfung als normaler Benutzer öffnest du bewusst ein bereits privilegiertes Terminal.

### Windows

Öffne eine **Administrator-PowerShell** und führe aus dem Release-Asset-Verzeichnis den geprüften Installer aus:

```powershell
& .\install-livariant-bootstrap-<version>.ps1
```

Die geschützte Quelle wird installiert unter:

```text
C:\Program Files\Livariant\Bootstrap\v1
```

Der geschützte Guardian-Parent wird vorbereitet unter:

```text
C:\ProgramData\Livariant\Guardian
```

### Linux

Öffne eine bereits als root laufende Shell und führe aus:

```bash
./install-livariant-bootstrap-<version>.sh
```

Die geschützte Quelle wird installiert unter:

```text
/opt/livariant/bootstrap/v1
```

Der Guardian-Parent wird vorbereitet unter:

```text
/var/lib/livariant-guardian
```

Stage A prüft das Release-Archiv vor der Installation, verweigert unsichere Pfadformen, schützt den installierten Tree und vergibt **keine Mutation-, Runtime-, Guardian-Operation-, Integrity- oder Release-Authority**.

Existiert bereits eine geschützte Bootstrap-Quelle, verweigert Stage A einen impliziten Austausch. Ein Release-Übergang muss ausdrücklich erfolgen (`-Replace` unter Windows bzw. `--replace` unter Linux) und ein separat geprüftes neues Release verwenden.

## 5. Stage A aus einem normalen Terminal prüfen

Schließe das privilegierte Terminal. Unter dem normalen Benutzerkonto:

```bash
livariant guardian status
```

Der Statusbefehl ist read-only. Nun sollte die geschützte Quelle als bereit erscheinen und Guardian Bootstrap als nächster erforderlicher Schritt angezeigt werden. Wird die Quelle als `unsafe` gemeldet, stoppe; repariere oder „segne“ sie nicht allein aufgrund ihrer Existenz.

## 6. Stage B - Guardian aus geschützten Bytes bootstrappen

Verwende ausschließlich den von `guardian status` angezeigten geschützten Stage-B-Launcher.

### Windows

Aus einer bereits erhöhten Administrator-PowerShell:

```powershell
& 'C:\Program Files\Livariant\Bootstrap\v1\guardian-bootstrap.ps1'
```

### Linux

Aus einer bereits als root laufenden Shell:

```bash
/opt/livariant/bootstrap/v1/guardian-bootstrap
```

Stage B prüft, dass Bootstrap-Modul/-Helper, Release-Descriptor, geschützte Filesystem-Kette und Node-Interpreter-Kette die Guardian-Vertrauensanforderungen erfüllen. Die bestehende interaktive Bootstrap-Bestätigung bleibt erforderlich. Stage B richtet ausschließlich die geschützte Guardian-Basis ein und erzeugt **keine** Lifecycle-Authority.

Schließe danach das privilegierte Terminal wieder und prüfe als normaler Benutzer:

```bash
livariant guardian status
```

Fahre nicht mit Projekt-Lifecycle-Autorisierung fort, solange Guardian Readiness nicht bestätigt ist.

## 7. Bestehendes Projekt öffnen und First Run ausführen

```bash
cd /pfad/zu/deinem-projekt
livariant first-run --language Deutsch
```

Windows-Beispiel:

```powershell
Set-Location C:\pfad\zu\deinem-projekt
livariant first-run --language Deutsch
```

Deutsch und Englisch sind im remediated First Run unterstützte Interaktions-Locals. Alle nutzerseitigen First-Run-Prompts, Überschriften und Erklärungen verwenden ab dem ersten Prompt die gewählte unterstützte Sprache. Maschinen-Identifier, Befehlsnamen, Project-Truth-Sprache und JSON-Enum-Werte bleiben davon getrennt.

First Run ist read-only und meldet `Vorgenommene Änderungen: 0`. Er prüft neben dem Projektzustand auch die Maschinen-Readiness. Ist der Guardian-Pfad nicht bereit oder unsicher, darf First Run nicht direkt zu Lifecycle-Autorisierung/-Anwendung führen.

## 8. Bewusst initialisieren

Ist Guardian Readiness bestätigt und benötigt das Projekt ein Project Brain:

```bash
livariant init
```

Prüfe zuerst den Plan. Erst danach folgt bei passendem Zustand die unterstützte explizite Autorisierungs-/Anwendungssequenz:

```bash
livariant init --authorize
livariant init --apply
```

Danach:

```bash
livariant status
livariant doctor
```

Für die WP-044-Abnahme muss zusätzlich ein echter Fresh-Machine-/First-Project-Pfad beweisen, dass das resultierende Project Brain gültig ist. Unit Tests allein reichen nicht.

## 9. Claude Code oder Codex über MCP verbinden

Die Livariant-Installation konfiguriert einen Coding-Agenten **nicht** automatisch.

### Claude Code

```bash
livariant mcp setup --provider claude-code
```

### Codex

```bash
livariant mcp setup --provider codex
```

Der Setup-Befehl zeigt provider-spezifische Hinweise an und führt selbst null Provider-Konfigurationsänderungen aus. MCP-Capability vergibt keine Mutation-, Runtime-, Guardian-, Integrity- oder Release-Authority.

## Was dieser Installationspfad nicht tut

Er:

- vertraut keinem Paket nur deshalb, weil es in einem bekannten Verzeichnis liegt;
- macht die normale globale npm-CLI nicht zum geschützten Root of Trust;
- erlaubt Projektdateien, CLI-Flags oder Provider-Ausgaben keine Selbstautorisierung von Guardian-/Lifecycle-Aktionen;
- initialisiert Projekte nicht automatisch;
- schreibt `CLAUDE.md`, `AGENTS.md`, Provider-Memory oder Provider-Konfiguration nicht still um;
- verwandelt Artifact Attestation, Release-Evidenz oder bloße Guardian-Existenz nicht in Mutation-/Runtime-/Release-Authority;
- veröffentlicht oder autorisiert kein zukünftiges Livariant-Release.

## Update- und Deinstallationsgrenzen

Normale CLI-Installation, geschützte Stage-A-Quelle, Guardian-State, Runtime Trust und Release Authorization sind unterschiedliche State-Klassen.

Ein Update der npm-CLI aktualisiert oder autorisiert die geschützte Bootstrap-Quelle nicht stillschweigend. Der Austausch einer geschützten Quelle erfordert einen ausdrücklichen verifizierten Release-Übergang. Das Entfernen der normalen CLI darf Guardian-/Authority-Historie nicht still löschen; geschützter System-State darf nicht als gewöhnlicher Package-Uninstall-Nebeneffekt behandelt werden.

Nutze die unterstützte Lifecycle-/Update-Dokumentation, statt `.project-brain/`, geschützten Guardian-State, verwalteten Runtime-State, Runtime-Trust-Evidenz oder Release-Authorization-Evidenz manuell zu ersetzen.

## Danach lesen

- [Fünf-Minuten-Schnellstart](quickstart.md)
- [First-Run Composition](first-run.md)
- [Verification Trace](verification-trace.md)
- [Bestehende Projekte](existing-projects.md)
- [Provider-Handoff](provider-handoff.md)
- [Updates, Migrationen & Wiederherstellung](lifecycle-guide.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
