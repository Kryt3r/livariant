<img width="1857" height="738" alt="Livariant" src="https://github.com/user-attachments/assets/87f45255-c7b2-4326-ad0c-209562df5ee9" />

<p align="center">
  <a href="README.md">English</a> · <strong>Deutsch</strong>
</p>

<p align="center">
  <a href="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/Kryt3r/livariant/releases"><img alt="Desktop Preview" src="https://img.shields.io/badge/Desktop-Preview-0ea5e9" /></a>
  <img alt="Windows x64" src="https://img.shields.io/badge/Desktop-Windows%20x64-2563eb" />
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-PolyForm%20Perimeter-7c3aed" /></a>
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-default-06b6d4" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-supported-a855f7" />
</p>

# Livariant

**Coding-Agenten werden immer besser darin, mehr Arbeit zu erledigen. Das schwierigere Problem ist, ein echtes Softwareprojekt dabei vertrauenswürdig zu halten.**

Bei langfristiger LLM-gestützter Entwicklung treten immer wieder dieselben strukturellen Schwächen auf:

- Kontext geht zwischen Sessions, Tools und Providern verloren;
- alte Entscheidungen tauchen wieder auf, obwohl sie längst ersetzt wurden;
- plausible Ableitungen können mit akzeptiertem Projektwissen verwechselt werden;
- ein Agent kann technisch etwas ändern können, ohne dafür autorisiert zu sein;
- "fertig" kann selbstbewusster behauptet werden, als es die vorhandene Verification Evidence erlaubt;
- Dokumentation, Architekturhinweise und Arbeitsannahmen driften vom tatsächlichen Produktstand weg;
- Updates, Migrationen, Fehler und unterbrochene Arbeit lassen sich später nur schwer sicher rekonstruieren;
- ein Modell- oder Agentenwechsel bedeutet oft, Projektkontext erneut aufzubauen.

Das sind keine theoretischen Randfälle. Sie werden wichtiger, je mehr Coding-Agenten nicht nur einzelne Codezeilen vorschlagen, sondern viele Dateien verändern, Tools ausführen, Migrationen vorbereiten und längere Zeit mit weniger Aufsicht arbeiten.

**Livariant wird als providerneutraler Reliability- und Governance-Layer für KI-gestützte Softwareentwicklung gebaut.** Es versucht nicht, ein einzelnes Modell unfehlbar zu machen. Stattdessen bekommt das Projekt dauerhaften Zustand und explizite Grenzen dafür, was Evidence ist, was akzeptierte Wahrheit ist, was geändert werden darf, was tatsächlich verifiziert wurde und wann ein Ablauf bei mehrdeutigem Zustand stoppen muss.

## Der Markt löst bereits Teile dieses Problems

Livariant basiert nicht auf der Behauptung, dass diese Probleme bisher niemand erkannt hätte.

Heutige Werkzeuge adressieren bereits einzelne Teile:

- Editor- und Agentenprodukte bieten persistente Projektregeln und Instruktionen;
- Repository-Memory-Systeme halten Fakten, Präferenzen und Entwicklungshistorie über Sessions hinweg fest;
- Review-Produkte prüfen KI-generierte Änderungen;
- Quality- und Security-Plattformen setzen Gates um generierten Code;
- Orchestrierungs- und Agenten-Frameworks verbessern Tool-Nutzung und Task-Ausführung.

