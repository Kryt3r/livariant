# Desktop Project Source & Review Konfiguration

Der Desktop kann die Konfiguration fuer Project Sources & Review ueber einen begrenzten Tauri-Befehl speichern, bevor der Runtime-Refresh ausgefuehrt wird.

Der Renderer liefert nur strukturierte Projektkonfiguration. Er kann weder den Zielpfad noch ein auszufuehrendes Programm bestimmen. Der Host schreibt immer in die feste Livariant-App-Data-Datei `project-source-review-input.json`.

Die Konfiguration akzeptiert genau ein Hauptrepository mit verpflichtendem lokalem Pfad, optionale weitere Repositories mit verpflichtender Zweckbeschreibung, optionale repository-relative Review-Pfade und optionale materialgebundene Review-Entscheidungen.

Der Host lehnt leere Identitaeten, nicht unterstuetzte Repository-Provider, doppelte Repository-Identitaeten, doppelte oder unbegrenzte Review-Pfade, ungueltige Decision-Arten und Entscheidungen ohne ausgewaehltes Review-Material ab.

Der Konfigurations-Writer schreibt bewusst ein leeres `observations`-Array. Konfiguration ist keine Beobachtungs-Evidence und die UI darf Reachability, Branch, Revision oder Stale-Zustand nicht allein durch das Speichern von Projekteinstellungen erzeugen. Diese Werte muessen aus einem getrennten Pfad fuer beobachtete Evidence stammen.

## Normale Desktop-Auswahl fuer Reviews

Project Sources & Review kann ueber den gebuendelten Livariant Core begrenzte pruefbare Adoption-/Self-Observation-Oberflaechen aus dem verknuepften lokalen Haupt-Checkout inventarisieren. Der Renderer liefert dabei keinen Dateisystem-Root und die Inventarisierung interpretiert keine Dateiinhalte. Kandidaten bleiben repository-relative Evidence mit explizitem Typ- und Geltungsbereichskontext.

Der Nutzer muss einen oder mehrere Kandidaten explizit auswaehlen und **Review starten** ausloesen, bevor die Auswahl in Livariant-App-Data geschrieben wird. Beim Start fuehrt der Host die begrenzte Inventarisierung erneut aus und lehnt leere Auswahl, absolute Pfade, Parent-Traversal, Duplikate sowie jeden Pfad ab, der in der frischen Inventarisierung nicht mehr vorhanden ist. Auch eine gleichzeitige Aenderung der Konfiguration laesst den Start fail-closed scheitern.

Wenn das ausgewaehlte Material geaendert wird, werden vorherige materialgebundene Review-Entscheidungen verworfen. Anschliessend fuehrt der bestehende kanonische Project-Source-&-Review-Refresh-Produzent das begrenzte Review aus; der Desktop fuehrt keine zweite Review-Engine ein.

Auswahl und Start eines Reviews erzeugen weder Project Truth noch Authority oder Semantic-Apply-Faehigkeit und veraendern keine projekt-eigenen Dateien. Die UI macht `Evidence != Truth`, `Proposal != Authorization` und `Authorization != Apply` explizit sichtbar.

Das Speichern der Konfiguration erzeugt weder Project Truth noch Authority oder Semantic-Apply-Faehigkeit und veraendert keine projekt-eigenen Dateien. Zweckbeschreibungen weiterer Repositories bleiben rein semantischer Kontext und verleihen weder Trust noch Authority.
