# Project-Source-&-Review-Producer

Der Project-Source-&-Review-Producer ist die kanonische Kompositionsschnittstelle zwischen akzeptiertem Projektquellenzustand, expliziten Quellenbeobachtungen, dem kanonischen Existing-Project-Adoption-Review-Lifecycle und der Desktop-Präsentationsoberfläche.

`produceProjectSourceReviewPresentation(...)` kombiniert `buildProjectSourceCenterPresentation(...)` mit dem bestehenden `buildAdoptionDesktopPresentation(...)`. Er implementiert keine zweite Adoption-Engine und interpretiert Repository-Evidence nicht neu.

Der Producer darf Quellenbeobachtungen und aktuellen Review-Lifecycle-Evidence nur aufnehmen, wenn diese explizit geliefert werden. Fehlende Beobachtungen bleiben unbekannt. Review-Entscheidungen, Authorization- oder Semantic-Apply-Evidence werden abgelehnt, wenn kein aktueller Review vorliegt.

Die erzeugte Präsentation bleibt reine Präsentationsdaten. Sie ist keine Project Truth, verleiht keine Authority, verändert keine projekt-eigenen Dateien und führt selbst keinen Semantic Apply aus. Serialisierte Ausgabe ist für den begrenzten Desktop-Bridge-Snapshot erst geeignet, nachdem der Aufrufer sie über einen autorisierten host-seitigen Persistenzpfad gespeichert hat.

Dieser Producer autorisiert keine Self-Hosting-Mutation und ergänzt keine Release-, Veröffentlichungs- oder Updater-Fähigkeit.
