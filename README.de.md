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

Coding-Agenten werden immer leistungsfähiger. Trotzdem beginnt der nächste Chat oft wieder mit Rekonstruktion, alte Entscheidungen tauchen plötzlich erneut auf und aus "die Tests sind grün" wird schneller "fertig", als es die vorhandenen Belege eigentlich erlauben.

Je mehr ein Agent selbstständig verändert, desto größer wird dieses Problem.

> **Livariant ist kein weiterer Coding-Agent. Es ist die Reliability-Schicht, die beim Projekt bleibt, während Chats, Modelle, Agenten und Tools wechseln.**

Das Ziel: schneller mit KI entwickeln, ohne Projektwissen, Kontrolle und Nachvollziehbarkeit an einzelne Sessions oder Provider zu verlieren.

---

## Was Livariant anders macht

Viele heutige Lösungen verbessern einzelne Teile: Memory, Rules, Review, CI, Quality Gates oder Agent-Orchestrierung.

Livariant versucht diese Fragen als **ein zusammenhängendes System** zu behandeln:

| Statt... | Soll Livariant... |
| --- | --- |
| Kontext immer wieder neu aufzubauen | wichtiges Projektwissen dauerhaft beim Projekt halten |
| jede KI-Aussage wie Wahrheit zu behandeln | Evidence von akzeptierter Project Truth trennen |
| "der Agent kann das" mit "der Agent darf das" gleichzusetzen | folgenreiche Änderungen hinter klare Authority-Grenzen stellen |
| "Tests bestanden" automatisch als "alles erledigt" zu lesen | sichtbar machen, was belegt, widersprochen oder noch ungeklärt ist |
| beim Providerwechsel Projektwissen zu verlieren | Continuity möglichst providerneutral halten |
| nach Fehlern raten zu müssen | Updates, Migrationen und Recovery nachvollziehbarer machen |

**Die Modelle sollen denken und arbeiten. Das Projekt soll Gedächtnis, Regeln, Evidenz, Entscheidungen und Kontrolle behalten.**

---

## Was heute schon da ist

Livariant befindet sich noch in früher Entwicklung, besitzt aber bereits funktionierende Grundlagen für:

- **Project Continuity** mit lokalem, projekt-eigenem Project Brain;
- **Evidence vor Truth**, damit Agenten-Ausgabe nicht automatisch Projektwissen wird;
- **Authority-Grenzen** für folgenreiche Änderungen;
- **Verification Trace** mit `SUPPORTED`, `CONTRADICTED` und `UNPROVEN`;
- **Agent-/Provider-Continuity** über MCP-Grundlagen und aktuelle Claude-Code-/Codex-Pfade;
- **Lifecycle und Recovery** für Initialisierung, Updates, Migrationen und unsichere Zustände;
- **ehrliche Diagnostics**, die Beobachtetes, Vermiedenes und Geschätztes nicht vermischen.

Livariant behauptet dabei nicht, KI unfehlbar zu machen oder beliebigen Code automatisch korrekt verifizieren zu können.

---

## Desktop first

Die Desktop-App wird als normale Oberfläche für Livariant gebaut: Projekt verstehen, Agenten verbinden, wichtige Punkte reviewen, Diagnostics prüfen, Einstellungen verwalten und Updates durchführen, ohne Livariant zuerst als CLI-System lernen zu müssen.

> [!WARNING]
> **Early Development / Preview**
>
> Livariant befindet sich weiterhin in aktiver Entwicklung. Wichtige Workflows werden noch vervollständigt und einzelne Oberflächen können sich vor dem ersten öffentlichen Produktrelease verändern. Dem Windows-Installer fehlt außerdem noch die finale produktive Publisher-Signierung bzw. Reputation, weshalb Windows SmartScreen- oder Publisher-Hinweise anzeigen kann.

Aktuelle Desktop-Bereiche: **Project Truth / First Steps**, **Connections**, **Diagnostics**, **Updates** und **Settings**.

### Screenshots

Aktuelle Desktop-Screenshots werden hier ergänzt, sobald der verifizierte visuelle Satz vorliegt.

---

## Zielbild für das erste öffentliche Release

Zum ersten öffentlichen Produktrelease soll ein Nutzer Livariant vor allem deshalb einsetzen können, weil es im Alltag spürbar etwas löst:

- ein bestehendes Projekt anbinden, ohne es für Livariant neu aufzubauen;
- wichtigen Kontext und Entscheidungen über Sessions hinweg behalten;
- zwischen unterstützten Agenten wechseln, ohne das Projekt gedanklich zurückzusetzen;
- widersprüchliches oder veraltetes Wissen sichtbar machen und bewusst klären;
- Agenten bei risikoarmer Arbeit möglichst wenig bremsen, bei folgenreichen Änderungen aber klare Grenzen setzen;
- "fertig" stärker an nachvollziehbare Verification koppeln;
- nach Updates, Migrationen oder Unterbrechungen nicht raten müssen, welchem Zustand man vertrauen kann;
- das Ganze überwiegend über eine verständliche Desktop-App und standardmäßig local-first nutzen.

**Das Ziel ist nicht mehr Prozess. Das Ziel ist mehr Vertrauen pro Unterbrechung.**

---

<details>
<summary><strong>Warum Livariant trotz bestehender Memory-, Review- und Quality-Tools?</strong></summary>

Livariant basiert nicht auf der Behauptung, dass niemand sonst diese Probleme sieht. Im Gegenteil: Persistente Regeln, Repository-Memory, AI-Code-Review und Quality Gates werden immer wichtiger.

Beispiele sind [Cursor Rules](https://docs.cursor.com/context/rules), [GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory), [projectmem](https://projectmem.dev/), [Sonar AI Code Assurance](https://www.sonarsource.com/solutions/ai-code-assurance/) und [CodeRabbit](https://www.coderabbit.ai/).

Livarians These ist, dass Memory allein nicht Authority löst, Review nicht automatisch Project Truth erzeugt, CI keine Continuity ersetzt und providergebundenes Memory beim Providerwechsel weiterhin providergebunden bleibt.

Die Chance liegt deshalb nicht in einem weiteren isolierten Feature, sondern in einer gemeinsamen Reliability-Schicht rund um das Projekt selbst.

</details>

<details>
<summary><strong>Technische Grundlagen</strong></summary>

Livariant hält mehrere Konzepte absichtlich getrennt:

```text
Evidence != Truth
Capability != Authority
Proposal != Authorization
Verification evidence != accepted completion
Persistence != Trust
Presence != Currency
```

Das lokale Project Brain gehört zum Projekt. Eine lokale stdio-MCP-Bridge stellt aktuell unter anderem `livariant_provider_context`, `livariant_provider_return` und `livariant_verification_trace` bereit. Die Desktop-App basiert auf Tauri 2 mit Rust-Host; der Renderer ist keine Root of Trust.

Mehr dazu unter [Architektur & Sicherheit](docs/de/architecture-and-safety.md).

</details>

<details>
<summary><strong>Aktuelle Preview-Grenzen und langfristige Richtung</strong></summary>

Livariant beansprucht aktuell weder universelle Code-Correctness-Verifikation noch automatisch vertrauenswürdige Evidenz, perfekte Konflikterkennung, uneingeschränkte autonome Repository-Mutation oder Support für jeden Provider.

Langfristig kann dasselbe Modell unter anderem um reichhaltigeres Failure Memory, Engineering Intelligence, unabhängige Review-/Critic-Layer, breiteren Provider-Support, privacy-preserving aggregierte Reliability-Evidenz und später kontrolliertes Livariant-on-Livariant Self-Hosting erweitert werden.

Siehe [Public Preview Scope & Limitations](docs/de/preview-scope.md) für die exakten aktuellen Grenzen.

</details>

---

## Ausprobieren

Für normale Desktop-Nutzung das **aktuellste qualifizierte Desktop Preview** unter [GitHub Releases](https://github.com/Kryt3r/livariant/releases) laden.

Danach helfen:

- [Installation & erstes Projekt](docs/de/installation.md)
- [Fünf-Minuten-Schnellstart](docs/de/quickstart.md)
- [Existing Projects](docs/de/existing-projects.md)
- [Datenschutz & Netzwerkverhalten](docs/de/privacy-and-network.md)

---

## Lizenz, Sicherheit und Beiträge

Livariant ist source-available und unter der [PolyForm Perimeter License 1.0.1](LICENSE) lizenziert. Sicherheitsprobleme bitte nicht öffentlich posten, sondern nach [SECURITY.md](SECURITY.md) melden.

Externe Code-Beiträge sind derzeit eingeschränkt; Bug Reports, Dokumentationsfeedback, Fragen und Design-Diskussionen sind willkommen. Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

---

<p align="center">
  <strong>Livariant versucht nicht, eine KI perfekt zu machen.<br/>Es versucht, dein Projekt verlässlich zu halten, wenn die KI es nicht ist.</strong>
</p>
