# Architektur & Sicherheit

<p align="center">
  <a href="../architecture-and-safety.md">English</a> · <strong>Deutsch</strong>
</p>

Livariant trennt Projektwissen, Evidenz, Provider-Integration, ausführbare Capability und Authority. Ein nützliches Tool, ein Agent, Renderer oder Runtime darf nicht still zum Eigentümer des Projekts werden, nur weil es technisch eine Aktion ausführen kann.

## Aktuelle High-Level-Architektur

Livariant kombiniert derzeit:

1. **Core / CLI** - TypeScript-/Node.js-Produktlogik, Lifecycle-Verträge, Project Brain, providerneutrale Semantik, MCP, Verification und tiefergehende Kontrolloberflächen.
2. **Project Brain** - projekt-eigener dauerhafter Kontext, Ziele, Entscheidungen, Wissen und Metadaten.
3. **Provider-/Connector-Schicht** - begrenzter Provider Context/Return, MCP und Desktop-Connector-Host-Integration.
4. **Protected Guardian / Authority-Grenzen** - geschützte folgenreiche Authority für Domains wie Lifecycle Mutation, Semantic Mutation, Project-Brain-Integrity-Acceptance, Runtime Trust und Release Authorization.
5. **Desktop Host** - Tauri-2-/Rust-Grenze für plattformsensitive Operationen, Runtime-/Connector-/Update-Integration und Desktop-Lifecycle.
6. **Desktop Renderer** - TypeScript-/CSS-Oberfläche für Project Truth / First Steps, Connections, Diagnostics, Updates und Settings.

Der Desktop-Renderer ist **keine** Root of Trust und erzeugt keinen alternativen Project-Truth-Speicher.

## Project Brain ist der dauerhafte Projektdatensatz

Project Brain besitzt die dauerhaften Projektkontext-Domains, die Livariant ausdrücklich verwaltet:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Resume-Ausgabe, Provider-Projektionen, Findings, External Knowledge, temporäre Pläne, Desktop-Session-State, Connector-State und verborgenes Provider Memory können nützlich sein, sind aber keine konkurrierenden kanonischen Stores.

Der aktuelle Desktop-Project-Truth-/First-Steps-Workspace enthält noch Renderer-/Session-State-Foundation-Verhalten und darf nicht als vollständig persistente Project-Brain-Mutation beschrieben werden, solange der unterstützte Bridge-/Authority-Pfad nicht existiert.

## Presence ist nicht Currency

Eine legitime Datei kann trotzdem veraltet sein.

READMEs, Provider-Instruktionen, Beispiele, Release-Guides, Architekturzusammenfassungen und Projektnotizen können früher korrekt gewesen und nach späteren Produkt-/Authority-/Runtime-Entscheidungen veraltet sein.

Livariant unterscheidet deshalb:

- **kanonische aktuelle Truth**;
- **abhängige aktuelle Truth**, die ihr folgen muss;
- **historische Truth**, die einen früheren Zustand bewahrt;
- **ephemere Projektionen/Evidenz**, die aus aktuellem Zustand abgeleitet sind.

> [!IMPORTANT]
> **Presence is not currency.** Eine Aussage in einer legitimen projekt-eigenen Datei ist nicht allein deshalb noch aktuell.

Drift zu finden vergibt außerdem keine Erlaubnis, ihn umzuschreiben. Detection und Authority bleiben getrennt.

## Evidence ist nicht Project Truth

Provider-Ausgabe, externe Quellen, Findings, Discovery, Verification-Daten, Diagnostics-Evidenz und rekonstruierter Kontext sind nicht automatisch Project Truth.

Die beabsichtigte Form lautet:

```text
Evidence
  -> verstehen / bewerten / vorschlagen
  -> reviewen / wo unterstützt ausdrücklich übernehmen
  -> Project Truth
```

Nicht: „Ein Agent hat es gesagt, also schreiben wir es.“

## Capability ist nicht Authority

Dauerhafte Regeln:

```text
Capability != Authority
Connection != Authority
Proposal != Authorization
```

Technische Fähigkeit, eine Datei zu ändern, einen Prozess aufzurufen, einen Provider zu verbinden oder ein Update herunterzuladen, erzeugt keine Erlaubnis für eine folgenreiche Aktion.

Geschützte folgenreiche Authority wird nicht durch Projektdateien, gewöhnliches Same-User-JSON, Provider-Ausgabe, Renderer-State oder caller-controlled Flags hergestellt.

Für geschützte Domains schlägt fehlender, fehlerhafter, veralteter, substituierter, nicht passender oder bereits konsumierter Authority-State geschlossen fehl.

## Aktuelle Guardian-/Authority-Domains

Aktuelle geschützte Consumer umfassen folgenreiche Pfade für:

- Lifecycle Mutation;
- Semantic Mutation;
- Project-Brain-Integrity-Acceptance;
- Runtime Trust;
- Release Authorization.

Diese Domains bleiben getrennt. Authorization für ein Projekt/eine Operation/ein Material kann nicht für eine andere Domain zweckentfremdet werden.

Ein nacktes `--apply` drückt nur Ausführungsabsicht aus; es ist dort, wo aktuelle Operationen Guardian-Authorization benötigen, nicht selbst die geschützte Authority.

## Bestehende Projekte sind preservation-first

Das beabsichtigte Mutationsmodell ist:

```text
prüfen
-> Evidenz sammeln/verstehen
-> vorgeschlagenen Scope und Impact erklären
-> reviewen
-> exakte Authority herstellen, wo erforderlich
-> kleinste ausreichende Mutation durchführen
-> verifizieren
```

Bestehende Projektdateien werden nicht normalisiert, nur weil Livariant eine andere Struktur bevorzugen würde.

