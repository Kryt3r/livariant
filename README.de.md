<img width="1376" height="682" alt="Livariant | Living software framework for coherent AI-assisted development" src="https://github.com/user-attachments/assets/16f5afee-a10a-4c79-8bc9-89d23135e0e9" />

<p align="center">
  <a href="README.md">English</a> · <strong>Deutsch</strong>
</p>

# Livariant

**Ein Living Software Framework, das KI-gestützten Softwareprojekten hilft, Wissen, Entscheidungen und Richtung über Sitzungen und Tools hinweg zu behalten.**

Wenn du KI zum Programmieren nutzt, kennst du vielleicht genau das Problem, für das Livariant gedacht ist.

Du erklärst einem KI-Coding-Tool dein Projekt. Die Zusammenarbeit läuft gut. Einige Tage später startest du eine neue Sitzung, wechselst das Tool oder kehrst nach einer längeren Pause zurück. Wichtiger Kontext fehlt. Alte Entscheidungen tauchen wieder auf. Du erklärst dieselben Dinge erneut. Ein Agent versteht das Projekt anders als der nächste. Irgendwann steckt ein Teil der Projektgeschichte nur noch in Chatverläufen oder in deinem Kopf.

Livariant gibt diesem Wissen einen dauerhaften Platz direkt im Projekt.

Du musst kein KI-Experte sein, um die Idee zu verstehen. Gerade wenn du mit Tools wie Claude Code oder Codex anfängst, soll Livariant dir helfen, dein Projekt verständlich und konsistent zu halten, auch wenn einzelne KI-Sitzungen kommen und gehen.

## Wobei Livariant hilft

Livariant ist dafür gedacht, Projekten dabei zu helfen:

- wichtige Projektentscheidungen auch nach dem Ende einer KI-Sitzung verfügbar zu halten;
- Architektur und Ziele nicht ständig neu erklären zu müssen;
- zwischen unterstützten Coding-Agents zu wechseln, ohne das Gedächtnis eines einzelnen Providers zum Projektarchiv zu machen;
- bestätigte Fakten und offene Fragen in einem projekt-eigenen Wissensstand zu bewahren;
- Änderungen zu prüfen, bevor Livariant verwalteten Projektzustand schreibt;
- Livariant zu aktualisieren oder wiederherzustellen, ohne verwaltete Lifecycle-Dateien per Hand auszutauschen.

Ein einfaches Beispiel für das geplante Modell:

```text
Montag
Du entscheidest mit Claude Code, dass die Anmeldung nach Ansatz A gebaut wird.
Sobald diese Entscheidung im Project Brain steht, gehört sie zum Projekt und nicht mehr nur zum Chat.

Freitag
Du startest eine neue Codex-Sitzung.
Livariant erzeugt den passenden Projektkontext aus dem Project Brain.
Codex braucht den alten Claude-Code-Chat nicht, um zu wissen, dass Ansatz A die akzeptierte Entscheidung ist.
```

Livariant sorgt nicht dafür, dass ein KI-Modell alles dauerhaft erinnert. Stattdessen bekommt das Projekt einen eigenen Wissensstand, den unterstützte Tools lesen können, wenn du ihnen diesen Kontext bewusst gibst.

## Was das Project Brain ist

Livariant nennt seinen projekt-eigenen Wissensspeicher **Project Brain**.

Einfach gesagt ist das eine kleine Gruppe von Dateien im Projekt. Darin stehen zum Beispiel Projektidentität, Ziele, akzeptierte Entscheidungen, bestätigtes Wissen und Livariant-Metadaten.

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Das Project Brain gehört deinem Projekt. Es gehört nicht Claude Code, Codex, einem bestimmten Modell oder einem versteckten Livariant-Cloud-Dienst.

Chatverläufe, Provider-Memory, temporäre Pläne, `CLAUDE.md`, `AGENTS.md` und andere provider-spezifische Dateien können weiterhin hilfreich sein. Livariant behandelt sie aber nicht als konkurrierende Hauptquelle für den Projektzustand.

## Inhaltsverzeichnis

