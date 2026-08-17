<img width="1376" height="682" alt="Livariant | Zuverlässigkeit und Governance für KI-gestützte Softwareentwicklung" src="https://github.com/user-attachments/assets/16f5afee-a10a-4c79-8bc9-89d23135e0e9" />

<p align="center">
  <a href="README.md">English</a> · <strong>Deutsch</strong>
</p>

# Livariant

**Eine projekt-eigene Zuverlässigkeits- und Governance-Schicht für ernsthafte KI-gestützte Softwareentwicklung.**

KI-Coding-Agenten sind mächtig, aber weiterhin probabilistische Systeme. Sie können Kontext verlieren, Projektfakten halluzinieren, frühere Entscheidungen vergessen, anderen Agenten widersprechen, Fertigstellung zu früh behaupten, auf veralteten Informationen handeln oder lokal plausible Änderungen machen, die dem Projekt langfristig schaden.

Livariant folgt deshalb einer einfachen Idee:

> **Die KI darf falsch liegen. Dein Projekt sollte den Fehler nicht automatisch übernehmen.**

Statt ein einzelnes Modell unfehlbar machen zu wollen, gibt Livariant dem **Projekt selbst** dauerhafte Wahrheit, Kontinuität, kontrollierte Änderungspfade, Sicherheitsgrenzen, Verifikationsevidenz und Recovery-Semantik, die einzelne Chats, Agenten, Tools und Provider überdauern.

## Was Livariant konkret macht

Livariant sitzt zwischen KI-gestützter Entwicklung und dem dauerhaften Zustand deines Softwareprojekts.

```text
KI-Agent
   ↓
Beobachtung / Vorschlag / geplante Änderung
   ↓
Livariant
├─ rekonstruiert den aktuellen Projektkontext
├─ bewahrt dauerhafte Ziele, Entscheidungen und Wissen
├─ erkennt Konflikte und veraltete Baselines
├─ trennt Evidenz von akzeptierter Wahrheit
├─ trennt technische Fähigkeit von Autorität
├─ bereitet klar begrenzte Projektänderungen vor
├─ verlangt die passende Autorisierung
├─ verifiziert den resultierenden Zustand
└─ bewahrt Historie, Lifecycle-Evidenz und Recovery-Pfade
   ↓
Projekt
```

Zu den Kernregeln gehören:

```text
Evidenz != Wahrheit
Fähigkeit != Autorität
Vorschlag != Autorisierung
Persistenz != Vertrauen
Vorhandensein != Aktualität
Abgeleiteter Zustand != kanonischer Zustand
Unklarer Zustand -> Fail Closed
```

Diese Regeln existieren, weil eine KI-Antwort nützlich sein kann, ohne automatisch korrekt, aktuell, vertrauenswürdig, autorisiert oder sicher dauerhaft speicherbar zu sein.

## Ist Livariant ein Second Brain?

**Nein.**

Ein Second Brain speichert und findet vor allem Informationen wieder. Livariant nutzt ebenfalls dauerhaftes Projektwissen, aber seine Aufgabe ist breiter: Es steuert, wie KI-Agenten Projektzustand **interpretieren, vertrauen, nutzen und verändern**.

Livariant beschäftigt sich mit Fragen wie:

- Woher stammt diese Information?
- Ist sie bestätigte Projektwahrheit, Evidenz, Historie oder eine KI-Inferenz?
- Ist sie noch aktuell?
- Widerspricht sie einer bestehenden Entscheidung?
- Darf der Agent daraus eine dauerhafte Projektänderung machen?
- Was würde sich konkret ändern?
- Wurde die Änderung tatsächlich verifiziert?
- Kann das Projekt sich erholen, wenn etwas schiefläuft?

Externe Wissenssysteme wie Obsidian sollen nicht durch Livariant ersetzt werden müssen. Langfristig sollen bestehende Wissensquellen dort bleiben können, wo sie sind, während Livariant sie als **provenienzbewusste externe Evidenz** nutzt, ohne sie still in kanonische Project Truth umzuwandeln.

## Welches Problem Livariant angeht

Livariant soll projektweite KI-Fehlermuster reduzieren, zum Beispiel:

