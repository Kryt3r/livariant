# Existing-Project-Adoption: Authorization Consumption

Dieser WP-053-Slice verbindet den materialgebundenen Existing-Project-Adoption-Handoff mit Livariants bestehender proposal-bound Authorization-Lifecycle. Es wird kein zweiter Authority-Mechanismus eingeführt.

## Grenzfolge

```text
begrenzte Repository-Evidence
-> explizite Review-Entscheidungen
-> deterministisches Adoption-Proposal
-> explizite semantische Projektion
-> Adoption-Authorization-Handoff
-> frische Handoff-Revalidierung
-> bestehende Actionable-Proposal-Authorization-Lifecycle
-> separates Semantic Apply
```

Jeder Pfeil bleibt eine eigene Grenze. Evidence ist nicht Project Truth. Ein Adoption-Proposal ist keine Authorization. Ein Adoption-Authorization-Handoff ist keine Authority. Lokale Authorization-Lifecycle-Evidence ist nicht die semantische Mutation selbst.

## Frischer Handoff ist Pflicht

`authorizeAdoptionAuthorizationHandoff(...)` baut den Handoff zuerst erneut aus dem aktuellen begrenzten Review, den aktuellen materialgebundenen Entscheidungen, der aktuellen expliziten Projektion und dem aktuellen Project Brain auf.

Authorization Consumption wird verweigert, sofern nicht weiterhin exakt übereinstimmen:

- Adoption-Proposal-Identität;
- Identität und Material-Digest der akzeptierten Evidence;
- Pfad, Art und Scope der Evidence;
- explizite semantische Projektion;
- Identität und Digest des Actionable Proposal;
- stabile logische Projektidentität;
- aktuelle Project-Brain-Baseline.

Eine geänderte Repository-Evidence, ein ersetztes Adoption-Proposal, eine geänderte Projektion, eine geänderte Project-Brain-Baseline oder ein ausgetauschtes Actionable Proposal erfordern daher einen neuen Review/Handoff, statt alte Zustimmungsabsicht wiederzuverwenden.

## Bestehende Authorization bleibt kanonisch

Nach erfolgreicher Handoff-Revalidierung ruft der Adapter den bestehenden Core `authorizeActionableProposal(...)` auf.

Dieser bestehende Core bleibt zuständig für:

- die interaktive lokale proposal-spezifische Bestätigung;
- die erneute Rekonstruktion des Actionable Proposal gegen den aktuellen kanonischen Project-Brain-Stand;
- eine weitere Revalidierung unmittelbar vor dem Commit von Authorization-State;
- das bestehende project-local/machine-local Authorization-Evidence-Modell;
- die Ablehnung von stale, widersprüchlichem, mehrdeutigem, unterbrochenem oder wiederverwendetem Lifecycle-State.

Die Adoption-Schicht schwächt, umgeht, dupliziert oder interpretiert diese Regeln nicht neu.

## Keine semantische Mutation während Authorization

Erfolgreiche Authorization-Vorbereitung darf Livariant-eigenen Authorization-Lifecycle-/Audit-State verändern, führt aber die projizierte semantische Project-Brain-Änderung nicht aus.

Das Ergebnis bewahrt:

```text
evidenceIsProjectTruth: false
adoptionHandoffIsAuthority: false
authorizationIsSemanticMutation: false
semanticApplyRequired: true
semanticChangesMade: 0
```

Die eigentliche dauerhafte semantische Mutation bleibt hinter der bereits bestehenden, separat autorisierten Semantic-Apply-Grenze. Projekt-eigene Repository-Dateien werden von diesem Authorization-Consumption-Slice nicht umgeschrieben.

## Replay und Recovery

Replay-Resistenz und Recovery-Semantik werden aus der kanonischen proposal-bound Authorization-Lifecycle übernommen. Ein früher vorbereiteter Adoption-Handoff kann eine alte Authorization nicht für ein geändertes Proposal, eine geänderte Baseline, eine geänderte Projektidentität oder geändertes Evidence-Material gültig machen.

Mehrdeutiger oder unterbrochener Authorization-State bleibt fail-closed. Authority wird niemals allein aus Repository-Evidence, Provider-Text, einem Adoption-Proposal oder dem Handoff-Objekt neu erzeugt.

## Scope

Dies ist eine generische Existing-Project-Adoption-Fähigkeit für gewöhnliche Repositories. Sie ist kein Livariant-Self-Hosting-Sonderfall und fügt weder Desktop-UX noch Release-/Publication-Verhalten hinzu.
