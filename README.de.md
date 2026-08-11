<img width="1376" height="682" alt="Livariant — Living software framework for coherent AI-assisted development" src="https://github.com/user-attachments/assets/16f5afee-a10a-4c79-8bc9-89d23135e0e9" />

<p align="center">
  <a href="README.md">English</a> · <strong>Deutsch</strong>
</p>

# Livariant

**Ein Living Software Framework für kohärente KI-gestützte Softwareentwicklung über Coding-Agents, Tools und Sitzungen hinweg.**

Livariant gibt langlebigen Softwareprojekten eine persistente, projekt-eigene Quelle der Wahrheit — das **Project Brain**. Entscheidungen, Architektur, Ziele und bestätigtes Projektwissen bleiben dadurch über einzelne KI-Sitzungen und Provider-Wechsel hinweg erhalten, ohne verstecktes Modellgedächtnis zum eigentlichen Projektzustand zu machen.

> [!IMPORTANT]
> **Fähigkeit ist nicht Autorität.** Nur weil ein Tool technisch in ein Projekt schreiben kann, bedeutet das nicht, dass es dazu autorisiert ist. Livariant trennt Inspektion, Planung, Autorisierung, Mutation, Verifikation und Wiederherstellung bewusst voneinander.

## Inhaltsverzeichnis

