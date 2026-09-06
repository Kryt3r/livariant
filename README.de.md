<img width="1857" height="738" alt="Livariant" src="https://github.com/user-attachments/assets/87f45255-c7b2-4326-ad0c-209562df5ee9" />

<p align="center">
  <a href="README.md">English</a> · <strong>Deutsch</strong>
</p>

<p align="center">
  <a href="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/Kryt3r/livariant/releases/tag/desktop-preview-0.1.0-rc.28-ec2916979c19"><img alt="Desktop Preview" src="https://img.shields.io/badge/Desktop%20Preview-0.1.0--rc.28-0ea5e9" /></a>
  <img alt="Windows x64" src="https://img.shields.io/badge/Desktop-Windows%20x64-2563eb" />
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-PolyForm%20Perimeter-7c3aed" /></a>
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-default-06b6d4" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-supported-a855f7" />
</p>

# Livariant

**LLM-gestützte Entwicklung ist schnell. Bei langfristiger Softwarearbeit zeigen sich aber genau die Dinge, die ein Chat nicht zuverlässig bewahrt: Kontext, Entscheidungen, Evidenz, Änderungsbefugnis, Dokumentation und Recovery-Zustand.**

Livariant ist eine local-first Reliability- und Governance-Schicht für KI-gestützte Softwareentwicklung. Es gibt dem **Projekt selbst** dauerhaften Kontext und explizite Regeln dafür, was Evidenz ist, was akzeptierte Project Truth ist, was geändert werden darf, was tatsächlich verifiziert wurde und welcher Zustand im Zweifel geschlossen bleiben muss.

## Welches Problem Livariant löst

Vibe-Coding und Coding-Agenten können sehr gut funktionieren – bis ein Projekt größer, älter oder folgenreicher wird. Dann treten typische Fehlerbilder auf:

- **Kontext geht verloren** zwischen Chats, Agenten, Providern und langen Sessions;
- **Entscheidungen widersprechen sich** oder alte Annahmen tauchen unbemerkt wieder auf;
- **plausible KI-Ausgabe wird zur Projektänderung**, ohne klare Authority-Grenze;
- **„fertig“ wird stärker behauptet**, als es die vorhandene Evidenz hergibt;
- **Dokumentation und Projektwissen driften** vom tatsächlichen Softwarestand weg;
- **Handoffs, Updates, Migrationen und Recovery** werden inkonsistent oder später kaum noch rekonstruierbar.

Livariant versucht nicht, ein LLM unfehlbar zu machen. Es macht den umgebenden Projektzustand schwerer versehentlich korrumpierbar.

## Was Livariant heute konkret dagegen tut

| Fehlerbild | Aktuelle Antwort von Livariant |
| --- | --- |
| Kontextverlust | Ein projekt-eigenes **Project Brain**, begrenzte Project-Context-Snapshots, Provider-Handoff-/Context-Return-Flows und stabile Projektidentität. |
| Widersprüchliches oder veraltetes Wissen | Semantic Proposal, Drift-/Conflict-Assessment, Controlled Understanding/Adoption und Semantic-Maintenance-Grundlagen. |
| Unbeabsichtigte folgenreiche Änderungen | Explizite **Authority**-Grenzen, plan-first Abläufe, Guardian-geschützte Authority für folgenreiche Operationen und Fail-Closed bei mehrdeutigem/veraltetem Trust-Zustand. |
| Unbelegte „fertig“-Behauptungen | **Verification Trace** klassifiziert bereitgestellte Beziehungen aus Anforderung, Implementierung und Evidenz als `SUPPORTED`, `CONTRADICTED` oder `UNPROVEN`. |
| Externe/Agenten-Inhalte werden zu leicht Wahrheit | Provider-Ausgabe, Findings, External Knowledge und andere abgeleitete Inhalte bleiben **Evidence**, bis ein unterstützter Review-/Adoption-Pfad etwas als Project Truth akzeptiert. |
| Lifecycle-/Recovery-Fehler | Getrennte Grenzen für Initialisierung, Update, Migration, Checkpoint, Recovery, Runtime Trust und Release Authorization. |

