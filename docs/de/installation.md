# Livariant installieren und mit einem Projekt verbinden

<p align="center">
  <a href="../installation.md">English</a> · <strong>Deutsch</strong>
</p>

Der aktuelle normale Installationspfad für Nutzer ist das **Livariant Desktop Preview für Windows x64**. Das historische CLI Public Preview und das tiefergehende Protected-Guardian-/Core-Lifecycle-Modell sind getrennte Oberflächen und gehören nicht mehr in den First-Time-Desktop-Installationsfluss.

> [!WARNING]
> **Frühe Entwicklungsphase / Preview**
>
> Livariant Desktop ist weiterhin ein Prerelease. Abläufe und Kompatibilität können sich bis Stable ändern. Dem aktuellen Windows-Installer fehlt außerdem noch die finale produktive Authenticode-Publisher-Signierung bzw. Reputation; abhängig von Richtlinie und Reputation kann Windows Publisher- oder SmartScreen-Hinweise anzeigen.

## Aktuelles veröffentlichtes Desktop Preview

```text
Version: 0.1.0-rc.28
Plattform: Windows x64
Exakter Quellstand: ec2916979c1911a56203878d7102570ab71cd13c
Tag: desktop-preview-0.1.0-rc.28-ec2916979c19
Installer: Livariant_0.1.0-rc.28_x64-setup.exe
Installer SHA-256: 2897e2bf7940b8d222b382bd6c3548861cd8dd5bbfbcca097783f08f6a21579d
```

