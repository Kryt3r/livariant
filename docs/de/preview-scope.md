# Public-Preview-Umfang & Einschränkungen

<p align="center">
  <a href="../preview-scope.md">English</a> · <strong>Deutsch</strong>
</p>

Diese Seite beschreibt den Umfang des **aktuell veröffentlichten Livariant Desktop Preview** und trennt ihn von historischen CLI-Releases sowie von Roadmap-Arbeit.

## Aktuelles veröffentlichtes Desktop Preview

```text
Version: 0.1.0-rc.28
Plattform: Windows x64
Exakter Quellstand: ec2916979c1911a56203878d7102570ab71cd13c
Tag: desktop-preview-0.1.0-rc.28-ec2916979c19
Installer: Livariant_0.1.0-rc.28_x64-setup.exe
Installer SHA-256: 2897e2bf7940b8d222b382bd6c3548861cd8dd5bbfbcca097783f08f6a21579d
```

Das Release ist ein unveränderliches GitHub-Prerelease und **nicht Stable**.

Das Repository kann Änderungen enthalten, die neuer als dieser veröffentlichte Quellstand sind. Repository-Existenz, ein gemergter PR oder eine gleiche Versionsnummer veröffentlicht kein neues Release.

## Grenze der frühen Entwicklungsphase

Livariant Desktop befindet sich noch in einer frühen Entwicklungsphase. Aktuelles Preview-Verhalten ist reales Produktverhalten, aber einzelne Workflows, unterstützte Provider, UI-Oberflächen, Performance-Eigenschaften und Kompatibilität können sich bis Stable noch ändern.

Dem Windows-Preview-Installer fehlt außerdem noch die finale produktive Authenticode-Publisher-Signierung bzw. Reputation. Abhängig von Windows-Richtlinie und Reputation können Publisher- oder SmartScreen-Hinweise erscheinen. Das ist ein Distribution-Signing-Residual und kein Beleg dafür, dass Guardian-/Runtime-Authority fehlgeschlagen oder erfolgreich ist.

## Was das aktuelle Desktop Preview enthält

### Desktop-Shell und Project Truth / First Steps

Die aktuelle Desktop-Anwendung ist die grafische Normal-User-Oberfläche und enthält die akzeptierte Livariant-Shell sowie:

- Project Truth / First Steps Workspace;
- Connections;
- Diagnostics;
- Updates;
- Settings mit Deutsch/English-Anwendungssprache;
- Darstellung von Desktop-/Core-/Runtime-Identität und Health.

Der Project-Truth-Renderer enthält aktuell kuratiertes Foundation-/Session-State-Verhalten für Purpose, Direction, Rules, Knowledge Gaps, Proposals, Source-/Review-Darstellung und explizite Review-Aktionen. Er darf **nicht** als fertiger persistenter Project-Brain-Editor oder alternativer kanonischer Truth-Store beschrieben werden.

### Connections

Die Desktop-App besitzt einen echten lokalen **Codex**-Verbindungspfad über die begrenzte Connector-Host-/App-Server-Architektur. Die aktuelle Entwicklung enthält persistierte Connection Intent und automatisches Restore-Verhalten, das an die zuvor akzeptierte Executable Identity gebunden ist.

Dauerhafte Grenzen bleiben:

```text
Provider != Connection Method != Capability != Role != Authority
Connection != Authority
```

Das breitere Connector-Modell ist bewusst erweiterbar, aber zusätzliche Provider oder Connection-Methoden sind nicht allein deshalb aktuelle Desktop-Fähigkeiten, weil die Architektur sie darstellen kann.

### Diagnostics & Efficiency Evidence

Die Desktop-App enthält Diagnostics auf Basis lokal gespeicherter Evidenz. Die unterstützte Darstellung trennt:

```text
Observed != Avoided != Estimated
```

Aktuelle Zeiträume enthalten begrenzte Presets wie `1d`, `7d`, `30d`, `90d` und die gesamte gespeicherte Historie. Fehlende Evidenz muss fehlend bleiben und darf nicht erfunden werden. Diagnostics erfasst standardmäßig keine Rohinhalte von Projekt-Prompts/-Content.

Performance-Messungen aus der Entwicklung sind Engineering Evidence und keine universellen Ressourcen- oder Einsparungsgarantien für Endnutzer.

### Desktop-Updates

Die Desktop-App enthält einen echten signierten Updater-Pfad mit:

- festem HTTPS-Update-Feed und Updater-Public-Key;
- signierten Release-/Update-Metadaten;
- lokalisierten DE/EN-Release-Notes;
- echtem Download-Zustand;
- ausdrücklicher Nutzerautorisierung vor der Installation;
- Installations-/Restart-Darstellung ohne erfundenen Fortschritt.

Update-Erkennung/-Verfügbarkeit ist keine Installations-Authority. Ein Preview-Release wird nicht zu Stable, nur weil der Updater es entdecken kann.

