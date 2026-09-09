# Desktop Project Source & Review Refresh

Der Desktop-Bereich Project Sources & Review aktualisiert seine Darstellung vor dem Anzeigen ueber eine feste host-seitige Grenze. Der Renderer kann weder Dateisystempfad noch Repository-Ziel, Kommando oder Ausgabeziel vorgeben.

Der Tauri-Host verwendet zwei feste Dateien im Livariant-App-Data-Verzeichnis:

- `project-source-review-input.json` - begrenzter Runtime-Input aus Livariant-Konfiguration/-Zustand;
- `project-source-review-presentation.json` - erzeugter Presentation-Snapshot, den die Desktop-Bridge nur lesend konsumiert.

Der Host startet ausschliesslich die gebuendelte Livariant-Node-Runtime und das gebuendelte Core-Refresh-Modul. Gewoehnliches gebuendeltes Runtime-Material wird abgelehnt, falls sein Manifest Authority behauptet.

Das Core-Refresh-Modul validiert konfigurierte Projekt-/Source-Identitaeten, rekonstruiert die kanonische Source Registry, baut einen ausgewaehlten Adoption-Review aus dem **aktuellen** Material des primaeren lokalen Projekts neu, bindet mitgelieferte Review-Entscheidungen ueber den kanonischen Adoption-Decision-Seam an das aktuelle Material und uebergibt die Presentation-Komposition anschliessend an den akzeptierten Project-Source-&-Review-Producer.

Fehlender Runtime-Input wird als unavailable dargestellt. Ungueltiger Input, veraltete Entscheidungen, fehlende aktuelle Evidence oder ein fehlgeschlagener Refresh der gebuendelten Runtime schlagen fail-closed fehl und werden weder Project Truth noch Authority. Der Refresh-Pfad fuehrt keinen Semantic Apply aus und veraendert keine projekt-eigenen Dateien.

Eine frueher erzeugte Presentation-Datei gilt nicht als Beleg dafuer, dass ein fehlgeschlagener aktueller Refresh erfolgreich war. Der Refresh-Befehl liefert dem Renderer unmittelbar das Ergebnis des aktuellen Refreshs.

Dieser Slice definiert noch nicht den UI-/Konfigurations-Writer fuer `project-source-review-input.json`; dieser folgt als eigener begrenzter Integrationsschritt fuer den Projektzustand.
