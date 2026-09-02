<img width="1857" height="738" alt="image" src="https://github.com/user-attachments/assets/87f45255-c7b2-4326-ad0c-209562df5ee9" />

<p align="center">
  <a href="README.md">English</a> · <strong>Deutsch</strong>
</p>

<p align="center">
  <a href="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Kryt3r/livariant/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/Kryt3r/livariant/releases/tag/v0.1.0-rc.4"><img alt="CLI Public Preview" src="https://img.shields.io/badge/CLI%20preview-v0.1.0--rc.4-0ea5e9" /></a>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-%E2%89%A520-339933?logo=nodedotjs&logoColor=white" />
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-PolyForm%20Perimeter-7c3aed" /></a>
  <img alt="Local-first" src="https://img.shields.io/badge/local--first-default-06b6d4" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-supported-a855f7" />
</p>

# Livariant

**KI-Coding-Agenten können falsch liegen. Livariant verhindert, dass ihre Fehler unbemerkt zur Projektwahrheit werden.**

**Bewahre, was wahr ist. Kontrolliere, was sich ändert. Verifiziere, was tatsächlich belegt ist. Stelle wieder her, wenn etwas schiefläuft.**

Coding-Agenten können Kontext verlieren, mit veralteten Annahmen arbeiten, früheren Entscheidungen widersprechen, Arbeit zu früh als fertig erklären oder aus plausiblen Inferenzfehlern dauerhafte Projektfehler machen. Livariant versucht nicht, ein einzelnes Modell unfehlbar zu machen. Es gibt dem **Projekt selbst** dauerhafte Wahrheit, explizite Authority-Grenzen, Verification Evidence und Recovery-Semantik, die einzelne Chats, Agenten, Tools und Provider überdauern.

> **Die KI darf falsch liegen. Dein Projekt sollte den Fehler nicht automatisch übernehmen.**

## Die Kernidee

Livariant sitzt zwischen KI-gestützter Entwicklung und dauerhaftem Projektzustand:

```text
KI / Coding-Agent
      ↓
Evidenz und begrenzter Kontext
      ↓
Livariant
      ↓
Project Truth / Verification / Authority / Recovery-Grenzen
      ↓
Dauerhafter Projektzustand
```

Dauerhafte Regeln sind unter anderem:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Verification Evidence != akzeptierte Completion
Persistence != Trust
Presence != Currency
Mehrdeutiger folgenreicher Zustand -> Fail Closed
```

## Wie sich die Nutzung entwickeln soll

Die aktuelle Entwicklung ist auf einen **agent-nativen** Workflow ausgerichtet und nicht auf einen command-lastigen Alltag.

Für einen frischen unterstützten Rechner ist der remediated First-Use-Pfad bewusst gestuft:

```text
exakte qualifizierte Release-Artefakte verifizieren
-> normale Livariant-CLI installieren
-> geschütztes Stage-A-Release-Material provisionieren
-> Guardian aus geschützten Stage-B-Bytes bootstrappen
-> Guardian Readiness verifizieren
-> Projekt öffnen
-> livariant first-run
-> bei Bedarf bewusst initialisieren
-> Claude Code oder Codex explizit über MCP verbinden
-> normal mit dem Coding-Agenten arbeiten
```

Normale globale CLI und geschützte Guardian-Bootstrap-Quelle besitzen getrennte Trust-Rollen. Die CLI bleibt wichtig für Setup, Diagnose, direkte Inspektion, explizite Kontrolle und providerunabhängige Abläufe, wird aber nicht allein deshalb zum Root of Trust, weil sie global installiert ist.

Nach Verbindung eines MCP-fähigen Coding-Agenten muss der Nutzer **nicht** in jede normale Interaktion einen Livariant-Command schreiben. Zum Beispiel kann er den Coding-Agenten einfach bitten, ein Feature zu implementieren und anschließend zu prüfen, ob die angeforderten Ergebnisse wirklich belegt sind. Der Agent kann Livariant über MCP aufrufen und das Ergebnis im normalen Gespräch zurückgeben.

## Der aktuelle Reliability-Moment

Die aktuelle Entwicklung stellt ein read-only MCP-Tool bereit:

`livariant_verification_trace`

Es bewertet explizite Anforderungen oder Acceptance Criteria, Implementierungsclaims und bereitgestellte Verification Evidence mit derselben deterministischen Verification-Trace-Semantik wie Core-/CLI-Assessor.

Konzeptionell:

```text
Anforderung / Acceptance Criterion
        +
