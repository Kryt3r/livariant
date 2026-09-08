# End-to-End-Qualifikation der Adoption bestehender Projekte

Diese Qualifikation prüft den normalen Existing-Project-Adoption-Lifecycle anhand des bereits vorhandenen Projekt-Fixtures `existing-small`.

Der Abnahmepfad umfasst:

- schreibgeschützte Discovery und Adoption-Inventarisierung;
- begrenzte Inhaltsprüfung mit nachvollziehbarer Provenienz;
- explizite, an den geprüften Inhalt gebundene Review-Entscheidungen;
- deterministische Erstellung des Adoption-Proposals;
- Desktop-nahe Darstellung des Lifecycles ohne Vergabe von Authority;
- proposal-gebundene Authorization-Evidence;
- geschützten Guardian-gestützten kanonischen Semantic Apply;
- Darstellung des abgeschlossenen Zustands;
- Ablehnung eines Replays nach Abschluss;
- unveränderte projekt-eigene Repository-Dateien;
- sichtbare ungelöste Überschneidungen von Guidance ohne automatische Priorisierung oder Konfliktauflösung.

Der Test erzeugt weder eine zweite Adoption-Engine noch einen alternativen Authority-Store. Der ausschließlich für CI verwendete Harness legt die exakte kanonische Audit-/Recovery-Bindung sowie einen bereits konsumierten geschützten Guardian-One-Shot an, damit der produktive Recovery-/Apply-Pfad ohne interaktive Eingabe geprüft werden kann. Diese vorbereitete Evidence ist Test-Setup und kein neuer Produkt-Mutationspfad.

Evidence bleibt von Project Truth getrennt. Proposal bleibt von Authorization getrennt. Authorization bleibt vom abgeschlossenen Semantic Apply getrennt.

Self-Hosting ist nicht Bestandteil dieser Qualifikation.
