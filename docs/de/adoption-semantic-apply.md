# Adoption Semantic Apply

Existing-Project-Adoption erreicht eine dauerhafte Project-Brain-Mutation ausschließlich über Livariants bestehenden Semantic-Apply-Pfad.

Eine geprüfte Repository-Oberfläche bleibt Evidence. Ein akzeptierter Adoption-Kandidat ist weiterhin keine Project Truth. Die explizite Projektion aus dem Adoption-Review ist keine Mutation Authority. Auch der lokale Authorization-Record ist keine eigenständige Guardian Authority.

`applyAuthorizedAdoptionHandoff(...)` rekonstruiert den aktuellen Adoption-Authorization-Handoff aus aktuellem begrenztem Review, materialgebundenen Entscheidungen, expliziter Projektion und aktuellem Project Brain. Vor der Übergabe an `applyActionableProposal(...)` müssen weiterhin exakt übereinstimmen:

- Adoption-Proposal-Identität;
- Identität und Material-Digest der ausgewählten Evidence;
- Evidence-Pfad, -Art und -Scope;
- explizite semantische Projektion;
- Identität und Digest des Actionable Proposal;
- stabile Projektidentität;
- Project-Brain-Baseline;
- kanonisches Authorization-Binding und Authorization-ID.

Geändertes, veraltetes, ersetztes, gefälschtes oder mehrdeutiges Material failt geschlossen, bevor Adoption-spezifischer Code eine semantische Mutation anfordern kann.

Der Adapter erzeugt keinen weiteren Authority-Store und konsumiert selbst keine Mutation Authority. Er delegiert an die kanonische `applyActionableProposal(...)`-Lifecycle. Diese bleibt zuständig für aktuelle Proposal-Verifikation, exaktes lokales Authorization-Matching, Konsum geschützter Guardian Semantic Authority, Replay-Schutz, Recovery-Transitionen, Prüfung des exakten Managed-State-Deltas, Postcondition-Verifikation und das Fortschreiben der akzeptierten Project-Brain-Integrität.

Nur die explizit projizierte und unterstützte semantische Aussage darf kanonischer Zustand werden. Die v1-Adoption-Projektion bleibt additiv auf `project-goal` oder `project-knowledge` begrenzt. Das Quell-Dokument des Repositories wird weder umgeschrieben noch normalisiert oder pauschal in Project Brain kopiert.

Projekt-eigene Repository-Dateien liegen außerhalb des Adoption-Mutationsziels. Die einzige unterstützte dauerhafte Änderung ist das bereits autorisierte verwaltete Project-Brain-Ziel, das vom Actionable Proposal festgelegt wurde.

Ein erfolgreicher Rückgabewert bedeutet daher, dass der kanonische Semantic-Apply-Pfad genau eine semantische Project-Brain-Änderung abgeschlossen und verifiziert hat. Dadurch entsteht keine weiterreichende zukünftige Authority und dieselbe Mutation kann nicht erneut abgespielt werden.
