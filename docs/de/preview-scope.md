# Public-Preview-Umfang & Einschränkungen

Diese Seite trennt das **veröffentlichte Foundation-Preview-Release** von neuerer Repository-Entwicklung. So ist klar erkennbar, was tatsächlich veröffentlicht ist und was nur im Post-RC3-Quellstand vorhanden ist.

Sie ist keine Marketingliste. Ihr Zweck ist, die unterstützte Oberfläche und ihre Grenzen zu beschreiben, ohne geplante oder unveröffentlichte Funktionen zu Release-Behauptungen zu machen.

## Veröffentlichtes Foundation Preview

Das aktuelle öffentliche Release ist das unveränderliche Pre-Release:

```text
v0.1.0-rc.3
```

RC3 ist das erste saubere öffentliche Foundation-Preview-Release. Es bleibt historische Release-Evidenz und wird durch spätere Entwicklung auf `main` nicht umgeschrieben.

Die gehärtete RC3-Foundation besitzt ausführbare Evidenz für:

- neue und bestehende Projekte;
- wiederholte semantische Pflege bestätigter Ziele, bestätigten Projektwissens und akzeptierter Entscheidungen;
- plan-first Mutation mit ausdrücklichem `--apply`;
- Supersession von Entscheidungen mit erhaltener Historie;
- Project-Brain-Resume-Handoff für Claude Code und Codex;
- Schutz vor veraltetem Kontext;
- normale Updates;
- den expliziten Project-Brain-Schema-Pfad `1 -> 2`;
- Diagnose unterbrochener Updates;
- separat autorisierte Wiederherstellung;
- Dateisystemgrenzen;
- Release- und Runtime-Integrität;
- unabhängige rechnerlokale Runtime-Release-Authority;
- Drift-Diagnose;
- saubere Paketinstallation.

Die veröffentlichte RC3-Befehlsoberfläche lautet:

```text
init
status
doctor
resume
goals
knowledge
decisions
update
recover
version
```

Paket, Runtime und installierter CLI-Befehl heißen `livariant`.

Die Release-Supportaussage ist bewusst auf die Umgebungen begrenzt, die von der gehärteten Release-Pipeline tatsächlich getestet werden: Ubuntu und Windows mit Node.js 24. Das Paket deklariert Node.js `>=20`.

## Post-RC3-Repository-Entwicklung

Die Entwicklung nach RC3 ergänzt klar begrenzte read-only Oberflächen von Active Project Intelligence. Sie bleiben unveröffentlicht, bis ein späteres Release separat freigegeben wird.

### Project Context Snapshot

Die Repository-Implementierung stellt bereit:

```text
livariant context
livariant context --json
```

sowie die Runtime-API `buildProjectContextSnapshot()`.

Der Snapshot ist read-only. Er liefert bestätigten Project-Brain-Kontext, offene Unklarheiten, explizite Authority-Klassen, eine deterministische materiale Project-Brain-Baseline und einen ausdrücklichen Safety-State `clear` oder `blocked`. Zusätzlich weist er strukturell aus, dass der Snapshot abgeleitete Ausgabe und keine Mutation-Autorisierung ist.

Blockierte maschinenlesbare Ausgabe ist durch einen von null verschiedenen CLI-Status von sauberem Erfolg unterscheidbar. Parallele Änderungen am verwalteten Project Brain während der Snapshot-Erzeugung brechen geschlossen ab, statt einen gemischten sauberen Snapshot auszugeben.

Der Snapshot zeigt einen aktuellen Projekt-Locator, erfindet aber keine stabile dauerhafte Projektidentität. `stableProjectIdentity` bleibt in diesem ersten Vertrag `null`.

Siehe [Project Context Snapshot](project-context-snapshot.md).

### Semantic Proposal Core

Das Repository stellt zusätzlich die begrenzte read-only Proposal-Oberfläche bereit:

```text
livariant propose --input <candidate.json>
livariant propose --input <candidate.json> --json
```

sowie die Runtime-API `buildSemanticProposal()`.

Schema-Version 1 unterstützt aktuell:

- `project-decision` mit `add` und `supersede`;
- `project-goal` mit `add`;
- `project-knowledge` mit `add`.

Candidate-JSON ist externe, nicht vertrauenswürdige Eingabe. Das Feld `origin` ist lediglich eine nicht verifizierte Herkunftsbehauptung und niemals Zustimmung oder Mutationsautorität.