Das sind implementierte Grundlagen mit bewusst begrenztem Umfang. Livariant behauptet **nicht**, beliebigen Code universell korrekt zu verifizieren, automatisch vertrauenswürdige Evidenz zu erzeugen, uneingeschränkt autonom zu mutieren oder jeden Widerspruch sicher zu erkennen.

## Desktop-App — die zentrale grafische Oberfläche

Die Livariant Desktop-App ist die zentrale grafische Oberfläche für die normale tägliche Nutzung. Das aktuell veröffentlichte Desktop Preview ist **`0.1.0-rc.28` für Windows x64**.

> [!WARNING]
> **Frühe Entwicklungsphase / Preview**
>
> Livariant befindet sich noch in einer frühen Entwicklungsphase. Die Desktop-App ist als Preview nutzbar, aber Abläufe, Kompatibilität und einzelne Oberflächen können sich noch ändern. Preview-Verhalten ist keine Stable-Release-Garantie. Dem Windows-Installer fehlt außerdem noch die finale produktive Authenticode-Publisher-Signierung bzw. Reputation; abhängig von Systemrichtlinie und Reputation können deshalb Publisher-/SmartScreen-Hinweise erscheinen.

Aktuelle Desktop-Bereiche sind unter anderem:

- **Project Truth / First Steps** — ein kuratierter Arbeitsbereich für Projektzweck, Richtung, Regeln, Wissenslücken, Vorschläge und manuellen Review. Der aktuelle Renderer enthält hier Foundation-/Session-State-Verhalten; das darf nicht mit vollständig persistenter Project-Brain-Mutation verwechselt werden.
- **Connections** — lokale Provider-/Agent-Verbindungsverwaltung rund um die aktuell implementierte Codex-Verbindungsgrenze, inklusive persistierter Connection Intent und Restore-Verhalten.
- **Diagnostics** — wahrheitsgemäße lokale Diagnostics-/Efficiency-Evidenz mit expliziten Zeiträumen und der dauerhaften Trennung `Observed != Avoided != Estimated`.
- **Updates** — signierte Desktop-Update-Erkennung, lokalisierte DE/EN-Patch-Notes, echter Download-Zustand sowie ein ausdrücklich autorisierter Installations-/Neustart-Ablauf.
- **Settings** — Anwendungssprache sowie Connection-/System-Konfiguration und Runtime-/Identitäts-/Health-Informationen.

### Aktuelle Desktop-Screenshots

Das Repository enthält derzeit noch keinen kanonischen Satz an Desktop-Screenshot-Assets. Diese Dokumentationsüberarbeitung wird nur Screenshots ergänzen, die nachweislich den akzeptierten aktuellen Desktop-Visual-Stand zeigen; es werden keine Mockups oder erfundenen Bilder als Produktbeleg dargestellt.

### Kleine Roadmap — geplant, nicht bereits umgesetzt

Die nächste Produktrichtung bleibt bewusst überschaubar:

1. die aktive **Desktop-Security-/Performance-Härtung** abschließen;
2. den normalen **Existing-Project-Adoption**-Pfad fertigstellen, damit reale Projekte ohne Sonderbehandlung übernommen werden können;
3. persistente **First-Steps-/Project-Truth**-Integration vertiefen und dabei `Evidence -> Review -> Project Truth` sowie eine einzelne Mutation Authority beibehalten;
4. Provider-/Connection-Unterstützung über die derzeit implementierte Verbindungsoberfläche hinaus erweitern;
5. **Livariant-on-Livariant Self-Hosting** erst nach funktionierender normaler Adoption beginnen – zunächst mit Read / Observe / Propose statt Mutation Authority.

Roadmap-Punkte sind Produktrichtung, keine bereits vorhandenen Fähigkeiten oder Release-Versprechen.

## Das Kernmodell

Livariant trennt Konzepte, die in KI-gestützten Workflows schnell miteinander vermischt werden:

```text
Inspect / Observe
      ↓
Evidence + begrenzter Kontext
      ↓
Understand / Assess / Propose
      ↓
Review + explizite Authority, wo erforderlich
      ↓
Mutate
      ↓
Verify
```

