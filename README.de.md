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

## Dein Projekt sollte nicht vergessen, nur weil dein Chat es tut.

KI kann heute in erstaunlichem Tempo Software bauen.

Aber wer länger als ein paar Sessions mit Coding-Agenten arbeitet, stößt irgendwann auf ein anderes Problem:

> Das Modell wird immer besser. Das Projekt drumherum kann trotzdem überraschend schnell unübersichtlich und unzuverlässig werden.

Du startest einen neuen Chat und erklärst das Projekt wieder von vorne.

Du wechselst von einem Agenten zum nächsten und wichtiger Kontext bleibt im alten Tool zurück.

Eine Entscheidung, die du vor drei Wochen verworfen hast, taucht plötzlich wieder auf.

Ein Agent meldet "fertig", weil die Tests grün sind, die er gerade ausgeführt hat, während eine andere Anforderung nie geprüft wurde.

Die Dokumentation sagt A, der Code sagt B, und der nächste Agent behandelt einfach das als Wahrheit, was er zuerst findet.

Eine Migration oder ein Update geht schief und plötzlich ist die schwierigste Frage nicht mehr "Kann die KI das reparieren?", sondern "Welchem Zustand können wir überhaupt noch vertrauen?"

**Genau für dieses Problem entsteht Livariant.**

Livariant ist kein weiterer Coding-Agent. Es ist die Schicht, die beim Projekt bleibt, während Chats, Modelle, Agenten, Tools und Sessions wechseln.

---

## Die fehlende Schicht rund um Coding-Agenten

Viele Produkte lösen heute bereits einzelne Teile des Problems:

| Wird bereits besser | Bleibt oft voneinander getrennt |
| --- | --- |
| Persistente Regeln und Memories | Welche Information ist eigentlich noch gültig? |
| Längere Agent-Sessions | Welche Entscheidungen müssen die nächste Session überleben? |
| Code-Review-Agenten | Was war nur ein Vorschlag und was wurde wirklich akzeptiertes Projektwissen? |
| CI und Quality Gates | Was wurde tatsächlich verifiziert und was nur angenommen? |
| Mehr autonome Agenten | Was darf der Agent wirklich verändern, ohne zu fragen? |
| Providergebundenes Memory | Was passiert beim Providerwechsel? |

Diese Fragmentierung wird umso wichtiger, je leistungsfähiger Coding-Agenten werden.

Wenn KI nur eine Codezeile ergänzt, ist verlorener Kontext lästig.

Wenn ein Agent dutzende Dateien verändert, Befehle ausführt, Migrationen vorbereitet, Dependencies aktualisiert und lange Zeit selbstständig arbeitet, wird verlorener Kontext zu einem Reliability-Problem.

### Die Idee hinter Livariant ist einfach

> **Die Modelle sollen denken und arbeiten. Das Projekt soll Gedächtnis, Regeln, Evidenz, Entscheidungen und Kontrolle behalten.**

Statt jeden Provider zum dauerhaften Gehirn deines Projekts zu machen, soll Livariant dem Projekt selbst eine dauerhafte Kontinuität geben.

Du kannst das Modell wechseln, ohne zu verlieren, was das Projekt weiß.

Du kannst den Agenten wechseln, ohne wichtige Entscheidungen neu erklären zu müssen.

Du kannst schneller arbeiten, ohne jede überzeugend klingende KI-Antwort automatisch zur Projektwahrheit zu machen.

---

## Was sich mit Livariant verändert

<table>
<tr>
<td width="50%" valign="top">

### Ohne Livariant

- Jede neue Session beginnt mit Rekonstruktion.
- Wichtiger Kontext lebt in einzelnen Chats oder Tools.
- Alte Entscheidungen können unbemerkt zurückkehren.
- Agenten-Ausgabe kann verbindlicher wirken, als sie tatsächlich ist.
- Aus "Tests bestanden" wird schnell "alles erledigt".
- Ein Providerwechsel kann bedeuten, Kontext erneut aufzubauen.
- Recovery nach einer schlechten Änderung hängt stark vom menschlichen Gedächtnis ab.

</td>
<td width="50%" valign="top">

### Mit Livariant

- Wichtiges Projektwissen bekommt einen dauerhaften Ort.
- Evidenz und akzeptierte Project Truth bleiben getrennt.
- Entscheidungen können über Sessions hinweg nachvollziehbar bleiben.
- Etwas technisch tun zu können ist nicht dasselbe wie es tun zu dürfen.
- Verification kann zeigen, was belegt, widersprochen oder weiterhin ungeklärt ist.
- Der Reliability-Layer gehört zum Projekt, nicht zu einem Provider.
- Updates, Migrationen und Recovery können sich an explizitem Projektzustand orientieren.