Implementierungsclaim
        +
Verification Evidence
        ↓
Livariant
        ↓
SUPPORTED / CONTRADICTED / UNPROVEN
```

Beispiel:

```text
E-Mail-Login ......... SUPPORTED
Passwort-Reset ....... UNPROVEN
Rate Limiting ........ CONTRADICTED
```

Das ist absichtlich strenger als ein bloßes "fertig" des Agenten.

Wichtige Grenzen bleiben:

```text
SUPPORTED != DONE
Verification Evidence != akzeptierte Completion
Agent-Evidenz != unabhängiges Vertrauen
MCP-Transport != Authority
```

Livariant entdeckt aktuell **nicht** automatisch jede Anforderung, erzeugt nicht automatisch vertrauenswürdige Evidenz, verifiziert nicht universell beliebigen Code und erkennt nicht jeden falschen DONE-Claim ohne explizites Trace-/Evidenzmaterial.

Mehr unter [Verification Trace](docs/de/verification-trace.md).

## First Run

Der geführte Einstieg ist:

```bash
livariant first-run
```

Die aktuelle First-Run-Grundlage ist zustandsbewusst über Projektzustand und geschützte Maschinen-Readiness. Sie kann kombinieren:

- EN/DE-Interaktionslokalisierung;
- read-only Project Discovery;
- Project-Brain-Initialisierungsbewertung;
- Protected-Bootstrap-/Guardian-Readiness;
- Wahl eines Autonomy Profiles;
- optionale External-Knowledge-Evidenz;
- Guided Project Understanding Review;
- optionale Claude-Code-/Codex-MCP-Setup-Hinweise.

First Run bleibt read-only. Er initialisiert das Projekt nicht still, konfiguriert keinen Provider automatisch, übernimmt keine Evidenz, persistiert kein Autonomy Profile, provisioniert keinen Guardian-State und vergibt keine Authority. Fehlen geschützte Maschinenvoraussetzungen oder sind sie unsicher, darf er nicht direkt zu Lifecycle-Autorisierung/-Anwendung führen.

Mehr unter [First-Run-Komposition](docs/de/first-run.md).

## MCP-Verbindung

Livariant zu installieren und einen Coding-Agenten zu verbinden sind getrennte Vorgänge.

Livariant kann provider-native Setup-Hinweise erzeugen:

```bash
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
```

Diese Befehle führen selbst **null Provider-Konfigurationsänderungen** aus. Sie zeigen, wie Livariant über die jeweilige MCP-Konfigurationsoberfläche registriert wird.

Nach der Verbindung kann der MCP-Agent aktuelle begrenzte Tools erkennen, darunter:

- `livariant_provider_context`;
- `livariant_provider_return`;
- `livariant_verification_trace`.

Die MCP-Bridge erzeugt oder konsumiert keine Mutation Authority und macht Agent-Ausgabe nicht automatisch zu Project Truth, nur weil sie über MCP eintrifft.

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

Damit besitzt das Projekt dauerhaften Zustand, der nicht einem einzelnen Chat oder KI-Provider gehört. Ein kopierter Satz, ein KI-Ergebnis, ein veraltetes Kontextpaket, eine externe Notiz oder eine rekonstruierte Zusammenfassung wird nicht automatisch vertrauenswürdiger Projektzustand, nur weil es existiert.

## Authority und sichere Änderungen

Eine zentrale Regel lautet:

> **Etwas tun zu können bedeutet nicht, es tun zu dürfen.**

Livariant trennt:

```text
Prüfen
-> Verstehen
-> Vorschlagen
-> Autorisieren
-> Ändern
-> Verifizieren
```

Die aktuelle Entwicklung enthält geschützte Guardian-origin Authority für folgenschwere Consumer, darunter semantische Änderungsautorisierung, Project-Brain-Integritätsschutz, Runtime Trust und Release Authorization.

## Bestehende Projekte zuerst

Livariant arbeitet preservation-first und benötigt kein spezielles Projekt-Template.

```text
prüfen
-> entdecken
-> verstehen
-> reviewen
-> bewusst übernehmen
```

Bestehende Projektdateien, Provider-Instruktionen, externe Notizen und KI-Ausgabe dürfen kanonische Project Truth nicht still neu definieren.

## Externes Wissen bleibt extern, bis es bewusst übernommen wird

Die aktuelle Entwicklung enthält eine Grundlage, um unterstützte externe Text-/Markdown-Wissensquellen als getrennte provenienzbewusste Evidenz zu behandeln.

```text
externes Wissen
-> read-only Adapter
-> Evidenz
-> Understanding / Review
-> kontrollierte Übernahme, wenn etwas Project Truth werden soll
```

Künftige Retrieval-, Relationship-, Graph- und Token-Effizienz-Arbeit soll auf diesen expliziten Provenienz-/Freshness-Grenzen aufbauen, statt versteckte zweite Wahrheitsspeicher zu erzeugen.

## Veröffentlichte Previews und aktuelle Entwicklung

Livariant besitzt aktuell **unabhängig versionierte Produktoberflächen**. Root-/Core-Paketidentität und Desktop-Preview-Identität müssen bewusst nicht dieselbe RC-Nummer tragen.

### Aktuelles veröffentlichtes Desktop Preview

Das kanonisch veröffentlichte Desktop Preview ist `0.1.0-rc.17`, gebaut aus dem exakten Quellstand `6214bfe2318dc5c0dc4ae0b949146451ad4d20f6` und über den updater-first Windows-Pfad akzeptiert.

Die Desktop-Identität auf dem aktuellen kanonischen `main` ist `0.1.0-rc.18`. **rc.18 ist noch nicht veröffentlicht.** Es dient der finalen Installed-Windows-Dogfood-Abnahme der aktiven Diagnostics-&-Efficiency-Measurement-Foundation-Arbeit, bevor dieses Work Package geschlossen werden kann.

### Historisches CLI Public Preview

`v0.1.0-rc.4` bleibt ein unveränderliches veröffentlichtes **CLI Public Preview**. Es enthält den agent-nativen First-Run-/MCP-Workflow, Verification Trace, Active-Project-Intelligence-Grundlagen, External-Knowledge-Grundlagen, Autonomy Profiles sowie die Guardian-/Self-Integrity-Enforcement-Logik des qualifizierten RC4-Quellstands.

RC4 wurde aus dem exakten Quellstand `4f547751d9d53e7325e6ea1f2401f1dea45779dc` qualifiziert. Der SHA-256 des installierbaren CLI-Artefakts lautet `6a8a287e55344e22c97c543cb4a9e071d27d9e18c5ff585cab8235aaa37dce8e`.

> [!WARNING]
> Echtes Windows-Fresh-Install-Dogfooding hat gezeigt, dass die veröffentlichte RC4-Distribution die geschützte Stage-A-Bootstrap-Quelle, die vor Guardian-gestützter First-Project-Lifecycle-Autorisierung erforderlich ist, **nicht** enthält/provisioniert. Eine Installation nur der RC4-`.tgz` liefert deshalb keinen vollständigen sicheren Fresh-Machine -> First-Project-Pfad. Umgehe das nicht, indem du requester-controlled Paketdateien manuell in geschützte Systempfade kopierst. Siehe [Installation & erstes Projekt](docs/de/installation.md).

Spätere Repository-Arbeit verändert RC4 nicht rückwirkend.

### Historisches RC3 Foundation Preview

`v0.1.0-rc.3` bleibt unveränderliche historische Foundation-Preview-Evidenz. Spätere Fähigkeiten wurden dem RC3-Artefakt nicht rückwirkend hinzugefügt.

### Aktueller Repository-`main`

Der kanonische Produkt-`main` ist zum Zeitpunkt dieser Dokumentationsabstimmung `e121edfe84061208ac5d1e3568a2c0c6c4ec3749`.

Auf diesem Quellstand gilt:

- Desktop-Identität ist `0.1.0-rc.18`;
- Root-/Core-Paketidentität bleibt bewusst unabhängig versioniert bei `0.1.0-rc.12`;
- rc.18 wurde weder getaggt noch veröffentlicht oder über den Updater sichtbar gemacht;
- bloße Repository-Existenz darf niemals als Release-Veröffentlichung behandelt werden.

### Aktive Entwicklung

Das aktive Produkt-Work-Package ist **WP-047 — Diagnostics & Efficiency Measurement Foundation**. Die begrenzte Implementierung ist gemergt; zum Abschluss fehlt weiterhin Installed-Windows-Dogfood-Evidence für reale beobachtete Nutzung, Periodenverhalten, dauerhafte Zähler, wahrheitsgemäße fehlende Werte, Attribution und den Berechnungs-/Erklärungspfad.

Der unmittelbar release-sensitive Pfad bleibt gegated: Die CI-Trigger-Härtung muss über ihre eigene ausdrückliche Autorisierungsgrenze qualifiziert und gemergt werden, bevor ein unveröffentlichtes rc.18-Kandidaten-Build erstellt und verifiziert wird. Veröffentlichung bleibt eine separate ausdrückliche Autorisierung.

### Künftige qualifizierte Releases

Ein künftiges Release benötigt weiterhin seine eigene Exact-Candidate-CI-/Security-/Self-Integrity-Qualifikation, bei Bedarf reale Installed-/Fresh-Machine-Evidenz, eine Release-Entscheidung und ausdrückliche Publication Authority.

Keine README-Aussage, kein Merge und kein CI-Ergebnis veröffentlicht automatisch einen Release.

## Local-first als Standard

Der aktuelle Livariant-Betrieb ist local-first ausgelegt:

- kein Livariant-Cloud-Konto für normale lokale Nutzung erforderlich;
- kein automatischer Project-Brain-Upload;
- keine Livariant-Nutzungstelemetrie in der aktuellen Runtime;
- kein automatischer Remote-Update-Check.

Wenn Projektkontext an einen externen KI-Provider gesendet wird, gelten dessen Bedingungen, Aufbewahrungseinstellungen und Sicherheitsmodelle.

Mehr unter [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md).

## Hier starten

Für Installation und aktuellen Entwicklungsstand:

1. [Installation & erstes Projekt](docs/de/installation.md)
2. [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
3. [First-Run-Komposition](docs/de/first-run.md)
4. [Verification Trace](docs/de/verification-trace.md)
5. [Bestehende Projekte](docs/de/existing-projects.md)
6. [Provider-Handoff](docs/de/provider-handoff.md)
7. [Architektur & Sicherheit](docs/de/architecture-and-safety.md)
8. [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md)

Die englische Dokumentation startet bei [README.md](README.md).

## Lizenzierung, Sicherheit und Beiträge

Livariant ist source-available und nicht OSI-zertifiziertes Open Source. Es steht unter der [PolyForm Perimeter License 1.0.1](LICENSE).

Veröffentliche vermutete Schwachstellendetails nicht in einem öffentlichen Issue. Siehe [SECURITY.md](SECURITY.md).

Externe Code-Beiträge sind derzeit eingeschränkt, während passende Contributor-Rights-Regeln für das source-available und zukünftige kommerzielle Lizenzmodell finalisiert werden. Bugreports, Doku-Feedback, Fragen und Designdiskussionen sind willkommen.

- [Lizenzierung](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

> **Livariant braucht keine perfekte KI. Das Projekt muss vertrauenswürdig bleiben, wenn die KI es nicht ist.**