- [Für wen Livariant gedacht ist](#für-wen-livariant-gedacht-ist)
- [Wie Livariant funktioniert](#wie-livariant-funktioniert)
- [Fünf-Minuten-Start](#fünf-minuten-start)
- [Wie die normale Nutzung aussieht](#wie-die-normale-nutzung-aussieht)
- [Grenze der aktuellen Preview](#grenze-der-aktuellen-preview)
- [Bestehende Projekte](#bestehende-projekte)
- [Claude Code und Codex](#claude-code-und-codex)
- [Sichere Updates und Wiederherstellung](#sichere-updates-und-wiederherstellung)
- [Sicherheitsmodell](#sicherheitsmodell)
- [Lokaler Datenschutz](#lokaler-datenschutz)
- [Preview-Status](#preview-status)
- [Dokumentation](#dokumentation)
- [Lizenz, Sicherheit und Beiträge](#lizenz-sicherheit-und-beiträge)

## Für wen Livariant gedacht ist

### Wenn du gerade mit KI-gestütztem Programmieren anfängst

Du musst weder Agent-Architektur noch Provider-APIs oder das komplette Sicherheitsmodell von Livariant verstehen, bevor du loslegst.

Die aktuelle ausführbare Preview kann:

1. Livariant als Kommandozeilen-Tool installieren;
2. dein Projekt prüfen;
3. einen Initialisierungsplan anzeigen;
4. das Project Brain nach ausdrücklicher Freigabe anlegen;
5. Gesundheit und Lifecycle-Zustand prüfen;
6. Project-Brain-Kontext für unterstützte Coding-Agents erzeugen;
7. den gehärteten Update-, Migrations- und Recovery-Lifecycle ausführen.

Die tieferen Lifecycle- und Sicherheitsdokumente kannst du lesen, sobald du sie brauchst.

### Wenn du bereits Claude Code oder Codex nutzt

Livariant gibt diesen Sitzungen einen gemeinsamen projekt-eigenen Kontext, ohne so zu tun, als wären die nativen Erinnerungen verschiedener Provider austauschbar. Die aktuelle Preview unterstützt einen klar begrenzten Resume-Handoff für Claude Code und Codex.

### Wenn du ein langfristiges oder komplexes Projekt pflegst

Livariant bringt zusätzlich feste Regeln für Initialisierung, Updates, Migration, Integritätsprüfung und Wiederherstellung mit. Bestehender Projektzustand soll geschützt bleiben. Unklare Situationen sollen sichtbar werden, statt automatisch erraten zu werden.

## Wie Livariant funktioniert

Livariant trennt Projektwissen vom Gedächtnis eines einzelnen KI-Tools. Außerdem trennt es technische Fähigkeit von der Erlaubnis, geschützten Zustand zu verändern.

Der normale Ablauf lautet:

```text
Prüfen -> Planen -> Autorisieren -> Ändern -> Verifizieren
                                      |
                                      +-> bei Abbruch gezielt wiederherstellen
```

Das ist wichtig, weil ein Tool nicht automatisch jede Änderung ausführen sollte, nur weil es technisch dazu in der Lage ist.

> [!IMPORTANT]
> **Fähigkeit ist nicht Autorität.** Livariant trennt Prüfung, Planung, Autorisierung, Änderung, Verifikation und Wiederherstellung bewusst voneinander.

Das tiefere Modell erklärt [Architektur & Sicherheit](docs/de/architecture-and-safety.md).

## Fünf-Minuten-Start

Voraussetzungen für den aktuellen Preview-Kandidaten:

- Node.js 20 oder neuer;
- ein lokales Projektverzeichnis;
- der verifizierte Livariant-Preview-Release-Tarball aus dem kanonischen GitHub Release, sobald dieser veröffentlicht ist.

Livariant wird nicht in Claude Code oder Codex installiert. Installiere den Release-Tarball zuerst als Tool für deinen Rechner oder Benutzeraccount:

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.2.tgz
livariant version
```

Wechsle danach in den Projektordner, den du bereits mit deinem Coding-Tool nutzt, und prüfe den Zustand:

```bash
livariant status
livariant doctor
livariant init
```

`livariant init` ohne `--apply` initialisiert das Projekt nicht. Du bekommst zuerst den Plan zu sehen.

Wenn der Plan korrekt ist:

```bash
livariant init --apply
```

Danach prüfst du das Ergebnis:

```bash
livariant status
livariant doctor
livariant resume
```

Die CLI-Installation trägt Livariant nicht in die `package.json` deines Projekts ein und initialisiert das Projekt nicht automatisch.

Unter [Installation & erstes Projekt](docs/de/installation.md) findest du Download-Prüfung, Windows-Befehle, PATH-Hilfe und den vollständigen Einstieg. Der [Fünf-Minuten-Schnellstart](docs/de/quickstart.md) ist die kürzere Arbeitsreferenz.

## Wie die normale Nutzung aussieht

Nach der Einrichtung musst du das Projekt nicht bei jeder KI-Sitzung neu initialisieren.

Eine Sitzung mit der aktuellen Preview kann so aussehen:

```text
1. Projekt öffnen.
2. Bei Bedarf den Livariant-Status prüfen.
3. Resume-Kontext erzeugen lassen.
4. Den passenden Kontext an den Coding-Agent weitergeben, den du gerade nutzt.
5. Am Projekt arbeiten.
6. Für Status, Diagnose, Resume, Updates oder Recovery wieder Livariant verwenden.
```

Nützliche Befehle sind:

```bash
livariant status
livariant doctor
livariant resume
```

`status` zeigt, welchen Zustand Livariant erkennt. `doctor` diagnostiziert unterstützte Zustände, ohne sie still zu reparieren. `resume` erzeugt den aktuellen Project-Brain-Kontext für den Wiedereinstieg in das Projekt.

Livariant beobachtet nicht automatisch jedes Gespräch und behauptet nicht, dass jeder Satz aus einer KI-Sitzung dauerhaftes Projektwissen werden sollte.

## Grenze der aktuellen Preview

Das Framework-Design sieht geführte semantische Operationen vor, mit denen Ziele, Entscheidungen und Projektwissen sicher verändert werden können. Diese Oberfläche ist in der ausführbaren CLI von `0.1.0-rc.2` **noch nicht vorhanden**.

Die aktuelle CLI ist bewusst kleiner und enthält `init`, `status`, `doctor`, `resume`, `update`, `recover` und `version`.

RC2 kann das Project Brain anlegen, daraus Resume-Kontext lesen, seinen Zustand diagnostizieren und seinen Lifecycle schützen. Die geplanten First-Class-Befehle für laufende Wissensänderungen wie `goals`, `decisions` oder `knowledge` sind jedoch noch nicht implementiert.

Wir behandeln das als explizite Preview-Einschränkung und nicht so, als gäbe es die spätere Bedienoberfläche bereits. Mehr dazu unter [Public-Preview-Umfang & Einschränkungen](docs/de/preview-scope.md).

## Bestehende Projekte

Du musst kein neues Repository anlegen, um Livariant zu verwenden.

Bei einem bestehenden Projekt beginnst du mit:

```bash
livariant status
livariant doctor
livariant init
```

Lies das Ergebnis, bevor du die Initialisierung anwendest. Livariant soll das vorhandene Projekt übernehmen, nicht es in eine bevorzugte Vorlage zwingen. Bestehende projekt-eigene Dateien sind standardmäßig geschützt. Unklarer Zustand führt zu Diagnose statt zu geratenem Umschreiben.

Mehr dazu im [Leitfaden für bestehende Projekte](docs/de/existing-projects.md).

## Claude Code und Codex

Die aktuelle Preview unterstützt einen Project-Brain-Resume-Handoff für Claude Code und Codex über getrennte Adapter.

Beispiele für Linux oder macOS:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

Livariant ist dabei kein natives Claude-Code- oder Codex-Plugin. Es erzeugt provider-spezifischen Resume-Kontext aus dem Project Brain. Es verwaltet nicht automatisch jede Provider-Funktion, Modelleinstellung, Authentifizierung, Tool-Ausführung oder native Instruktionsdatei.

Mehr dazu unter [Provider-Handoff](docs/de/provider-handoff.md).

## Sichere Updates und Wiederherstellung

Die meisten Nutzer müssen am ersten Tag nicht das komplette Release-Authority-Modell verstehen. Eine Regel ist aber wichtig: Aktualisiere Livariant nicht, indem du seinen verwalteten Lifecycle-Zustand per Hand ersetzt.

Ein Update wird zuerst geprüft:

```bash
livariant update --manifest ./release-manifest.json
```

Nach Prüfung des Plans verwendet ein unterstütztes ausführbares Update das passende Artefakt und explizite Trust-Evidenz:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

Für ausführbare Updates muss der exakte SHA-256 des Artefakts zusätzlich bereits durch eine unabhängige, rechnerlokale Release-Policy außerhalb der Projektautorität freigegeben sein. Projektdateien, Manifest, `--trusted-source` und die projektseitige Livariant-CLI oder API können diese Autorität nicht selbst erzeugen. Fehlt sie, bricht das Update geschlossen ab, bevor Candidate-Runtime-Code ausgeführt werden kann. Einen projektseitigen `authorize-runtime`-Befehl gibt es nicht.

> [!WARNING]
> Aktualisiere Livariant nicht, indem du `.project-brain/`, framework-verwaltete Lifecycle-Dateien, Schema- oder Versionsmetadaten, verwaltete Runtime-Dateien oder Trust- und Release-Authorization-Records per Hand ersetzt oder bearbeitest.

Wird ein Update oder eine Migration unterbrochen, diagnostiziere zuerst den Zustand:

```bash
livariant doctor
livariant recover
```

Wiederherstellung wird nur angewendet, wenn Livariant eine gültige unterstützte Strategie meldet:

```bash
livariant recover --apply
```

Schema-ändernde Releases verwenden automatisch den unterstützten Update- und Migrationsablauf. Einen normalen manuellen `migrate`-Shortcut gibt es nicht.

Mehr dazu unter [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md).

## Sicherheitsmodell

Livariant verlangt eine explizite Autorisierung für Änderungen an geschütztem Projektzustand. Bestehender projekt-eigener Zustand wird standardmäßig geschützt. Unklare Zustände führen zu Diagnose statt zu geratenen Reparaturen.

Die gehärtete Preview-Baseline enthält ausführbare Tests unter anderem für Path- und Symlink-Escape, veraltete Entscheidungswahrheit, unterbrochene Migrationen, manipulierte Checkpoints, manipulierte Release-Artefakte, Runtime-Drift, Provider-Instruktionskonflikte, nicht unterstützte Migrationen, konkurrierende Projektänderungen während Aktivierung, fehlende Update-Trust-Evidenz, feindliche Trust-Root-Topologien, Pre-Trust-Runtime-Ausführung und Versuche von Projekten, ihre eigene Release-Authority zu erzeugen.

Der Kern ist einfach:

> **Fähigkeit ist nicht Autorität.**

## Lokaler Datenschutz

Die aktuelle Preview-Runtime ist für lokale Projektarbeit ausgelegt:

- keine Livariant-Analytics oder Nutzungs-Telemetrie;
- kein automatischer Upload des Project Brain;
- kein Livariant-Cloud-Konto für lokale Nutzung erforderlich;
- kein automatischer Remote-Update-Check;
- provider-spezifischer Resume-Kontext wird lokal von Livariant erzeugt.

Wenn du Resume-Kontext bewusst an einen externen KI-Provider weitergibst, gelten für dessen Umgang damit die Bedingungen und Einstellungen dieses Providers.

Mehr dazu unter [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md).

## Preview-Status

`0.1.0-rc.2` ist der aktuelle Kandidat für die Public Preview. Dieses Repository befindet sich weiterhin in der Vorbereitung vor der öffentlichen Freigabe, bis Veröffentlichung und Sichtbarkeitswechsel separat autorisiert und durchgeführt wurden.

Die unterstützte Baseline wird in CI auf Ubuntu und Windows mit Node.js 24 geprüft. Das Paket deklariert Node.js `>=20`, aber der Preview-Nachweis bleibt auf die Umgebungen begrenzt, die tatsächlich von der Release-Pipeline getestet werden.

Preview bedeutet, dass unterstütztes Verhalten durch Tests und Evidenz abgesichert ist. Es bedeutet nicht, dass jedes CLI-Detail oder jeder interne Vertrag bereits bis 1.0 eingefroren ist.

Bekannte Datenverlust-, Autoritätseskalations-, Migrationsintegritäts- oder Release-Trust-Bypässe auf einem unterstützten Pfad gelten nicht als akzeptable Preview-Einschränkungen.

Mehr dazu unter [Public-Preview-Support & Stabilität](docs/de/preview-support-and-stability.md) und [Public-Preview-Umfang & Einschränkungen](docs/de/preview-scope.md).

## Dokumentation

Wenn du neu bei Livariant bist, nutze am besten diese Reihenfolge:

1. [Installation & erstes Projekt](docs/de/installation.md)
2. [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
3. [Leitfaden für bestehende Projekte](docs/de/existing-projects.md)
4. [Provider-Handoff](docs/de/provider-handoff.md)
5. [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md)

Für tiefere Details:

- [Architektur & Sicherheit](docs/de/architecture-and-safety.md)
- [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md)
- [Public-Preview-Support & Stabilität](docs/de/preview-support-and-stability.md)
- [Public-Preview-Umfang & Einschränkungen](docs/de/preview-scope.md)
- [Lizenz, Gewährleistung & Haftung](docs/de/license-and-warranty.md)

Englische Nutzerdokumentation:

- [English project overview](README.md)
- [Installation & First Project](docs/installation.md)
- [Five-Minute Quickstart](docs/quickstart.md)
- [Existing Project Guide](docs/existing-projects.md)
- [Provider Handoff](docs/provider-handoff.md)
- [Updates, Migrations & Recovery](docs/lifecycle-guide.md)
- [Architecture & Safety](docs/architecture-and-safety.md)
- [Privacy & Network Behavior](docs/privacy-and-network.md)
- [Public Preview Support & Stability](docs/preview-support-and-stability.md)
- [Public Preview Scope & Limitations](docs/preview-scope.md)
- [License, Warranty & Liability](docs/license-and-warranty.md)

Englisch bleibt die kanonische Vertragssprache für tiefe Framework- oder interne Verträge, wenn es dafür keine deutsche Entsprechung gibt. Die oben aufgeführten nutzerorientierten Dokumente sind auf Deutsch gespiegelt.

## Lizenz, Sicherheit und Beiträge

Livariant ist source-available und kein OSI-zertifiziertes Open-Source-Projekt. Die Standardlizenz ist die [PolyForm Perimeter License 1.0.1](LICENSE).

Die Lizenz erlaubt eine breite Nutzung, auch bei der Entwicklung kommerzieller Software. Sie schränkt die Nutzung von Livariant ein, wenn damit ein konkurrierender Ersatz für Livariant selbst angeboten werden soll. Separate kommerzielle Bedingungen können angeboten werden, wenn individuell ausgehandelte Rechte benötigt werden.

Veröffentliche vermutete Sicherheitslücken nicht als öffentliches Issue. Folge stattdessen [SECURITY.md](SECURITY.md).

Externe Code-Beiträge sind derzeit ausgesetzt, bis Contributor-Rechte mit dem source-available und zukünftigen kommerziellen Lizenzmodell sauber geregelt sind. Bugreports, Dokumentationsfeedback, Fragen und Design-Diskussionen sind über die Community-Wege willkommen, die für die Preview eingerichtet werden.

- [Lizenzierung](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Lizenz, Gewährleistung & Haftung](docs/de/license-and-warranty.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

**Livariant folgt einer einfachen Idee:** Das Projekt selbst soll das Wissen besitzen, das nötig ist, um seine Arbeit fortzusetzen, auch wenn sich die KI-Sitzung ändert.
