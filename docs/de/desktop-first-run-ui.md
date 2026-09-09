# Desktop First-Run UI

Livariant Desktop leitet den Start jetzt durch den kanonischen First-Run-Lifecycle, bevor die normale Anwendungsoberflaeche geladen wird.

## Startverhalten

Bei einer frischen Installation laedt Desktop den kanonischen First-Run-Snapshot ueber die begrenzte Host/Core-Lifecycle-Bridge. Solange der Snapshot unvollstaendig ist, ersetzt das Onboarding die normale Navigation. Nach dem Abschluss werden die normalen Desktop-Module geladen.

Der Renderer besitzt keine zweite Onboarding-State-Machine. Er stellt den kanonischen Lifecycle-Snapshot dar und sendet nur begrenzte Lifecycle-Intents.

## Projektverstaendnis

Wenn ein Nutzer explizit einen bestehenden lokalen Projektordner auswaehlt, fuehrt der gebuendelte Core die bestehende read-only Projekterkennung und den Understanding Review aus. Die daraus entstehenden kanonischen Klaerungsfragen werden im `FirstRunOnboardingState` gespeichert.

Antworten bleiben Candidate Evidence. Uebersprungene Fragen bleiben explizit unbekannt und erhalten keine abgeleiteten Standardwerte.

Die Auswahl eines Projektordners leitet diesen Ordner nicht als lokale Bindung des Hauptrepositorys ab. Repository-Identitaet und lokale Repository-Bindung bleiben explizite Entscheidungen im Quellen-Setup.

## Quellen-Setup

Die UI unterstuetzt genau ein Hauptrepository sowie zusaetzliche Repositories mit verpflichtender Zweckbeschreibung. Diese Beschreibungen liefern nur Kontext und erteilen kein Trust, keine Truth und keine Authority.

Ein lokaler Pfad fuer das Hauptrepository muss explizit eingegeben werden, bevor Project Sources & Review bereit werden kann. Damit bleibt die Projektordner-Auswahl von der Repository-Bindung getrennt.

## Provider-Setup

Der First-Run-Provider-Schritt kann die bestehende Codex-Connector-Grenze pruefen, ueber automatische Erkennung verbinden oder einen explizit eingegebenen lokalen Codex-Programmpfad verwenden. Eine erfolgreiche Verbindung kann anschliessend im Onboarding hinterlegt werden. Nutzer koennen das Provider-Setup auch bewusst auf spaeter verschieben.

Verbindung bleibt von Capability, Role und Authority getrennt.

## Abschluss und erneutes Oeffnen

Der Health-Schritt zeigt eingerichtete und unvollstaendige Bereiche, ohne fehlendes Wissen zu erfinden. Das Onboarding darf abgeschlossen werden, obwohl Luecken bestehen. Die Willkommensseite bietet ebenfalls einen bewussten unvollstaendigen Pfad, der First Run abschliesst, ohne Projektzustand zu erfinden.

Ein abgeschlossenes Onboarding kann spaeter aus den Einstellungen erneut geoeffnet werden. Der Revisit-Modus verwendet denselben kanonischen Lifecycle-Zustand und dieselben begrenzten Aktionen.

## Grenzen

- Onboarding-Zustand ist keine Project Truth;
- Repository-Inhalte und Discovery-Ausgaben bleiben Evidence;
- unbekannte/uebersprungene Antworten werden nicht zu Defaults;
- der Renderer veraendert den kanonischen Zustand nicht direkt;
- Onboarding erfindet keine Source Observation;
- kein Semantic Apply und keine Mutation projekt-eigener Dateien;
- keine Self-Hosting Mutation Authority;
- keine Freigabe fuer Release, Tag, Package, Desktop Preview oder Updater-Publikation.
