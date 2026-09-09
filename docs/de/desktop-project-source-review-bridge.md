# Desktop-Bridge für Project Sources und Review

Die Desktop-Bridge für Project Sources und Review ist eine nur lesende Host-Grenze für die akzeptierte Project-Sources-und-Review-Oberfläche.

Der Host liest ausschließlich den festen Livariant-App-Data-Präsentationssnapshot `project-source-review-presentation.json`. Der Renderer kann keinen Pfad, Befehl, Repository-Zielwert oder beliebigen Quellort vorgeben.

Ein Snapshot wird nur akzeptiert, wenn er die unterstützte Schemaversion, eine nicht leere Projektidentität, ein Source-Array und ein Summary-Objekt enthält. Fehlende, nicht lesbare, fehlerhafte oder nicht unterstützte Daten schlagen fail-closed in den expliziten Zustand `unavailable` um.

Die Bridge entdeckt keine Repositories, leitet keinen Projektzustand ab, erzeugt keine Project Truth, vergibt keine Authority, löst keine Konflikte, führt keinen Semantic Apply aus und verändert keine projekt-eigenen Dateien. Ein `ready`-Ergebnis bedeutet nur, dass ein begrenzter Präsentationssnapshot zur Anzeige geladen werden konnte.
