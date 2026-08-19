<img width="1857" height="738" alt="image" src="https://github.com/user-attachments/assets/87f45255-c7b2-4326-ad0c-209562df5ee9" />

<p align="center">
  <a href="README.md">English</a> · <strong>Deutsch</strong>
</p>

<p align="center">
  <a href="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/Kryt3r/livariant/releases/tag/v0.1.0-rc.3"><img alt="Release" src="https://img.shields.io/badge/release-v0.1.0--rc.3-0ea5e9" /></a>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-%E2%89%A520-339933?logo=nodedotjs&logoColor=white" />
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-PolyForm%20Perimeter-7c3aed" /></a>
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-default-06b6d4" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-supported-a855f7" />
</p>

# Livariant

**KI-Coding-Agenten können falsch liegen. Livariant verhindert, dass falsche Annahmen unbemerkt zur Projektwahrheit werden.**

**Bewahre, was wahr ist. Kontrolliere, was sich ändert. Stelle wieder her, wenn etwas schiefläuft.**

Coding-Agenten sind mächtig, können aber Kontext verlieren, auf veralteten Annahmen handeln, früheren Entscheidungen widersprechen, Arbeit zu früh als fertig erklären oder aus einer plausiblen Inferenz einen dauerhaften Projektfehler machen.

Livariant versucht nicht, ein einzelnes Modell unfehlbar zu machen. Es gibt dem **Projekt selbst** dauerhafte Wahrheit, explizite Authority-Grenzen, Verifikationsevidenz und Recovery-Semantik, die einzelne Chats, Agenten, Tools und Provider überdauern.

> **Die KI darf falsch liegen. Dein Projekt sollte den Fehler nicht automatisch übernehmen.**

## Das Problem an einem Beispiel

Stell dir Folgendes vor:

```text
Montag
Du und ein Coding-Agent akzeptieren Architekturentscheidung A.
Die Entscheidung wird dauerhafter Projektzustand.

Freitag
Ein anderer Agent startet mit veraltetem Kontext und schlägt überzeugt B vor.
B wirkt lokal vernünftig, widerspricht aber der akzeptierten Entscheidung.
```

Ohne eine projekt-eigene Zuverlässigkeitsschicht kann die veraltete Annahme leicht zur nächsten Änderung, zur nächsten Zusammenfassung, zum nächsten persistenten Memory-Eintrag und schließlich zur scheinbar neuen Realität des Projekts werden.

Livariant wird dafür gebaut, diese Schritte voneinander zu trennen:

```text
Agent-Ausgabe
   ↓
Evidenz
   ↓
aktuelle Project Truth + Provenienz + Freshness
   ↓
Konflikt- / Drift-Bewertung
   ↓
Vorschlag
   ↓
Autorisierung
   ↓
Änderung
   ↓
Verifikation
   ↓
Dauerhafter Projektzustand
```

Eine nützliche KI-Antwort ist nicht automatisch aktuelle Wahrheit. Eine technisch mögliche Aktion ist nicht automatisch autorisiert. Ein persistierter Record ist nicht automatisch vertrauenswürdig.

## Was Livariant konkret macht

Livariant sitzt zwischen KI-gestützter Entwicklung und dem dauerhaften Zustand deines Softwareprojekts.

Es ist um vier praktische Verantwortungsbereiche herum aufgebaut:

- **Wahrheit** - projekt-eigene Ziele, Entscheidungen, Wissen, Provenienz und aktuellen Kontext bewahren, statt sich auf einen einzelnen Chat oder Provider-Memory zu verlassen.
- **Authority** - technische Fähigkeit davon trennen, ob ein Vorschlag tatsächlich zu einer folgenreichen Projektänderung werden darf.
- **Verifikation** - Completion-, Integritäts-, Lifecycle- und Änderungsclaims auf Evidenz statt auf Agenten-Selbstvertrauen stützen.
- **Recovery** - verhindern, dass Updates, Migrationen, Runtime-Aktivierung oder unterbrochene Operationen das Projekt still in einem unklaren Zustand zurücklassen.

