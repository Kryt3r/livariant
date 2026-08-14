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

Die Entwicklung nach RC3 ergänzt klar begrenzte Active-Project-Intelligence-Oberflächen und unterstützende Project-Brain-Grundlagen. Sie bleiben unveröffentlicht, bis ein späteres Release separat freigegeben wird.

### Project Context Snapshot

Die Repository-Implementierung stellt bereit:

```text
livariant context
livariant context --json
```

sowie die Runtime-API `buildProjectContextSnapshot()`.

Der Snapshot ist read-only. Er liefert bestätigten Project-Brain-Kontext, offene Unklarheiten, explizite Authority-Klassen, eine deterministische materiale Project-Brain-Baseline und einen ausdrücklichen Safety-State `clear` oder `blocked`. Zusätzlich weist er strukturell aus, dass der Snapshot abgeleitete Ausgabe und keine Mutation-Autorisierung ist.

Blockierte maschinenlesbare Ausgabe ist durch einen von null verschiedenen CLI-Status von sauberem Erfolg unterscheidbar. Parallele Änderungen am verwalteten Project Brain während der Snapshot-Erzeugung brechen geschlossen ab, statt einen gemischten sauberen Snapshot auszugeben.

Der Snapshot hält den aktuellen Projekt-Locator von der stabilen logischen Identität getrennt. Ein gültiges Schema-2-Project-Brain liefert seine kanonische UUID als `stableProjectIdentity`; historische Schema-1-Project-Brains liefern bis zur ausdrücklichen unterstützten Migration `stableProjectIdentity: null`. Verschieben oder Kopieren eines Project Brain macht die ID weder zu einer eindeutigen Checkout- noch zu einer Machine-ID.

Siehe [Project Context Snapshot](project-context-snapshot.md) und [Stable Project Identity Foundation](stable-project-identity-foundation.md).

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

Candidate-JSON ist externe, nicht vertrauenswürdige Eingabe. Das Feld `origin` ist lediglich eine nicht verifizierte Herkunftsbehauptung und niemals Zustimmung, Projektidentität oder Mutationsautorität.

Jedes Ergebnis des Semantic Proposal Core bleibt dauerhaft nur für Review bestimmt. Es weist `reviewOnly: true`, `mutationAuthorization: false`, `applySupported: false`, `authorizationEligible: false` und `changesMade: 0` aus. Die Proposal-Identität ist deterministisch und an dieselbe kohärente materiale Project-Brain-Baseline-Semantik gebunden wie der Project Context Snapshot. Für Schema 2 ist auch die stabile logische Projektidentität material für die abgeleitete Proposal-Identität. Parallele Änderungen am verwalteten Zustand brechen geschlossen ab.

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

Die Bewertung ist ausschließlich abgeleitete Review-Evidenz. Sie weist `reviewOnly: true`, `mutationAuthorization: false`, `applySupported: false`, `authorizationEligible: false` und `changesMade: 0` aus. Sie ist an dieselbe kohärente materiale Project-Brain-Baseline gebunden wie die übrigen Active-Project-Intelligence-Read-Surfaces. Für Schema 2 trägt sie dieselbe kanonische logische `stableProjectIdentity`. Parallele Änderungen am verwalteten Zustand brechen geschlossen ab.

Dieser Slice scannt das Repository nicht automatisch und wendet keine Änderung an oder autorisiert sie.

Siehe [Konflikt- und Drift-Bewertung](conflict-drift-assessment.md).

### Provider Context Foundation

Das Repository stellt zusätzlich eine providerbezogene read-only Projektionsoberfläche bereit:

```text
livariant provider-context --provider claude-code --task <task.txt>
livariant provider-context --provider codex --task <task.txt>
livariant provider-context --provider <provider> --task <task.txt> --json
```

sowie die Runtime-API `buildProviderContext()`.

Provider Context verbindet dieselbe kohärente aktuelle Project-Brain-Evidence mit genau einer ausdrücklich angegebenen externen Aufgabe. Task-Material ist auf 64 KiB begrenzt, bleibt `session-ephemeral` und kann weder kanonische Projektwahrheit noch stabile Projektidentität, Zustimmung, Safety-State oder Mutationsautorität behaupten.

