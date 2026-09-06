# Livariant Fünf-Minuten-Schnellstart

<p align="center">
  <a href="../quickstart.md">English</a> · <strong>Deutsch</strong>
</p>

Der schnellste aktuelle Einstieg in Livariant ist das **Windows-x64-Desktop-Preview**. Die CLI bleibt für tiefergehende und providerunabhängige Workflows erhalten, ist für normale Desktop-Nutzer aber nicht mehr der richtige erste Einstieg.

> [!WARNING]
> **Frühe Entwicklungsphase / Preview**
>
> Livariant Desktop ist weiterhin ein Preview. Aktuelle Abläufe können sich bis Stable noch ändern. Dem aktuellen Windows-Installer fehlt außerdem noch die finale produktive Authenticode-Publisher-Signierung bzw. Reputation; Windows kann deshalb Publisher- oder SmartScreen-Hinweise anzeigen.

## 1. Aktuelles Desktop Preview laden

Aktuell veröffentlichtes Desktop Preview:

```text
Version: 0.1.0-rc.28
Plattform: Windows x64
Exakter Quellstand: ec2916979c1911a56203878d7102570ab71cd13c
Installer: Livariant_0.1.0-rc.28_x64-setup.exe
SHA-256: 2897e2bf7940b8d222b382bd6c3548861cd8dd5bbfbcca097783f08f6a21579d
```

Verwende das unveränderliche [Desktop Preview rc.28 Release](https://github.com/Kryt3r/livariant/releases/tag/desktop-preview-0.1.0-rc.28-ec2916979c19).

Prüfe, dass du genau diese Release-Identität verwendest und nicht nur eine ähnlich benannte Datei aus einer anderen Quelle. Das Preview-Release enthält außerdem die Updater-Signatur und maschinenlesbare Update-Metadaten.

## 2. Livariant installieren und öffnen

Starte den verifizierten Windows-x64-Installer. Livariant wird als Current-User-Desktop-Anwendung mit gebündelter Runtime installiert.

Nach dem Start kann die App ihren aktuellen Desktop-/Core-/Runtime-Identitäts- und Health-Zustand anzeigen. Ein funktionierender Renderer ist dabei keine Root of Trust; folgenreiche Security-/Authority-Entscheidungen bleiben hinter Host-/Core-/Protected-Grenzen.

## 3. Die wichtigsten Desktop-Bereiche verstehen

Die aktuelle App ist um wenige primäre Oberflächen organisiert:

- **Project Truth / First Steps** — Projektzweck, Richtung, Regeln, Lücken, Vorschläge und Review. Das aktuelle Renderer-/Session-State-Verhalten ist eine Foundation und darf nicht als vollständig persistente Project-Brain-Mutation verstanden werden.
- **Connections** — die aktuell implementierte lokale Codex-Verbindungsoberfläche prüfen/konfigurieren. Connection Intent kann persistiert und für Restore-Verhalten genutzt werden; eine Verbindung ist trotzdem keine Authority.
- **Diagnostics** — lokale Diagnostics-/Efficiency-Evidenz über explizite Zeiträume prüfen. `Observed`, `Avoided` und `Estimated` sind bewusst getrennte Evidenzklassen.
- **Updates** — den konfigurierten signierten Desktop-Update-Feed prüfen, lokalisierte Release Notes lesen, ein kompatibles Update laden und Installation/Neustart ausdrücklich autorisieren.
- **Settings** — zwischen Deutsch/English wechseln und Connection-/System-Konfiguration prüfen.

## 4. Einen unterstützten Coding-Agenten verbinden

Die Desktop-App besitzt aktuell den tiefer implementierten Live-Verbindungspfad für **Codex**.

Livariant Core bietet zusätzlich provider-native MCP-Setup-Hinweise für Claude Code und Codex:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

Diese CLI-Setup-Befehle zeigen Anweisungen an und schreiben selbst keine Provider-Konfiguration.

Aktuelle begrenzte MCP-Tools sind unter anderem:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

Provider-Ausgabe und MCP-Transport erzeugen keine Mutation Authority und werden nicht automatisch Project Truth, nur weil sie Livariant erreicht haben.

## 5. Die zentrale Reliability-Regel

Ein nützliches Denkmodell ist:

```text
Evidence
  -> verstehen / bewerten / vorschlagen
  -> reviewen / bei Bedarf autorisieren
  -> ändern
  -> verifizieren
```

Wichtige Grenzen:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
SUPPORTED != DONE
Verification Evidence != akzeptierte Completion
```

Verification Trace kann beispielsweise bereitgestellte Beziehungen aus Anforderung, Implementierung und Evidenz so klassifizieren:

```text
SUPPORTED
CONTRADICTED
UNPROVEN
```

Diese Klassifikation beschreibt Evidenzunterstützung; sie akzeptiert nicht still die Fertigstellung.

## 6. Bestehende Projekte und Project Brain

Livariant arbeitet preservation-first. Ein Projekt benötigt kein spezielles Starter-Template.

Das dauerhafte lokale Project-Brain-Modell ist:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Bestehende Projektdateien, Provider-Instruktionen, externe Notizen, Agenten-Ausgabe, Findings und rekonstruierter Kontext bleiben Evidenz/Kandidatenmaterial, bis ein unterstützter Review-/Adoption-Pfad etwas als Project Truth akzeptiert.

Der normale Existing-Project-Desktop-Adoption-Pfad wird noch fertiggestellt. Der aktuelle Project-Truth-Renderer-Workspace ist deshalb nicht als fertige persistente Adoption-UI zu verstehen.

## 7. CLI / geschützte Lifecycle-Workflows

Die CLI bleibt die tiefergehende Kontrolloberfläche für providerunabhängige Inspektion, MCP-Setup, Lifecycle-Operationen, Guardian-/Protected-Authority-Flows, Status/Doctor und verwandte Advanced-Use-Cases.

Das historische veröffentlichte CLI Public Preview ist `v0.1.0-rc.4`. Es bleibt unveränderliche historische Release-Evidenz und enthält spätere Desktop-Arbeit **nicht** rückwirkend.

Die aktuelle Core-/CLI-Entwicklung im Repository ist neuer als RC4, aber Repository-Existenz ist keine Veröffentlichung. Für manuelle/erweiterte Installation und Protected-Guardian-Details siehe [Installation & erstes Projekt](installation.md).

## Danach weiterlesen

- [Installation & erstes Projekt](installation.md)
- [Public Preview Scope & Limitations](preview-scope.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
- [First-Run-Komposition](first-run.md)
- [Bestehende Projekte](existing-projects.md)
- [Lokale MCP-Agent-Bridge](mcp-agent-bridge.md)
- [Provider-Handoff](provider-handoff.md)
- [Verification Trace](verification-trace.md)
- [Datenschutz & Netzwerkverhalten](privacy-and-network.md)
- [Updates, Migrationen & Recovery](lifecycle-guide.md)
