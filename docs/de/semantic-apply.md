# Semantic Apply

Semantic Apply ist eine post-RC3-Fähigkeit von Active Project Intelligence. Sie verbraucht genau eine WP-008 Proposal-bound Authorization und führt genau eine unterstützte kanonische semantische Project-Brain-Änderung aus.

Diese Fähigkeit ist Repository-Entwicklung nach dem unveränderlichen Foundation-Preview-Release `v0.1.0-rc.3`.

## Aktuelle Oberfläche

```text
livariant apply --authorization <authorization-id> --input <actionable-proposal.json>
livariant apply --authorization <authorization-id> --input <actionable-proposal.json> --json
```

High-Level-Runtime-API:

```text
applyActionableProposal()
```

Als Eingabe ist exakt das autorisierte Actionable Proposal erforderlich. Candidate-JSON und das dauerhaft review-only Semantic Proposal sind kein Ersatz.

## Unterstützte semantische Operationen

Das aktuelle begrenzte Schema unterstützt exakt:

- `project-decision` / `add`;
- `project-decision` / `supersede`;
- `project-goal` / `add`;
- `project-knowledge` / `add`.

Semantic Apply führt weder eine neue semantische Domäne noch einen generischen beliebigen Dateischreibmechanismus ein.

## Authority-Grenze

Semantic Apply erzeugt oder errät keine Mutation Authority.

Ein frischer Apply-Vorgang benötigt die vorhandene WP-008 Dual-Evidence-Authority passend zu exakt:

- Authorization-ID;
- Identität und Digest des Actionable Proposal;
- stabiler logischer Project-Brain-Identität;
- materiellem Project-Brain-Baseline;
- normalisiertem Mutation Scope;
- projektlokaler Authorization-Lifecycle-Evidence;
- unabhängiger machine-local Authorization Receipt.

Projektlokale Bytes allein, Provider-Behauptungen, kopierte Pakete, Stable Project Identity, Review-only-Proposal-Ausgabe, übereinstimmender Text oder frühere Gesprächszustimmung können Apply nicht autorisieren.

## Ablauf eines frischen Apply

Der unterstützte normale Ablauf ist:

```text
Actionable Proposal strikt parsen
-> aktuelles vertrauenswürdiges Proposal und Baseline rekonstruieren
-> exakten dual-evidence authorized state verifizieren
-> Authority verbrauchen: authorized -> applying
-> exaktes Pre-Mutation-Proposal/Baseline erneut validieren
-> den verwalteten Pre-State dieses Aufrufs nur flüchtig im Speicher halten
-> bestehenden unterstützten semantischen Writer vorbereiten
-> unmittelbar vor atomarem Promote erneut validieren
-> nur die exakt autorisierte semantische Mutation promoten
-> beweisen, dass alle nicht betroffenen verwalteten Project-Brain-Inputs byte-identisch geblieben sind
-> exakten autorisierten semantischen Zielzustand erneut lesen und strukturell verifizieren
-> vollständigen verifizierten verwalteten Post-State nur flüchtig im Speicher erfassen
-> unmittelbar vor terminaler Completion erneut Byte-Identität des vollständigen verwalteten Zustands beweisen
-> Authority abschließen: applying -> completed
```

Authority wird vor Beginn der semantischen Mutation nicht mehr wiederverwendbar.

Die flüchtigen Pre-/Post-Bytes existieren nur für den aktuellen vertrauenswürdigen Prozess. WP-009 persistiert sie nicht als neuen Recovery-Checkpoint, Journal, Authority-Quelle oder machine-local Trust-Objekt.

## Bestehende semantische Writer bleiben für die Mutation maßgeblich

Semantic Apply komponiert die vorhandenen Decision-, Goal- und Knowledge-Mutationen, statt einen zweiten Project-Brain-Writer einzuführen.

Dadurch bleiben die bestehenden Grenzen aktiv, darunter:

- Begrenzung auf verwaltete Pfade;
- Regular-File- und Symlink-Sicherheit;
- Exact-original Optimistic-Concurrency-Prüfungen;
- atomarer Dateiaustausch;
- Erhalt nicht betroffener menschlich gepflegter Inhalte;
- Duplicate-Rejection;
- strukturierte Decision-Historie und Supersession-Semantik;
- Writer-seitige Post-Write-Verifikation.

