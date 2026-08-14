# Public-Preview-Umfang & Einschränkungen

Diese Seite trennt das **veröffentlichte Foundation-Preview-Release** von neuerer Repository-Entwicklung. So ist klar erkennbar, was tatsächlich veröffentlicht ist und was nur im Post-RC3-Quellstand vorhanden ist.

Sie ist keine Marketingliste. Ihr Zweck ist, unterstützte Oberflächen und Grenzen zu beschreiben, ohne geplante oder unveröffentlichte Funktionen zu Release-Behauptungen zu machen.

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

Die Entwicklung nach RC3 ergänzt klar begrenzte Active-Project-Intelligence-Oberflächen und unterstützende Project-Brain-Grundlagen. Diese Fähigkeiten bleiben unveröffentlicht, bis ein späteres Release separat freigegeben wird.

### Project Context Snapshot

Der Repository-Quellstand stellt bereit:

```text
livariant context
livariant context --json
```

sowie die Runtime-API `buildProjectContextSnapshot()`.

Der Snapshot ist read-only. Er liefert bestätigten Project-Brain-Kontext, offene Unklarheiten, explizite Authority-Klassen, eine deterministische materiale Project-Brain-Baseline und einen Safety-State `clear` oder `blocked`. Parallele Änderungen am verwalteten Zustand brechen geschlossen ab, statt einen gemischten sauberen Snapshot auszugeben.

Ein gültiges Schema-2-Project-Brain liefert seine kanonische logische UUID als `stableProjectIdentity`; historischer Schema-1-Zustand liefert bis zur ausdrücklichen unterstützten Migration `null`. Der Projekt-Locator bleibt von der logischen Identität getrennt.

Siehe [Project Context Snapshot](project-context-snapshot.md) und [Stable Project Identity Foundation](stable-project-identity-foundation.md).

### Semantic Proposal Core

Der Repository-Quellstand stellt bereit:

```text
livariant propose --input <candidate.json>
livariant propose --input <candidate.json> --json
```

sowie die Runtime-API `buildSemanticProposal()`.

Schema-Version 1 unterstützt:

- `project-decision` mit `add` und `supersede`;
- `project-goal` mit `add`;
- `project-knowledge` mit `add`.

Candidate-JSON ist externe, nicht vertrauenswürdige Eingabe. `origin` ist lediglich eine nicht verifizierte Herkunftsbehauptung und niemals Zustimmung, Projektidentität oder Mutationsautorität.

Semantic-Proposal-Ausgabe bleibt dauerhaft review-only: `reviewOnly: true`, `mutationAuthorization: false`, `applySupported: false`, `authorizationEligible: false` und `changesMade: 0`. Die Proposal-Identität ist deterministisch an die kohärente materiale Project-Brain-Baseline gebunden; bei Schema 2 ist auch die stabile logische Projektidentität material. Parallele Änderungen am verwalteten Zustand brechen geschlossen ab.

Exakte Duplikate aktiver Decisions, bestätigter Goals und bestätigten Knowledges können erkannt werden. Abweichender Text wird nicht als semantisch gleichwertig oder konfliktfrei behauptet. Decision-Supersession benötigt genau ein aktives strukturiertes Decision-Ziel. Goal- und Knowledge-Proposals sind im aktuellen Schema add-only.

Siehe [Semantic Proposal Core](semantic-proposal-core.md).

### Konflikt- und Drift-Bewertung

Der Repository-Quellstand stellt bereit:

```text
livariant drift --input <observation.json>
livariant drift --input <observation.json> --json
```

sowie die Runtime-API `buildConflictDriftAssessment()`.

Die aktuelle begrenzte read-only Bewertung akzeptiert genau eine explizite Observation in den Decision-, Goal- oder Knowledge-Domänen mit Evidence-Klassen `dependent-current`, `historical` oder `provider-observation`.

Die vertrauenswürdige Diagnosemenge umfasst `consistent`, `confirmed-drift`, `historical-match`, `authority-ambiguous` und `insufficient-evidence`. Abweichender Text allein ist niemals Beweis für Widerspruch oder Drift. Die Ausgabe bleibt abgeleitete Review-Evidence ohne Mutationsautorität.

Dieser Slice scannt das Repository nicht automatisch und wendet oder autorisiert keine Änderung.

Siehe [Konflikt- und Drift-Bewertung](conflict-drift-assessment.md).