Jedes aktuelle Proposal bleibt dauerhaft nur für Review bestimmt. Es weist `reviewOnly: true`, `applySupported: false`, `authorizationEligible: false` und `changesMade: 0` aus. Die Proposal-Identität ist deterministisch und an dieselbe materiale Project-Brain-Baseline-Semantik gebunden wie der Project Context Snapshot. Parallele Änderungen am verwalteten Zustand brechen geschlossen ab.

Exakte Duplikate aktiver Entscheidungen, bestätigter Ziele und bestätigten Projektwissens können erkannt werden. Abweichender Text wird von dieser begrenzten Implementierung nicht als semantisch vereinbar oder konfliktfrei behauptet. Decision-Supersede-Kandidaten müssen genau eine strukturierte aktive Decision-ID benennen. Goal- und Knowledge-Proposals unterstützen in diesem Slice nur `add`.

Die Goal-Duplikatprüfung verwendet nur den bestätigten Goal-Bereich. Ein gleicher Bullet-Text außerhalb dieses Bereichs wird separat ausgewiesen und nicht zu bestätigter Goal-Authority hochgestuft. Die Knowledge-Duplikatprüfung verwendet ausschließlich bestätigtes Projektwissen. Ein gleicher Eintrag unter `Known unknowns` wird als Scope-Konflikt mit ungelöstem Zustand ausgewiesen und nicht als bestätigter Fakt behandelt.

Siehe [Semantic Proposal Core](semantic-proposal-core.md).

### Konflikt- und Drift-Bewertung

Das Repository stellt zusätzlich eine explizite read-only Bewertungsoberfläche bereit:

```text
livariant drift --input <observation.json>
livariant drift --input <observation.json> --json
```

sowie die Runtime-API `buildConflictDriftAssessment()`.

Schema-Version 1 akzeptiert genau eine ausdrückliche Beobachtung in den Domänen `project-decision`, `project-goal` oder `project-knowledge`. Unterstützte Evidenzklassen sind `dependent-current`, `historical` und `provider-observation`.

Die aktuelle vertrauenswürdige Diagnosemenge umfasst `consistent`, `confirmed-drift`, `historical-match`, `authority-ambiguous` und `insufficient-evidence`. Abweichender Text allein gilt niemals als Beweis für Drift oder Widerspruch. Eine starke Decision-Beziehung setzt eine exakte strukturierte Entscheidungsidentität voraus, wenn die Diagnose von dieser Identität abhängt.

Die Bewertung ist ausschließlich abgeleitete Review-Evidenz. Sie weist `reviewOnly: true`, `mutationAuthorization: false`, `applySupported: false`, `authorizationEligible: false` und `changesMade: 0` aus. Sie ist an dieselbe kohärente materiale Project-Brain-Baseline gebunden wie die übrigen Active-Project-Intelligence-Read-Surfaces. Parallele Änderungen am verwalteten Zustand brechen geschlossen ab.

Dieser Slice scannt das Repository nicht automatisch und wendet keine Änderung an oder autorisiert sie.

Siehe [Konflikt- und Drift-Bewertung](conflict-drift-assessment.md).

Diese Post-RC3-Funktionen werden nicht rückwirkend Bestandteil des unveränderlichen RC3-Releases. Sie werden erst durch ein späteres, separat freigegebenes Release zu verteilten Release-Funktionen.

Die aktuellen Post-RC3-Oberflächen ergänzen **nicht**:

- Proposal Apply oder Mutationsautorität;
- automatisches Drift-Scanning oder automatische Drift-Auflösung;
- Terminologie-Persistenz oder Lifecycle-Mutation;
- Provider-Transport oder automatische Kontextinjektion;
- eine dauerhafte stabile Projektidentität;
- LLM-basierten semantischen Vergleich;
- autonome Kandidatenfindung;
- Goal- oder Knowledge-Ersetzung, -Löschung oder -Supersession;
- zusätzliche Proposal-Domänen außerhalb des ausdrücklich dokumentierten Schema-Version-1-Sets.

Diese Oberflächen bleiben spätere Arbeit, solange sie nicht separat implementiert und verifiziert wurden.

## Provider-Support ist bewusst begrenzt

Die veröffentlichte Preview unterstützt Claude Code und Codex für Project-Brain-Resume-Handoff.

Die Provider-Anwendbarkeit verwendet `LIVARIANT_PROVIDER_ENV`. Wenn du einen Provider auswählst, teilst du Livariant mit, welche unterstützte Resume-Umgebung du ansprichst. Dadurch entsteht keine Ausführungs- oder Mutationsautorität.