</td>
</tr>
</table>

Livariant versucht nicht, KI perfekt zu machen.

**Es soll unperfekte KI deutlich verlässlicher auf Software arbeiten lassen, die länger leben muss als ein einzelner Chat.**

---

## Was Livariant heute bereits bietet

Livariant befindet sich noch in früher Entwicklung, ist aber längst nicht mehr nur ein Konzept. Wichtige Grundlagen funktionieren bereits.

### Projektkontinuität

Ein lokales, dem Projekt gehörendes Project Brain gibt wichtigen Zielen, Entscheidungen, Wissen und Kontext einen Ort, der nicht von einem einzelnen Chat oder Modell abhängt.

### Erst Evidenz, dann Wahrheit

Agenten-Ausgabe, gefundene Informationen, Findings und externe Quellen werden nicht automatisch akzeptierte Project Truth, nur weil ein LLM sie erzeugt oder gefunden hat.

### Sicherere Grenzen für Änderungen

Livariant trennt "der Agent kann das" von "der Agent darf das" und schützt folgenreiche Operationen hinter expliziten Authority-Grenzen.

### Verification, die auch sagen darf: "Wir wissen es noch nicht"

Verification Trace kann Beziehungen zwischen Anforderungen, Implementierung und Evidenz als `SUPPORTED`, `CONTRADICTED` oder `UNPROVEN` einstufen, statt ein künstlich grünes Ergebnis zu erzwingen.

### Kontinuität über Agenten hinweg

Livariant bietet bereits lokale MCP-Grundlagen, Provider-Context-/Return-Flows, Setup-Pfade für Claude Code und Codex sowie einen tieferen lokalen Desktop-Verbindungspfad für Codex.

### Recovery- und Lifecycle-Grundlagen

Initialisierung, Updates, Migrationen, Checkpoints, Recovery, Runtime Trust und Release Authority werden als getrennte Reliability-Fragen behandelt und nicht als eine generische "Update"-Aktion.

### Ehrliche Diagnostics

Diagnostics trennt bewusst, was wirklich beobachtet wurde, was vermieden wurde und was lediglich geschätzt ist. Livariant soll keine beeindruckend aussehenden Einsparungszahlen erfinden, nur um nützlicher zu wirken.

---

## Die Desktop-App macht daraus ein nutzbares Produkt

Livariant soll nicht als Sammlung von CLI-Befehlen und Engineering-Konzepten enden.

Die Desktop-App wird als normale Oberfläche gebaut: Projekte und Agenten verbinden, Projektzustand verstehen, wichtige Punkte reviewen, Diagnostics prüfen, Einstellungen verwalten und Updates über eine gemeinsame grafische Oberfläche durchführen.

> [!WARNING]
> **Frühe Entwicklungsphase / Preview**
>
> Livariant befindet sich weiterhin in aktiver Entwicklung. Die Desktop-App ist als Preview nutzbar, aber wichtige Workflows werden noch vervollständigt und einzelne Oberflächen können sich vor dem ersten öffentlichen Produktrelease verändern. Dem Windows-Installer fehlt außerdem noch die finale produktive Publisher-Signierung bzw. Reputation, weshalb Windows abhängig von Systemrichtlinie und Reputation SmartScreen- oder Publisher-Hinweise anzeigen kann.

Aktuelle Desktop-Bereiche sind:

| Bereich | Wofür er gedacht ist |
| --- | --- |
| **Project Truth / First Steps** | Projektzweck, Richtung, Regeln, Wissenslücken und Vorschläge verstehen. Persistentes Project-Brain-Editing ist noch nicht vollständig abgeschlossen. |
| **Connections** | Unterstützte lokale Agent-/Provider-Verbindungen verwalten und Connection Intent dort wiederherstellen, wo dies unterstützt wird. |
| **Diagnostics** | Lokale Reliability- und Efficiency-Evidenz prüfen, ohne beobachtete Fakten mit Schätzungen zu vermischen. |
| **Updates** | Signierte Updates finden, lokalisierte Release Notes lesen, echten Download-Fortschritt sehen und Installation/Neustart ausdrücklich autorisieren. |
| **Settings** | Sprache, Connection-/System-Konfiguration sowie Runtime-Identität und Health-Informationen verwalten. |

### Screenshots

Aktuelle Desktop-Screenshots werden hier ergänzt, sobald der verifizierte visuelle Satz vorliegt.

---

## Was das erste öffentliche Release leisten soll

Das hier ist das Zielbild aus Nutzersicht. Es ist keine interne Engineering-To-do-Liste und keine Behauptung, dass jeder Punkt heute bereits vollständig umgesetzt ist.

### 1. Ein bestehendes Projekt einfach mitbringen

