# Agent-Assisted Semantic Maintenance

Agent-Assisted Semantic Maintenance ist eine post-RC3 provider-neutrale Kompositionsschicht über Livariants bestehenden Active-Project-Intelligence-Primitiven.

Sie reduziert manuelle Orchestrierung, ohne zu ändern, wem Project Truth gehört oder wer Mutation autorisieren darf.

Diese Fähigkeit ist Repository-Entwicklung nach dem unveränderlichen Foundation-Preview-Release `v0.1.0-rc.3`.

## Aktuelle Oberfläche

```text
livariant maintain --input <candidate.json>
livariant maintain --input <candidate.json> --json
livariant maintain --input <candidate.json> --authorization <authorization-id>
livariant maintain --input <candidate.json> --authorization <authorization-id> --json
```

Runtime-API:

```text
maintainSemanticProjectState()
```

Der Command akzeptiert exakt einen Candidate im bestehenden strikt geparsten Semantic-Proposal-Candidate-Schema.

## Was die Oberfläche komponiert

Der Workflow verwendet vorhandene vertrauenswürdige Primitive:

```text
expliziter Candidate
-> Semantic-Proposal-Rekonstruktion
-> Actionable-Proposal-Rekonstruktion, wenn zulässig
-> separate bestehende Authorization-Grenze
-> bestehendes Semantic Apply bei explizit angegebener Authorization-ID
-> frische Project-Context-Rekonstruktion nach erfolgreichem Apply
```

Er führt weder eine zweite Proposal-Engine noch eine neue Authority-Quelle, einen zweiten semantischen Writer oder einen neuen Recovery-Mechanismus ein.

## Ergebniszustände

### `review-required`

Der Candidate ist bereits erfüllt/dupliziert oder bleibt nach den aktuellen begrenzten Regeln ein reines Review-Ergebnis.

Eigenschaften:

- null semantische Mutation;
- null Authority-Erzeugung;
- null Authority-Consumption;
- Review-Evidence wird zurückgegeben.

### `authorization-required`

Der Candidate rekonstruiert aktuell ein exaktes Actionable Proposal, aber es wurde keine Authorization-ID angegeben.

Eigenschaften:

- gibt das exakt rekonstruierte Actionable Proposal zurück;
- null semantische Mutation;
- keine implizite Authority-Erzeugung;
- kein impliziter Verbrauch einer eventuell bereits vorhandenen passenden Authority;
- der Benutzer muss den separaten unterstützten `livariant authorize`-Pfad verwenden.

Die CLI verwendet dafür einen unterscheidbaren Nicht-Erfolgszustand, sodass Integrationen diesen Fall nicht über Human-Text erkennen müssen.

### `blocked`

Aktueller Projektzustand, Candidate-/Proposal-Rekonstruktion, Authority-Evidence, Baseline, Identität, Scope, Replay-Zustand oder Recovery-Zustand unterstützen den angeforderten nächsten Schritt nicht sicher.

Solange nachweisbar keine Authority-Consumption erreicht werden konnte, darf ein blockiertes Ergebnis `semanticChangesMade: 0` melden.

Wenn die ausgewählte Authorization bereits in einen aktiven oder recovery-required Lifecycle eingetreten sein könnte, rät der Composer keinen Null-Write-Ausgang. Er macht die Recovery-Unsicherheit ausdrücklich sichtbar.

### `completed`

Nur zulässig, wenn der aktuelle Candidate exakt das autorisierte Actionable Proposal rekonstruiert, die angegebene Authorization-ID die bestehenden WP-008/WP-009-Prüfungen besteht, Semantic Apply genau eine unterstützte Mutation erfolgreich abschließt und danach ein frischer Project Context Snapshot `clear` ist.

Der zurückgegebene Context wird nach der Mutation neu aus dem kanonischen Project Brain aufgebaut; er wird nicht aus einem alten Caller-Paket fortgeschrieben.

### `completed-context-blocked`

Semantic Apply ist erfolgreich abgeschlossen und Authority ist bereits terminal `completed`, aber die anschließende frische Project-Context-Rekonstruktion ist blockiert.

Dieser Zustand ist bewusst von `completed` und von einem Pre-Apply-`blocked` getrennt. Er meldet eine abgeschlossene semantische Mutation, verweigert aber den Claim eines sauberen aktualisierten Context. Die abgeschlossene Authority ist nicht replaybar.

## Authorization-Grenze

`maintain` erzeugt niemals Mutation Authority.