Das Paket erhält den Safety-Floor des Project Brain. Ein gültiges Schema-2-Project-Brain liefert dieselbe kanonische logische `stableProjectIdentity`; historischer Schema-1-Zustand liefert bis zur ausdrücklichen Migration `null`. Das Paket weist weiterhin `mutationAuthorization: false`, `applySupported: false`, `authorizationEligible: false` und `changesMade: 0` aus und bricht bei parallelen Änderungen am verwalteten Zustand geschlossen ab. Die Provider-Auswahl ändert nur das Projektionsziel; kopierte oder vom Provider zurückgegebene Pakete gelten bei späterer Verwendung nicht als vertrauenswürdige kanonische Eingabe.

Dieser Slice injiziert Kontext nicht automatisch in Claude Code oder Codex und ergänzt weder Provider-Transport noch persistente Provider-Writes.

Siehe [Provider Context Foundation](provider-context-foundation.md).

### Stable Project Identity Foundation

Die aktuelle Post-RC3-Repository-Entwicklung hebt das Project-Brain-Schema auf Version 2 an und ergänzt genau eine erforderliche kanonische UUID in `projectBrain.projectId`.

Bei einer frischen Schema-2-Initialisierung erzeugt Livariant die logische Identität lokal aus vertrauenswürdiger Runtime-Zufälligkeit. Bestehende Schema-1-Project-Brains erhalten die Identität ausschließlich über die ausdrückliche unterstützte `1 -> 2`-Lifecycle-Migration; Leseoperationen erzeugen oder reparieren sie nicht stillschweigend. Fehlende oder fehlerhafte Schema-2-Identität bricht geschlossen ab.

Die ID identifiziert eine logische Project-Brain-Linie, nicht einen physischen Checkout, eine Maschine, eine Provider-Session oder eine User-Session. Verschieben oder Umbenennen eines Projekts rotiert sie nicht, und eine byte-identische Kopie des Project Brain behält legitimerweise dieselbe ID.

Gleiche Identität allein ist weder Zustimmung noch Mutationsautorität, Anti-Replay-Evidenz, machine-local Trust, Checkpoint-Integrität, Runtime-/Release-Integrität oder Beweis dafür, dass ein zurückgeliefertes Provider-Paket kanonisch ist.

Siehe [Stable Project Identity Foundation](stable-project-identity-foundation.md).

### Proposal-bound Authorization Foundation

Die aktuelle Post-RC3-Repository-Entwicklung stellt zusätzlich eine getrennte Actionable-Proposal- und Authorization-Grundlage bereit:

```text
livariant prepare --input <candidate.json>
livariant prepare --input <candidate.json> --json
livariant authorize --input <actionable-proposal.json>
livariant authorize --input <actionable-proposal.json> --json
```

`prepare` erzeugt ein strukturell eigenes Actionable Proposal aus derselben kanonischen semantischen Evidence wie der review-only Proposal Core. Es bindet die exakte stabile logische Projektidentität, die materiale Project-Brain-Baseline, den normalisierten semantischen Mutations-Scope und einen eigenen deterministischen Material-Digest. Es autorisiert oder appliziert die Änderung nicht.

`authorize` ist eine ausdrückliche lokale User-Presence-Operation. Die unterstützte CLI benötigt ein interaktives TTY, zeigt exakte Projektidentität, Proposal-Digest, Baseline und Mutations-Scope und verlangt die ausdrückliche Bestätigung der Challenge. Es gibt kein projektseitiges `--yes`, Environment-Flag, Candidate-Feld, zurückgeliefertes Provider-Paket oder bloß passende Project-ID, die diesen User-Presence-Schritt ersetzt.

Aufgezeichnete Authority verwendet Dual Evidence: einen projektlokalen Lifecycle-/Audit-Record plus passende unabhängige machine-local Authority außerhalb der Projektkontrolle. Beide binden dieselbe Authorization-ID, dasselbe Actionable Proposal, Projektidentität, Baseline und den exakten Mutation-Scope. Fehlende, fehlerhafte oder widersprüchliche Evidence bricht geschlossen ab.

Der Authorization-Lifecycle ist zustandsbehaftet und replay-resistent. Er unterscheidet `authorized`, `applying`, `completed`, `failed-recovery-required` und `invalidated`; ein machine-local Consumption-Lock verhindert, dass zwei Consumer dieselbe Authorization erfolgreich beginnen. Abgeschlossene und failed/recovery-required Authorizations sind terminal und können durch Replay kopierter Records nicht wieder zu nutzbarer Zustimmung werden.

`prepare` und `authorize` selbst führen weiterhin **null semantische Mutationen** aus. Ihre eng gebundene Dual Evidence kann ausschließlich vom separaten Semantic-Apply-Pfad unten verbraucht werden.

