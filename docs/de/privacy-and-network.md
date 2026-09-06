# Datenschutz & Netzwerkverhalten

<p align="center">
  <a href="../privacy-and-network.md">English</a> · <strong>Deutsch</strong>
</p>

Livariant arbeitet standardmäßig local-first. Diese Seite trennt lokales Projektverhalten, Desktop-Update-Traffic, lokale Connector-Kommunikation und das Verhalten externer KI-Provider.

## Keine Livariant-Nutzungstelemetrie im aktuellen Produkt

Livariant implementiert derzeit keine eigene:

- Analytics- oder Nutzungstelemetrie;
- Werbe-Identifier;
- Livariant-Cloud-Account-Verfolgung;
- automatischen Uploads von Project-Brain-Inhalten;
- automatischen Uploads von Roh-Prompts oder beliebigen Projektdateien für Diagnostics.

Project Brain, lokale Diagnostics-Evidenz, Connection Intent und normale Projektinspektion bleiben lokal, solange nicht ein separat unterstütztes Feature ausdrücklich eine Netzwerkgrenze überschreitet.

Diese Aussage betrifft Livariant selbst. Betriebssystem-Komponenten, GitHub, Paketmanager in erweiterten CLI-Workflows und externe KI-Provider besitzen eigenes Netzwerk-/Datenschutzverhalten.

## Externe KI-Provider sind eine eigene Grenze

Livariant kann begrenzten Provider-Kontext lokal vorbereiten. Wenn dieser Kontext an Claude Code, Codex oder einen anderen externen Provider gesendet wird, gelten dessen Anwendung, Account-Einstellungen, Aufbewahrungsregeln und Bedingungen.

Provider-Ausgabe, die zu Livariant zurückkehrt, bleibt Evidence/Kandidatenmaterial, bis ein unterstützter Review-/Adoption-/Authority-Pfad etwas stärker akzeptiert.

Eine Provider-Verbindung gilt nicht als Zustimmung, das gesamte Projekt oder Project Brain hochzuladen.

## Desktop Connections

Die aktuelle Desktop-App besitzt einen echten lokalen Codex-Verbindungspfad über einen begrenzten lokalen Connector Host / App Server.

Connection Intent kann lokal gespeichert werden, damit eine akzeptierte Verbindung bei einem späteren App-Start wiederhergestellt werden kann. Diese Persistenz speichert Connection-State-/Identity-Informationen, nicht Project Truth und keine Mutation Authority.

Der externe Codex-Client/-Dienst kann nach seinen eigenen Authentifizierungs-, Account-, Modell- und Datenschutzeinstellungen über das Netzwerk kommunizieren. Dieser Provider-Traffic ist von Livariant-Telemetrie getrennt.

## Desktop-Update-Verhalten

Der aktuelle Desktop unterstützt **Remote-Update-Erkennung**. Ältere Dokumentation mit der Aussage, Livariant führe keine Remote-Update-Checks durch, beschrieb das frühere CLI-only-Update-Modell und ist heute global nicht mehr korrekt.

Wenn der Nutzer den Desktop-Update-Flow aufruft, prüft Livariant seinen konfigurierten HTTPS-Updater-Endpunkt auf signierte Update-Metadaten. Der aktuelle Update-Pfad verwendet:

- eine feste Updater-Endpunkt-/Channel-Konfiguration;
- einen festen Updater-Public-Key;
- signierte Update-Metadaten/-Artefakte;
- lokalisierte DE/EN-Release-Notes in den Update-Metadaten;
- echte Download-Callbacks/-Fortschrittszustände, wenn eine vertrauenswürdige Gesamtgröße vorliegt;
- ausdrückliche Nutzerautorisierung vor Installation/Neustart.

Update-Verfügbarkeit ist keine Installations-Authority. Der Renderer kann keine beliebige Update-URL oder Executable auswählen.

Der aktuelle Desktop-Update-Pfad darf nicht als stille autonome Projektmutation beschrieben werden. Ein ausführbares App-Update und eine Projekt-Lifecycle-Mutation sind getrennte Domains.

## CLI / Protected-Runtime-Update-Verhalten

Livariant Core enthält zusätzlich das tiefergehende CLI-Lifecycle-/Update-Modell. Dieser Pfad arbeitet mit explizitem lokalem Release-Manifest-/Artefaktmaterial und geschützten Runtime-/Release-Authority-Grenzen.

Ein typischer plan-first CLI-Update-Pfad bleibt konzeptionell von der Desktop-Updater-Erkennung getrennt:

```bash
livariant update --manifest ./release-manifest.json
```

Ein folgenreicher Apply erfordert weiterhin die unterstützten Exact-Artifact-/Source-/Authority-Prüfungen. Projektdateien, Provider-Ausgabe oder ein caller-controlled `--trusted-source`-Wert können keine geschützte Release-/Runtime-Authority herstellen.

Die Existenz des Desktop-Updaters schwächt diese Core-/Guardian-Grenzen nicht.

## Project Brain und Diagnostics sind Projektdaten

Project Brain kann Projektidentität, Ziele, Entscheidungen, Wissen und offene Fragen enthalten. Diagnostics kann lokale technische Evidenz und Provenienz enthalten.

Behandle beides als Projekt-/Nutzerdaten. Livariant muss offensichtliche Secret-Dateien nicht einlesen, nur um diese Speicher anzureichern, und Diagnostics darf standardmäßig keine Roh-Prompt-/Projektinhalte erfassen, nur um Effizienz zu messen.

Du bleibst dafür verantwortlich, was du bewusst in Project Brain festhältst und welchen Kontext du später an einen externen Provider sendest.

## Aktuelle Netzwerk-/Datenschutz-Zusammenfassung

Für das aktuelle Preview gilt:

- für normale lokale Projektarbeit ist kein Livariant-Cloud-Konto nötig;
- Livariant-Nutzungstelemetrie ist derzeit nicht implementiert;
- Project Brain wird von Livariant nicht automatisch hochgeladen;
- Diagnostics erfasst standardmäßig keine Roh-Prompt-/Projektinhalte;
- Desktop kann den konfigurierten signierten Updater-Endpunkt kontaktieren, wenn der Update-Flow aufgerufen wird;
- lokaler Desktop-Connector-State kann für Restore persistiert werden, ist aber weder Project Truth noch Authority;
- Provider-Traffic und Provider-Aufbewahrung bleiben getrennte externe Provider-Themen;
- geschützte CLI-Runtime-/Release-Authority bleibt von Desktop-Update-Erkennung getrennt.

## Künftige Netzwerkfeatures benötigen einen eigenen Review

Hosted Synchronization, Livariant-Accounts/Cloud-Storage, Telemetrie, Remote-Projektindizierung oder andere neue Netzwerkdienste würden neue Datenschutz-/Trust-Grenzen schaffen. Sie sind durch diese Seite nicht autorisiert oder beschrieben, nur weil sie als Roadmap-Idee möglich wären.

Vor unterstützter Nutzung benötigt jedes solche Feature explizite Dokumentation zu Datenfluss, Defaults, Einwilligung, Aufbewahrung, Sicherheit und Disable-/Reversal-Verhalten.