Verwende das unveränderliche [Desktop Preview rc.28 Release](https://github.com/Kryt3r/livariant/releases/tag/desktop-preview-0.1.0-rc.28-ec2916979c19).

Das Release enthält außerdem die Updater-Signatur und maschinenlesbare Update-Metadaten. Ein ähnlich benannter Installer aus einer anderen Quelle ist nicht dieselbe Trust-Identität.

## 1. Release-Identität prüfen

Prüfe vor der Installation mindestens:

1. der GitHub-Release-Tag lautet exakt `desktop-preview-0.1.0-rc.28-ec2916979c19`;
2. das Release nennt den exakten Quellstand `ec2916979c1911a56203878d7102570ab71cd13c`;
3. der Installer heißt `Livariant_0.1.0-rc.28_x64-setup.exe`;
4. der Installer-SHA-256 lautet:

```text
2897e2bf7940b8d222b382bd6c3548861cd8dd5bbfbcca097783f08f6a21579d
```

PowerShell-Beispiel:

```powershell
Get-FileHash .\Livariant_0.1.0-rc.28_x64-setup.exe -Algorithm SHA256
```

Weicht der Wert ab, stoppe und führe den Installer nicht aus.

Das aktuelle Preview besitzt Updater-Signing-/Integrity-Evidenz, aber noch nicht die finale produktive Windows-Publisher-Signierung/-Reputation. Ein SmartScreen-/Publisher-Hinweis ist deshalb weder automatisch ein Beleg für Kompromittierung noch ein Sicherheitsbeweis; prüfe die Release-Identität unabhängig.

## 2. Desktop-App installieren

Starte den verifizierten Installer als normaler Windows-Benutzer.

Das aktuelle NSIS-Desktop-Paket nutzt ein Current-User-Installationsmodell und enthält die qualifizierte gebündelte Runtime, die die Desktop-Anwendung benötigt. Für eine normale Desktop-Installation müssen Livariant-Paketbytes nicht manuell in geschützte Systemverzeichnisse kopiert werden.

Verwende keine alten RC4-CLI-Workarounds oder historischen Stage-A-Anweisungen als Ersatz für den aktuellen Desktop-Installer.

## 3. Erster Start

Starte Livariant nach der Installation.

Der Desktop zeigt aktuelle Desktop-/Core-/Runtime-Identitäts- und Health-Informationen. Diese Health-Oberflächen sind nützliche Coherence-/Integrity-Signale, aber der Renderer selbst ist keine Root of Trust und Runtime Health ist kein unabhängiger kryptografischer Post-Install-Anti-Tamper-Beweis.

Die App stellt aktuell primäre Bereiche bereit wie:

- Project Truth / First Steps;
- Connections;
- Diagnostics;
- Updates;
- Settings.

Der Project-Truth-/First-Steps-Renderer enthält weiterhin Foundation-/Session-State-Verhalten und darf nicht als fertiger persistenter Project-Brain-Editor verstanden werden.

## 4. Codex im Desktop verbinden

Der aktuelle Live-Desktop-Verbindungspfad ist für **Codex** implementiert.

Verwende **Connections**, um lokale Codex-Installation und Connection State zu prüfen und anschließend über den unterstützten UI-Flow zu verbinden.

Die aktuelle Härtung hält Provider, Connection Method, Capability, Role und Authority getrennt. Eine erfolgreiche Verbindung vergibt keine Mutation Authority.

Connection Intent kann persistiert werden, damit Livariant eine akzeptierte Verbindung bei einem späteren App-Start wiederherstellen kann. Restore bleibt an die implementierten Executable-Identity-/Trust-Prüfungen gebunden; Livariant darf nicht still über eine andere PATH-aufgelöste Executable verbinden, nur weil sie denselben Command-Namen besitzt.

Zusätzliche Provider oder Connection-Methoden bleiben zukünftige Erweiterungen, solange sie nicht separat implementiert und qualifiziert wurden.

## 5. Mit Project Truth / First Steps arbeiten

Der aktuelle Workspace hilft dabei, Projektzweck, Richtung, Regeln, Lücken, Änderungsvorschläge und manuellen Review zu strukturieren.

Wichtige aktuelle Grenze:

```text
Renderer-/Session-State != persistente Project-Brain-Mutation
Evidence != Project Truth
Proposal != Authorization
```

Der normale Existing-Project-Adoption-Pfad wird noch fertiggestellt. Eingaben im aktuellen Desktop-Workspace dürfen nicht als stilles Umschreiben von kanonischem Project-Brain-Zustand verstanden werden.

## 6. Diagnostics

Diagnostics liest lokal gespeicherte technische Evidenz und hält die Evidenzklassen getrennt:

```text
Observed != Avoided != Estimated
```

Nutze die expliziten Periodensteuerungen, um verfügbare Evidenz zu prüfen. Fehlende Werte sollen fehlend bleiben und dürfen nicht erfunden werden.

Diagnostics benötigt standardmäßig keine Erfassung von Roh-Prompt-/Projektinhalten.

## 7. Updates

Der aktuelle Desktop besitzt einen echten signierten Updater-Flow.

Wenn du ausdrücklich nach Updates suchst, kann Livariant seinen konfigurierten HTTPS-Updater-Endpunkt kontaktieren und signierte Update-Metadaten auswerten. Ist ein kompatibles Update verfügbar, kann die UI lokalisierte Release Notes und echten Download-/Installationszustand anzeigen.

Installation/Neustart bleibt ein ausdrücklich vom Nutzer autorisierter Schritt. Update-Verfügbarkeit ist keine Installations-Authority und der Renderer kann keine beliebigen Update-URLs oder Executables wählen.

Siehe [Updates, Migrationen & Recovery](lifecycle-guide.md) für die Trennung zwischen Desktop-Anwendungsupdates und Projekt-/Core-Lifecycle-Operationen.

## 8. Sprache

Die Desktop-App unterstützt Deutsch und English. Die Sprachwahl ist lokaler Preference-State; sie verändert keine Machine Identifier, Command-Namen, Project-Truth-Semantik oder Security-/Authority-Regeln.

## Deinstallation

Verwende die normale Windows-Oberfläche für installierte Apps/Deinstallation der Desktop-Anwendung.

Lösche geschützten Livariant-Security-State oder projekt-eigene `.project-brain`-Daten nicht manuell nur deshalb, weil du die Desktop-UI deinstallierst. Anwendungsinstallation, geschützter Maschinenzustand und projekt-eigener Zustand sind bewusst getrennte Dinge.

Wenn du eine Preview-Installation debuggen möchtest, sichere relevante Diagnostics, bevor du lokalen App-State entfernst – außer du willst diesen Zustand ausdrücklich zurücksetzen.

## Historisches CLI Public Preview

`v0.1.0-rc.4` bleibt ein unveränderliches historisches **CLI Public Preview**. Es ist nicht das aktuelle Desktop-Release.

Echtes Windows-Fresh-Install-Dogfooding hat gezeigt, dass RC4 die geschützte Stage-A-Guardian-Bootstrap-Quelle für einen vollständigen Fresh-Machine -> Protected Guardian -> First-Project-Lifecycle-Pfad nicht veröffentlicht/provisioniert hat. Diese historische Einschränkung bleibt für das RC4-Artefakt wahr und darf nicht durch Kopieren requester-controlled/globaler npm-Paketdateien in geschützte Pfade umgangen werden.

Spätere Repository-Remediation verändert RC4 nicht rückwirkend. Diese Seite behauptet auch nicht, dass nur aufgrund neueren Core-Codes auf `main` ein neueres eigenständiges CLI-Paket öffentlich veröffentlicht worden wäre.

## Erweiterte Core-/CLI-/Guardian-Workflows

Livariant Core und CLI bleiben relevant für:

- providerunabhängige Status-/Doctor-/Inspektionspfade;
- MCP-Setup und lokale stdio-Bridge;
- Lifecycle-Plan-/Apply-Flows;
- geschützte Guardian-Authority-Domains;
- Migration-/Recovery-Operationen;
- tiefergehende Entwicklung und Qualifikation.

Diese Workflows verwenden strengere Trust-/Authority-Verträge als der Desktop-Renderer. Insbesondere:

```text
Capability != Authority
Projektdateien != geschützte Machine Authority
Artifact Integrity != Runtime Trust != Release Authorization
```

Für Architekturdetails siehe [Architektur & Sicherheit](architecture-and-safety.md) und [Updates, Migrationen & Recovery](lifecycle-guide.md). Historische release-spezifische Stage-A-/Stage-B-Prozeduren sollten als Release-Evidenz gelesen und nicht in den aktuellen Desktop-Installationspfad kopiert werden.

## Plattformgrenze

Aktuell veröffentlichter Desktop-Preview-Support: **Windows x64**.

Core/CLI und geschützte Guardian-Implementierungen besitzen breitere plattformspezifische Historie; daraus folgt aber kein Linux-/macOS-Desktop-Release. Eine künftige Desktop-Plattform benötigt eigene qualifizierte Packaging-/Installations-Evidenz.

## Danach weiterlesen

- [Fünf-Minuten-Schnellstart](quickstart.md)
- [Public Preview Scope & Limitations](preview-scope.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
- [Bestehende Projekte](existing-projects.md)
- [Datenschutz & Netzwerkverhalten](privacy-and-network.md)
- [Updates, Migrationen & Recovery](lifecycle-guide.md)
