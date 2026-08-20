# Livariant Fünf-Minuten-Schnellstart

<p align="center">
  <a href="../quickstart.md">English</a> · <strong>Deutsch</strong>
</p>

Die kürzeste Erklärung von Livariant lautet:

> Du arbeitest mit deinem Coding-Agenten. Livariant stellt lokal eine Reliability-/Governance-Schicht bereit, während dauerhafte Project Truth und folgenschwere Authority explizit bleiben.

## Warnung zum aktuellen Public Preview

Das aktuell veröffentlichte Release ist **`v0.1.0-rc.4`**. Das normale CLI-Paket funktioniert, aber echtes Fresh-Install-Dogfooding hat gezeigt, dass RC4 die geschützte Stage-A-Guardian-Bootstrap-Quelle für einen vollständigen Fresh-Machine-/First-Project-Lifecycle **nicht** veröffentlicht/provisioniert.

Kopiere deshalb keine RC4-Paketdateien manuell in geschützte Systempfade, um diese Lücke zu umgehen. Die vollständige Sequenz unten beschreibt die WP-044-Remediation und wird erst in einem späteren Release zum unterstützten öffentlichen Fresh-Install-Pfad, wenn dieses Release die Änderungen ausdrücklich enthält und qualifiziert.

Die vollständigen Trust-/Provenance-Details stehen unter [Installation & erstes Projekt](installation.md).

## 1. Qualifizierte Release-Artefakte prüfen

Ein remediated qualifiziertes Release stellt explizite Assets bereit, darunter normales CLI-Paket, Protected-Bootstrap-Paket, plattformspezifischen Stage-A-Installer, Manifest und Prüfsummen.

GitHubs automatisch erzeugte Downloads `Source code (zip)` und `Source code (tar.gz)` sind **keine** installierbaren Livariant-Pakete.

Vor einer privilegierten Stage-A-Ausführung prüfst du die heruntergeladenen installierbaren Inputs über GitHub Artifact Attestations gegen:

```text
Repository: Kryt3r/livariant
Signer Workflow: Kryt3r/livariant/.github/workflows/rc-bundle.yml
Source Ref: refs/heads/main
Source Digest: exakter qualifizierter Release-Source-SHA
```

Danach prüfst du `SHA256SUMS` und `PROTECTED-SHA256SUMS`.

## 2. Normale CLI installieren

```bash
npm install --global --ignore-scripts ./livariant-<version>.tgz
livariant version
```

Damit wird ausschließlich User-Tooling installiert. Es entstehen weder Guardian Readiness noch Authority.

## 3. Geschützte Maschinenbasis herstellen

Zuerst den Zustand prüfen:

```bash
livariant guardian status
```

Auf einem frischen Windows-/Linux-Rechner lautet der remediated Pfad:

```text
verifizierte Release-Artefakte
-> normale CLI installieren
-> geschützte Stage-A-Installation aus exaktem Release-Material
-> guardian status
-> geschützter Stage-B-Guardian-Bootstrap
-> guardian status: ready
```

Stage A und Stage B benötigen bereits privilegierte lokale Terminals und starten UAC/`sudo`/`pkexec` nicht selbst. Sie erzeugen keine Mutation-, Runtime- oder Release-Authority.

Für macOS existiert aktuell kein geschützter Guardian-v1-Bootstrap-Pfad.

## 4. Projekt öffnen und First Run ausführen

Im Projekt-Hauptordner:

```bash
livariant first-run --language Deutsch
```

oder:

```bash
livariant first-run --language English
```

Deutsch und Englisch sind in der Remediation eingebaute Interaktions-Locals. Nutzerseitige First-Run-Prompts und Human-Readable-Ausgabe verwenden ab dem ersten lokalisierten Prompt die gewählte unterstützte Sprache.

First Run ist read-only. Er meldet Projektzustand **und Maschinen-/Guardian-Readiness** und endet mit null Änderungen. Er initialisiert das Projekt nicht stillschweigend, persistiert kein Autonomy Profile, konfiguriert keinen Coding-Agenten und vergibt keine Authority.

Fehlt Guardian Readiness oder ist geschützter State unsicher, darf First Run nicht unmittelbar zu Lifecycle-Autorisierung/-Anwendung führen.

Mehr unter [First-Run-Komposition](first-run.md).

## 5. Bewusst initialisieren, wenn der Rechner bereit ist

Ist Guardian bereit und benötigt das Projekt ein Project Brain:

```bash
livariant init
```

Zuerst den Plan prüfen. Danach, sofern passend:

```bash
livariant init --authorize
livariant init --apply
```

Anschließend:

```bash
livariant status
livariant doctor
```

Das Project Brain ist projekt-eigener dauerhafter State:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Evidence, Inference, Project Truth, Autorisierung und Mutation bleiben getrennte Konzepte.

## 6. Coding-Agent über MCP verbinden

Provider-Konfiguration bleibt explizit:

```bash
livariant mcp setup --provider claude-code
```

oder:

```bash
livariant mcp setup --provider codex
```

Der Befehl zeigt provider-spezifische Setup-Hinweise und führt selbst null Provider-Konfigurationsänderungen aus.

Aktuelle begrenzte MCP-Tools sind:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

Nach der normalen Provider-Registrierung kann der Alltag weiterhin natural-language/agent-native statt command-lastig bleiben.

## 7. Der zentrale Reliability-Moment

`livariant_verification_trace` bewertet explizite Anforderungen/Claims gegen bereitgestellte Verification Evidence und liefert:

```text
SUPPORTED
CONTRADICTED
UNPROVEN
```

Die Grenzen bleiben:

```text
SUPPORTED != DONE
Verification Evidence != akzeptierte Completion
Evidence != Project Truth
MCP-Transport != unabhängiges Vertrauen
Capability != Authority
```

Livariant entdeckt nicht automatisch jede Anforderung und erzeugt nicht automatisch vertrauenswürdige Verification Evidence.

Mehr unter [Verification Trace](verification-trace.md).

## Fresh-Install-Abnahme für WP-044

WP-044 ist nicht abgeschlossen, nur weil Tests grün sind. Der erforderliche reale Ablauf lautet:

```text
clean machine/user state
-> verified RC install
-> protected Stage A provisioning
-> protected Stage B Guardian bootstrap
-> guardian status ready
-> existing-project First Run
-> init plan
-> init --authorize
-> init --apply
-> Project Brain valid
-> status/doctor clean
```

Unter Windows muss dieser Pfad ohne manuelles Trust-Bypass-Kopieren funktionieren.

## Danach lesen

- [Installation & erstes Projekt](installation.md)
- [First-Run-Komposition](first-run.md)
- [Verification Trace](verification-trace.md)
- [Bestehende Projekte](existing-projects.md)
- [Provider-Handoff](provider-handoff.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
- [Updates, Migrationen & Wiederherstellung](lifecycle-guide.md)