### Provider Context Foundation

Der Repository-Quellstand stellt bereit:

```text
livariant provider-context --provider claude-code --task <task.txt>
livariant provider-context --provider codex --task <task.txt>
livariant provider-context --provider <provider> --task <task.txt> --json
```

sowie die Runtime-API `buildProviderContext()`.

Provider Context verbindet kohärente aktuelle Project-Brain-Evidence mit genau einer begrenzten expliziten externen Aufgabe. Task-Material bleibt `session-ephemeral` und kann weder kanonische Wahrheit noch stabile Projektidentität, Zustimmung, Safety-State oder Mutationsautorität behaupten.

Provider-Auswahl ändert nur das Projektionsziel. Kopierte oder vom Provider zurückgegebene Pakete gelten später nicht als vertrauenswürdige kanonische Eingabe. Die Funktion injiziert Kontext nicht automatisch in Claude Code oder Codex und ergänzt weder Provider-Transport noch persistente Provider-Writes.

Siehe [Provider Context Foundation](provider-context-foundation.md).

### Stable Project Identity Foundation

Der aktuelle Post-RC3-Quellstand verwendet Project-Brain-Schema 2 mit genau einer erforderlichen kanonischen UUID in `projectBrain.projectId`.

Frische Schema-2-Initialisierung erzeugt die Identität lokal aus vertrauenswürdiger Runtime-Zufälligkeit. Bestehende Schema-1-Project-Brains erhalten Identität nur über die ausdrückliche unterstützte `1 -> 2`-Lifecycle-Migration. Reads erzeugen oder reparieren Identität nicht stillschweigend; fehlerhafte Schema-2-Identität bricht geschlossen ab.

Die ID identifiziert eine logische Project-Brain-Linie, nicht einen physischen Checkout, eine Maschine, Provider-Session oder User-Session. Verschieben oder Kopieren eines Project Brain macht sie weder zur eindeutigen physischen Identität noch zur Mutationsautorität.

Siehe [Stable Project Identity Foundation](stable-project-identity-foundation.md).

### Proposal-bound Authorization Foundation

Der aktuelle Post-RC3-Quellstand stellt zusätzlich bereit:

```text
livariant prepare --input <candidate.json>
livariant prepare --input <candidate.json> --json
livariant authorize --input <actionable-proposal.json>
livariant authorize --input <actionable-proposal.json> --json
```

`prepare` erzeugt ein strukturell getrenntes Actionable Proposal, gebunden an exakte logische Projektidentität, materiale Project-Brain-Baseline, normalisierten Mutation Scope und deterministischen Material-Digest. Es autorisiert oder appliziert die Änderung nicht.

`authorize` ist eine separate ausdrückliche lokale User-Presence-Operation. Die unterstützte CLI verlangt ein interaktives TTY und exakte Challenge-Bestätigung. Projektfelder, Provider-Behauptungen, kopierte Pakete, passende Identität, Environment-Flags oder Gesprächshistorie können dieses Ereignis nicht ersetzen.

Aufgezeichnete Authority verwendet passende projektlokale Lifecycle-/Audit-Evidence und unabhängige machine-local Evidence außerhalb der Projektkontrolle. Beide binden dieselbe Authorization-ID, dasselbe Actionable Proposal, Projektidentität, Baseline und Mutation Scope. Fehlende, fehlerhafte oder widersprüchliche Evidence bricht geschlossen ab.

Der Lifecycle unterscheidet `authorized`, `applying`, `completed`, `failed-recovery-required` und `invalidated`. Consumption-Locking verhindert parallelen Replay. Terminale Authority kann durch kopierte Records nicht wieder zu nutzbarer Zustimmung werden.

`prepare` und `authorize` selbst führen null semantische Mutationen aus.

Siehe [Proposal-bound Authorization Foundation](proposal-bound-authorization.md).

### Semantic Apply

Der aktuelle Post-RC3-Quellstand stellt bereit:

```text
livariant apply --authorization <authorization-id> --input <actionable-proposal.json>
livariant apply --authorization <authorization-id> --input <actionable-proposal.json> --json
```

sowie die Runtime-API `applyActionableProposal()`.

Semantic Apply unterstützt nur Decision Add, Decision Supersede, Confirmed-Goal Add und Confirmed-Knowledge Add. Review-only Semantic-Proposal-JSON und rohe Candidate-JSON sind kein Ersatz für ein Actionable Proposal.

