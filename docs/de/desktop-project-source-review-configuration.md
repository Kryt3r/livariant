# Desktop Project Source & Review Konfiguration

Der Desktop kann die Konfiguration fuer Project Sources & Review ueber einen begrenzten Tauri-Befehl speichern, bevor der Runtime-Refresh ausgefuehrt wird.

Der Renderer liefert nur strukturierte Projektkonfiguration. Er kann weder den Zielpfad noch ein auszufuehrendes Programm bestimmen. Der Host schreibt immer in die feste Livariant-App-Data-Datei `project-source-review-input.json`.

Die Konfiguration akzeptiert genau ein Hauptrepository mit verpflichtendem lokalem Pfad, optionale weitere Repositories mit verpflichtender Zweckbeschreibung, optionale repository-relative Review-Pfade und optionale materialgebundene Review-Entscheidungen.

Der Host lehnt leere Identitaeten, nicht unterstuetzte Repository-Provider, doppelte Repository-Identitaeten, doppelte oder unbegrenzte Review-Pfade, ungueltige Decision-Arten und Entscheidungen ohne ausgewaehltes Review-Material ab.

Der Konfigurations-Writer schreibt bewusst ein leeres `observations`-Array. Konfiguration ist keine Beobachtungs-Evidence und die UI darf Reachability, Branch, Revision oder Stale-Zustand nicht allein durch das Speichern von Projekteinstellungen erzeugen. Diese Werte muessen aus einem getrennten Pfad fuer beobachtete Evidence stammen.

Das Speichern der Konfiguration erzeugt weder Project Truth noch Authority oder Semantic-Apply-Faehigkeit und veraendert keine projekt-eigenen Dateien. Zweckbeschreibungen weiterer Repositories bleiben rein semantischer Kontext und verleihen weder Trust noch Authority.