Repräsentative Beispiele sind [Cursor Rules](https://docs.cursor.com/context/rules), [GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory), [projectmem](https://projectmem.dev/), [Sonar AI Code Assurance](https://www.sonarsource.com/solutions/ai-code-assurance/) und AI-Review-Produkte wie [CodeRabbit](https://www.coderabbit.ai/).

Die Chance, auf die Livariant zielt, ist eine andere:

> **Die einzelnen Reliability-Probleme werden zunehmend erkannt, aber häufig weiterhin als getrennte Features, getrennte Tools oder providergebundener Zustand behandelt.**

Memory löst nicht automatisch Authority. Review löst nicht automatisch dauerhafte Project Truth. CI löst nicht automatisch Context Continuity. Providergebundenes Memory überlebt nicht automatisch einen Providerwechsel. Ein erfolgreicher Testlauf beweist nicht automatisch, dass jede Anforderung erfüllt wurde. Ein Recovery-Mechanismus weiß nicht automatisch, welcher Projektzustand tatsächlich autorisiert war.

Livariants These ist, dass diese Fragen stärker werden, wenn sie als ein zusammenhängendes System entworfen werden, statt unabhängig voneinander um den Agenten herum zu wachsen.

## Was Livariant zusammenführt

Livariant ist als kombinierter Reliability-Layer gedacht:

```text
Dauerhafte Project Truth
+ Evidence und Provenance
+ explizite Authority
+ providerneutrale Continuity
+ Verification Trace
+ Conflict- und Drift-Handling
+ kontrollierte Autonomie
+ Lifecycle und Recovery
+ Diagnostics und Observability
```

Entscheidend ist dabei nicht die Anzahl der Features, sondern die Trennung von Konzepten, die LLM-Workflows leicht vermischen:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Verification Evidence != akzeptierte Completion
Persistence != Trust
Presence != Currency
```

Ein Modell kann nützlich, selbstbewusst, verbunden und technisch leistungsfähig sein und trotzdem falsch liegen. Keine dieser Eigenschaften allein soll bei Livariant stillschweigend dazu führen, dass seine Ausgabe dauerhafter Projektzustand wird.

## Was Livariant heute bereits kann

Livariant besitzt heute bereits funktionierende Grundlagen für:

| Problem | Aktuelle Antwort von Livariant |
| --- | --- |
| Kontextverlust | Projekt-eigenes **Project Brain**, begrenzter Project Context, Provider-Context-/Return-Flows und stabile Projektidentität. |
| Veraltetes oder widersprüchliches Wissen | Semantic Proposal, Drift-/Conflict-Assessment, Guided Understanding, Controlled Adoption und Semantic-Maintenance-Grundlagen. |
| Unbeabsichtigte folgenreiche Änderungen | Explizite **Authority**-Grenzen, plan-first Mutation, Guardian-geschützte Authority für folgenreiche Operationen und Fail-Closed bei veraltetem oder mehrdeutigem Trust-Zustand. |
| Unbelegte "fertig"-Behauptungen | **Verification Trace** klassifiziert bereitgestellte Beziehungen aus Anforderung, Implementierung und Evidenz als `SUPPORTED`, `CONTRADICTED` oder `UNPROVEN`. |
| Agenten- oder externe Inhalte werden zu leicht Wahrheit | Provider-Ausgabe, Findings, External Knowledge und abgeleitete Inhalte bleiben **Evidence**, bis ein akzeptierter Review-/Adoption-Pfad etwas zu Project Truth macht. |
| Provider-Continuity | Lokale MCP-Integration, Provider Context/Return, Setup-Pfade für Claude Code und Codex sowie ein aktuell tiefer implementierter Desktop-Verbindungspfad für Codex. |
| Lifecycle- und Recovery-Fehler | Getrennte Grenzen für Initialisierung, Update, Migration, Checkpoint, Recovery, Runtime Trust und Release Authorization. |
| Observability | Lokale Diagnostics-Grundlagen mit expliziter Trennung von `Observed`, `Avoided` und `Estimated`. |

Diese Fähigkeiten sind bewusst begrenzt. Livariant behauptet **nicht**, beliebigen Code universell verifizieren zu können, automatisch vertrauenswürdige Evidenz zu erzeugen, uneingeschränkt autonom zu mutieren, jeden Konflikt sicher zu erkennen oder jeden Provider und Workflow zu unterstützen.

## Desktop-App

Die Desktop-App soll die zentrale Benutzeroberfläche von Livariant sein, sodass normale Nutzer nicht dauerhaft mit einem command-lastigen Workflow arbeiten müssen.

> [!WARNING]
> **Frühe Entwicklungsphase / Preview**
>
> Livariant befindet sich weiterhin in aktiver Entwicklung. Die Desktop-App ist als Preview nutzbar, aber Workflows, Kompatibilität und einzelne Oberflächen können sich vor dem ersten öffentlichen Produktrelease noch ändern. Dem Windows-Installer fehlt außerdem noch die finale produktive Authenticode-Publisher-Signierung bzw. Reputation. Je nach Systemrichtlinie und Reputation können deshalb Publisher- oder SmartScreen-Hinweise erscheinen.

Aktuelle Desktop-Bereiche sind unter anderem:

- **Project Truth / First Steps** - Projektzweck, Richtung, Regeln, Wissenslücken, Vorschläge und manueller Review. Der aktuelle Renderer enthält hier noch Foundation-/Session-State-Verhalten und darf nicht mit einem vollständig persistenten Project-Brain-Editor verwechselt werden.
- **Connections** - lokale Provider-/Agent-Verbindungsverwaltung rund um die aktuell implementierte Connection-Grenze, inklusive persistierter Connection Intent und Restore-Verhalten.
- **Diagnostics** - lokale Reliability-/Efficiency-Evidenz mit expliziten Zeiträumen und der dauerhaften Trennung `Observed != Avoided != Estimated`.
- **Updates** - signierte Update-Erkennung, lokalisierte DE/EN-Release-Notes, echter Download-Zustand und ein ausdrücklich autorisierter Installations-/Neustart-Ablauf.
- **Settings** - Sprache, Connection-/System-Konfiguration und Runtime-Identitäts-/Health-Informationen.

### Screenshots

Aktuelle Screenshots werden hier ergänzt, sobald ein verifizierter Satz vorliegt, der den akzeptierten Desktop-Visual-Stand zeigt. Mockups oder veraltete Screenshots werden nicht als aktueller Produktbeleg dargestellt.

## Zielbild für das erste öffentliche Produktrelease

Diese Roadmap beschreibt den **beabsichtigten nutzerseitigen Produktumfang für das erste öffentliche Release**. Sie ist keine Reihenfolge interner Engineering-Arbeit und keine Behauptung, dass heute bereits jeder Punkt vollständig umgesetzt ist.

Ziel ist, dass ein Nutzer:

1. **Livariant primär über die Desktop-App installieren und bedienen kann**, mit verständlichem Onboarding, Updates, Diagnostics und Settings.
2. **Ein bestehendes reales Projekt anbinden kann, ohne es für Livariant umzustrukturieren**, vorhandenen Zustand inspizieren und Projektwissen bewusst übernehmen kann.
3. **Dauerhaften Projektkontext über lange Arbeitsphasen hinweg behält**, sodass wichtige Ziele, Entscheidungen, Constraints, bekannte Fakten und offene Fragen nicht von einem einzelnen Chat abhängen.
4. **Zwischen unterstützten Coding-Agenten und Providern wechseln kann, ohne den Reliability-Layer des Projekts zu verlieren**, einschließlich persistierter Connection Intent, wo unterstützt, und providerneutraler Project Continuity.
5. **Evidence von Project Truth getrennt halten kann**, einschließlich Agent-Ausgabe, Findings, Discovery-Ergebnissen und External Knowledge.
6. **Widersprüchliches oder veraltetes Projektwissen reviewen kann, statt es still zu überschreiben**, einschließlich nachvollziehbarer Replacement-/Supersession-Semantik, wo unterstützt.
7. **Kontrollierte Autonomie statt Alles-oder-Nichts-Automation verwenden kann**, sodass routinemäßige risikoarme Arbeit leichtgewichtig bleibt und folgenreiche Entscheidungen an expliziten Grenzen stoppen.
8. **Claims strenger prüfen kann als durch ein bloßes "fertig" des Agenten**, mit Verification Trace und risikogerechter Verification Evidence.
9. **Unterbrochenen oder unsicheren Lifecycle-Zustand ohne Raten wiederherstellen kann**, mit expliziten Grenzen für Update, Migration, Checkpoints, Recovery und Trust.
10. **Lokale Diagnostics ohne erfundene Einsparungen oder vorgetäuschte Gewissheit prüfen kann**, inklusive klarer Provenance und Trennung zwischen beobachteten, vermiedenen und geschätzten Werten.
11. **Standardmäßig local-first arbeiten kann**, ohne für normale lokale Nutzung einen Livariant-Cloud-Account oder automatischen Upload von Project-Brain-Zustand zu benötigen.

Darauf zielt Livariant als Produkt: nicht auf einen weiteren Coding-Agenten, sondern auf einen dauerhaften Reliability-Layer, der beim Projekt bleibt, während Agents, Modelle, Sessions und Tools wechseln.

## Die entscheidende Produktanforderung: Reliability ohne den Geschwindigkeitsvorteil zu zerstören

Livariant funktioniert nur, wenn die zusätzliche Reliability die zusätzliche Reibung wert ist.

Ein System, das bei jeder harmlosen Änderung stoppt, ständig Warnungen erzeugt oder aus einer kleinen Änderung ein Governance-Ritual macht, würde einen der wichtigsten Vorteile von Coding-Agenten zerstören.

Das beabsichtigte Verhalten ist deshalb **risikobasiert**:

- risikoarme, read-only und routinemäßige Arbeit soll so wenig Reibung wie praktikabel erzeugen;
- relevante Unsicherheit soll sichtbar werden, statt still ignoriert zu werden;
- folgenreiche Änderungen sollen mit wachsender Auswirkung und höheren Trust-Anforderungen expliziter werden;
- harte Authority-Grenzen dürfen nicht geschwächt werden, nur damit sich der Workflow schneller anfühlt.

Das Ziel ist nicht maximaler Prozess. Es ist **der minimale Prozess, der nötig ist, um das Projekt vertrauenswürdig zu halten**.

## Wie Livariant arbeitet

Vereinfacht:

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

Das lokale Project Brain liefert projekt-eigenen dauerhaften Kontext:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Ein kopierter Satz, ein Provider-Ergebnis, ein veraltetes Kontextpaket, eine externe Notiz oder ein Finding ist nicht automatisch Project Truth, nur weil es existiert.

## Agenten- und MCP-Integration

Livariant enthält eine lokale stdio-MCP-Bridge für kompatible Coding-Agenten. Aktuelle begrenzte Tools sind:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

Die CLI kann außerdem explizite Setup-Hinweise für Claude Code und Codex ausgeben:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

Diese Befehle schreiben Provider-Konfiguration nicht still um. MCP-Transport erzeugt außerdem keine Mutation Authority und macht Provider-Ausgabe nicht automatisch zu Project Truth.

## Sicherheits- und Trust-Prinzipien

Livariant arbeitet preservation-first:

- folgenreiche Mutation bleibt explizit;
- Capability und Authority sind getrennt;
- veralteter, substituierter, mehrdeutiger oder fehlerhafter folgenreicher Trust-Zustand schlägt geschlossen fehl;
- historische Evidenz wird nicht still umgeschrieben;
- External Knowledge und Provider-Ausgabe bleiben Evidence, bis sie geprüft und übernommen wurden;
- Update-Verfügbarkeit ist keine Installationsautorisierung;
- Verification Evidence ist nicht automatisch akzeptierte Completion;
- der Desktop-Renderer ist keine Root of Trust;
- Project-Brain-Zustand bleibt standardmäßig lokal;
- Livariant-Nutzungstelemetrie ist aktuell nicht implementiert.

Wenn Projektkontext an einen externen KI-Provider gesendet wird, gelten dessen Bedingungen, Aufbewahrungseinstellungen und Sicherheitsmodell.

## Installation und Quickstart

Für normale Desktop-Nutzung lädst du das **aktuellste qualifizierte Desktop Preview** von der [GitHub-Releases-Seite](https://github.com/Kryt3r/livariant/releases) und folgst der aktuellen [Installationsanleitung](docs/de/installation.md) sowie dem [Fünf-Minuten-Schnellstart](docs/de/quickstart.md).

Exakte Release-Identitäten, unterstützte Plattformen, bekannte Preview-Einschränkungen, Artefaktinformationen und historische Release-Grenzen stehen in [Public Preview Scope & Limitations](docs/de/preview-scope.md), statt in dieser README mehrfach dupliziert zu werden.

Core und CLI bleiben für providerunabhängige Inspektion, MCP-Setup, Lifecycle-Operationen, Guardian-/Protected-Authority-Abläufe und tiefergehende Diagnostik verfügbar.

## Grenzen des aktuellen Previews

Livariant behauptet derzeit nicht:

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

## Langfristige Richtung

Über das erste öffentliche Produktbaseline hinaus kann Livariant auf demselben Trust-Modell weiter aufbauen, etwa mit umfangreicherem Failure Memory, laufend aktualisierter Engineering Intelligence, unabhängigen Review-/Critic-Layern, privacy-preserving aggregierter Real-World-Reliability-Evidenz, breiterem Provider-Support und später kontrolliertem Livariant-on-Livariant Self-Hosting.

Das sind zukünftige Richtungen und keine aktuellen Capability-Claims.

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

Mehr unter [Architektur & Sicherheit](docs/de/architecture-and-safety.md).

## Lizenzierung, Sicherheit und Beiträge

Livariant ist source-available und kein OSI-zertifiziertes Open-Source-Projekt. Es steht unter der [PolyForm Perimeter License 1.0.1](LICENSE).

Veröffentliche vermutete Schwachstellen nicht in einem öffentlichen Issue. Folge stattdessen [SECURITY.md](SECURITY.md).

Externe Code-Beiträge sind derzeit eingeschränkt, solange Contributor-Rechte passend zum source-available und möglichen späteren kommerziellen Lizenzmodell finalisiert werden. Bugreports, Dokumentationsfeedback, Fragen und Design-Diskussionen sind willkommen.

- [Lizenzierung](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

**Livariant braucht kein perfektes Modell. Es braucht ein Projekt, das verständlich, reviewbar und wiederherstellbar bleibt, wenn das Modell nicht perfekt ist.**