Der unterstützte semantische Flow auf dem aktuellen `main` umfasst außerdem Konflikt-/Drift-Bewertung, Provider-Return-Intake als nicht vertrauenswürdige Evidenz, proposal-gebundene Autorisierung, kontrollierte Semantic-Apply-Pfade, geführtes Projektverständnis, MCP-Grundlagen, External-Knowledge-Source-Grundlagen, First-Run-Komposition und Autonomy Profiles.

## Wo Livariant einzuordnen ist

Livariant versucht nicht, jedes Tool zu ersetzen, das ein KI-Coding-Agent verwenden kann.

Unterschiedliche Ebenen beantworten unterschiedliche Fragen:

```text
Repository Intelligence
"Wo sollte der Agent hinschauen?"

Memory / Second Brain
"Was sollte der Agent erinnern?"

Livariant
"Was vertraut das Projekt tatsächlich,
 was darf sich ändern
 und wie wird diese Änderung verifiziert oder wiederhergestellt?"
```

Repository-Indizes, Code-Graphen, Suchwerkzeuge, externe Wissenssysteme und Provider-Memory lösen benachbarte Probleme und können einem KI-Workflow nützliche Informationen liefern. Livariants Architekturgrenze lautet: **Wenn abgeleitete oder gefundene Information in einen von Livariant gesteuerten Flow gelangt, darf sie nicht still zu kanonischer Project Truth werden.**

Deshalb gelten die Kernregeln:

```text
Evidenz != Wahrheit
Fähigkeit != Autorität
Vorschlag != Autorisierung
Persistenz != Vertrauen
Vorhandensein != Aktualität
Abgeleiteter Zustand != kanonischer Zustand
Unklarer Zustand -> Fail Closed
```

## Die veröffentlichte Foundation Preview ausprobieren

`v0.1.0-rc.3` ist die unveränderliche **Foundation Preview**. Sie zeigt die ursprüngliche projekt-eigene Kontinuitäts- und Lifecycle-Basis.

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

Später lässt sich der aktuelle Project-Brain-Kontext rekonstruieren mit:

```bash
livariant resume
```

Für den vollständigen unterstützten Release-Workflow:

- [Installation & erstes Projekt](docs/de/installation.md)
- [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
- [Leitfaden für bestehende Projekte](docs/de/existing-projects.md)

## Der aktuelle `main` geht deutlich über RC3 hinaus

Das öffentliche Repository ist inzwischen deutlich weiter als die Foundation Preview.

Der aktuelle `main` enthält Post-RC3-Funktionen aus dem Bereich Active Project Intelligence, darunter:

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
- Autonomy Profiles;
- geschützte Guardian-origin Authority für folgenschwere Trust-Consumer auf dem aktuellen `main`.

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

Repository-Existenz ist nicht dasselbe wie Release-Qualifikation. Diese Post-RC3-Funktionen sind nicht Teil des veröffentlichten RC3-Artefakts.

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

## Authority und sichere Änderungen

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

Der aktuelle `main` enthält Guardian-origin geschützte Authority für folgenschwere Consumer, darunter semantische Änderungsautorisierung, Project-Brain-Integritätsakzeptanz/-schutz, Runtime Trust und Release Authorization.

Diese Migrationen bestanden die fokussierte Pre-Merge-Acceptance sowie die vorgeschriebene Canonical-main-Post-Merge-Class-D-/Security-Qualifikation. Der Guardian-/S-03-Remediation-Block ist damit innerhalb des akzeptierten WP-023-Threat-Scope vollständig geschlossen. Das ist eine Aussage über den aktuellen Entwicklungsstand und erweitert nicht rückwirkend den veröffentlichten RC3-Funktionsumfang.

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

## Externes Wissen bleibt extern, bis es bewusst übernommen wird

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

## Self-Integrity

Livariant wendet seine eigene Philosophie auch auf sich selbst an.

Ein System, das KI-Fehler eindämmen soll, darf dieselben Fehler nicht schleichend in seinem eigenen Gedächtnis, seiner abgeleiteten Intelligenz, seinem Authority-Modell oder Agent-Handoffs institutionalisieren.

Integritätsrisiken sind beispielsweise:

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

## Veröffentlichtes Release vs. aktuelle Entwicklung

### Veröffentlichtes Release

`v0.1.0-rc.3` ist die unveränderliche **Foundation Preview**.

### Aktueller Repository-`main`

Enthält umfangreiche Post-RC3-Active-Project-Intelligence-Funktionen sowie zusätzliche Guardian-/Self-Integrity-Härtung, die nicht Teil von RC3 sind.

### Aktueller Guardian-Qualifikationsstatus

Die folgenschweren Guardian-Consumer-Migrationen sind auf `main` gemergt und haben sowohl ihre fokussierte Pre-Merge-Acceptance als auch die erforderliche Canonical-main-Post-Merge-Class-D-/Security-Verifikation bestanden. Der zugehörige Guardian-/Self-Integrity-Remediation-Block ist innerhalb des akzeptierten WP-023-Threat-Scope vollständig geschlossen.

### Nächster qualifizierter Release

Erhält eine eigene Exact-Candidate-CI-/Security-Qualifikation, einen releaseweiten Review und eine ausdrückliche Release-Autorisierung.

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

Mehr unter [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md) und [Architektur & Sicherheit](docs/de/architecture-and-safety.md).

## Wohin Livariant geht

Livariants langfristige Richtung ist nicht einfach "mehr Kontext speichern". Die Architektur entwickelt sich um sechs miteinander verbundene Säulen:

- **Memory** - validierte Projekterfahrung über Agenten und Sessions hinweg bewahren.
- **Epistemics** - wissen, warum das Projekt etwas glaubt, woher es stammt und ob es aktuell, abgeleitet, stale oder umstritten ist.
- **Relationships** - relevante Abhängigkeiten zwischen Entscheidungen, Requirements, Komponenten, Evidenz und Änderungen darstellen.
- **Governance** - Fähigkeit, Authority, Risiko und irreversible Aktionen getrennt halten.
- **Verification** - Completion- und Safety-Claims auf Evidenz statt Agenten-Selbstvertrauen stützen.
- **Learning** - validierte Fehler in dauerhaftes Projektwissen und Regression-Schutz verwandeln.

Künftige Funktionen wie tiefere External-Knowledge-Integration, graphgestütztes Retrieval, Context-Budget-Optimierung, Change-Impact-Analyse, risk-adaptive Autonomy und Multi-Agent-Koordination sollen erst dann auf diesen Fundamenten aufbauen, wenn ihre Voraussetzungen und ein realer Produktbedarf gegeben sind.

Die strategische Grenze bleibt dieselbe: **Intelligenz kann aus vielen Tools kommen; Project Truth und folgenschwere Authority müssen explizit bleiben.**

## Dokumentation

Hier starten:

1. [Installation & erstes Projekt](docs/de/installation.md)
2. [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
3. [Leitfaden für bestehende Projekte](docs/de/existing-projects.md)
4. [Provider-Handoff](docs/de/provider-handoff.md)
5. [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md)

Tiefere Referenzen:

- [Architektur & Sicherheit](docs/de/architecture-and-safety.md)
- [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md)
- [Public-Preview-Umfang & Grenzen](docs/de/preview-scope.md)
- [Public-Preview-Support & Stabilität](docs/de/preview-support-and-stability.md)
- [Lizenz, Gewährleistung & Haftung](docs/de/license-and-warranty.md)

Die englische Dokumentation beginnt bei [README.md](README.md).

## Lizenzierung, Sicherheit und Beiträge

Livariant ist source-available und kein OSI-anerkanntes Open-Source-Projekt. Es steht unter der [PolyForm Perimeter License 1.0.1](LICENSE).

Veröffentliche vermutete Sicherheitslücken nicht in einem öffentlichen Issue. Folge [SECURITY.md](SECURITY.md).

Externe Code-Beiträge sind derzeit eingeschränkt, während Contributor-Rights-Bedingungen für das source-available und künftige kommerzielle Lizenzmodell finalisiert werden. Bugreports, Dokumentationsfeedback, Fragen und Design-Diskussionen sind willkommen.

- [Lizenzierung](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

> **Livariant braucht keine perfekte KI. Es braucht ein Projekt, das vertrauenswürdig bleibt, wenn die KI es nicht ist.**