Livariant beansprucht nicht, jede Provider-Funktion, Modellauswahl, Authentifizierungsmethode, native Instruktionsdatei oder Provider-Memory-Oberfläche zu verwalten.

Der Post-RC3 Project Context Snapshot, der Semantic Proposal Core und die Konflikt- und Drift-Bewertung sind provider-neutrale strukturierte Ausgaben. Sie injizieren sich nicht automatisch in Claude Code, Codex oder einen anderen Provider.

## Semantische Wissenspflege

Die Foundation Preview unterstützt klar begrenzte wiederholte Änderungen an dauerhafter Project-Brain-Wahrheit.

Unterstützt werden:

```text
livariant goals [list]
livariant goals add <goal> [--apply]

livariant knowledge [list]
livariant knowledge add <fact> [--apply]

livariant decisions [list]
livariant decisions add <decision> [--apply]
livariant decisions supersede <id> <replacement> [--reason <reason>] [--apply]
```

Mutation ist plan-first. Ohne `--apply` zeigt Livariant die geplante kanonische Änderung und schreibt nichts.

Eine unterstützte Änderung darf nur bei einem gültigen und gesunden Project Brain angewendet werden. Verwaltete Writes bleiben hinter der Project-Brain-Storage-Grenze, lehnen unsichere Managed-File-Topologien ab, verwenden atomare Ersetzung mit Exact-Original-Concurrency-Prüfung und verifizieren den gespeicherten Zustand, bevor Erfolg gemeldet wird.

Einfache Duplikate werden abgelehnt, statt bestehenden Projektstand still umzuschreiben. Beim Superseden einer Entscheidung bleibt die alte Entscheidung als Historie erhalten und eine neue aktive Entscheidungsidentität wird angelegt.

`livariant resume` enthält bestätigte Ziele, aktive Entscheidungen, bekannte Fakten, offene Unklarheiten und vorhandene Projektidentität. Die Resume-Projektionen für Claude Code und Codex verwenden denselben kanonischen Zustand.

Livariant beobachtet Gespräche nicht automatisch und entscheidet nicht selbst, welche KI-Ausgabe dauerhafte Projektwahrheit werden soll. Der Nutzer entscheidet weiterhin, welcher bestätigte Projektzustand festgehalten wird.

## Update- und Migrationssupport

`livariant update --manifest <path>` plant standardmäßig nur ein Update, solange `--apply` fehlt.

Zum Anwenden eines geprüften Updates brauchst du zusätzlich:

- `--apply`;
- das passende lokale Runtime-Artefakt;
- mindestens einen expliziten `--trusted-source`-Wert.

Das Release-Manifest kann seine eigene Quelle nicht selbst vertrauenswürdig machen. Die Artefaktbytes müssen zu Identität und SHA-256 des ausgewählten Release-Descriptors passen.

Für ausführbare Updates gilt eine weitere Voraussetzung: Der exakte Artefakt-SHA-256 muss bereits durch eine unabhängige rechnerlokale Release-Policy außerhalb der Projektautorität autorisiert sein.

Projektdateien, Release-Manifest, `--trusted-source` und die projektseitige Livariant-CLI oder API können diese Autorität weder erzeugen noch verändern. Produktive Release-Authorization-Logik ist read-only und prüft nur Authority, die bereits existiert. Einen projektseitigen `authorize-runtime`-Befehl gibt es absichtlich nicht.

Fehlt die exakte Artefakt-Autorität, stoppt das Update vor npm-Installation oder Candidate-Runtime-Attestation.

Kompatible schema-ändernde Releases verwenden denselben `livariant update`-Ablauf und werden durch den Migrations-Lifecycle geführt. Der aktuell belegte Schema-Pfad ist `1 -> 2`. Nicht unterstützte Migrationspfade brechen geschlossen ab.

> [!WARNING]
> Das manuelle Ersetzen von Project-Brain-Dateien, framework-verwaltetem Lifecycle-State, Schema- oder Versionsmetadaten, installierten Runtime-Dateien, Runtime-Trust-Records oder Release-Authorization-Records ist kein unterstützter Update-Weg. Damit würden Autoritäts-, Kompatibilitäts-, Integritäts-, Checkpoint-, Aktivierungs- und Recovery-Garantien umgangen.

## Wiederherstellung

`livariant recover` ist standardmäßig read-only.

`livariant recover --apply` autorisiert einen validierten Rollback-Plan separat.

