# Datenschutz & Netzwerkverhalten

Livariant ist für lokale Projektarbeit ausgelegt. Diese Seite trennt das Netzwerkverhalten des Windows-Desktops, von Core/CLI, optionalen GitHub- und KI-Provider-Verbindungen sowie den Operator-/Update-Sicherheitskanälen.

## Keine Livariant-Nutzungstelemetrie

Die aktuelle Livariant-Runtime und der Desktop implementieren keine:

- Analytics oder Nutzungstelemetrie;
- Werbe-Identifier;
- Livariant-Account-Verfolgung;
- automatischen Uploads von Project-Brain-Inhalten.

Für normalen lokalen Projektbetrieb ist kein Livariant-Cloud-Account erforderlich.

Das Project Brain kann Projektidentität, Entscheidungen, Ziele, Wissen und offene Fragen enthalten. Behandle es als Projektdaten. Livariant muss offensichtliche Secret-Dateien nicht einlesen, um das Project Brain anzureichern; `.env`-artige Secrets sind standardmäßig kein kanonischer Project-Brain-Input.

## Automatischer Desktop-Operator-Sicherheitsabruf

Der Windows-Desktop prüft automatisch Livariants festen Operator-Broadcast-Endpunkt:

`https://broadcast.livariant.dev/v1/operator.json`

Die aktuelle Runtime führt die erste Prüfung kurz nach dem Desktop-Start aus und fragt danach ungefähr alle fünf Minuten erneut ab.

Die Anfrage ist ein begrenzter HTTPS-**GET**. Der geprüfte Transport:

- verwendet einen festen Endpunkt statt einer vom Renderer gelieferten URL;
- folgt keinen Redirects;
- sendet keinen Request-Body und keine Projektinhalte;
- begrenzt Antwortgröße und Netzwerk-Timeouts;
- akzeptiert einen Broadcast erst nach erfolgreicher Prüfung von Signatur, Signing-Key-Identität, Gültigkeitsfenster und Replay-Sequenz.

Der Kanal transportiert begrenzte Service-Hinweise und exakte versionsbezogene Update-Sicherheitsblöcke. Er ist kein Remote-Command-Kanal und vergibt keine Projekt- oder Mutation-Authority.

Ein Transport- oder Verifikationsfehler autorisiert keine Aktion.

## GitHub-Verbindung

GitHub ist optional und wird nur verbunden, wenn du den GitHub-Verbindungsfluss ausdrücklich startest.

Der Windows-Desktop verwendet den Device Flow der Livariant GitHub App. Nach der Verbindung kann Livariant authentifizierte GitHub-Anfragen ausführen, um:

- den verbundenen Account zu bestimmen;
- Repositories aufzulisten, die GitHub für die autorisierte GitHub-App-/Benutzerverbindung freigibt, einschließlich privater Repositories;
- unterstützte Repository-Metadaten wie Actions, Pull Requests, Issues oder Releases zu lesen;
- ein von dir ausdrücklich ausgewähltes Repository zu klonen.

Die aktuelle GitHub-Fähigkeit ist leseorientiert. Das Verbinden von GitHub vergibt weder Repository-Schreibfähigkeit noch Project Truth oder Projekt-Mutation-Authority.

Unter Windows werden Access-/Refresh-Token mit der DPAPI-Grenze des aktuellen Benutzers geschützt, bevor ausschließlich geschütztes Material unter Livariant-App-Daten gespeichert wird. Klartext-Tokens werden nicht in Projektdateien geschrieben.

Ein Git-Clone überträgt zwangsläufig Inhalte des ausdrücklich ausgewählten Repositories von GitHub in den von dir gewählten lokalen Checkout. Livariant klont Repositories nicht stillschweigend.

Siehe [Desktop-GitHub-Verbindung](desktop-github-connection.md).

## Desktop-Update-Prüfungen

Der Desktop führt **keinen automatischen Remote-Update-Check** aus.

Wenn du ausdrücklich **Nach Updates suchen** auswählst, liest der Desktop den festen Livariant-Preview-Update-Feed über HTTPS und prüft die Updater-Signing-Identität, bevor ein Update installiert werden kann.