- Kontextverlust zwischen Chats und Sessions;
- vergessene oder ersetzte Architekturentscheidungen;
- halluzinierte oder veraltete Projektfakten, die zu dauerhaften Annahmen werden;
- unterschiedliche Agenten mit unterschiedlichen Versionen der Projektwirklichkeit;
- Architekturdrift durch viele einzeln vernünftig wirkende Änderungen;
- nicht vertrauenswürdiger Repository- oder externer Kontext, der Agenten beeinflusst;
- Verwechslung von technischer Fähigkeit mit Nutzerautorisierung;
- unterbrochene Updates oder Migrationen mit unklarem Zustand;
- Agenten, die Arbeit ohne ausreichende Verifikation als fertig melden;
- persistierter KI-Zustand, der einen früheren Fehler verstärkt;
- wiederholte Fehler, die das Projekt immer wieder neu macht.

Livariant behauptet **nicht**, Halluzinationen, Bugs, Prompt Injection oder falsches Denken im Modell selbst zu eliminieren.

Das Ziel ist ein anderes:

> **Das Softwareprojekt soll kohärent, nachvollziehbar, wiederherstellbar und kontrolliert bleiben, auch wenn einzelne KI-Agenten Fehler machen.**

## Projekt-eigene Kontinuität

Livariant führt lokal ein **Project Brain**:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Damit besitzt das Projekt einen dauerhaften Zustand, der nicht einem einzelnen Chat oder KI-Provider gehört.

Ein kopierter Satz, ein zurückgegebenes KI-Ergebnis, ein veraltetes Kontextpaket, eine externe Notiz oder eine rekonstruierte Zusammenfassung wird nicht automatisch vertrauenswürdiger Projektzustand, nur weil es existiert.

## Active Project Intelligence

Die veröffentlichte `v0.1.0-rc.3` Foundation Preview hat die ursprüngliche projekt-eigene Kontinuitäts- und Lifecycle-Basis geschaffen.

Das Repository ist inzwischen deutlich weiter. Der aktuelle `main` enthält Post-RC3-Funktionen aus dem Bereich **Active Project Intelligence**, darunter:

- kohärente Project-Context-Snapshots;
- semantische Änderungsvorschläge;
- Konflikt-/Drift-Bewertung;
- providerbezogene Kontext-Erzeugung;
- Provider-Return-Intake als nicht vertrauenswürdige Evidenz;
- proposal-gebundene Authorization- und Semantic-Apply-Pfade;
- providerneutrale Semantic-Maintenance-Komposition;
- lokale MCP-Grundlagen und native Setup-Unterstützung für kompatible Agent-Umgebungen;
- read-only Projekt-Discovery;
- geführtes Projektverständnis mit kontrollierter Übernahme;
- eine External-Knowledge-Source-Foundation;
- First-Run-Komposition;
- Autonomy Profiles.

Repräsentative Oberflächen sind:

```bash
livariant context
livariant propose --input candidate.json
livariant drift --input observation.json
livariant provider-context --provider claude-code --task task.txt
livariant provider-return --context provider-context.json --input provider-return.json
livariant maintain --input candidate.json
livariant mcp
livariant discover
livariant understand
livariant adopt-understanding
livariant external-source
livariant first-run
livariant autonomy
```

Die Architekturregel bleibt dabei gleich: **KI-/Provider-Ausgabe ist Evidenz oder Projektion, bis sie einen ausdrücklich unterstützten Authority-Pfad durchläuft.**

## Bestehende Projekte zuerst

Livariant verlangt kein spezielles Projekt-Template. Es ist für bestehende Softwareprojekte gedacht.

Die Übernahme folgt einem preservation-first Modell:

```text
prüfen
-> entdecken
-> verstehen
-> reviewen
-> bewusst übernehmen
```

Livariant soll ein bestehendes Projekt nicht still umschreiben, nur weil eine KI glaubt, das Repository verstanden zu haben.

## Externes Wissen

Livariant besitzt bereits eine Grundlage, um externes Wissen als getrennte Evidenzquelle zu behandeln.

Das Zielmodell ist:

```text
Obsidian / Markdown / andere Wissensquelle
        ↓
read-only Source Adapter
        ↓
provenienzbewusste Evidenz
        ↓
Retrieval / Understanding
        ↓
Review
        ↓
kontrollierte Übernahme, wenn etwas Project Truth werden soll
```

Externes Wissen bleibt externes Wissen. Künftige Retrieval-, Relationship-, Graph- und Token-Effizienz-Funktionen sollen auf expliziter Provenienz und Freshness-Semantik aufbauen, statt versteckte zweite Wahrheitsspeicher zu erzeugen.

## Autorität und sichere Änderungen

Eine der zentralen Livariant-Regeln lautet:

> **Etwas tun zu können bedeutet nicht, es tun zu dürfen.**

Livariant trennt:

```text
Prüfen
   ↓
Verstehen
   ↓
Vorschlagen
   ↓
Autorisieren
   ↓
Ändern
   ↓
Verifizieren
```

Das wird umso wichtiger, je mehr Coding-Agenten auf Dateisystem, Shell, Git, Netzwerk oder Deployment-Systeme zugreifen können.

## Self-Integrity

Livariant wendet seine eigene Philosophie auch auf sich selbst an.

Ein System, das KI-Fehler eindämmen soll, darf dieselben Fehler nicht schleichend in seinem eigenen Gedächtnis, seiner abgeleiteten Intelligenz, seinem Authority-Modell oder Agent-Handoffs institutionalisieren.

Langfristige Integritätsrisiken sind beispielsweise:

```text
Halluzination -> dauerhafter Zustand
veraltete Information -> aktuelle Wahrheit
KI-Inferenz -> Autorität
verlustbehaftete Zusammenfassung -> akzeptierter Projektglaube
falscher persistenter Zustand -> wiederholtes Retrieval -> scheinbare Gewissheit
abgeleiteter Graph/Index -> versteckte zweite Wahrheit
agentenveränderte Guardrail -> schwächere zukünftige Absicherung
```

Wo praktikabel, sollen kritische Invarianten durch deterministische Software und explizite Zustandsübergänge erzwungen werden, statt darauf zu vertrauen, dass ein KI-Modell eine Regel korrekt erinnert.

## Guardian-Authority-Hardening

Der aktuelle `main` enthält inzwischen die nach RC3 eingeführte geschützte Guardian-Trust-Root-Foundation.

Der nächste Hardening-Schritt migriert entscheidende Trust-Consumer auf Guardian-origin Authority, damit normal nutzerbeschreibbare Records nicht länger als unabhängige harte Autorität gelten.

Diese Migration befindet sich **noch in aktiver Entwicklung und Acceptance**. Sie ist noch kein abgeschlossenes Release-Versprechen.

Repository-Existenz ist daher nicht dasselbe wie Release-Qualifikation.

## Veröffentlichtes Release vs. aktuelle Entwicklung

### Veröffentlichtes Release

`v0.1.0-rc.3` ist die unveränderliche **Foundation Preview**.

### Aktueller Repository-`main`

Enthält umfangreiche Post-RC3-Funktionen sowie zusätzliche Guardian-/Self-Integrity-Härtung, die nicht Teil von RC3 sind.

### Aktive Entwicklung

Weitere Guardian-Consumer-Migration und Self-Integrity-Remediation werden noch implementiert und adversarial geprüft, bevor daraus der nächste qualifizierte Release wird.

### Nächster qualifizierter Release

Erhält eine eigene Exact-Candidate-CI-/Security-Qualifikation, einen releaseweiten Review und eine ausdrückliche Release-Autorisierung.

## Fünf-Minuten-Start mit der Foundation Preview

Voraussetzungen:

- Node.js 20 oder neuer;
- ein lokales Softwareprojekt;
- das offizielle `v0.1.0-rc.3`-Release-Artefakt.