Dauerhafte Grenzen sind unter anderem:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Verification Evidence != akzeptierte Completion
Persistence != Trust
Presence != Currency
Mehrdeutiger folgenreicher Zustand -> Fail Closed
```

Praktisch bedeutet das: Ein Modell darf etwas vorschlagen, ableiten, inspizieren oder technisch sogar ausführen können, ohne dass daraus automatisch die Erlaubnis entsteht, kanonischen Projektzustand umzuschreiben.

## Projekt-eigene Kontinuität

Das lokale Project Brain von Livariant stellt dauerhaften Projektkontext bereit, der nicht einem einzelnen Chat oder Modell gehört:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Dazu kommen Grundlagen wie Project Context Snapshots, Provider Context/Return Evidence, External-Knowledge-Evidenz, Guided Understanding/Review, Semantic Proposal/Drift Assessment, Findings und Verification Trace.

Ein kopierter Satz, Provider-Ergebnis, veraltetes Kontextpaket, eine externe Notiz oder ein gespeichertes Finding wird nicht automatisch Project Truth, nur weil es existiert.

## Agenten- und MCP-Integration

Livariant enthält eine lokale stdio-MCP-Bridge für kompatible Coding-Agenten. Aktuelle begrenzte Tools sind unter anderem:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

Die CLI kann außerdem explizite Provider-Setup-Hinweise für Claude Code und Codex ausgeben:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

Diese Befehle schreiben Provider-Konfiguration nicht still um. MCP-Transport erzeugt außerdem keine Mutation Authority und macht Provider-Ausgabe nicht automatisch zu Project Truth.

Die Desktop-Verbindungsoberfläche besitzt aktuell einen tiefer implementierten lokalen Codex-Verbindungspfad. Zusätzliche Provider und Connection-Methoden bleiben zukünftige Erweiterungen, solange sie nicht separat implementiert und qualifiziert wurden.

## Sicherheits- und Trust-Prinzipien

Livariant arbeitet preservation-first:

- folgenreiche Mutation bleibt explizit;
- Capability und Authority sind getrennt;
- veralteter, substituierter, mehrdeutiger oder fehlerhafter folgenreicher Trust-Zustand schlägt geschlossen fehl;
- historische Evidenz wird nicht still umgeschrieben;
- External Knowledge und Provider-Ausgabe bleiben Evidenz, bis sie überprüft/übernommen wurden;
- Update-Verfügbarkeit ist keine Installationsautorisierung;
- Verification Evidence ist nicht automatisch akzeptierte Completion;
- Project-Brain-Zustand bleibt standardmäßig lokal;
- Livariant-Nutzungstelemetrie ist aktuell nicht implementiert.

Wenn Projektkontext an einen externen KI-Provider gesendet wird, gelten dessen Bedingungen, Aufbewahrungseinstellungen und Sicherheitsmodell.

## Installation / Quickstart

### Normaler Windows-Desktop-Pfad

Das aktuell veröffentlichte grafische Preview ist:

- **Desktop:** `0.1.0-rc.28`
- **Plattform:** Windows x64
- **Exakter veröffentlichter Quellstand:** `ec2916979c1911a56203878d7102570ab71cd13c`
- **Installer:** `Livariant_0.1.0-rc.28_x64-setup.exe`
- **Installer SHA-256:** `2897e2bf7940b8d222b382bd6c3548861cd8dd5bbfbcca097783f08f6a21579d`

Lade ihn aus dem unveränderlichen [Desktop Preview rc.28 Release](https://github.com/Kryt3r/livariant/releases/tag/desktop-preview-0.1.0-rc.28-ec2916979c19), prüfe die Release-Identität, installiere ihn und starte Livariant.

Danach kannst du in der App den aktuellen Runtime-Zustand prüfen, eine unterstützte Verbindung konfigurieren, Project Truth / First Steps bearbeiten bzw. reviewen, Diagnostics ansehen und bei einem verfügbaren signierten kompatiblen Update den expliziten Update-Ablauf verwenden.

Siehe [Installation](docs/de/installation.md) und [Fünf-Minuten-Schnellstart](docs/de/quickstart.md) für den vollständigen aktuellen Ablauf und seine Grenzen.

### CLI / erweiterte Kontrolloberflächen

Livariant Core und CLI bleiben wichtig für providerunabhängige Inspektion, MCP-Setup, Lifecycle-Operationen, Guardian-/Protected-Authority-Abläufe und tiefergehende Diagnostik. Das historische `v0.1.0-rc.4` CLI Public Preview ist eine unveränderliche ältere Release-Oberfläche; es ist **nicht** das aktuelle Desktop Preview und spätere Desktop-Fähigkeiten sind nicht rückwirkend Teil von RC4.

## Grenzen des aktuellen Previews

Das aktuelle Produkt ist ein Preview. Livariant behauptet insbesondere derzeit nicht:

- Stable-Release-Kompatibilitätsgarantien;
- einen vollständig persistenten Project-Truth-Editor im Desktop-Renderer;
- jeden Provider oder jede Provider-Verbindungsmethode;
- universelle automatische Requirement Discovery;
- automatische Erzeugung unabhängig vertrauenswürdiger Verification Evidence;
- universelle Correctness-Verifikation für beliebigen Code;
- automatische Reparatur jedes Drift-/Conflict-Falls;
- uneingeschränkte autonome Repository-Mutation;
- breite Multi-Agent-Orchestrierung oder einen Drittanbieter-Plugin-Marktplatz;
- exakte providerseitig abgerechnete Token-/Kosteneinsparung aus Proxy-Messungen.

Siehe [Public Preview Scope & Limitations](docs/de/preview-scope.md).

## Dokumentation

Hier beginnen:

1. [Installation & erstes Projekt](docs/de/installation.md)
2. [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
3. [Public Preview Scope & Limitations](docs/de/preview-scope.md)
4. [Architektur & Sicherheit](docs/de/architecture-and-safety.md)
5. [First-Run-Komposition](docs/de/first-run.md)
6. [Bestehende Projekte](docs/de/existing-projects.md)
7. [Lokale MCP-Agent-Bridge](docs/de/mcp-agent-bridge.md)
8. [Provider-Handoff](docs/de/provider-handoff.md)
9. [Verification Trace](docs/de/verification-trace.md)
10. [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md)
11. [Updates, Migrationen & Recovery](docs/de/lifecycle-guide.md)

Die englische Dokumentation startet bei [README.md](README.md).

## Architektur und technische Details

Livariant kombiniert aktuell:

- einen TypeScript-/Node.js-Core samt CLI;
- eine Tauri-2-Desktop-App mit Rust-Host und Host-WebView-Frontend;
- geschützte Guardian-/Authority-Grenzen für folgenreiche Operationen;
- eine lokale stdio-MCP-Bridge;
- projektlokalen Project-Brain-Zustand;
- provenienzbewusste Evidence-/Verification-Verträge;
- signierte Desktop-Updater-Metadaten und Release-Identität.

Der Desktop-Renderer ist keine Root of Trust und erzeugt keinen alternativen Project-Truth-Speicher. Plattformabhängiges Process-, Filesystem-, Updater-, Installer- und Protected-Authority-Verhalten bleibt hinter expliziten Host-/Core-Grenzen.

Mehr unter [Architektur & Sicherheit](docs/de/architecture-and-safety.md).

## Lizenzierung, Sicherheit und Beiträge

Livariant ist source-available und kein OSI-anerkanntes Open-Source-Projekt. Es steht unter der [PolyForm Perimeter License 1.0.1](LICENSE).

Bitte keine Details zu vermuteten Sicherheitslücken in öffentlichen Issues posten. Siehe [SECURITY.md](SECURITY.md).

Externe Code-Beiträge sind derzeit eingeschränkt, während Contributor-Rights-Regeln finalisiert werden, die mit dem source-available und künftigen kommerziellen Lizenzmodell vereinbar sind. Bugreports, Dokumentationsfeedback, Fragen und Designdiskussionen sind willkommen.

- [Lizenzierung](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

**Livariant muss die KI nicht perfekt machen. Es muss folgenreichen Projektzustand überprüfbar, zuordenbar und explizit kontrolliert halten, wenn die KI es nicht ist.**