Bestehende Semantic-Proposal-, Conflict/Drift- und Provider-Context-Ausgaben bleiben nicht autorisierend. Provider-Text mit der Behauptung, der Nutzer habe bereits zugestimmt, erzeugt keine Livariant-Mutationsautorität.

Siehe [Proposal-bound Authorization Foundation](proposal-bound-authorization.md).

### Semantic Apply

Die aktuelle Post-RC3-Repository-Entwicklung ergänzt die begrenzte Apply-Oberfläche:

```text
livariant apply --authorization <authorization-id> --input <actionable-proposal.json>
livariant apply --authorization <authorization-id> --input <actionable-proposal.json> --json
```

sowie die Runtime-API `applyActionableProposal()`.

Semantic Apply unterstützt ausschließlich die bereits im Actionable-Proposal-Vertrag repräsentierten Mutationsdomänen: Decision Add, Decision Supersede, Confirmed-Goal Add und Confirmed-Knowledge Add. Review-only Semantic-Proposal-JSON oder rohe Candidate-JSON werden nicht als Ersatz für ein Actionable Proposal akzeptiert.

Ein frisches Apply muss das exakte Actionable Proposal, die stabile logische Projektidentität, die materiale Project-Brain-Baseline, den Mutation-Scope, projektlokale Authorization-Evidence und die passende unabhängige machine-local Authority erneut prüfen. Authority wird vor Beginn der semantischen Mutation zu `applying` verbraucht, sodass dieselbe Authorization während des Schreibversuchs nicht wiederverwendbar bleibt.

Die Implementierung verwendet die bestehenden semantischen Project-Brain-Writer weiter, einschließlich Managed-Path-Confinement, Regular-File-/Symlink-Safety, Exact-Original-Concurrency-Prüfung, atomarer Promotion und Writer-Verifikation. Die exakte autorisierte Baseline wird unmittelbar vor der Promotion erneut geprüft. Anschließend liest Livariant den kanonischen semantischen Zustand erneut und verifiziert das autorisierte Ergebnis vor normaler terminaler Completion.

Crash-Reconciliation ist absichtlich enger als die normale erfolgreiche Ausführung. Ein unterbrochener Split darf nur dann automatisch weiterlaufen, solange die exakte autorisierte aggregierte **Pre-Mutation-Baseline** weiterhin reproduzierbar ist. Dass der gewünschte Satz im aktuellen Project Brain auftaucht, beweist nicht vollständig, dass ausschließlich die autorisierte Mutation stattgefunden hat. Post-Mutation- oder Changed-Baseline-Splits bleiben deshalb fail-closed/recovery-required, solange keine separat akzeptierte vollständige exakte Post-State-Evidence existiert.

Machine-local Terminal-State wird niemals heruntergestuft und Authority niemals auf `authorized` zurückgesetzt. Passende machine-local `failed-recovery-required`-Evidence darf Project-Audit-Evidence ausschließlich vorwärts in denselben failed terminal state ausrichten. Ein Split `machine=completed / project=applying` wird nach einer Prozessgrenze ohne vollständigen Exact-Delta-Beweis nicht automatisch als Erfolg deklariert.

Semantic Apply ergänzt keine provider-getriebene Mutation, keine Wildcard-/Standing-Authorization, keine beliebigen Repository-Writes, keine automatische Candidate-Ermittlung und keine neuen semantischen Domänen.

Siehe [Semantic Apply](semantic-apply.md).

Diese Post-RC3-Funktionen werden nicht rückwirkend Bestandteil des unveränderlichen RC3-Releases. Sie werden erst durch ein späteres, separat freigegebenes Release zu verteilten Release-Funktionen.

Die aktuellen Post-RC3-Oberflächen ergänzen **nicht**:

- provider-getriebene, automatische, Wildcard- oder Standing-Mutationsautorität;
- eindeutige Checkout-Identität oder Authority-Transfer durch Kopieren von Project-Brain-Bytes;
- Project-Fork-, Split-, Merge- oder Project-ID-Replacement-Semantik;
- automatisches Drift-Scanning oder automatische Drift-Auflösung;
- Terminologie-Persistenz oder Lifecycle-Mutation außerhalb der ausdrücklich unterstützten Schema-Migration;
- Provider-Transport oder automatische Kontextinjektion;
- LLM-basierten semantischen Vergleich;
- autonome Kandidatenfindung;
- Goal- oder Knowledge-Ersetzung, -Löschung oder -Supersession;
- zusätzliche Proposal-/Apply-Domänen außerhalb des ausdrücklich dokumentierten Schema-Version-1-Sets.

