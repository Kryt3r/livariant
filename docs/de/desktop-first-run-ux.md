# Desktop First-Run UX

Livariant Desktop behandelt die Ersteinrichtung als normalen Produktablauf und nicht als entwicklerorientiertes Konfigurationsformular.

## Ordnerauswahl

Der normale Weg verwendet den nativen Windows-Ordnerdialog. Die manuelle Pfadeingabe bleibt für fortgeschrittene oder Recovery-Fälle sichtbar. Die Auswahl eines Projektordners autorisiert keine Änderung an Projektdateien.

Wenn noch keine Projekt-ID eingetragen wurde, schlägt Livariant aus dem Namen des gewählten Ordners eine stabile Projekt-ID vor. Der Vorschlag bleibt vor dem Speichern editierbar.

## Repository-Bestätigung

Nach der Auswahl des Projektordners darf Livariant Git-Metadaten read-only untersuchen. Wird ein bestehender Git-Checkout erkannt, füllt der Quellen-Schritt beobachteten Provider, Repository-ID, Anzeigename, Remote-URL und lokalen Ordner soweit verfügbar vor.

Erkannte Daten werden niemals stillschweigend als Hauptrepository übernommen. Der Nutzer muss das Hauptrepository-Formular weiterhin ausdrücklich bestätigen. Projektordner und Repository-Bindung bleiben getrennte Konzepte.

## Sprache

Bekannte kanonische IDs der Projektverständnis-Fragen werden in der aktuellen Desktop-Sprache dargestellt. Kanonische Fragen-IDs und Lifecycle-Zustände bleiben unverändert; die Lokalisierung betrifft nur die Darstellung.

Auch die Oberfläche Projektquellen & Prüfung lokalisiert sichtbare Navigation, Statusbezeichnungen, Leerzustände und Lifecycle-Bezeichnungen. Rohe Repository-IDs, Revisionen, Evidence-Codes und quellen-eigene Nachweise bleiben unverändert.

## Interaktionskontext

Lokale Aktionen wie Antworten speichern/überspringen, ein Repository bestätigen oder einen Provider aktualisieren erhalten den aktuellen Scroll- und Fokuskontext. Ein bewusster Wechsel zu einem anderen Onboarding-Schritt darf an den Anfang des neuen Schritts wechseln.

## Grenzen

- Ordnerauswahl und Git-Inspektion sind read-only;
- erkannte Quellen-Metadaten bleiben Evidence, bis sie ausdrücklich als Konfiguration bestätigt werden;
- eine Verbindung erteilt keine Authority;
- Onboarding erteilt keine Self-Hosting-Mutation-Authority und keinen Semantic Apply;
- diese UX-Verbesserungen verändern keine projekt-eigenen Dateien.