Installiere Livariant als Rechner-/Benutzer-Tool und nicht als normale Anwendungsabhängigkeit:

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.3.tgz
livariant version
```

Im Projekt:

```bash
livariant status
livariant doctor
livariant init
```

Um später den aktuellen Project-Brain-Kontext zu rekonstruieren:

```bash
livariant resume
```

Für den vollständigen unterstützten Release-Workflow:

- [Installation & erstes Projekt](docs/de/installation.md)
- [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
- [Leitfaden für bestehende Projekte](docs/de/existing-projects.md)

## Local-first als Standard

Der aktuelle Livariant-Betrieb ist local-first ausgelegt:

- kein Livariant-Cloud-Konto für normale lokale Nutzung erforderlich;
- kein automatischer Upload des Project Brain;
- keine Livariant-Nutzungstelemetrie in der aktuellen Runtime;
- kein automatischer Remote-Update-Check.

Wenn Projektkontext an einen externen KI-Provider gesendet wird, gelten dessen eigene Bedingungen, Aufbewahrungseinstellungen und Sicherheitsmodelle.

Mehr unter [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md).

## Updates, Lifecycle und Recovery

Livariant behandelt Software-Lifecycle-Operationen getrennt von normalen Projektkontext-Änderungen.

Update, Migration, Runtime-Aktivierung, Recovery, Release-Identität, Artefaktintegrität und Autorisierung sind unterschiedliche Anliegen.

Das Projekt wurde bereits gezielt gegen unterbrochene Migrationen, Recovery-Checkpoint-Substitution, stranded Lifecycle State, Runtime Trust, Release-Artefaktidentität, Windows-Shell-Ausführung, stale Semantic Baselines und proposal-gebundene Autorisierung gehärtet.

Die aktuelle Guardian-Arbeit stärkt die unabhängige Authority-Grenze weiter.

Mehr unter [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md) und [Architektur & Sicherheit](docs/de/architecture-and-safety.md).

## Wohin Livariant geht

Livariants langfristige Richtung ist nicht einfach „mehr Kontext speichern“. Die Architektur entwickelt sich um sechs miteinander verbundene Säulen:

- **Memory** — validierte Projekterfahrung über Agenten und Sessions hinweg bewahren.
- **Epistemics** — wissen, warum das Projekt etwas glaubt, woher es stammt und ob es aktuell, abgeleitet, stale oder umstritten ist.
- **Relationships** — relevante Abhängigkeiten zwischen Entscheidungen, Requirements, Komponenten, Evidenz und Änderungen darstellen.
- **Governance** — Fähigkeit, Autorität, Risiko und irreversible Aktionen getrennt halten.
- **Verification** — Completion- und Safety-Claims auf Evidenz statt Agenten-Selbstvertrauen stützen.
- **Learning** — validierte Fehler in dauerhaftes Projektwissen und Regression-Schutz verwandeln.

Künftige Funktionen wie tiefere External-Knowledge-Integration, graphgestütztes Retrieval, Context-Budget-Optimierung, Change-Impact-Analyse, risk-adaptive Autonomy und Multi-Agent-Koordination sollen erst dann auf diesen Fundamenten aufbauen, wenn ihre Voraussetzungen und ein realer Produktbedarf gegeben sind.

## Warum das wichtig ist

KI-Entwicklungstools werden immer besser darin, Software zu erzeugen und zu verändern. Damit kann aber auch eine falsche Annahme einen größeren Blast Radius bekommen.

Livariant folgt der Idee, dass ernsthafte KI-gestützte Entwicklung etwas braucht zwischen:

```text
"Das Modell hat das vorgeschlagen"
```

und:

```text
"Das Projekt glaubt das jetzt und handelt danach"
```

Diese Schicht soll Kontext erhalten, Annahmen hinterfragen, Autorität begrenzen, Änderungen verifizieren, Historie bewahren und dem Projekt helfen, aus früheren Fehlern zu lernen.

Für ein Hobbyprojekt kann das weniger verwirrende Neustarts und weniger versehentliche Fehler bedeuten. Für professionelle Software können dieselben Prinzipien stärkere Nachvollziehbarkeit, Governance, Sicherheit und Release-Vertrauen schaffen.

## Dokumentation

Starte hier:

1. [Installation & erstes Projekt](docs/de/installation.md)
2. [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
3. [Leitfaden für bestehende Projekte](docs/de/existing-projects.md)
4. [Provider-Handoff](docs/de/provider-handoff.md)
5. [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md)

Für tiefere Details:

- [Architektur & Sicherheit](docs/de/architecture-and-safety.md)
- [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md)
- [Public-Preview-Umfang & Einschränkungen](docs/de/preview-scope.md)
- [Public-Preview-Support & Stabilität](docs/de/preview-support-and-stability.md)
- [Lizenz, Gewährleistung & Haftung](docs/de/license-and-warranty.md)

Die englische Dokumentation beginnt unter [README.md](README.md).

## Lizenz, Sicherheit und Beiträge

Livariant ist source-available und kein OSI-zertifiziertes Open-Source-Projekt. Es steht unter der [PolyForm Perimeter License 1.0.1](LICENSE).

Veröffentliche vermutete Sicherheitslücken nicht als öffentliches Issue. Folge stattdessen [SECURITY.md](SECURITY.md).

Externe Code-Beiträge sind derzeit eingeschränkt, solange Contributor-Rechte passend zum source-available und zukünftigen kommerziellen Lizenzmodell finalisiert werden. Bugreports, Dokumentationsfeedback, Fragen und Design-Diskussionen sind willkommen.

- [Lizenzierung](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

> **Livariant braucht keine perfekte KI. Das Projekt muss vertrauenswürdig bleiben, wenn die KI es nicht ist.**
