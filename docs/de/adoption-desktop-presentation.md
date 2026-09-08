# Existing-Project-Adoption: Desktop-Präsentationsvertrag

Die Desktop-Präsentationsschicht muss den kanonischen Existing-Project-Adoption-Lifecycle sichtbar machen, ohne selbst zu einer zweiten Adoption-Engine zu werden.

`buildAdoptionDesktopPresentation(...)` leitet aus dem aktuellen Adoption-Content-Review und den expliziten materialgebundenen Review-Entscheidungen ein begrenztes, nur lesendes Präsentationsmodell ab. Optionale kanonische Authorization- und Semantic-Apply-Evidence darf den angezeigten Lifecycle-Zustand nur erweitern, wenn sie weiterhin exakt an das aktuelle Adoption-Proposal gebunden ist.

## Was der Desktop anzeigen darf

Der Präsentationsvertrag stellt bereit:

- Reviewed Evidence mit Provenienz;
- Evidence-Art, Pfad, Scope und Materialidentität;
- Review-Attention-Codes wie Konflikte oder überlappende Guidance;
- expliziten Entscheidungszustand: `accept-as-candidate`, `reject`, `defer`, `undecided` oder `review-again`;
- ob das aktuelle Adoption-Proposal blockiert oder für Authorization-Review bereit ist;
- ob die kanonische Authorization erreicht wurde;
- ob der kanonische Semantic Apply abgeschlossen wurde.

## Veraltetes oder ersetztes Material

Frühere Entscheidungen werden bei geändertem Evidence-Material nicht stillschweigend übernommen. Wenn eine Entscheidung nicht mehr zum exakten aktuellen Material passt oder auf Evidence verweist, die im aktuellen Review nicht mehr vorhanden ist, bleibt die Darstellung fail-closed und verlangt eine erneute Prüfung.

Ebenso werden Authorization- oder Apply-Evidence, die an ein anderes Adoption-Proposal gebunden sind, nicht als aktuelle Authority oder Completion dargestellt.

## Grenzen

Der Präsentationsvertrag bewahrt ausdrücklich folgende Grenzen:

- Evidence ist nicht Project Truth.
- Eine UI-Entscheidung ist nicht Project Truth.
- Eine UI-Entscheidung erteilt keine Mutation Authority.
- Ein Proposal ist keine Authorization.
- Authorization ist nicht Semantic-Apply-Completion.
- Projekt-eigene Repository-Dateien bleiben in diesem Präsentations-Slice nur lesbar.
- Konflikte werden nicht stillschweigend aufgelöst.
- Die Präsentation selbst führt keine Produktzustandsänderung aus.

Diese Fähigkeit ist generisches Existing-Project-Adoption-Verhalten. Sie ist kein Livariant-Self-Hosting-Sonderfall und autorisiert weder Release noch Publication, Tagging oder Updater-Änderungen.