- [Warum Livariant?](#warum-livariant)
- [Wie es funktioniert](#wie-es-funktioniert)
- [Fünf-Minuten-Start](#fünf-minuten-start)
- [Bestehende Projekte](#bestehende-projekte)
- [Claude Code und Codex](#claude-code-und-codex)
- [Sichere Updates und Wiederherstellung](#sichere-updates-und-wiederherstellung)
- [Sicherheitsmodell](#sicherheitsmodell)
- [Local-first Datenschutz](#local-first-datenschutz)
- [Preview-Status](#preview-status)
- [Dokumentation](#dokumentation)
- [Lizenz, Sicherheit und Beiträge](#lizenz-sicherheit-und-beiträge)

## Warum Livariant?

KI-Coding-Agents sind gut darin, die konkrete Aufgabe vor ihnen zu lösen. Langfristige Softwareprojekte brauchen zusätzlich etwas Dauerhaftes.

Ohne persistierenden Projektkontext entsteht Drift: Entscheidungen verschwinden, überholte Annahmen kehren zurück, verschiedene Agents übernehmen unterschiedliche Wissensstände, Provider-Memory wird versehentlich zur Quelle der Wahrheit und Updates oder Reparaturen enden in manuellem Dateiaustausch.

Livariant setzt auf das Gegenmodell:

```text
projekt-eigenes kanonisches Wissen
+ explizite Autorität
+ provider-unabhängige Resume-Semantik
+ Preservation-first Mutationen
+ integritätsgebundene Lifecycle-Operationen
+ fail-closed Diagnose und Wiederherstellung
```

## Wie es funktioniert

Das Project Brain ist eine kleine, explizite Quelle der Wahrheit im Projekt:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Es gehört dem Projekt — nicht Claude Code, Codex, einer Modellsitzung oder verstecktem Runtime-State von Livariant.

Provider-Projektionen, temporäre Pläne, native Agent-Instruktionsdateien und verstecktes Provider-Memory sind **keine** konkurrierenden kanonischen Quellen.

### Lifecycle-Prinzip

```text
Prüfen → Planen → Autorisieren → Ändern → Verifizieren
                             ↘ bei Abbruch explizit wiederherstellen
```

## Fünf-Minuten-Start

Voraussetzungen für die aktuelle Preview-Baseline:

- Node.js 20 oder neuer;
- ein lokales Projektverzeichnis;
- das Livariant-Preview-Release-Artefakt.

Zuerst nur lesen und prüfen:

```bash
livariant status
livariant doctor
livariant init
```

Wenn der erkannte Initialisierungsplan korrekt ist:

```bash
livariant init --apply
```

Danach prüfen und Kontext wieder aufnehmen:

```bash
livariant status
livariant doctor
livariant resume
```

> [!NOTE]
> `livariant init` ohne `--apply` verändert nichts. Livariant ist bewusst plan-first statt mutation-first.

Mehr dazu im [deutschen Fünf-Minuten-Schnellstart](docs/de/quickstart.md).

## Bestehende Projekte

Bestehende Projekte sind First-Class. Livariant ist **discovery-first und preservation-first**: Ein vorhandenes Repository muss nicht in eine Livariant-Vorlage umgebaut werden.

Der normale Einstieg bleibt:

```bash
livariant status
livariant doctor
livariant init
```

Projekt-eigene Dateien sind standardmäßig geschützt. Unklarheit führt zu mehr Inspektion und Diagnose, nicht zu heuristischem Umschreiben.

Mehr dazu im [Leitfaden für bestehende Projekte](docs/de/existing-projects.md).

## Claude Code und Codex

Die aktuelle Preview unterstützt **Project Brain Resume Handoff** für Claude Code und Codex über getrennte Adapter:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

Diese Aussage ist bewusst eng gefasst. Livariant rekonstruiert provider-spezifischen Resume-Kontext aus dem kanonischen Project Brain. Es beansprucht **nicht**, sämtliche Features, Modelloptionen, Tool-Aufrufe, Authentifizierungsmethoden oder nativen Instruktionsmechanismen dieser Provider zu verwalten.

Mehr dazu unter [Provider-Handoff](docs/de/provider-handoff.md).

## Sichere Updates und Wiederherstellung

Ein Update wird zuerst geprüft:

```bash
livariant update --manifest ./release-manifest.json
```

Erst nach Prüfung des Plans wird das passende Artefakt aus einer explizit vertrauten Quelle angewendet:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

Für ausführbare Updates reicht das allein weiterhin nicht: Der **exakte Artefakt-SHA-256 muss bereits durch eine unabhängige machine-local Release-Policy außerhalb der Projektautorität autorisiert sein**. Projektdateien, Manifest, `--trusted-source` und die projektseitige Livariant-CLI/API können diese Authority nicht erzeugen. Fehlt sie, bricht das Update geschlossen ab, bevor npm-Installation oder Candidate-Runtime-Attestation stattfinden. Einen projektseitigen `authorize-runtime`-Befehl gibt es absichtlich nicht.

> [!WARNING]
> **Livariant niemals aktualisieren, indem `.project-brain/`, framework-verwalteter Lifecycle-State oder Schema-/Versionsmetadaten manuell ersetzt bzw. verändert werden, indem einfach eine neuere Runtime in verwalteten Speicher kopiert wird oder indem Runtime-Trust-/Release-Authorization-Records editiert werden.**
>
> Damit würden Kompatibilitätsprüfung, explizite Autorität, Release-Integrität, Migrations-Checkpoints, Replay-Sicherheit, Validierung und Aktivierungssemantik umgangen.

> [!CAUTION]
> Wird ein Update oder eine Migration unterbrochen, **nicht blind erneut starten und keine Dateien per Hand reparieren**. Zuerst diagnostizieren:
>
> ```bash
> livariant doctor
> livariant recover
> ```
>
> Wiederherstellung nur anwenden, wenn Livariant eine gültige unterstützte Strategie meldet:
>
> ```bash
> livariant recover --apply
> ```

Schema-ändernde Releases laufen über denselben `update`-Pfad und werden automatisch in den unterstützten Migrations-Lifecycle geroutet. Einen normalen manuellen `migrate`-Shortcut gibt es absichtlich nicht.

Mehr dazu unter [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md).

## Sicherheitsmodell

Livariant verlangt für projektverändernde Mutationen explizite Autorisierung. Bestehender projekt-eigener Zustand wird standardmäßig geschützt; unklarer Zustand führt zu Diagnose statt zu geratenen Reparaturen.

Die gehärtete Preview-Baseline deckt unter anderem Path-/Symlink-Escape, veraltete Entscheidungswahrheit, unterbrochene Migrationen, manipulierte Checkpoints, manipulierte Release-Artefakte, Runtime-Drift, Provider-Instruktionskonflikte, nicht unterstützte Migrationen, konkurrierende Projektänderungen während Aktivierung, fehlende Trust-Evidenz, feindliche Trust-Root-Topologien, Pre-Trust-Runtime-Ausführung und Versuche von Projekten ab, ihre eigene Release-Authority zu erzeugen.

Der Kern bleibt:

> **Fähigkeit ist nicht Autorität.**

Mehr dazu unter [Architektur & Sicherheit](docs/de/architecture-and-safety.md).

## Local-first Datenschutz

Die aktuelle Preview-Runtime ist local-first ausgelegt:

- keine Livariant-Analytics oder Usage-Telemetrie;
- kein automatischer Project-Brain-Upload;
- kein Livariant-Cloud-Konto für lokale Nutzung erforderlich;
- kein automatischer Remote-Update-Check;
- provider-spezifischer Resume-Handoff wird von Livariant lokal erzeugt.

Was ein externer KI-Provider mit Kontext macht, den du bewusst an ihn weitergibst, richtet sich nach dessen Bedingungen und nicht nach Livariant.

Mehr dazu unter [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md).

## Preview-Status

Livariant befindet sich in **Public Preview**. Die Preview ist evidenzgestützt, bedeutet aber noch keinen Freeze sämtlicher CLI-Details oder interner Verträge vor 1.0.

Die aktuell nachgewiesene Baseline läuft in CI auf **Ubuntu und Windows mit Node.js 24**. Das Paket deklariert Node.js `>=20`, aber der Preview-Nachweis wird bewusst nicht über die tatsächlich getesteten Umgebungen hinaus aufgebläht.

Begrenzte bekannte Preview-Einschränkungen können existieren. Bekannte Datenverlust-, Autoritätseskalations-, Migrationsintegritäts- oder Release-Trust-Bypässe auf unterstützten Pfaden gelten nicht als akzeptable Preview-Limitierungen.

Mehr dazu unter [Public-Preview-Support & Stabilität](docs/de/preview-support-and-stability.md) und [Public-Preview-Umfang & Einschränkungen](docs/de/preview-scope.md).

## Dokumentation

### Deutsch

- [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
- [Leitfaden für bestehende Projekte](docs/de/existing-projects.md)
- [Architektur & Sicherheit](docs/de/architecture-and-safety.md)
- [Provider-Handoff](docs/de/provider-handoff.md)
- [Updates, Migrationen & Wiederherstellung](docs/de/lifecycle-guide.md)
- [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md)
- [Public-Preview-Support & Stabilität](docs/de/preview-support-and-stability.md)
- [Public-Preview-Umfang & Einschränkungen](docs/de/preview-scope.md)
- [Lizenz, Gewährleistung & Haftung](docs/de/license-and-warranty.md)

### English

- [Five-Minute Quickstart](docs/quickstart.md)
- [Existing Project Guide](docs/existing-projects.md)
- [Architecture & Safety](docs/architecture-and-safety.md)
- [Provider Handoff](docs/provider-handoff.md)
- [Updates, Migrations & Recovery](docs/lifecycle-guide.md)
- [Privacy & Network Behavior](docs/privacy-and-network.md)
- [Public Preview Support & Stability](docs/preview-support-and-stability.md)
- [Public Preview Scope & Limitations](docs/preview-scope.md)
- [License, Warranty & Liability](docs/license-and-warranty.md)

## Lizenz, Sicherheit und Beiträge

Livariant ist **source-available und nicht OSI-zertifiziertes Open Source**. Die Standardlizenz ist die [PolyForm Perimeter License 1.0.1](LICENSE).

Sie soll breite Nutzung erlauben — einschließlich kommerzieller Softwareentwicklung mit Livariant — und gleichzeitig verhindern, dass Livariant genutzt wird, um Dritten einen konkurrierenden Ersatz für Livariant selbst anzubieten. Separate kommerzielle Bedingungen können für Fälle angeboten werden, die individuell ausgehandelte Rechte benötigen.

Sicherheitsrelevante Probleme sollten über [SECURITY.md](SECURITY.md) gemeldet und nicht zuerst öffentlich als Issue offengelegt werden.

Externe Code-Beiträge sind derzeit ausgesetzt, bis Contributor-Rechte mit dem source-available und zukünftigen kommerziellen Lizenzmodell sauber geregelt sind.

- [Lizenzierung](LICENSING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Lizenz, Gewährleistung & Haftung](docs/de/license-and-warranty.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)

---

**Livariant** folgt einer einfachen Prämisse: KI-gestützte Entwicklung wird zuverlässiger, wenn das Projekt sein eigenes Gedächtnis besitzt, Entscheidungen explizit bleiben und selbst mächtige Tools Autoritätsgrenzen respektieren müssen.
