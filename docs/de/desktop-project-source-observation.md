# Desktop Project Source Observation

Der Desktop-Bereich Project Sources & Review kann konfigurierte lokale Repository-Bindungen beobachten, bevor die kanonische Presentation neu aufgebaut wird.

Der Renderer kann weder Dateisystemziel noch ausfuehrbare Datei, Git-Argumente oder Ausgabeziel vorgeben. Der Tauri-Host startet ausschliesslich das gebuendelte Livariant-Node/Core-Observationsmodul und verweist es auf die feste Livariant-App-Data-Datei `project-source-review-input.json`.

Fuer jedes konfigurierte Repository mit expliziter lokaler Bindung prueft das Observationsmodul Git ohne Shell-Aufruf. Ist der Pfad ein Git-Work-Tree, werden soweit verfuegbar aktueller Branch und Revision beobachtet. Der Beobachtungszeitpunkt wird beim Lauf erzeugt; eine neue Beobachtung ist zunaechst nicht stale.

Ein zusaetzlich konfiguriertes Repository ohne lokale Bindung erhaelt keine erfundene Beobachtung. Es bleibt im Project Source Center deshalb unknown, bis eine echte Beobachtungsquelle existiert.

Kann eine konfigurierte lokale Bindung nicht als Git-Work-Tree untersucht werden, wird dies als unreachable Evidence festgehalten. Dadurch wird weder Project Truth erzeugt noch die Repository-Zuordnung veraendert.

Das Observationsmodul schreibt ausschliesslich den begrenzten Livariant-App-Data-Runtime-Input. Es schreibt keine projekt-eigenen Dateien, vergibt keine Authority, fuehrt keinen Semantic Apply aus und loest keine Konflikte. Anschliessend fuehrt der Desktop den bereits akzeptierten kanonischen Project-Source-&-Review-Refresh mit der neu beobachteten Evidence aus.
