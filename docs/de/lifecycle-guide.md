# Updates, Migrationen & Wiederherstellung

<p align="center">
  <a href="../lifecycle-guide.md">English</a> · <strong>Deutsch</strong>
</p>

Livariant besitzt zwei unterschiedliche Update-/Lifecycle-Domains, die nicht miteinander verwechselt werden dürfen:

1. **Desktop-Anwendungsupdates** — signierte Updater-Erkennung/Download/Installation für das Windows Desktop Preview;
2. **Core-/Projekt-Lifecycle-Operationen** — plan-first Initialisierung, Runtime-/Framework-Update, Migration und Recovery unter dem bestehenden Guardian-/Authority-Modell.

Ein Anwendungsupdate ist nicht automatisch eine Project-Brain-Mutation und Project-Lifecycle-Authority ist nicht automatisch die Erlaubnis, beliebigen ausführbaren Code zu installieren.

## Desktop-Anwendungsupdates

Der aktuelle Desktop besitzt einen echten signierten Updater-Pfad.

Wenn der Nutzer ausdrücklich nach Updates sucht, kann Livariant seinen konfigurierten HTTPS-Updater-Endpunkt abfragen. Aktuelle Kontrollen umfassen:

- feste Updater-Endpunkt-/Channel-Konfiguration;
- festen Updater-Public-Key;
- signierte Update-Metadaten/-Artefakte;
- lokalisierte DE/EN-Release-Notes;
- echte Download-Callbacks/-Fortschrittszustände, wenn eine vertrauenswürdige Gesamtgröße verfügbar ist;
- ausdrückliche Nutzerautorisierung vor Installation/Neustart;
- Renderer-Grenzen, die beliebige Update-URLs oder Executables verhindern.

Das Zustandsmodell bleibt:

```text
verfügbar != zur Installation autorisiert
signiertes Artefakt != Project Truth
Anwendungsupdate != Projektmutation
```

Das aktuell veröffentlichte Desktop Preview ist `0.1.0-rc.28` für Windows x64. Exakte Release-Identität siehe [Installation](installation.md).

## Desktop-Update-UX schwächt Authority nicht

Der Desktop kann Update-Verfügbarkeit, Release Notes, Download-Fortschritt, Installationsvorbereitung, Abschluss und Restart-State darstellen. Darstellung ist keine Authority.

Der Installationsschritt bleibt ausdrücklich vom Nutzer autorisiert. Ist keine vertrauenswürdige Gesamtgröße des Downloads verfügbar, muss die UI einen indeterminierten Zustand anzeigen statt einen Prozentwert zu erfinden.

Lokalisierte Release Notes sind Display-Daten und werden über begrenzte Parsing-/Escaping-Pfade dargestellt; sie werden dadurch nicht zu ausführbaren Instruktionen.

## Core-/Projekt-Lifecycle bleibt plan-first

Tiefergehende Livariant-Core-Lifecycle-Operationen bleiben vom Desktop-Updater getrennt.

Für Initialisierung, Core-/Framework-Update/-Migration und Recovery gilt konzeptionell weiterhin:

```text
planen / prüfen
-> exaktes folgenreiches Material autorisieren, wo erforderlich
-> anwenden
-> verifizieren
```

Dass ein Caller `--apply`-Intent ausdrückt, ist nicht dasselbe wie geschützte Lifecycle Authority.

Dauerhafte Grenzen sind unter anderem:

```text
Capability != Authority
Proposal != Authorization
Artifact Integrity != Runtime Trust != Release Authorization
Project-Lifecycle-Authority != Executable-Release-Authority
```

## Initialisierung

Zuerst prüfen:

```bash
livariant init
```

Wo der aktuell unterstützte Lifecycle geschützte Autorisierung verlangt, den exakten Plan vor Request/Apply reviewen:

```bash
livariant init --authorize
livariant init --apply
```

Authority ist an Material/Projekt/Operation gebunden. Ändert sich der Zustand zwischen Authorization und Apply, muss veraltete Authority ungültig werden statt still wiederverwendet zu werden.

## Core-/Framework-Update planen

Der tiefergehende Core-Update-Pfad verwendet ein explizites Release-Manifest:

```bash
livariant update --manifest ./release-manifest.json
```

Planning mutiert das Projekt nicht. Es löst/zeigt Release-Identität, Artefakt-/Source-Informationen, Projektauswirkungen und Migration-/Checkpoint-Anforderungen.