### Core / projekt-eigene Kontinuität

Die aktuelle Codebasis enthält außerdem die projekt-eigenen Reliability-Grundlagen, auf denen Desktop- und Agenten-Workflows aufbauen, darunter:

- Project-Brain-Kontext/Ziele/Entscheidungen/Wissen/Metadaten;
- stabile logische/physische Projektidentitätsgrenzen;
- Project Context Snapshot;
- Semantic Proposal und Conflict/Drift Assessment;
- Provider Context/Return Evidence Intake;
- providerneutrale Semantic Maintenance;
- Guided Project Understanding Review und Controlled Adoption;
- External-Knowledge-Evidence-Grundlagen;
- Autonomy Profiles;
- Evidence-backed Findings;
- Requirement -> Implementation -> Verification Trace;
- Lifecycle-/Update-/Migration-/Recovery-Safeguards;
- Guardian-geschützte folgenreiche Authority-Domains;
- lokale stdio-MCP-Bridge.

Das konkrete aktuelle Verhalten jeder einzelnen Fähigkeit wird immer durch kanonischen Produktcode/-tests bestimmt, nicht allein durch diese Übersicht.

## Historisches CLI Public Preview

`v0.1.0-rc.4` bleibt ein unveränderliches historisches **CLI Public Preview**. Es ist eine getrennte ältere Release-Oberfläche und darf nicht so dargestellt werden, als hätte es spätere Desktop-Releases, spätere Remediation oder das aktuelle Desktop-UI enthalten.

Seine historischen Installationsgrenzen und das exakte RC4-Verhalten sind nur relevant, wenn jemand bewusst dieses Artefakt verwendet oder auditiert.

## Provider-Unterstützung

Livariant Core stellt MCP-Setup-Hinweise für **Claude Code** und **Codex** bereit; die aktuelle begrenzte MCP-Bridge enthält unter anderem:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

Der aktuelle Desktop-Live-Verbindungspfad ist für **Codex** tiefer implementiert. Aus providerneutralen Core-Verträgen darf keine vollständige Desktop-Unterstützung jedes Providers abgeleitet werden.

Provider-Ausgabe ist Evidenz/Kandidatenmaterial. Sie wird nicht allein deshalb Project Truth oder Mutation Authority, weil sie über MCP oder eine Desktop-Verbindung eingetroffen ist.

## Plattformumfang

Aktuell veröffentlichtes Desktop Preview:

- Windows x64.

Core/CLI und geschützte Guardian-Pfade besitzen breitere plattformspezifische Implementierungshistorie; daraus wird das aktuelle Desktop Preview aber nicht zu einem Linux-/macOS-Desktop-Release.

Ein künftiges Desktop-Plattform-Release benötigt eigene qualifizierte Distribution-/Installations-Evidenz.

## Was das aktuelle Preview nicht behauptet

Livariant behauptet derzeit **nicht**:

- Stable-Release-Kompatibilitätsgarantien;
- finale produktive Windows-Publisher-Signierung/-Reputation;
- einen fertigen persistenten Project-Truth-Editor im Desktop;
- einen vollständigen normalen Existing-Project-Adoption-UI/Pfad;
- jeden Provider, jede Authentifizierungsmethode, jede Model-Selection-Option oder jedes provider-native Feature;
- universelle automatische Requirement Discovery;
- automatische Erzeugung unabhängig vertrauenswürdiger Verification Evidence;
- universelle Correctness-Verifikation für beliebigen Code;
- automatische Reparatur jedes Drift-/Conflict-Falls;
- uneingeschränkte autonome Repository-Mutation;
- breite Multi-Agent-Orchestrierung/Concurrent-Agent-Containment als fertiges Nutzerfeature;
- ein allgemeines Drittanbieter-Plugin-/Marketplace-Ausführungsmodell;
- exakte providerseitig abgerechnete Token-/Kosteneinsparungen aus Proxy-Messungen;
- stabiles Livariant-on-Livariant Self-Hosting.

## Geplante Richtung — keine aktuelle Fähigkeit

Die aktuelle kurzfristige Richtung lautet:

1. Desktop-Security-/Performance-Härtung abschließen;
2. normalen Existing-Project-Adoption-Pfad fertigstellen;
3. persistente First-Steps-/Project-Truth-Integration unter Evidence-/Review-/Authority-Grenzen vertiefen;
4. Provider-/Connection-Unterstützung bewusst erweitern;
5. Livariant-on-Livariant Self-Hosting erst nach funktionierender normaler Adoption beginnen, zunächst Read / Observe / Propose.

Das ist Roadmap-Richtung und kein Release-Versprechen.

## Hier beginnen

- [Installation & erstes Projekt](installation.md)
- [Fünf-Minuten-Schnellstart](quickstart.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
- [Datenschutz & Netzwerkverhalten](privacy-and-network.md)
- [Updates, Migrationen & Recovery](lifecycle-guide.md)
