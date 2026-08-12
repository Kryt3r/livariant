# Datenschutz & Netzwerkverhalten

Der aktuelle Livariant-Preview-Kandidat ist für lokale Projektarbeit ausgelegt. Diese Seite erklärt, was Livariant selbst über das Netzwerk sendet, was lokal bleibt und wo externe KI-Provider ein eigenes Thema sind.

## Keine Livariant-Telemetrie in der aktuellen Runtime

Die aktuelle Runtime implementiert keine:

- Analytics oder Nutzungstelemetrie;
- Crash-Reports;
- Werbe-Identifier;
- Livariant-Account-Verfolgung;
- automatischen Uploads von Project-Brain-Inhalten.

`status`, `doctor`, `init`, `resume` und `recover` arbeiten mit lokalem Projektzustand.

Auch provider-spezifischer Resume-Kontext wird von Livariant lokal erzeugt. Der Livariant-Adapter sendet diesen Kontext nicht selbst an Claude Code, Codex oder einen anderen Remote-Dienst.

Wenn du den erzeugten Kontext anschließend bewusst an einen externen KI-Provider weitergibst, bestimmen dessen Anwendung, Account, Datenschutzeinstellungen und Bedingungen, was damit geschieht. Dieses Verhalten gehört nicht zur Livariant-Runtime.

## Update-Verhalten

Der aktuelle unterstützte Update-Pfad liest ein Release-Manifest und ein Artefakt aus lokalen Pfaden, die du der CLI übergibst.

Planung:

```bash
livariant update --manifest ./release-manifest.json
```

Zum Anwenden eines geprüften Updates brauchst du das lokale Artefakt und eine ausdrücklich ausgewählte vertrauenswürdige Quellidentität:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

Für ausführbare Updates muss der exakte Artefakt-SHA-256 zusätzlich bereits durch eine unabhängige rechnerlokale Release-Authority außerhalb der Projektautorität autorisiert sein.

Manifest, `--trusted-source`, Projektdateien und die projektseitige Livariant-CLI oder API können diese Autorität nicht erzeugen. Fehlt sie, stoppt das Update vor npm-Installation oder Candidate-Runtime-Attestation. Einen projektseitigen `authorize-runtime`-Befehl gibt es nicht.

Die aktuelle Runtime führt keinen automatischen Remote-Update-Check aus und lädt Releases nicht stillschweigend herunter.

Bei der Installation eines unabhängig autorisierten und geprüften lokalen Runtime-Artefakts verwendet Livariant npm in einem eingeschränkten lokalen Installationspfad. Lifecycle-Skripte, Audit- und Funding-Prompts sind dabei deaktiviert. Die aktuell gepackte Runtime hat keine Runtime-Abhängigkeiten, deshalb muss das unterstützte Release-Artefakt keine weiteren Runtime-Pakete aus dem Netz auflösen.

Rechnerlokale Runtime-Trust- und Release-Authorization-Records sind Sicherheitszustand außerhalb der Projektautorität. Sie gehören nicht zum Project Brain und sind keine vom Repository kontrollierte Konfiguration.

## Project Brain als Projektdaten behandeln

Das Project Brain kann Projektidentität, Entscheidungen, Ziele, Wissen und offene Fragen enthalten. Behandle diese Dateien wie andere Projektdaten auch.

Livariant muss offensichtliche Secret-Dateien nicht einlesen, nur um das Project Brain mit mehr Informationen zu füllen. `.env`-artige Secrets und andere unabhängige private Dateien sind standardmäßig kein kanonischer Project-Brain-Input.

Du entscheidest selbst, welche Informationen du bewusst im Project Brain speicherst und welchen Kontext du später an einen externen KI-Provider weitergibst.

## Zukünftige Netzwerkfunktionen brauchen eine neue Prüfung

Funktionen wie automatische Update-Dienste, gehostete Registry-Integration, Telemetrie, Remote-Synchronisierung oder ein Livariant-Cloud-Konto würden neue Datenschutz- und Vertrauensgrenzen schaffen.

Solche Funktionen sind nicht automatisch durch diese Erklärung abgedeckt, nur weil sie in einer späteren Version entstehen könnten. Bevor sie unterstützt werden, müssen Datenfluss, Standardverhalten, Nutzerkontrollen, Aufbewahrungsfolgen und Sicherheitsmodell dokumentiert und geprüft werden.

## Aktueller Datenschutz in Kurzform

Für den aktuellen Preview-Kandidaten gilt:

- normaler lokaler Projektbetrieb braucht keinen Livariant-Cloud-Account;
- Livariant-Telemetrie ist nicht implementiert;
- automatische Remote-Update-Checks sind nicht implementiert;
- das Project Brain wird von Livariant nicht automatisch hochgeladen;
- Provider-Resume-Kontext wird lokal erzeugt;
- ausführbare Updates brauchen bereits vorhandene unabhängige rechnerlokale Autorität für das exakte Artefakt;
- Projektinput kann diese Autorität nicht über die projektseitige Livariant-CLI oder API erzeugen;
- das Verhalten externer KI-Provider bleibt von Livariants eigener Runtime getrennt.