Ein reales Softwareprojekt anbinden, ohne es für Livariant neu aufzubauen. Livariant soll vorhandenen Zustand inspizieren, die Hoheit des Projekts über seine eigenen Dateien erhalten und helfen, verstreuten Kontext bewusst in Projektwissen zu überführen.

### 2. Nicht alle paar Sessions wieder Kontext rekonstruieren

Ziele, wichtige Entscheidungen, Constraints, bekannte Fakten, offene Fragen und relevante Historie sollen Chats und Arbeitssessions überleben.

### 3. Agenten wechseln, ohne das Projekt zurückzusetzen

Unterstützte Coding-Agenten und Provider nutzen, ohne das private Memory eines einzelnen Providers zum einzigen Ort zu machen, an dem das Projekt noch Sinn ergibt.

### 4. Wissen, was das Projekt weiß und warum

Generiertes Material, Findings, externe Informationen, Annahmen und akzeptierte Project Truth unterscheidbar halten, statt alles in einem großen Haufen "Kontext" verschwimmen zu lassen.

### 5. Widersprüche erkennen, bevor sie still zum neuen Normalzustand werden

Veraltetes oder widersprüchliches Wissen sichtbar machen, damit es bewusst geprüft, ersetzt oder verworfen werden kann, statt frühere Entscheidungen still zu überschreiben.

### 6. Agenten dort Freiheit geben, wo Fehler billig sind, und Grenzen dort setzen, wo Fehler teuer werden

Routine und risikoarme Arbeit sollen leichtgewichtig bleiben. Folgenreiche Änderungen sollen mit wachsender Auswirkung expliziter werden.

### 7. "Fertig" soll mehr bedeuten als Selbstbewusstsein

Anforderungen, Implementierung und Verification Evidence miteinander verbinden, sodass das System weiterhin "unproven" sagen kann, wenn der Nachweis fehlt.

### 8. Wiederherstellen, ohne raten zu müssen

Updates, Migrationen, Unterbrechungen und unsichere Zustände sollen genug vertrauenswürdigen Projektzustand hinterlassen, um nachvollziehen zu können, was passiert ist und wie man zu einem bekannten guten Zustand zurückkehrt.

### 9. Das Ganze über eine verständliche Desktop-App bedienen

Normale Nutzer sollen Livariants Interna nicht erst vollständig verstehen müssen, um von ihnen zu profitieren.

### 10. Standardmäßig local-first bleiben

Normale lokale Nutzung soll weder einen Livariant-Cloud-Account noch einen automatischen Upload des Project-Brain-Zustands benötigen.

---

## Reliability, ohne Entwicklung in Bürokratie zu verwandeln

Es gibt eine sehr einfache Möglichkeit, wie ein Tool wie Livariant scheitern könnte:

> Jede winzige Änderung könnte sich plötzlich wie das Ausfüllen eines Formulars anfühlen.

Damit würde Livariant genau den Geschwindigkeits- und Flow-Vorteil zerstören, wegen dem Menschen Coding-Agenten überhaupt einsetzen.

Deshalb zielt Livariant auf ein risikobasiertes Erlebnis:

- Routine und read-only Arbeit sollen leichtgewichtig bleiben;
- Unsicherheit soll sichtbar werden, wenn sie wirklich relevant ist;
- höhere Risiken sollen stärkere Prüfungen bekommen;
- harte Sicherheitsgrenzen sollen nicht verschwinden, nur weil sie gerade unbequem sind.

**Das Ziel ist nicht mehr Prozess. Das Ziel ist mehr Vertrauen pro Unterbrechung.**

---

## Warum providerneutral wichtig ist

Ein Modellanbieter hat naturgemäß ein Interesse daran, seinen eigenen Agenten besser zu machen.

Livariant hat eine andere Aufgabe.

Livariant soll die Kontinuität deines Projekts erhalten, selbst wenn du morgen ein anderes Modell, einen anderen Coding-Agenten oder mehrere Tools nebeneinander nutzt.

Denn das wertvolle Gut ist nicht der aktuelle Chatverlauf.

**Das wertvolle Gut ist das über Zeit entstandene Verständnis des Projekts.**

Livariant wird so gebaut, dass dieses Verständnis dem Projekt gehört.

---

## Wo der Markt heute steht

Livariant basiert nicht auf der Behauptung, dass niemand sonst diese Probleme sieht. Im Gegenteil: Dass Memory, Repository-Kontext, Review, Quality Gates für AI-Code und Agent Reliability zu aktiven Produktfeldern werden, ist ein gutes Signal.