Ein reviewtes folgenreiches Update kann anschließend den unterstützten Authorization-/Application-Pfad verwenden:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --authorize
```

gefolgt von passendem Apply mit exaktem Artefakt-/Source-Material:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

Diese Commands beschreiben den Core-Lifecycle-Vertrag. Sie sind **nicht** die normale Desktop-Preview-Update-UI und bedeuten nicht, dass ein neueres eigenständiges CLI-Paket aktuell veröffentlicht wäre.

Project-controlled Input, Provider-Ausgabe, Manifest oder `--trusted-source` können keine geschützte Release-/Runtime-Authority herstellen.

## Framework-Update vs. Project-Brain-Migration

Ein Update ausführbarer Framework-Tools bedeutet nicht automatisch eine Project-Brain-Schema-Migration.

Wird eine Schema-Migration benötigt, muss der Migrationspfad explizit unterstützt sein. Livariant darf keine beliebigen Transformationen zwischen Schemas erraten.

Operation-Domains bleiben getrennt, damit Authorization für ein normales Update nicht als Migration-/Recovery-/Init-Authorization zweckentfremdet werden kann.

## Unterbrochener Migration-/Update-Zustand

Eine unterbrochene Lifecycle-Operation ist nicht gleichbedeutend mit „nichts ist passiert“.

Livariant behält Lifecycle-Evidenz, damit mehrdeutiger/unvollständiger Zustand diagnostiziert werden kann. Solange Recovery ungelöst ist, können normale Mutation/Replays blockiert werden, statt sich durch den Zustand zu raten.

Prüfen mit:

```bash
livariant doctor
livariant recover
```

Ein gültiger unterstützter Recovery-Pfad kann seine eigene exakte Authorization-/Application-Sequenz benötigen:

```bash
livariant recover --authorize
livariant recover --apply
```

Recovery Authority ist an spezifisches Projekt/unterbrochene Operation/Checkpoint/Material gebunden und kann keine andere Lifecycle-Domain autorisieren.

## Checkpoints und Recovery-Sicherheit

Recovery bleibt konservativ:

- Checkpoint-Identität/-Ort/-Material muss weiterhin passen;
- Migration-/Recovery-Journal-State muss kohärent sein;
- mehrdeutiges, verschobenes, verändertes, veraltetes oder substituiertes Material schlägt geschlossen fehl;
- wiederhergestellter kanonischer Project-Brain-State wird verifiziert, bevor Cleanup als abgeschlossen gilt;
- fehlgeschlagenes Cleanup muss genug Evidenz behalten, damit mehrdeutiger State nicht als gesund dargestellt wird.

## Lifecycle- oder Protected-State nicht manuell reparieren

> [!CAUTION]
> Project-Brain-Dateien, Livariant-managed Lifecycle-State, geschützten Guardian-/Bootstrap-State, Runtime-Trust-Records oder Release-Authorization-Records nicht manuell ersetzen, nur um Update/Recovery zu erzwingen.

Manuelles Ersetzen kann Compatibility-, Authority-, Provenance-, Checkpoint-, Replay-Safety- und Integrity-Grenzen umgehen.

Für Projekt-Lifecycle-State:

```bash
livariant doctor
livariant recover
```

Für geschützten Guardian-State, wo die relevante CLI-Oberfläche vorhanden ist:

```bash
livariant guardian status
```

Ein unsicherer/mehrdeutiger Protected-State ist ein Stop-Zustand und keine Erlaubnis für geratenes Repair.

## Historische CLI-Release-Grenze

Das historische `v0.1.0-rc.4` CLI Public Preview bleibt unveränderlich. Seine alte Windows-Fresh-Install-Distributionseinschränkung bleibt historische Wahrheit für dieses Artefakt: Die geschützte Stage-A-Guardian-Bootstrap-Quelle für einen vollständigen Clean-Machine-Protected-Lifecycle wurde nicht veröffentlicht/provisioniert.

Spätere Core-/Desktop-Implementierung repariert RC4 nicht rückwirkend und historische Stage-A-/Stage-B-Anweisungen sollten nicht als normaler Installations-/Update-Pfad für das aktuelle Desktop Preview dargestellt werden.

## Aktueller Nutzerpfad

Für normale Windows-Nutzer:

```text
verifiziertes Desktop Preview installieren
-> Livariant öffnen
-> Connections / Project Truth / Diagnostics verwenden
-> ausdrücklich nach signierten Desktop-Updates suchen
-> Installation/Neustart bei Wunsch ausdrücklich autorisieren
```

Für tiefergehende Core-/Guardian-Lifecycle-Arbeit die expliziten CLI-Verträge oben und die ausführlichere [Architektur-&-Sicherheits-Dokumentation](architecture-and-safety.md) verwenden.

Siehe außerdem:

- [Installation & erstes Projekt](installation.md)
- [Public Preview Scope & Limitations](preview-scope.md)
- [Datenschutz & Netzwerkverhalten](privacy-and-network.md)
