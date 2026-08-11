# Datenschutz & Netzwerkverhalten

Die Public-Preview-Baseline von Livariant ist darauf ausgelegt, als local-first Tool nützlich zu bleiben.

## Keine Telemetrie in der aktuellen Runtime

Die aktuelle Livariant-Runtime implementiert keine Analytics, Nutzungstelemetrie, Crash-Reports, Werbe-Identifier, Account-Tracking oder automatische Uploads von Project-Brain-Inhalten.

`status`, `doctor`, `init`, `resume` und `recover` arbeiten gegen lokalen Projektzustand.

Provider-spezifischer Resume-Handoff erzeugt derzeit eine lokale Projektion aus kanonischem Project-Brain-State. Der Livariant-Adapter selbst überträgt diesen Kontext nicht an Claude Code, Codex oder einen anderen Remote-Service. Was ein separat betriebener Provider/Client mit vom Nutzer bereitgestelltem Kontext macht, unterliegt dessen Bedingungen und liegt außerhalb des aktuellen Runtime-Verhaltens von Livariant.

## Update-Verhalten

Der aktuell unterstützte Preview-Update-Befehl verarbeitet ein Release-Manifest und ein Artefakt, die der CLI als lokale Pfade übergeben werden:

```bash
livariant update --manifest ./release-manifest.json
```

Zum Anwenden des Updates sind das lokale Artefakt und eine explizit gewählte vertrauenswürdige Quellidentität erforderlich:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

Für ausführbare Updates muss der exakte Artefakt-SHA-256 zusätzlich bereits durch eine unabhängige machine-local Release-Authority außerhalb der Projektautorität autorisiert sein. Diese Autorität wird weder durch das Manifest, `--trusted-source`, Projektdateien noch durch die projektseitige Livariant-CLI/API erzeugt. Fehlt sie, bricht das Update fail-closed vor npm-Installation oder Candidate-Runtime-Attestation ab. Livariant stellt absichtlich keinen projektseitigen `authorize-runtime`-Befehl bereit.

Die Runtime führt derzeit keinen automatischen Remote-Update-Check aus und lädt Releases nicht stillschweigend herunter.

Die Installation eines unabhängig autorisierten und verifizierten lokalen Runtime-Artefakts verwendet npm in einem eingeschränkten lokalen Installationspfad, bei dem Lifecycle-Skripte, Audit- und Funding-Prompts deaktiviert sind. Die aktuell gepackte Runtime deklariert keine Runtime-Abhängigkeiten, sodass das unterstützte Release-Artefakt keine zusätzliche Dependency-Auflösung benötigt, um weitere Runtime-Pakete herunterzuladen.

Machine-local Runtime-Trust- und Release-Authorization-Records sind Sicherheitszustand außerhalb der Projektautorität. Sie sind keine Project-Brain-Daten und dürfen nicht als repository-kontrollierte Konfiguration behandelt werden.

## Projektdaten

Das Project Brain kann Projektidentität, Entscheidungen, Ziele, Wissen und ungelöste Unbekannte enthalten. Behandle es als Projektdaten.

Livariant darf offensichtliche Secret-Dateien nicht allein deshalb einlesen, um Projektwissen anzureichern. Bestehende `.env`-artige Secrets und andere nicht zugehörige private Dateien sind standardmäßig kein kanonischer Project-Brain-Input.

Nutzer bleiben dafür verantwortlich zu entscheiden, welche Informationen sie bewusst in Project-Brain-Dateien festhalten und welchen Kontext sie bewusst an externe KI-Provider weitergeben.

## Zukünftige Netzwerkfunktionen

Ein zukünftiger automatischer Update-Service, eine gehostete Registry-Integration, Telemetrie, Remote-Synchronisierung oder ein Cloud-Account würde neue Datenschutz- und Vertrauensgrenzen schaffen.

Solches Verhalten darf unter der aktuellen Aussage nicht stillschweigend ergänzt werden. Bevor es als unterstütztes öffentliches Feature gilt, müssen Datenfluss, Standardverhalten, Opt-in/Opt-out-Semantik, Aufbewahrungsfolgen und Sicherheitsmodell dokumentiert und geprüft werden.

## Zusammenfassung

Für die aktuelle Public-Preview-Baseline gilt:

- lokaler Projektbetrieb benötigt keinen Livariant-Cloud-Account;
- keine Livariant-Telemetrie ist implementiert;
- kein automatischer Remote-Update-Check ist implementiert;
- das Project Brain wird von Livariant nicht automatisch hochgeladen;
- ausführbare Updates erfordern bereits vorhandene unabhängige machine-local Exact-Artifact Release Authority;
- Projektinput kann diese Autorität nicht über die projektseitige Livariant-CLI/API erzeugen;
- Verhalten externer Provider bleibt von Livariants eigener Runtime getrennt.
