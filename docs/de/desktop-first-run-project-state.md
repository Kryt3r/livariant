# Desktop First-Run-Projektzustand

Livariant Desktop kann den akzeptierten First-Run-Projektzustand in einer festen Livariant-App-Data-Anfrage speichern und diesen Zustand durch den gebuendelten Livariant Core in die begrenzte Project-Sources-&-Review-Konfiguration projizieren.

Der Renderer liefert nur den serialisierten akzeptierten First-Run-Zustand sowie explizite Review-Pfade und materialgebundene Entscheidungen. Er kann weder Speicherpfad noch Projektionsprogramm, Runtime-Skript oder Project-Sources-&-Review-Ausgabepfad bestimmen.

Der Host speichert die Anfrage ausschliesslich in Livariant-App-Data, startet die gebuendelte Core-Projektionsruntime und uebergibt die resultierende Konfiguration an den bereits akzeptierten begrenzten Project-Sources-&-Review-Writer. Dadurch bleibt der normale `FirstRunOnboardingState` das Quellmodell, statt ein separates Desktop-Projektmodell einzufuehren.

Die kanonische Projektion verlangt weiterhin eine explizite lokale Bindung des Hauptrepositories. Der allgemeine Onboarding-Wert `localRoot` wird nicht stillschweigend als Repository-Bindung interpretiert. Zusatzrepositories behalten ihre expliziten Zweckbeschreibungen und optionalen lokalen Bindungen.

Gespeicherter Onboarding- oder Konfigurationszustand ist keine Project Truth, erzeugt keine Source-Observation-Evidence und vergibt keine Authority. Reachability, Branch und Revision bleiben Aufgabe des getrennten Observationsschritts. Projekt-eigene Dateien werden nicht veraendert; Semantic Apply oder Self-Hosting-Mutation-Authority entstehen nicht.
