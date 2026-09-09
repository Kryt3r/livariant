# Desktop First-Run Lifecycle Bridge

Livariant Desktop kann den kanonischen First-Run-Onboarding-Zustand jetzt laden und weiterfuehren, ohne im Renderer eine zweite Onboarding-State-Machine einzubauen.

Der Renderer sendet nur begrenzte Lifecycle-Aktionen, zum Beispiel den Wechsel zu einem Schritt, die Projektauswahl, das Beantworten oder Ueberspringen einer bestehenden Understanding-Frage, die Repository-Konfiguration, das Aufschieben der Provider-Einrichtung oder den Abschluss des Onboardings. Der Tauri-Host schreibt die Aktion nur in eine feste Livariant-App-Data-Staging-Datei und startet die gebuendelte Livariant-Core-Lifecycle-Runtime. Core verwendet die akzeptierten `FirstRunOnboardingState`-Transitionen und liefert den naechsten kanonischen Zustand zurueck.

Bei einer frischen Installation ohne gespeicherten First-Run-Request liefert Core einen noch nicht gespeicherten `welcome`-Zustand. Das reine Lesen dieses Zustands schreibt nichts und erzeugt keine Projektkonfiguration.

Nach einer Lifecycle-Aktion speichert der Host den resultierenden Onboarding-Zustand nur in Livariant-App-Data. Solange die kanonische First-Run-zu-Source-Review-Projektion noch nicht bereit ist, wird nur der partielle Onboarding-Fortschritt gespeichert. Es werden keine Repository-Beobachtungen oder Project-Sources-&-Review-Daten erfunden. Sobald die Projektion bereit ist, delegiert der Host an den bereits akzeptierten begrenzten First-Run-Project-State-Persistenzpfad, damit Project Sources & Review weiterhin ueber kanonischen Core synchronisiert bleibt.

Der Renderer kann weder State-Pfad noch Action-Pfad, Executable oder Runtime-Skript bestimmen. Gespeicherter Onboarding-Zustand ist keine Project Truth, vergibt keine Authority, erzeugt keine beobachtete Source-Evidence, veraendert keine projekt-eigenen Dateien und fuehrt keinen Semantic Apply aus.

Dieser Bridge-Slice ist Lifecycle-Infrastruktur fuer die echte First-Run-Oberflaeche. Er behauptet noch nicht, dass die vollstaendige First-Run-UI fertig ist.