Automatische Wiederherstellung bleibt gesperrt, wenn dauerhafte Lifecycle-Evidenz oder der Checkpoint fehlt, verschoben, verändert oder mehrdeutig ist.

Nach einem verifizierten Rollback schreibt Livariant zuerst das wiederhergestellte Project Brain fest. Verdrängter Recovery-State wird entfernt, bevor der letzte gültige Checkpoint gelöscht wird. Das Löschen des Checkpoints ist der letzte irreversible Bereinigungsschritt.

Scheitert die späte Bereinigung, müssen das wiederhergestellte Project Brain und der gültige Checkpoint erhalten bleiben.

## Keine versprochene Wunderreparatur

Livariant verspricht nicht, beliebigen beschädigten, manuell umgeschriebenen oder mehrdeutigen Project-Brain-Zustand automatisch zu reparieren.

Wenn sichere Semantik nicht eindeutig hergestellt werden kann, darf die Diagnose bewusst stoppen und menschliche Klärung verlangen.

## Local-first bedeutet nicht vertrauensfrei

Die normale Project-Brain-Nutzung ist local-first und braucht kein Livariant-Cloud-Konto.

Release- und Update-Vorgänge benötigen trotzdem vertrauenswürdige Release-Evidenz sowie bereits vorhandene unabhängige rechnerlokale Authority für das exakte ausführbare Artefakt.

Die aktuelle Runtime implementiert keine Livariant-Telemetrie, keinen automatischen Project-Brain-Upload und keinen automatischen Remote-Update-Check. Siehe [Datenschutz & Netzwerkverhalten](privacy-and-network.md).

## Öffentliche Distribution

Das kanonische Repository ist unter `Kryt3r/livariant` öffentlich. Preview-Releases werden über GitHub Releases aus diesem Repository mit der erwarteten Source-Identität verteilt:

```text
github:Kryt3r/livariant
```

Das Release-Tooling erzeugt:

- einen konkreten Runtime-Tarball;
- ein maschinenlesbares Manifest, das an den exakten Artefakt-SHA-256 gebunden ist;
- `SHA256SUMS`.

CI verifiziert dieses Release-Bundle gegen einen sauberen Consumer.

`v0.1.0-rc.1` und `v0.1.0-rc.2` bleiben historische Release-Evidenz. RC2 enthält Pre-Public-Text und ältere Bundle-Bytes und darf weder überschrieben, neu getaggt noch als aktueller Stand dargestellt werden.

`v0.1.0-rc.3` ist das aktuell veröffentlichte Foundation-Preview-Release. Spätere Repository-Änderungen verändern weder Tag noch Release-Text oder Artefakte dieses Releases.

Für die aktuelle Preview wird kein npm-Publishing-Pfad behauptet.

## Lizenz, Sicherheit, Datenschutz, Beiträge und Support

Zum Preview-Repository gehören:

- PolyForm Perimeter License 1.0.1 in `LICENSE`;
- `THIRD_PARTY_NOTICES.md`;
- `SECURITY.md`;
- `CONTRIBUTING.md`;
- `SUPPORT.md`;
- `docs/de/license-and-warranty.md`;
- `docs/de/privacy-and-network.md`;
- `docs/de/preview-support-and-stability.md`.

Livariant ist source-available und wird nicht als OSI-zertifiziertes Open Source angeboten.

Externe Code-Beiträge bleiben ausgesetzt, bis Contributor-Rechte finalisiert sind, die mit dem source-available und zukünftigen kommerziellen Lizenzmodell vereinbar sind.

GitHub Private Vulnerability Reporting, Dependabot Alerts, CodeQL, Secret Scanning, Push Protection, restriktive Actions-Berechtigungen, das main Ruleset und das Release-Tag Ruleset sind für das öffentliche Repository aktiviert.

## Was Preview bedeutet

Public Preview bedeutet:

- die unterstützte Oberfläche ist bewusst begrenzt;
- bekannte Einschränkungen sollen ausdrücklich dokumentiert werden;
- Breaking Changes können unter den dokumentierten Preview- und SemVer-Regeln noch vorkommen;
- Autorität und Projektmutationsumfang dürfen nicht stillschweigend wachsen;
- unterstützte Pfade sollen durch ausführbare Evidenz belegt sein, statt pauschal jede Umgebung zu versprechen.

Preview-Support ist Maintainer- und Community-Support ohne bezahlten SLA, sofern nichts anderes separat vereinbart wurde.

Der spätere 1.0-Stabilitäts- und Kompatibilitätsvertrag braucht eine eigene Readiness-Entscheidung.