Das Actionable Proposal bestimmt, welche Mutation versucht werden darf. Der aktuelle kanonische Project-Brain-Zustand bestimmt weiterhin, ob genau dieser Versuch noch gültig ist.

## Verifikation vor `completed`

Eine normale Same-Process-Completion verlangt mehr, als dass das gewünschte semantische Statement lediglich vorhanden ist.

Livariant verifiziert:

- jeder nicht betroffene verwaltete Project-Brain-Input bleibt byte-identisch zum exakten Pre-State dieses Aufrufs;
- Decision Add: exakt eine aktive strukturierte Decision mit dem autorisierten Statement;
- Decision Supersede: das exakt autorisierte Ziel ist superseded und verweist auf exakt eine aktive Replacement-Decision;
- Goal Add: exakt ein passendes bestätigtes Goal im Confirmed-Goal-Bereich;
- Knowledge Add: exakt ein passender bestätigter Fakt im bestätigten Project Knowledge;
- der vollständige verwaltete Project-Brain-Zustand bleibt vom verifizierten Post-State bis unmittelbar vor Authority-Completion byte-identisch.

Scheitert eine dieser Prüfungen nach Beginn des Authority-Verbrauchs, bleibt Semantic Apply unter den bestehenden `failed-recovery-required`-Regeln fail-closed, statt erfolgreiche Completion zu melden.

## Failure- und Replay-Grenze

Wenn nach Beginn des Authority-Verbrauchs ein Fehler auftritt, kehrt Authority niemals zu `authorized` zurück.

Der normale Failure-Übergang ist:

```text
applying -> failed-recovery-required
```

Eine abgeschlossene oder fehlgeschlagene Authorization ist terminal und kann nicht als neuer Mutation-Token wiederverwendet werden.

Gleichzeitige Consumer teilen den WP-008 machine-local Transition Lock. Zwei Consumer mit derselben logischen Project-Brain-Identität können dadurch dieselbe Authorization nicht gleichzeitig erfolgreich verbrauchen.

## Unterbrochene Pre-Mutation-Reconciliation

WP-008 verbraucht bewusst zuerst die machine-local Evidence und danach die projektlokale Evidence. Ein Crash kann deshalb beispielsweise hinterlassen:

```text
project-local: authorized
machine-local: applying
```

oder:

```text
project-local: applying
machine-local: applying
```

Semantic Apply darf diese Zustände nur fortsetzen, wenn der aktuelle Project Brain weiterhin das **exakte ursprüngliche Actionable-Proposal-Pre-Mutation-Baseline** reproduziert. Dann beweist der exakte Pre-State, dass die semantische Mutation noch nicht committed wurde.

Erlaubte Forward-Aktionen sind ausschließlich:

- projektlokal `authorized -> applying` ausrichten, wenn passende machine-local Evidence bereits `applying` ist;
- aus passendem `applying/applying` fortsetzen;
- die exakt autorisierte semantische Mutation genau einmal ausführen.

Machine-local Authority wird niemals auf `authorized` zurückgesetzt. Ein aktiver oder unterbrochener machine-local Transition Lock blockiert Reconciliation.

## Proof-Grenze nach einer Mutation

Der Same-Process-Exact-Delta-Beweis ist bewusst flüchtig. Nach einer Prozessgrenze steht er nicht mehr als dauerhafte Recovery-Evidence zur Verfügung.

Das Actionable-Proposal-Baseline beweist den exakten autorisierten Pre-Mutation-Zustand, bewahrt nach einer Mutation aber nicht die alten Bytes jeder einzelnen verwalteten Oberfläche. Deshalb beweist eine scheinbar korrekte semantische Postcondition wie „das angeforderte Goal existiert“ nach einem Crash **nicht**, dass alle übrigen verwalteten Project-Brain-Flächen unverändert geblieben sind.

Semantic Apply bleibt bei unterbrochenen Zuständen mit geändertem Baseline bewusst fail-closed, statt aus gewünschtem Text Erfolg abzuleiten.

Insbesondere wird ein Split wie:

```text
project-local: applying
machine-local: completed
```

nach einer Prozessgrenze nicht automatisch zu projektlokal `completed`, nur weil das gewünschte Statement vorhanden ist.

