# Review-Entscheidungen bei Existing-Project-Adoption

Diese Seite beschreibt die begrenzte Entscheidungs- und Proposal-Schicht nach einem expliziten Adoption-Content-Review.

## Grenze

Gelesener Repository-Text bleibt Evidence. Eine Review-Entscheidung macht daraus keine Project Truth und ein Proposal vergibt keine Authority.

Die Schicht hält folgende Zustände getrennt:

```text
beobachtete Evidence
→ explizite Review-Entscheidung
→ Candidate Evidence
→ deterministisches Proposal
→ separate Authorization-Prüfung
→ späterer dauerhafter Mutationspfad
```

Zwischen diesen Zuständen gibt es keinen impliziten Übergang.

## Explizite Entscheidungen

Jedes geprüfte Evidence-Element kann genau eine aktuelle Entscheidung erhalten:

- `accept-as-candidate`: das exakt geprüfte Material als Candidate Evidence für ein späteres Proposal einbeziehen;
- `reject`: dieses geprüfte Material aus dem Proposal ausschließen;
- `defer`: das Element ungelöst lassen und Proposal-Readiness blockieren.

Geprüfte Evidence ohne Entscheidung bleibt ebenfalls ungelöst und wird niemals stillschweigend akzeptiert.

## Exakte Materialbindung

Jede Entscheidung ist an einen SHA-256-Digest des exakt geprüften Materials gebunden, einschließlich Typ, Pfad, Scope, Review-Status, Byte-Anzahl, Truncation-Status und beobachtetem Inhalt.

Wenn ein frischer Review anderes Material beobachtet, passt eine ältere Entscheidung nicht mehr und darf nicht stillschweigend wiederverwendet werden. Die Proposal-Konstruktion validiert die Entscheidung erneut gegen das aktuelle Review-Material.

Abgeschnittene Evidence kann nicht als Candidate Evidence akzeptiert werden, weil ausgelassenes Material unbekannt bleibt.

## Scope und Konflikte

Verschachtelte Guidance behält den Scope aus dem Adoption-Content-Review. Wenn mehrere akzeptierte Guidance-Elemente überlappenden Scope haben und der Review ungelöste Überlappung gemeldet hat, hält die Proposal-Konstruktion diese Mehrdeutigkeit sichtbar und markiert das Proposal als blockiert. Sie wählt keinen Vorrang und führt Inhalte nicht automatisch zusammen.

## Deterministisches Proposal

`buildAdoptionReviewProposal(...)` erzeugt aus expliziten aktuellen Entscheidungen ein deterministisches Proposal. Das Proposal:

- enthält ausschließlich `accept-as-candidate`-Material;
- führt abgelehnte und aufgeschobene Evidence getrennt;
- zeigt Blocker für unentschiedene, aufgeschobene, abgeschnittene oder ungelöste Überlappungen;
- erhält aus normalisiertem Proposal-Material eine deterministische Proposal-ID;
- meldet `ready-for-authorization-review` nur, wenn kein Blocker verbleibt.

Auch ein bereites Proposal ist weder Authorization noch Project Truth. Seine Grenzen bleiben:

- `evidenceIsProjectTruth: false`;
- `decisionsAreProjectTruth: false`;
- `proposalIsAuthorization: false`;
- `grantsAuthority: false`;
- `changesMade: 0`.

Dieser Slice verändert keine projekt-eigenen Dateien und schreibt selbst keinen Project-Brain-Stand.
