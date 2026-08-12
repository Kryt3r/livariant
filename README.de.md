<img width="1376" height="682" alt="Livariant | Living software framework for coherent AI-assisted development" src="https://github.com/user-attachments/assets/16f5afee-a10a-4c79-8bc9-89d23135e0e9" />

<p align="center">
  <a href="README.md">English</a> · <strong>Deutsch</strong>
</p>

# Livariant

**Ein Living Software Framework für KI-gestützte Entwicklung, das dem Projekt ein eigenes dauerhaftes Gedächtnis, Entscheidungen, Richtung und Sicherheitsgrenzen gibt.**

KI beim Programmieren verliert viel von ihrem Nutzen, wenn das Projekt nur im aktuellen Chat existiert.

Du triffst mit einem Agenten eine Architekturentscheidung. Eine Woche später schlägt eine neue Sitzung wieder den alten Weg vor. Du erklärst denselben Kontext zum fünften Mal. Claude Code kennt eine Version deines Projekts, Codex eine andere, und wichtige Entscheidungen verschwinden langsam in verteilten Chatverläufen.

Livariant wird dafür gebaut, dass das Projekt selbst zur dauerhaften Quelle für Kontinuität wird und nicht eine einzelne KI-Sitzung.

Der aktuelle Kandidat `0.1.0-rc.3` ist der **Foundation-Preview-Kandidat**. Er stellt den sicheren, projekt-eigenen Kern bereit. Die nächste Schicht soll diesen Kern im normalen Arbeitsalltag deutlich aktiver und intuitiver machen.

## Die Idee in einer Minute

Heute gibt Livariant deinem Projekt ein **Project Brain**:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Darin liegen bestätigte Ziele, Wissen, Entscheidungen, Projektidentität und Lifecycle-Zustand in einer Form, die dem Projekt gehört.

So kann eine spätere KI-Sitzung den aktuellen Projektstand rekonstruieren, ohne von einem alten Chat oder dem Gedächtnis eines einzelnen Providers abhängig zu sein.

Ein einfaches Beispiel:

```text
Montag
Du entscheidest mit Claude Code, dass die Anmeldung nach Ansatz A gebaut wird.
Du hältst die akzeptierte Entscheidung über Livariant fest, nachdem du den Plan geprüft hast.

Freitag
Du startest eine neue Codex-Sitzung.
Livariant rekonstruiert den aktuellen Projektkontext aus dem Project Brain.
Codex kann sehen, dass Ansatz A die aktive Entscheidung ist, ohne den alten Claude-Code-Chat zu brauchen.
```

Der wichtige Punkt ist nicht nur, Text abzulegen. Livariant behandelt Projektwahrheit als verwalteten Zustand. Änderungen werden geplant, bevor sie angewendet werden. Alte Entscheidungen können als Historie erhalten bleiben, wenn sie ersetzt werden. Unklare oder unsichere Zustände werden nicht still geraten.

## Was heute bereits funktioniert

Die Foundation Preview unterstützt schon einen echten wiederholten Arbeitsablauf:

```text
Projekt prüfen
-> Project Brain bewusst initialisieren
-> Ziele, Wissen und Entscheidungen festhalten
-> aktuellen Kontext in einer späteren Sitzung wieder aufnehmen
-> veraltete Entscheidungen ersetzen, ohne Historie zu löschen
-> Probleme diagnostizieren
-> Updates und Recovery über kontrollierte Lifecycle-Pfade ausführen
```

Nützliche Befehle sind:

```bash
livariant status
livariant doctor
livariant init
livariant goals
livariant knowledge
livariant decisions
livariant resume
livariant update
livariant recover
```

Ändernde Operationen sind plan-first. Zum Beispiel:

```bash
livariant decisions add "Passkeys für die Anmeldung verwenden"
```

zeigt zuerst die geplante Änderung. Geschrieben wird erst, wenn du denselben Befehl ausdrücklich mit `--apply` wiederholst.

Die aktuelle Preview enthält außerdem:

- projekt-eigenen kanonischen Zustand statt Provider-Memory als Hauptquelle;
- Resume-Handoff für Claude Code und Codex;
- preservation-first Übernahme bestehender Projekte;
- Entscheidungsverlauf und Supersession;
- Schutz vor konkurrierenden Writes und unsicheren Pfaden bei verwaltetem Wissen;
- gehärtete Grenzen für Update, Migration, Recovery, Runtime-Trust und Release-Authority;
- lokalen Betrieb ohne Livariant-Telemetrie, automatischen Project-Brain-Upload oder verpflichtendes Livariant-Cloud-Konto.

## Wohin Livariant geht

Die Foundation Preview ist bewusst der sichere Kern und nicht das Ende des Produkts.