Der Updater prüft das Ziel vor der Installation erneut und fährt nicht still fort, wenn sich die verfügbare Version nach deiner Prüfung geändert hat. Verifizierter Operator-UpdateBlock-State wird zusätzlich vor Download/Installation geprüft; nicht lesbarer oder ungültiger Sicherheitszustand schlägt fail-closed fehl.

Der oben beschriebene automatische Operator-Sicherheitsabruf ist vom nutzerseitig ausgelösten Update-Check getrennt.

## Core-/CLI-Update-Verhalten

Der Core-/CLI-Update-Pfad bleibt vom Desktop-Updater getrennt. Er liest Release-Manifeste/-Artefakte, die du ausdrücklich bereitstellst, und hält rechnerlokalen Runtime Trust / Release Authorization außerhalb der Projekt-Authority.

Für ausführbare CLI-Runtime-Updates benötigt das exakte Artefakt weiterhin den akzeptierten unabhängigen Release-Authorization-Pfad. Projektdateien, ein Manifest oder projektseitiger CLI-Input können diese Authority nicht erzeugen.

## Externe KI-Provider

Provider-spezifischer Kontext wird von Livariant lokal vorbereitet. Livariant sendet Projektkontext nicht allein deshalb an einen KI-Provider, weil dieser Kontext existiert.

Wenn du einen externen Provider wie Codex ausdrücklich verbindest/verwendest, gelten dessen Anwendung, Account, Datenschutzeinstellungen, Aufbewahrungsregeln und Bedingungen für Daten, die der Provider erhält. Provider-Verhalten ist von Livariant-Telemetrie getrennt.

Das Verbinden eines Providers erteilt weder Livariant noch dem Provider allein dadurch die Berechtigung, Projektdateien zu ändern, Code zu mergen oder Releases zu veröffentlichen.

## Native Benachrichtigungen

Windows-Toast-Benachrichtigungen sind ein lokaler Auslieferungskanal. Beim unterstützten Update-Hinweis wird zuerst der dauerhafte Livariant-Notification-Center-Eintrag gespeichert und danach best-effort der Windows-Toast versucht. Native Toast-Auslieferung erzeugt keinen zusätzlichen Netzwerkpfad und keine Authority.

## Was standardmäßig lokal bleibt

Bei normaler lokaler Nutzung:

- wird das Project Brain von Livariant nicht automatisch hochgeladen;
- bleiben Diagnostics-Evidence/-Export lokal und sind darauf ausgelegt, Raw Prompts, freie Begründungstexte, Projektdatei-Inhalte, lokale Pfade und App-Credential-State auszuschließen;
- bleiben Repository-Zuordnungen und lokale Checkout-Pfade lokaler Livariant-State;
- wird Provider-Resume-/Handoff-Kontext lokal erzeugt, bis du ihn bewusst mit einem externen Provider verwendest.

## Künftige Netzwerkfunktionen brauchen eine neue Prüfung

Gehostete Synchronisierung, Livariant-Accounts, Telemetrie, Marketplace-Dienste, Remote-Projektspeicherung oder andere künftige Netzwerkfunktionen schaffen neue Datenschutz-/Trust-Grenzen. Sie sind nicht allein deshalb durch diese Erklärung abgedeckt, weil sie später existieren könnten.

Bevor eine solche Funktion unterstützt wird, müssen Datenfluss, Standardverhalten, Nutzerkontrollen, Aufbewahrungsfolgen und Sicherheitsmodell getrennt dokumentiert und geprüft werden.

## Aktueller Datenschutz in Kurzform

- keine Livariant-Nutzungstelemetrie ist implementiert;
- es gibt keinen automatischen Project-Brain-Upload;
- für normale lokale Nutzung ist kein Livariant-Cloud-Account erforderlich;
- Desktop-Operator-Sicherheitshinweise werden automatisch über genau einen festen signierten HTTPS-Kanal abgerufen;
- Desktop-Update-Suche ist nutzerseitig ausgelöst und nicht automatisch;
- GitHub-Netzwerkverkehr erfolgt erst nach ausdrücklicher Verbindung/Nutzung und bleibt im aktuellen Produkt leseorientiert;
- für ausdrücklich verwendete externe KI-Provider gilt deren eigenes Verhalten;
- Netzwerkverbindung erzeugt allein weder Project Truth noch Authority.
