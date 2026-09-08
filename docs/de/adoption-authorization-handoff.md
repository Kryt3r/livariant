# Authorization-Handoff bei der Übernahme bestehender Projekte

WP-053 hält Repository-Evidence, Review-Entscheidungen, Proposal-Erstellung, Authorization und dauerhafte Mutation als getrennte Stufen.

Ein fertiges Adoption-Proposal ist keine Authority. Geprüfte Evidence ist keine Project Truth. Candidate Evidence wird nicht pauschal in Project Brain übernommen.

`prepareAdoptionAuthorizationHandoff(...)` rekonstruiert das aktuelle Adoption-Proposal aus dem aktuellen begrenzten Review und den aktuellen materialgebundenen Entscheidungen. Der Aufrufer muss die exakte aktuelle `adoptionProposalId`, genau eine akzeptierte Evidence-ID mit Material-Digest und eine explizite semantische Projektion angeben.

Die Projektion ist eine getrennte Nutzerabsicht. v1 unterstützt nur additive Projektionen für `project-goal` und `project-knowledge`. Dadurch wird eine beliebige Dokumentations-, Architektur-, CI-, Tooling- oder Guidance-Datei nicht automatisch als eine kanonische semantische Aussage interpretiert.

Ist das aktuelle Proposal blockiert, unvollständig, geändert oder ersetzt, schlägt der Handoff fail-closed fehl. Passt die ausgewählte Candidate Evidence nicht mehr exakt, wird der Handoff verweigert.

Für eine gültige Anfrage verwendet Livariant die bestehende Actionable-Proposal-Grundlage wieder. Der zurückgegebene Handoff bindet Adoption-Proposal-Identität, Evidence-Identität und Material-Digest, semantische Projektion, Actionable-Proposal-Identität und -Digest, stabile Projektidentität sowie die aktuelle Project-Brain-Baseline.

Das Ergebnis bleibt nicht-authoritativ:

```text
evidenceIsProjectTruth: false
adoptionProposalIsAuthorization: false
projectionIsProjectTruth: false
mutationAuthorization: false
authorizationRequired: true
changesMade: 0
```

Der Handoff ruft den Authorization-Core nicht auf und schreibt keinen Authorization-State. Explizite Authorization bleibt ein separater Vorgang über den bestehenden proposalgebundenen Authorization-Pfad. Die dauerhafte semantische Mutation bleibt ein späterer separater Apply-Schritt mit den bestehenden Recovery- und Ambiguitätsschutzmechanismen.

Projekt-eigene Dateien werden durch Review, Proposal-Erstellung oder Authorization-Handoff nicht verändert.