Die nächste große Schicht ist **Active Project Intelligence**.

Das Ziel ist, Livariant während normaler Arbeit mit einem KI-Coding-Agenten nützlich zu machen, ohne dass du jedes wichtige Projektereignis manuell in einen CLI-Befehl übersetzen musst.

Ein zukünftiger Livariant-unterstützter Ablauf soll eher so aussehen:

```text
Du: "Wir ersetzen Passwort-Login durch Passkeys."

Agent + Livariant:
- erkennt, dass daraus dauerhafte Projektwahrheit entstehen könnte;
- prüft bestehende Ziele, Entscheidungen, Wissen und Begriffe;
- erkennt Konflikte oder betroffene Annahmen;
- erstellt einen semantischen Änderungsvorschlag;
- zeigt, was sich ändern würde und warum;
- wartet auf deine Zustimmung;
- übernimmt die bestätigte Project-Brain-Änderung über Livariant;
- verifiziert anschließend den neuen Zustand.
```

Zu dieser Richtung gehören unter anderem:

- semantische Änderungsvorschläge aus normaler Agent-Arbeit;
- Konflikt- und Drift-Erkennung gegenüber bestehender Projektwahrheit;
- agentenunterstützte Pflege des Project Brain statt manueller Buchhaltung;
- Verwaltung von Projektbegriffen und provisorischen Arbeitsnamen;
- sicherere Fortsetzung zwischen unterschiedlichen Coding-Agents;
- reichhaltigere Integrationen auf Basis des bestehenden Authority- und Recovery-Modells.

Diese Punkte sind **Produkt-Richtung und keine aktuellen RC3-Funktionsversprechen**. Der Sinn der Foundation Preview ist gerade, zuerst einen vertrauenswürdigen dauerhaften Kern zu haben, bevor mehr Automatisierung darauf handeln darf.

## Warum zuerst das Fundament?

Ein KI-Agent kann heute schon Dateien bearbeiten. Mehr Automatisierung hinzuzufügen ist leicht.

Mehr Automatisierung hinzuzufügen, **ohne Projektwahrheit zu verlieren, menschliche Arbeit zu überschreiben, projektkontrolliertem ausführbarem Code zu vertrauen oder beschädigten Zustand zu erraten**, ist deutlich schwieriger.

Livariant trennt deshalb:

```text
Prüfen -> Planen -> Autorisieren -> Ändern -> Verifizieren
                                      |
                                      +-> bei Abbruch gezielt wiederherstellen
```

> [!IMPORTANT]
> **Fähigkeit ist nicht Autorität.**

Je aktiver Livariant später wird, desto wichtiger wird genau diese Regel.

Das tiefere Modell erklärt [Architektur & Sicherheit](docs/de/architecture-and-safety.md).

## Fünf-Minuten-Start

Voraussetzungen für den aktuellen Preview-Kandidaten:

- Node.js 20 oder neuer;
- ein lokales Softwareprojekt;
- der verifizierte Livariant-Preview-Release-Tarball aus dem kanonischen GitHub Release, sobald RC3 veröffentlicht ist.