Für automatische Post-Crash-Completion wäre separat akzeptierte, vertrauenswürdige und dauerhafte Exact-Delta-Evidence nötig. WP-009 führt ein solches Trust-Substrat nicht stillschweigend ein.

## Forward-only Failure-Reconciliation

Wenn machine-local Failure-Terminalisierung zuerst abgeschlossen wurde und projektlokale Evidence noch `applying` ist:

```text
project-local: applying
machine-local: failed-recovery-required
```

kann bei vollständig passendem Binding die projektlokale Evidence ohne semantische Mutation vorwärts zu terminal `failed-recovery-required` ausgerichtet werden.

Das ist ausschließlich Failure-State-Buchführung. Es repariert keinen kanonischen Project-Brain-Zustand und macht Authority nicht erneut verwendbar.

## Nicht unterstützte und mehrdeutige Zustände

Nicht unterstützte oder nicht ausreichend beweisbare Zustände bleiben fail-closed. Beispiele:

- geändertes kanonisches Baseline nach Authority-Consumption;
- `project=authorized / machine=completed`;
- `project=applying / machine=authorized`;
- `project=applying / machine=completed` ohne vollständigen vertrauenswürdigen Post-State-Beweis;
- abweichende Proposal-/Project-/Scope-/Baseline-Bindings;
- fehlende Seite der Dual Evidence;
- widersprüchliche project active/history records;
- unsichere verwaltete Filesystem-Topologie;
- aktive machine-local Transition Locks.

Semantic Apply rät nicht, welche Seite gewinnen soll.

## Output-Grenze

Ein normal erfolgreicher Aufruf meldet sinngemäß:

```text
state: completed
mutationAuthorizationConsumed: true
semanticChangesMade: 1
```

Fehler, die nachweislich auftreten, bevor ein gültiges Actionable Proposal Authority-Consumption erreichen kann, dürfen melden:

```text
recoveryRequired: false
mutationOutcome: not-applied
semanticChangesMade: 0
```

Sobald die exakte Authorization bereits in einem aktiven oder recovery-required Lifecycle stehen könnte, behauptet die CLI **nicht** pauschal null Writes. Sie macht die Unsicherheit ausdrücklich sichtbar, zum Beispiel:

```text
recoveryRequired: true
mutationOutcome: unknown-recovery-required
semanticChangesMade: unknown
```

Der Command stellt einen ungeklärten Recovery-Zustand nicht als erfolgreiche Completion dar und verwendet einen `0`-Mutation-Claim nicht als Ersatz für fehlende Evidence.

## Komposition über `maintain`

Post-RC3-Repository-Entwicklung enthält zusätzlich die separate provider-neutrale Semantic-Maintenance-Oberfläche, dokumentiert unter [Agent-Assisted Semantic Maintenance](semantic-maintenance.md).

`maintain` erzeugt keine Authority. Ohne explizite Authorization-ID kann die Oberfläche nur Review-/Actionable-State rekonstruieren und `review-required` oder `authorization-required` zurückgeben. Mit expliziter Authorization-ID delegiert sie die Mutation an diesen bestehenden Semantic-Apply-Pfad; damit bleiben alle WP-008/WP-009-Replay-, Recovery-, Exact-Delta- und Terminal-State-Regeln maßgeblich.

## Nicht-Ziele

Semantic Apply implementiert nicht:

- automatische Candidate-Erkennung;
- automatische Drift-Reparatur;
- provider-ausgelöste oder provider-genehmigte Mutation;
- Standing-/Wildcard-Authorization;
- Batch-/Multi-Proposal-Apply;
- beliebige Repository-Dateimutationen;
- Terminology-Lifecycle-Persistenz oder Canonical Rename;
- Provider-Transport oder automatische Injection;
- eindeutige physische Checkout-Identität;
- generische Authorization-Reparatur;
- einen neuen vertrauenswürdigen Post-Crash-Checkpoint bzw. ein neues Journal;
- Release, Tag oder Package Publication.

## Release-Grenze

Semantic Apply ist nicht Bestandteil von `v0.1.0-rc.3`.

RC3 bleibt unveränderliche historische Release-Evidence. Ein verteiltes Release mit Semantic Apply benötigt einen separat genehmigten Release-Prozess.