Ein frisches Apply prüft exakte Proposal-Identität, stabile logische Projektidentität, materiale Baseline, Scope, projektlokale Authorization-Evidence und passende machine-local Authority erneut. Authority wird vor Beginn der semantischen Mutation zu `applying` verbraucht.

Die Implementierung verwendet bestehende semantische Writer weiter und erhält Managed-Path-Confinement, Regular-File-/Symlink-Safety, Exact-Original-Concurrency-Schutz, atomare Promotion und Writer-Verifikation. Unmittelbar vor Promotion wird die exakte autorisierte Baseline erneut geprüft.

Normale Same-Process-Completion beweist zusätzlich das **exakte Managed Delta**: Jeder nicht betroffene verwaltete Project-Brain-Input muss byte-identisch zum vertrauenswürdigen Pre-State dieses Aufrufs bleiben, das exakte autorisierte semantische Ziel muss verifiziert werden, und der vollständige verifizierte verwaltete Post-State muss bis zur terminalen Authority-Completion stabil bleiben. Diese Pre-/Post-Bytes bleiben flüchtig und werden kein neues Recovery-Trust-Substrat.

Crash-Time-Proof bleibt bewusst enger. Nach einer Prozessgrenze ist die flüchtige Exact-Delta-Evidence nicht mehr verfügbar. Changed-Baseline-/Post-Mutation-Splits bleiben deshalb fail-closed/recovery-required, solange keine separat akzeptierte vollständige dauerhafte Post-State-Evidence vorliegt. Dass der gewünschte Satz vorhanden ist, reicht nicht für einen Crash-Time-Erfolgsclaim.

Auch die Apply-CLI vermeidet einen falschen Null-Write-Claim, wenn die exakte Authorization bereits in einem aktiven oder recovery-required Lifecycle stehen könnte; Recovery-Unsicherheit wird ausdrücklich gemeldet.

Siehe [Semantic Apply](semantic-apply.md).

### Agent-Assisted Semantic Maintenance

Der aktuelle Post-RC3-Quellstand ergänzt die provider-neutrale Kompositionsoberfläche:

```text
livariant maintain --input <candidate.json>
livariant maintain --input <candidate.json> --json
livariant maintain --input <candidate.json> --authorization <authorization-id>
livariant maintain --input <candidate.json> --authorization <authorization-id> --json
```

sowie die Runtime-API `maintainSemanticProjectState()`.

`maintain` koordiniert vorhandene Primitive für genau einen expliziten Candidate. Es kann strukturierte Zustände `review-required`, `authorization-required`, `blocked`, `completed` oder `completed-context-blocked` zurückgeben.

Ohne explizite Authorization-ID verbraucht es niemals implizit eine vorhandene passende Authority. Ein zulässiger Candidate liefert das exakt rekonstruierte Actionable Proposal und benötigt den separaten bestehenden `livariant authorize`-User-Presence-Pfad. Der Command erzeugt keine Authority und startet intern keine TTY-Authorization-Challenge.

Mit expliziter Authorization-ID ist die ID lediglich ein Selektor vorhandener Authority. Der aktuelle Candidate wird aus aktuellem kanonischem Zustand neu rekonstruiert, und ausschließlich der bestehende Semantic-Apply-Pfad darf exakt passende Authority verbrauchen. Alle WP-008/WP-009-Replay-, Recovery-, Locking-, Baseline-, Scope-, Project-Identity- und Exact-Delta-Regeln bleiben maßgeblich.

Nach erfolgreichem Apply baut Livariant einen frischen Project Context Snapshot aus dem kanonischen Post-State auf. Wenn die Mutation abgeschlossen ist, der frische Context aber blockiert, lautet der Zustand `completed-context-blocked`: Die Mutation bleibt terminal und nicht replaybar, während Livariant keinen sauberen aktualisierten Context behauptet.

Diese Komposition ergänzt keine automatische Candidate-Erkennung, keinen Provider-Transport/Injection, keine provider-spezifische Zustimmung, keine Standing-/Wildcard-Authorization, keine beliebigen Repository-Writes, keine neuen semantischen Domänen, keine Batch-Mutation und kein Project-Lexicon-Rename-Verhalten.

Siehe [Agent-Assisted Semantic Maintenance](semantic-maintenance.md).