Installiere Livariant als Tool für deinen Rechner oder Benutzeraccount. Livariant wird nicht als Claude-Code- oder Codex-Plugin installiert und nicht in die `package.json` deines Projekts eingetragen.

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.3.tgz
livariant version
```

Öffne den Projektordner und prüfe zuerst den Zustand:

```bash
livariant status
livariant doctor
livariant init
```

`livariant init` ist standardmäßig read-only. Wenn der Plan korrekt ist:

```bash
livariant init --apply
```

Danach kannst du dauerhafte Projektwahrheit festhalten. Ohne `--apply` wird jeweils nur ein Plan erstellt:

```bash
livariant goals add "Die erste Public Preview veröffentlichen"
livariant knowledge add "Die Preview wird über GitHub Releases verteilt"
livariant decisions add "GitHub Releases für die Preview-Distribution verwenden"
```

Nach Prüfung wiederholst du den passenden Befehl mit `--apply`.

Um später den aktuellen Projektkontext wieder aufzunehmen:

```bash
livariant resume
```

Für Claude Code oder Codex gezielt:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

Unter [Installation & erstes Projekt](docs/de/installation.md) findest du den vollständigen Einstieg. Der [Fünf-Minuten-Schnellstart](docs/de/quickstart.md) ist die kürzere Arbeitsreferenz.

## Wie die normale Nutzung aussieht

Die aktuelle Foundation Preview beobachtet nicht automatisch jedes Gespräch. Du entscheidest, welcher bestätigte Zustand in das Project Brain gehört.

Ein normaler Zyklus ist:

```text
1. Projekt öffnen.
2. Bei Bedarf den aktuellen Project-Brain-Kontext wieder aufnehmen.
3. Normal mit dem Coding-Agent arbeiten.
4. Ein bestätigtes Ziel, einen Fakt oder eine akzeptierte Entscheidung als dauerhafte Projektwahrheit festhalten.
5. Livariants Plan prüfen.
6. Änderung ausdrücklich anwenden.
7. In einer späteren Sitzung oder bei einem anderen unterstützten Provider den aktualisierten Stand wieder aufnehmen.
```

Unterstützte semantische Operationen sind:

```text
livariant goals [list]
livariant goals add <goal> [--apply]
livariant knowledge [list]
livariant knowledge add <fact> [--apply]
livariant decisions [list]
livariant decisions add <decision> [--apply]
livariant decisions supersede <id> <replacement> [--reason <reason>] [--apply]
```

Beim Superseden bleibt die alte Entscheidung als Historie erhalten, statt still gelöscht zu werden.

## Bestehende Projekte

Livariant verlangt weder ein neues Repository noch ein bevorzugtes Projekt-Template.

Starte direkt im bestehenden Projekt:

```bash
livariant status
livariant doctor
livariant init
```

Bestehende projekt-eigene Dateien sind standardmäßig geschützt. Unklarer Zustand führt zu Diagnose statt zu geratenem Umschreiben.

Mehr dazu im [Leitfaden für bestehende Projekte](docs/de/existing-projects.md).

## Updates und Wiederherstellung

Der Livariant-Lifecycle ist bewusst strenger als das manuelle Kopieren oder Ersetzen verwalteter Dateien.

Zuerst prüfen:

```bash
livariant update --manifest ./release-manifest.json
livariant recover
```

Anwenden erst nach Prüfung und nur, wenn Livariant einen unterstützten Pfad meldet.

Für ausführbare Updates ist zusätzlich eine unabhängige rechnerlokale Autorität für das exakte Release-Artefakt nötig, bevor Candidate-Runtime-Code ausgeführt werden darf. Projektkontrollierte Dateien können diese Autorität nicht selbst für sich erzeugen.

Mehr dazu unter [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md).

## Datenschutz

Die aktuelle Runtime ist für lokale Projektarbeit ausgelegt:

- keine Livariant-Analytics oder Nutzungs-Telemetrie;
- kein automatischer Upload des Project Brain;
- kein Livariant-Cloud-Konto für lokale Nutzung erforderlich;
- kein automatischer Remote-Update-Check;
- Resume-Ausgabe wird lokal erzeugt.

Wenn du Resume-Kontext an einen externen KI-Provider weitergibst, gelten dessen eigene Bedingungen und Einstellungen.

Mehr dazu unter [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md).

## Foundation-Preview-Status

`0.1.0-rc.3` ist der aktuelle Foundation-Preview-Kandidat.

Das bestehende unveränderliche GitHub Release `v0.1.0-rc.2` ist historische Pre-Public-Release-Evidenz und nicht der aktuelle Kandidat.

Die unterstützte Baseline wird in CI auf Ubuntu und Windows geprüft. Preview bedeutet, dass das unterstützte Verhalten durch Evidenz abgesichert ist, während sich Oberflächen und Produktumfang vor 1.0 noch weiterentwickeln können.

Bekannte Datenverlust-, Autoritätseskalations-, Migrationsintegritäts- oder Release-Trust-Bypässe auf unterstützten Pfaden gelten nicht als akzeptable Preview-Einschränkungen.

Die größere Active-Project-Intelligence-Richtung wird bewusst nicht als bereits implementiertes RC3-Verhalten dargestellt.

Mehr dazu unter [Public-Preview-Support & Stabilität](docs/de/preview-support-and-stability.md) und [Public-Preview-Umfang & Einschränkungen](docs/de/preview-scope.md).

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

Livariant ist source-available und kein OSI-zertifiziertes Open-Source-Projekt. Die Standardlizenz ist die [PolyForm Perimeter License 1.0.1](LICENSE).

Veröffentliche vermutete Sicherheitslücken nicht als öffentliches Issue. Folge stattdessen [SECURITY.md](SECURITY.md).

Externe Code-Beiträge sind derzeit ausgesetzt, bis Contributor-Rechte mit dem source-available und zukünftigen kommerziellen Lizenzmodell sauber geregelt sind. Bugreports, Dokumentationsfeedback, Fragen und Design-Diskussionen sind über die Community-Wege des Repositorys willkommen.

- [Lizenzierung](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

**Livariant beginnt mit einer einfachen Regel: Das Projekt selbst soll die Wahrheit besitzen, die nötig ist, um seine Arbeit fortzusetzen. Der nächste Schritt ist, diese Wahrheit während der Entwicklung aktiv nutzbar zu machen.**