Diese Oberflächen bleiben spätere Arbeit, solange sie nicht separat implementiert und verifiziert wurden.

## Provider-Support ist bewusst begrenzt

Die veröffentlichte Preview unterstützt Claude Code und Codex für Project-Brain-Resume-Handoff.

Die Provider-Anwendbarkeit verwendet `LIVARIANT_PROVIDER_ENV`. Wenn du einen Provider auswählst, teilst du Livariant mit, welche unterstützte Resume-Umgebung du ansprichst. Dadurch entsteht keine Ausführungs- oder Mutationsautorität.

Livariant beansprucht nicht, jede Provider-Funktion, Modellauswahl, Authentifizierungsmethode, native Instruktionsdatei oder Provider-Memory-Oberfläche zu verwalten.

Der Post-RC3 Project Context Snapshot, der Semantic Proposal Core, die Konflikt- und Drift-Bewertung, die Stable Project Identity Foundation, die Proposal-bound Authorization Foundation und Semantic Apply sind provider-neutrale strukturierte Grundlagen oder lokale nutzergesteuerte Oberflächen. Provider Context ist eine providerbezogene Projektion für Claude Code und Codex. Keine davon behandelt Provider-Ausgabe oder providerseitige Zustimmungsbehauptungen automatisch als Livariant-Mutationsautorität.

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

Kompatible schema-ändernde Releases verwenden denselben `livariant update`-Ablauf und werden durch den Migrations-Lifecycle geführt. Der aktuell belegte Schema-Pfad ist `1 -> 2`. Im aktuellen Post-RC3-Quellstand erzeugt diese Migration die erforderliche stabile logische Projekt-ID innerhalb der bestehenden Checkpoint-/Journal-/Validation-/Activation-/Recovery-Transaktion. Nicht unterstützte Migrationspfade brechen geschlossen ab.

> [!WARNING]
> Das manuelle Ersetzen von Project-Brain-Dateien, framework-verwaltetem Lifecycle-State, Schema- oder Versionsmetadaten, stabiler Projektidentität, installierten Runtime-Dateien, Runtime-Trust-Records, Release-Authorization-Records oder semantischen Authorization-Audit-Records ist kein unterstützter Authority- oder Update-Weg. Damit würden Lifecycle-, Integritäts-, Baseline-, Authority-, Checkpoint-, Aktivierungs- und Recovery-Garantien umgangen oder ungültig.

## Wiederherstellung

`livariant recover` ist standardmäßig read-only.

`livariant recover --apply` autorisiert einen validierten Rollback-Plan separat.

Automatische Wiederherstellung bleibt gesperrt, wenn dauerhafte Lifecycle-Evidenz oder der Checkpoint fehlt, verschoben, verändert oder mehrdeutig ist.

Nach einem verifizierten Rollback schreibt Livariant zuerst das wiederhergestellte Project Brain fest. Verdrängter Recovery-State wird entfernt, bevor der letzte gültige Checkpoint gelöscht wird. Das Löschen des Checkpoints ist der letzte irreversible Bereinigungsschritt.

Scheitert die späte Bereinigung, müssen das wiederhergestellte Project Brain und der gültige Checkpoint erhalten bleiben.

## Keine versprochene Wunderreparatur

Livariant verspricht nicht, beliebigen beschädigten, manuell umgeschriebenen oder mehrdeutigen Project-Brain-Zustand automatisch zu reparieren.

Wenn sichere Semantik nicht eindeutig hergestellt werden kann, darf die Diagnose bewusst stoppen und menschliche Klärung verlangen. Dazu gehören auch fehlerhafte Schema-2-Identitätsmetadaten sowie fehlerhafte oder widersprüchliche semantische Authorization-Evidence; Reads erfinden weder Ersatz-IDs noch Zustimmung.

## Local-first bedeutet nicht vertrauensfrei

Die normale Project-Brain-Nutzung ist local-first und braucht kein Livariant-Cloud-Konto.

Release-/Update-Authority und semantische Mutationsautorität verwenden unabhängige machine-local Evidence, wo ihre jeweiligen Verträge dies verlangen. Projektkontrollierte Bytes können diese Trust Roots nicht selbst erzeugen.

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