Diese Post-RC3-Funktionen werden nicht rückwirkend Bestandteil des unveränderlichen RC3-Releases. Sie werden erst durch ein späteres, separat freigegebenes Release zu verteilten Release-Funktionen.

Die aktuellen Post-RC3-Oberflächen ergänzen weiterhin **nicht**:

- provider-getriebene, automatische, Wildcard- oder Standing-Mutationsautorität;
- eindeutige Checkout-Identität oder Authority-Transfer durch Kopieren von Project-Brain-Bytes;
- Project-Fork-, Split-, Merge- oder Project-ID-Replacement-Semantik;
- automatisches Drift-Scanning oder automatische Drift-Reparatur;
- Terminologie-Persistenz oder Canonical-Rename-Workflows;
- Provider-Transport oder automatische Kontextinjektion;
- LLM-basierte semantische Gleichwertigkeit;
- autonome Candidate-Erkennung;
- Goal- oder Knowledge-Ersetzung, -Löschung oder -Supersession;
- zusätzliche Proposal-/Apply-Domänen außerhalb des dokumentierten Schema-Version-1-Sets;
- Batch- oder Multi-Proposal-Mutationstransaktionen.

## Provider-Support ist bewusst begrenzt

Die veröffentlichte Preview unterstützt Claude Code und Codex für Project-Brain-Resume-Handoff.

Die Provider-Anwendbarkeit verwendet `LIVARIANT_PROVIDER_ENV`. Provider-Auswahl bezeichnet das unterstützte Resume-Ziel; sie erteilt keine Ausführungs- oder Mutationsautorität.

Livariant beansprucht nicht, jede Provider-Funktion, Modellauswahl, Authentifizierungsmethode, native Instruktionsdatei oder Provider-Memory-Oberfläche zu verwalten.

Die Post-RC3 Context-, Proposal-, Drift-, Stable-Identity-, Authorization-, Semantic-Apply- und Semantic-Maintenance-Oberflächen sind provider-neutrale Grundlagen oder lokale nutzergesteuerte Operationen. Provider Context ist eine providerbezogene read-only Projektion. Keine davon behandelt Provider-Ausgabe oder providerseitige Zustimmungsbehauptungen als Livariant-Mutationsautorität.

## Semantische Wissenspflege

Die Foundation Preview selbst unterstützt klar begrenzte wiederholte Änderungen an dauerhafter Project-Brain-Wahrheit:

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

Unterstützte Writes verlangen einen gültigen gesunden Project Brain, bleiben innerhalb verwalteter Project-Brain-Grenzen, lehnen unsichere Topologie ab, verwenden atomare Ersetzung mit Exact-Original-Concurrency-Prüfung und verifizieren persistierten Zustand vor Erfolg. Duplicate Adds schlagen fehl, statt bestehenden Truth still zu normalisieren. Decision Supersession erhält die alte Decision als Historie.

Livariant beobachtet Gespräche nicht automatisch und entscheidet nicht selbst, welche KI-Ausgabe dauerhafte Projektwahrheit werden soll.

## Update- und Migrationssupport

`livariant update --manifest <path>` plant nur, solange `--apply` fehlt.

Zum Anwenden eines geprüften Updates werden außerdem das passende lokale Runtime-Artefakt und mindestens ein expliziter `--trusted-source` benötigt. Das Release-Manifest kann seine eigene Quelle nicht selbst vertrauenswürdig machen; für ausführbare Update-Installation ist zusätzlich unabhängige machine-local Release Authority für den exakten Artefakt-Digest erforderlich.

Projektdateien, Manifeste, `--trusted-source` und projektseitige Commands können diese Runtime-Release-Authority nicht erzeugen. Einen projektseitigen `authorize-runtime`-Befehl gibt es absichtlich nicht.

Schema-ändernde kompatible Releases verwenden den Migration-Lifecycle. Der aktuell belegte Schema-Pfad ist `1 -> 2`; aktueller Post-RC3-Quellstand erzeugt stabile logische Projektidentität innerhalb der bestehenden Checkpoint-/Journal-/Validation-/Activation-/Recovery-Transaktion. Nicht unterstützte Pfade brechen geschlossen ab.

> [!WARNING]
> Das manuelle Ersetzen von Project-Brain-Dateien, framework-verwaltetem Lifecycle-State, Schema-/Versionsmetadaten, stabiler Projektidentität, installierten Runtime-Dateien, Runtime-Trust-Records, Release-Authorization-Records oder semantischen Authorization-Audit-Records ist kein unterstützter Authority- oder Update-Weg.