Beispiele sind [Cursor Rules](https://docs.cursor.com/context/rules), [GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory), [projectmem](https://projectmem.dev/), [Sonar AI Code Assurance](https://www.sonarsource.com/solutions/ai-code-assurance/) und AI-Review-Produkte wie [CodeRabbit](https://www.coderabbit.ai/).

Livarian ts Wette ist, dass die nächste hilfreiche Schicht nicht noch ein isoliertes Memory-Feature oder noch ein Review-Bot ist, sondern ein zusammenhängender Reliability-Layer, der Kontinuität, Evidenz, Authority, Verification, Recovery und kontrollierte Autonomie rund um das Projekt selbst verbindet.

---

## Langfristige Richtung

Über das erste öffentliche Produktrelease hinaus kann Livariant dasselbe Modell um reichhaltigeres Failure Memory, laufend aktualisierte Engineering Intelligence, unabhängige Review-/Critic-Layer, datenschutzfreundlich aggregierte Reliability-Evidenz, breiteren Provider-Support und später kontrolliertes Livariant-on-Livariant Self-Hosting erweitern.

Das sind Zukunftsrichtungen und keine aktuellen Capability-Claims.

---

<details>
<summary><strong>Technische Grundlagen</strong></summary>

### Zentrales Trust-Modell

Livariant hält mehrere Dinge bewusst getrennt:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Verification Evidence != akzeptierte Completion
Persistence != Trust
Presence != Currency
```

Ein vereinfachter Ablauf ist:

```text
Inspect / Observe
      |
      v
Evidence + begrenzter Kontext
      |
      v
Understand / Assess / Propose
      |
      v
Review + explizite Authority, wo erforderlich
      |
      v
Mutate
      |
      v
Verify
```

### Project Brain

Projekt-eigener dauerhafter Kontext nutzt aktuell eine lokale Struktur wie:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

### MCP-Integration

Aktuelle begrenzte MCP-Tools sind:

- `livariant_provider_context`
- `livariant_provider_return`
- `livariant_verification_trace`

Setup-Hinweise gibt es für Claude Code und Codex:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

Der MCP-Transport erzeugt selbst keine Mutation Authority und macht Provider-Ausgabe nicht automatisch zu Project Truth.

### Architektur

Livariant kombiniert derzeit einen TypeScript-/Node.js-Core samt CLI, eine Tauri-2-Desktop-App mit Rust-Host, geschützte Authority-Grenzen, eine lokale stdio-MCP-Bridge, projektlokalen Project-Brain-Zustand, provenienzbewusste Evidence-Verträge und signierte Desktop-Updater-Metadaten.

Mehr unter [Architektur & Sicherheit](docs/de/architecture-and-safety.md).

</details>

---

## Installieren und ausprobieren

Für die normale Desktop-Nutzung lade das **aktuellste qualifizierte Desktop Preview** aus den [GitHub Releases](https://github.com/Kryt3r/livariant/releases).

Danach weiter mit:

1. [Installation & erstes Projekt](docs/de/installation.md)
2. [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
3. [Public Preview Scope & Limitations](docs/de/preview-scope.md)
4. [Architektur & Sicherheit](docs/de/architecture-and-safety.md)
5. [Bestehende Projekte](docs/de/existing-projects.md)
6. [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md)
7. [Updates, Migrationen & Recovery](docs/de/lifecycle-guide.md)

Die englische Dokumentation startet bei [README.md](README.md).

---

## Aktuelle Preview-Grenzen

Livariant behauptet derzeit weder universelle Code-Correctness-Verifikation noch automatisch vertrauenswürdige Evidenzerzeugung, uneingeschränkte autonome Repository-Mutation, perfekte Conflict-Erkennung, Support für jeden Provider oder jede Connection-Methode oder Stable-Release-Kompatibilitätsgarantien.

Die genauen aktuellen Grenzen stehen in [Public Preview Scope & Limitations](docs/de/preview-scope.md).

---

## Lizenzierung, Sicherheit und Contributions

Livariant ist source-available und nicht OSI-zertifizierte Open Source Software. Es steht unter der [PolyForm Perimeter License 1.0.1](LICENSE).

Bitte veröffentliche vermutete Sicherheitslücken nicht in einem öffentlichen Issue. Folge [SECURITY.md](SECURITY.md).

Externe Code-Contributions sind derzeit eingeschränkt, während Contributor-Rechte passend zum source-available und künftigen Commercial-Licensing-Modell finalisiert werden. Bug Reports, Dokumentationsfeedback, Fragen und Design-Diskussionen sind willkommen.

- [Lizenzierung](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

<p align="center">
  <strong>Livariant versucht nicht, eine KI perfekt zu machen.<br/>Es versucht, dein Projekt verlässlich zu halten, auch wenn die KI es nicht ist.</strong>
</p>