Der unterstützte Consent-Ablauf bleibt:

```text
livariant maintain --input candidate.json
-> authorization-required + exaktes Actionable Proposal

livariant authorize --input actionable-proposal.json
-> explizite lokale User-Presence-Authorization

livariant maintain --input candidate.json --authorization <id>
-> darf an bestehendes Semantic Apply delegieren
```

Die Authorization-ID ist nur ein Selektor. Sie ist für sich kein Authority-Beweis.

Candidate, Provider-Paket, Provider-Behauptung, passende Project ID, kopierter projektlokaler Audit-Record oder frühere Gesprächszustimmung können das separate Livariant-eigene Authorization-Ereignis nicht ersetzen.

Wenn sich Candidate, Project Identity, Baseline, Proposal Digest oder Mutation Scope seit der Authorization geändert haben, schlagen die bestehenden Prüfungen fail-closed fehl.

## Kein impliziter Authority-Verbrauch

Ein Aufruf von `maintain` ohne `--authorization` sucht und verbraucht niemals implizit eine vorhandene passende Authorization.

Das ist bewusst so. Ein komfortabler Orchestrierungs-Command wird nicht zu Standing Permission, nur weil zufällig schmale Authority vorhanden ist.

## No-op- und Duplicate-Grenze

Wenn die bestehende Semantic-Proposal-Logik feststellt, dass eine exakt aktive Decision, ein bestätigtes Goal oder bestätigtes Knowledge den Candidate bereits erfüllt, stoppt `maintain` vor Actionable-Proposal-Consumption und liefert einen nicht-mutierenden Review-Zustand.

Stale oder unpassende Authority wird nicht verbraucht, nur weil Text einer bereits erfüllten Anfrage entspricht.

## Replay-, Recovery- und Exact-Delta-Grenze

Wenn `maintain` Mutation erreicht, ruft es den bestehenden `applyActionableProposal()`-Pfad auf. Alle bestehenden Regeln bleiben maßgeblich, darunter:

- machine-local Authority-Consumption-Locking;
- terminale Replay-Resistance;
- exakte Proposal-/Project-/Baseline-/Scope-Bindung;
- Pre-Mutation-Reconciliation nur, solange der exakte autorisierte Pre-State reproduzierbar ist;
- Same-Process Exact-Managed-Delta- und Stabilitätsprüfung;
- `failed-recovery-required` nach Authority-Consumption;
- kein Post-Crash-Erfolgsclaim allein aus gewünschtem semantischem Text;
- kein Zurücksetzen terminaler Authority auf `authorized`.

Der Composer führt keinen Checkpoint, kein Journal, kein Recovery-Trust-Objekt und keinen alternativen Repair-Pfad ein.

## Provider-Neutralität

Die Core-Oberfläche ist provider-neutral. CLI-Nutzer, künftige MCP-Adapter, Desktop-Anwendungen oder Provider-Integrationen können sie aufrufen, aber Provider-Identität ist keine Authority.

WP-010 fügt nicht hinzu:

- automatische Candidate-Erkennung aus Gesprächen oder Modell-Output;
- Provider-Transport oder automatische Injection;
- provider-spezifische Zustimmung;
- Remote Execution;
- Standing-/Wildcard-Authorization.

## Unterstützter Mutation Scope

Die Komposition erreicht nur die bereits von Actionable Proposal + Semantic Apply unterstützten semantischen Domänen:

- Decision Add;
- Decision Supersede;
- Confirmed Goal Add;
- Confirmed Knowledge Add.

Sie ergänzt keine beliebigen Repository-Writes, Terminology Rename, Batch-Mutation, Goal-/Knowledge-Replace/Delete oder ein neues semantisches Schema.

## CLI-Exit-State-Grenze

Der Command liefert deterministische maschinenlesbare Workflow-Zustände. Human-/JSON-Verhalten unterscheidet aktuell mindestens:

- erfolgreich abgeschlossen;
- Review erforderlich;
- Authorization erforderlich;
- blocked/recovery-required;
- Mutation abgeschlossen, aber aktualisierter Context blockiert.

Caller sollten auf strukturierten State reagieren und Authority oder Erfolg nicht aus Prosa ableiten.

## Release-Grenze

Agent-Assisted Semantic Maintenance ist nicht Bestandteil von `v0.1.0-rc.3`.

RC3 bleibt unveränderlich. Die Verteilung dieser post-RC3-Fähigkeit benötigt einen separat genehmigten Release-Prozess.
