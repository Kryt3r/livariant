# Desktop-GitHub-Verbindung

Livariant Desktop unterstützt eine klar begrenzte GitHub-Verbindung für die Repository-Auswahl. Sie soll die manuelle Einrichtung reduzieren und ausdrücklich freigegebene private Repositories auswählbar machen, ohne dass ein breit berechtigter persönlicher Zugriffstoken in Livariant kopiert werden muss.

## Authentifizierungsmodell

Für die Produktion ist eine GitHub App vorgesehen. Der Desktop verwendet den GitHub-Geräteautorisierungsfluss mit der Client-ID der App; die Client-ID ist kein Geheimnis. Ein Build kann `LIVARIANT_GITHUB_CLIENT_ID` zur Build-Zeit erhalten, für die lokale Entwicklung kann dieselbe Variable zur Laufzeit gesetzt werden.

Ist keine Client-ID konfiguriert, zeigt die GitHub-Auswahl an, dass die Integration in diesem Build noch nicht verfügbar ist. Die bestehende manuelle Repository-Eingabe bleibt dann nutzbar.

Zugriffs- und Refresh-Token werden unter Windows über den geschützten Zugangsdaten-Speicher des Betriebssystems gespeichert. Sie werden nicht in Projektdateien oder gewöhnlichen unverschlüsselten Livariant-App-Daten abgelegt.

## Repository-Auswahl

Nach der Autorisierung fragt Livariant die Repositories ab, die GitHub über die authentifizierte GitHub-App-/Benutzerverbindung bereitstellt. Dadurch können auch private Repositories erscheinen – aber nur, wenn GitHub sie für genau diese Verbindung freigibt.

Die Auswahl eines Repositorys füllt lediglich das bestehende Quellenformular voraus. Livariant bestätigt oder übernimmt das Repository nicht automatisch. Remote-Repository-Identität und lokaler Checkout bleiben getrennte Konzepte.

## Sicherheitsgrenze

Die GitHub-Verbindung ist eine Lesefähigkeit und keine Livariant-Authority. Repository-Metadaten sind externe Evidence und keine Project Truth. Diese Integration erlaubt keine Repository-Schreibzugriffe, Workflow-Dispatches oder -Reruns, Änderungen an Pull Requests oder Issues, Merges, Release-/Tag-Erstellung, Semantic Apply oder Änderungen an Projektdateien.

Spätere GitHub-Leseflächen können Actions-/Workflow-, Pull-Request-, Issue- und Release-Zustände ergänzen, wenn die GitHub App die dafür nötigen Leserechte besitzt. Jede Schreibfähigkeit benötigt eine getrennte ausdrückliche Produkt-/Authority-Entscheidung.