## Wiederherstellung

`livariant recover` ist standardmäßig read-only. `livariant recover --apply` autorisiert einen validierten Rollback-Plan separat.

Automatische Wiederherstellung bleibt gesperrt, wenn dauerhafte Lifecycle-Evidenz oder der Checkpoint fehlt, verschoben, verändert oder mehrdeutig ist. Nach verifiziertem Rollback wird der wiederhergestellte Project-Brain-Zustand committed, bevor verdrängter Recovery-State entfernt wird; das Löschen des letzten Checkpoints bleibt der letzte irreversible Cleanup-Schritt.

## Keine versprochene Wunderreparatur

Livariant verspricht keine automatische Reparatur beliebiger beschädigter, manuell umgeschriebener oder mehrdeutiger Project-Brain-Zustände. Wenn sichere Semantik nicht hergestellt werden kann, darf Diagnose bewusst stoppen und menschliche Klärung verlangen.

## Local-first bedeutet nicht vertrauensfrei

Normale Project-Brain-Nutzung ist local-first und braucht kein Livariant-Cloud-Konto.

Release-/Update-Authority und semantische Mutationsautorität verwenden unabhängige machine-local Evidence, wo ihre jeweiligen Verträge dies verlangen. Projektkontrollierte Bytes können diese Trust Roots nicht selbst erzeugen.

Die aktuelle Runtime implementiert keine Livariant-Telemetrie, keinen automatischen Project-Brain-Upload und keinen automatischen Remote-Update-Check. Siehe [Datenschutz & Netzwerkverhalten](privacy-and-network.md).

## Öffentliche Distribution

Das kanonische Repository ist unter `Kryt3r/livariant` öffentlich. Preview-Releases werden über GitHub Releases aus diesem Repository mit erwarteter Source-Identität `github:Kryt3r/livariant` verteilt.

Das Release-Tooling erzeugt einen konkreten Runtime-Tarball, ein maschinenlesbares Manifest gebunden an den exakten Artefakt-SHA-256 und `SHA256SUMS`; CI verifiziert das Release-Bundle gegen einen sauberen Consumer.

`v0.1.0-rc.1` und `v0.1.0-rc.2` bleiben historische Evidenz. RC2 enthält Pre-Public-Text und ältere Bundle-Bytes und darf nicht überschrieben oder als aktuell dargestellt werden. `v0.1.0-rc.3` ist das aktuell veröffentlichte Foundation Preview. Spätere Repository-Änderungen verändern weder Tag noch Release-Text oder Artefakte dieses Releases.

Für die aktuelle Preview wird kein npm-Publishing-Pfad behauptet.

## Lizenz, Sicherheit, Datenschutz, Beiträge und Support

Zum Preview-Repository gehören `LICENSE`, `THIRD_PARTY_NOTICES.md`, `SECURITY.md`, `CONTRIBUTING.md`, `SUPPORT.md` sowie die paarigen Lizenz-/Datenschutz-/Support-Dokumente.

Livariant ist source-available und wird nicht als OSI-zertifiziertes Open Source angeboten. Externe Code-Beiträge bleiben ausgesetzt, bis Contributor-Rechte finalisiert sind, die mit dem source-available und zukünftigen kommerziellen Lizenzmodell vereinbar sind.

GitHub Private Vulnerability Reporting, Dependabot Alerts, CodeQL, Secret Scanning, Push Protection, restriktive Actions-Berechtigungen, das main Ruleset und das Release-Tag Ruleset sind für das öffentliche Repository aktiviert.

## Was Preview bedeutet

Public Preview bedeutet:

- die unterstützte Oberfläche ist bewusst begrenzt;
- bekannte Einschränkungen sollen ausdrücklich dokumentiert werden;
- Breaking Changes können unter den dokumentierten Preview- und SemVer-Regeln noch vorkommen;
- Authority und Projektmutationsumfang dürfen nicht stillschweigend wachsen;
- unterstützte Pfade sollen durch ausführbare Evidence belegt sein, statt pauschal jede Umgebung zu versprechen.

Preview-Support ist Maintainer- und Community-Support ohne bezahlten SLA, sofern nichts anderes separat vereinbart wurde. Der spätere 1.0-Stabilitäts- und Kompatibilitätsvertrag braucht eine eigene Readiness-Entscheidung.
