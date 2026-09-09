# First-Run-Projektion fuer Project Sources & Review

Livariant kann den akzeptierten `FirstRunOnboardingState` in die begrenzte Project-Sources-&-Review-Konfiguration ueberfuehren, die der Desktop Configuration Writer verwendet.

Die Projektion verlangt eine explizite `projectId`, eine Source Registry und eine explizite lokale Bindung des Hauptrepositorys. `localRoot` aus dem Onboarding wird nicht stillschweigend als Repository-Bindung uebernommen, weil Projektwurzel und Repository-Bindung getrennte Fakten sind.

Zusaetzliche Repositories behalten ihre konfigurierte Identitaet, die verpflichtende Zweckbeschreibung und eine optionale explizite lokale Bindung. Ausgewaehlte Review-Pfade und Review-Entscheidungen bleiben explizite Eingaben; Entscheidungen werden ohne ausgewaehltes Review-Material nicht akzeptiert.

Die Projektion erzeugt keine Reachability-, Branch-, Revision- oder Stale-Beobachtungen. Diese Fakten bleiben Aufgabe des getrennten akzeptierten Source-Observation-Pfads.

Die Projektion ist ausschliesslich Konfigurations-Plumbing. Sie wird weder Project Truth noch Authority, fuehrt keinen Semantic Apply aus, veraendert keine projekt-eigenen Dateien und autorisiert keine Self-Hosting-Mutation.