Das gilt besonders für `CLAUDE.md`, `AGENTS.md`, Dokumentation, Konfiguration und andere bestehende projekt-eigene Oberflächen.

## Mehrdeutiger Zustand schlägt geschlossen fehl

Kann Livariant für eine folgenreiche Operation keinen sicheren unterstützten Zustand herstellen, soll es einschränken/stoppen statt durch das Problem zu raten.

Beispiele:

- beschädigter/teilweiser Project-Brain-State;
- ungültige Lifecycle-/Recovery-Journals;
- ungelöste unterbrochene Migration;
- Filesystem-/Symlink-/Topology-Substitution;
- nicht unterstützte Migration;
- veraltetes/nicht passendes Authority-Material;
- unerwartete Release-/Artefaktidentität;
- Runtime-Integrity-/Trust-Mismatch;
- Connector-Executable-Identity-Substitution;
- Updater-Signature-/Source-Mismatch.

Read-only Diagnostics werden nicht zu Repair Authority, nur weil sie ein Problem erkennen können.

## Desktop-Trust-Grenze

Der Tauri-/Rust-Host besitzt plattformsensitive Operationen, die nicht beliebigem Renderer-Input überlassen werden dürfen.

Aktuelle Desktop-Härtung umfasst begrenzte Kontrollen rund um:

- exponierte Tauri-Commands / validierte IPC-Inputs;
- Navigation-/CSP-/WebView-Grenzen;
- Process Spawning und Executable Selection;
- Codex-Connector-Host-Inputs/-Lifecycle;
- App-Data- und Projekt-/Filesystem-Grenzen;
- signierten Updater-Endpunkt/-Key/-Source-Identity;
- Trennung von Release- und Dev-Capabilities;
- Rendering nicht vertrauenswürdiger dynamischer Texte.

Der aktuelle Codex-Pfad bewahrt die akzeptierte Executable Identity, damit ein App-Neustart nicht still mit einer anderen PATH-aufgelösten Executable gleichen Namens verbindet.

Connection-Persistenz ist trotzdem keine Authority.

## Runtime- und Release-Trust

Ausführbarer Code wird nicht dadurch vertrauenswürdig, dass er auf dem Datenträger existiert oder projekt-kontrollierte Bytes ihn als trusted bezeichnen.

Livariant trennt Konzepte wie:

```text
Release Identity
Artifact Integrity
Release Authorization
Installed Runtime Measurement
Runtime Trust
Project Lifecycle Authorization
Project Activation
```

Diese Prüfungen dürfen nicht zu einem einzigen Boolean zusammenfallen.

Die genaue tiefergehende Reihenfolge hängt vom unterstützten Operation-/Release-Vertrag ab; Projektinput kann geschützte Runtime-/Release-Authority nicht über gewöhnlichen Product-State herstellen.

## Desktop-Updates sind eine eigene Lifecycle-Domain

Der aktuelle Desktop-Updater kann über seinen festen konfigurierten HTTPS-Feed und Public Key signierte Updates entdecken, lokalisierte Release Notes darstellen, das Update herunterladen und ausdrückliche Nutzerautorisierung für Installation/Neustart anfordern.

Dauerhafte Trennung:

```text
Update verfügbar != zur Installation autorisiert
Anwendungsupdate != Project-Brain-Mutation
Renderer-Darstellung != Release Authority
```

Der Renderer kann keine beliebigen Update-URLs oder Executables auswählen.

Siehe [Updates, Migrationen & Recovery](lifecycle-guide.md).

## Migration und Recovery

Core-/Projekt-Lifecycle-Operationen bleiben plan-first und nach Operation-Domain getrennt.

Unterbrochene Arbeit wird durch dauerhafte Evidenz dargestellt, statt so behandelt zu werden, als sei nichts passiert. Recovery prüft Checkpoint-Identität/-Material, Lifecycle-Evidenz und die konkrete unterbrochene Operation; veraltetes oder mehrdeutiges Recovery-Material schlägt geschlossen fehl.

Manuelles Ersetzen von Project-Brain-/Lifecycle-/Protected-State ist kein unterstützter Repair-Shortcut.

## Provider-Grenze

Livariant Core stellt providerneutrale Context-/Return- und MCP-Grundlagen bereit. Aktuelle MCP-Setup-Hinweise existieren für Claude Code und Codex.

Der Desktop besitzt aktuell den tiefer implementierten echten lokalen Verbindungspfad für Codex. Zusätzliche Provider/Connection-Methoden bleiben zukünftige Erweiterungen, solange sie nicht separat implementiert und qualifiziert wurden.

Dauerhafte Regel:

```text
Provider != Connection Method != Capability != Role != Authority
```

Provider-Ausgabe bleibt Evidence/Kandidatenmaterial, bis ein relevanter unterstützter Review-/Adoption-Pfad etwas stärker akzeptiert.

## Diagnostics und Measurement Truth

Diagnostics hält Evidenzklassen getrennt:

```text
Observed != Avoided != Estimated
```

Fehlende Evidenz muss fehlend bleiben. Proxy-/Context-/Token-/Resource-Messungen sind nicht automatisch exakte Provider-Billing-/Kostenclaims oder universelle Endnutzer-Performance-Garantien.

Diagnostics benötigt standardmäßig keine Roh-Prompt-/Projektcontent-Erfassung.

## Architektur-Zusammenfassung

Die zentrale Safety-Idee ist nicht, dass Livariant alles weiß. Unsicheres Wissen und technische Capability sollen nicht still zu kanonischer Truth oder Erlaubnis werden.

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Persistence != Trust
Presence != Currency
Verification Evidence != akzeptierte Completion
Mehrdeutiger folgenreicher Zustand -> Fail Closed
```

Für aktuellen Release-/User-Scope siehe [Public Preview Scope & Limitations](preview-scope.md).
