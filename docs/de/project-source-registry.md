# Projektquellen-Registry

Livariant-Projekte besitzen genau ein Hauptrepository und können zusätzlich null oder mehr weitere Repositories verknüpfen.

Die Registry ist ein von Livariant verwaltetes Zuordnungsmodell für Projektquellen. Sie macht Repository-Inhalte weder automatisch zu Project Truth noch verleiht sie Trust oder Authority.

## Hauptrepository

Jedes Projekt hat genau ein Hauptrepository. Dessen Repository-Identität ist von einem optionalen lokalen Checkout-Pfad getrennt.

Für das Hauptrepository ist keine Zweckbeschreibung erforderlich, weil es die zentrale Repository-Identität des Projekts trägt.

## Weitere Repositories

Zusätzliche Repositories benötigen eine nicht leere, vom Nutzer angegebene Zweckbeschreibung. Sie erklärt, warum das Repository zum Projekt gehört, zum Beispiel für Dokumentation, Infrastruktur oder eine interne Entwicklungssteuerung.

Die Beschreibung ist ausschließlich semantischer Kontext:

- sie ist kein Authority-Nachweis;
- sie erzeugt keine Quellen-Priorität;
- sie befördert Repository-Inhalte nicht zu Project Truth;
- sie erlaubt keine automatische Konfliktauflösung.

Doppelte Repository-Identitäten werden abgelehnt. Das gilt auch für den Versuch, das Hauptrepository nochmals als zusätzliche Quelle hinzuzufügen.

## Lokale Verknüpfungen

Remote-Repository-Identität und lokale Dateisystem-Verknüpfung sind getrennte Konzepte. Ein Repository kann einen lokalen Checkout-Pfad besitzen, aber dieser Pfad ist nicht seine kanonische Repository-Identität.

Dadurch können spätere Onboarding- und Einstellungsabläufe lokale Checkouts verbinden oder austauschen, ohne die logische Remote-Repository-Zuordnung zu verändern.

## Trennen einer Verknüpfung

Das Trennen eines zusätzlichen Repositories entfernt ausschließlich dessen Zuordnung aus Livariants Projektquellen-Registry.

Das Trennen:

- löscht oder verändert kein Remote-Repository;
- löscht oder verändert keinen lokalen Checkout;
- verändert keine projekt-eigenen Dateien;
- verändert keine Project Truth;
- erteilt oder verbraucht keine Authority.

Die Domain-Funktionen der Projektquellen-Registry sind absichtlich frei von Seiteneffekten, damit UI, Onboarding und Einstellungen denselben deterministischen Sicherheitsvertrag wiederverwenden können.
