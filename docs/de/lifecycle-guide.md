# Updates, Migrationen & Wiederherstellung

<p align="center">
  <a href="../lifecycle-guide.md">English</a> · <strong>Deutsch</strong>
</p>

Livariant führt Updates und Wiederherstellung über die installierte `livariant`-CLI aus. Dabei gilt immer dieselbe Grundregel: zuerst prüfen und planen, erst danach mit `--apply` eine Änderung ausdrücklich erlauben.

## Update zuerst planen

Verwende das Release-Manifest aus der vertrauenswürdigen Livariant-Preview-Quelle:

```bash
livariant update --manifest ./release-manifest.json
```

Der Plan zeigt unter anderem:

- Quell- und Zielversion;
- Update-Channel;
- Release-Source-ID;
- Artefaktidentität und SHA-256;
- ob eine Migration nötig ist;
- Auswirkungen auf das Projekt;
- ob ein Checkpoint benötigt wird;
- welche Autorisierung fehlt oder erforderlich ist.

Ohne `--apply` wird kein Update ausgeführt.

## Geprüftes Update anwenden

Wenn der Plan korrekt ist, gib exakt das im Plan identifizierte Artefakt an und nenne die Release-Quelle, der du ausdrücklich vertraust:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

Das Release-Manifest kann seine eigene Source-ID nicht selbst vertrauenswürdig machen. Die angegebene vertrauenswürdige Quelle wird separat geprüft. Das Artefakt muss außerdem zur Release-Identität und zum SHA-256 im Manifest passen.

Für ausführbare Updates gibt es noch eine zusätzliche Sicherheitsgrenze: Der exakte Artefakt-Digest muss bereits durch eine unabhängige rechnerlokale Release-Authority außerhalb des ausgewählten Projekts autorisiert sein.

Projektdateien, Release-Manifeste, `--trusted-source` und die projektseitige Livariant-CLI können diese Authority weder erzeugen noch verändern. Fehlt die passende Digest-Autorisierung, stoppt das Update, bevor Candidate-Runtime-Code installiert oder ausgeführt wird.

Einen projektseitigen `authorize-runtime`-Befehl gibt es absichtlich nicht.

## Was bei einem ausführbaren Update passiert

Der sichere normale Ablauf ist:

```text
Zielrelease auflösen
-> Release-Identität und Trusted-Source-Beziehung prüfen
-> Artefakt-SHA-256 prüfen
-> Kompatibilität und Channel prüfen
-> explizite --apply-Autorisierung verlangen
-> bereits vorhandene unabhängige rechnerlokale Artefakt-Authority verlangen
-> Ziel-Runtime ohne Lifecycle-Skripte installieren
-> gebundene Release-Evidenz schreiben und prüfen
-> installierten Runtime-Baum messen
-> rechnerlokalen Runtime-Trust herstellen und erneut prüfen
-> erst dann Candidate-Runtime-Attestation ausführen
-> Preservation- und Lifecycle-Bedingungen erneut prüfen
-> kanonischen Project-Brain-Framework-Pin committen
```

Der Framework-Pin im Project Brain ist die finale Aktivierungsentscheidung. Eine neuere Runtime ist nicht automatisch aktiv, nur weil sie bereits auf der Festplatte liegt.

## Framework-Update und Project-Brain-Migration sind nicht dasselbe

Ein Release kann Livariant aktualisieren, ohne das Project-Brain-Schema zu verändern.

Ändert sich das Schema, läuft das Update zusätzlich durch den Migrationsvertrag. Als Nutzer verwendest du trotzdem denselben Einstieg:

```bash
livariant update --manifest ./release-manifest.json
```

Wenn das kompatible Zielrelease das Project-Brain-Schema ändert, zeigt Livariant die Migration bereits im Plan. Ein autorisiertes `--apply` führt dann automatisch durch den unterstützten Migrationspfad.

> [!WARNING]
> `npm install`, das Kopieren eines Tarballs, das manuelle Ersetzen von `.project-brain/` oder direkte Änderungen an `metadata.json` sind keine unterstützten Projektmigrationen.

## Unterstützter Migrationspfad

Die aktuelle ausführbare Preview-Baseline weist einen expliziten Schema-Migrationspfad nach: Project Brain `1 -> 2`.

Der Ablauf enthält:

```text
Kompatibilitätsprüfung
-> explizite Migrationsidentität
-> Autorisierung
-> integritätsgebundener Checkpoint
-> dauerhaftes Migrationsjournal
-> Evidenz für nicht sicher wiederholbare Schritte
-> Mutation
-> Validierung
-> Zielaktivierung
```

Fehlt ein unterstützter oder vollständiger Migrationspfad, bricht Livariant geschlossen ab. Es wird keine Transformation geraten, nur weil Quell- und Zielschema unterschiedlich sind.

## Was bei einer unterbrochenen Migration passiert

Ein Abbruch nach einer nicht sicher wiederholbaren Mutation bedeutet nicht, dass nichts passiert ist.

Livariant hält diesen Zustand dauerhaft fest. Solange die Wiederherstellung ungeklärt ist:

- sind normale Update-Planung und Update-Anwendung blockiert;
- wird die Migration nicht blind wiederholt;
- meldet `livariant status` den Zustand `recovery-required`;
- bleibt `livariant doctor` diagnostisch und führt keine automatische Reparatur aus.

## Wiederherstellung zuerst prüfen

Beginne immer read-only:

```bash
livariant doctor
livariant recover
```

`livariant recover` zeigt die unterbrochene Operation, Migrationsidentität, Quell- und Zielrelease, Quell- und Zielschema sowie die Gültigkeit des Checkpoints. Falls eine unterstützte Recovery-Strategie möglich ist, wird sie ebenfalls angezeigt.

Fehlt der Checkpoint, wurde er verschoben, manipuliert oder ist er mehrdeutig, bleibt automatische Wiederherstellung gesperrt.

## Wiederherstellung anwenden

Wenn `livariant recover` einen gültigen Checkpoint und die Strategie `rollback` meldet:

```bash
livariant recover --apply
```

Recovery ist eine eigene, explizit autorisierte Lifecycle-Operation.

Vor dem Rollback prüft Livariant:

- das Migrationsjournal;
- Checkpoint-Ort und erwartete Identität;
- Quellrelease- und Quellschema-Metadaten;
- Digests der kanonischen Project-Brain-Dateien im Checkpoint.

Livariant committet zuerst das verifizierte wiederhergestellte Project Brain. Danach wird der verdrängte Pre-Recovery-Baum entfernt. Der letzte gültige Recovery-Checkpoint wird erst im letzten irreversiblen Bereinigungsschritt gelöscht.

Wenn die späte Bereinigung fehlschlägt, dürfen weder das wiederhergestellte Project Brain zurückgerollt noch der letzte gültige Checkpoint zerstört werden.

Ein fehlender, verschobener, manipulierter oder mehrdeutiger Checkpoint löst keine geratene Wiederherstellung aus.

## Was bei einem erneuten Versuch wiederverwendet werden darf

Eine während eines unterbrochenen Versuchs bereits installierte Ziel-Runtime darf nur wiederverwendet werden, wenn ihre gebundene Release-Evidenz weiterhin exakt übereinstimmt.

Dazu gehören:

- Version;
- Channel;
- Source-ID;
- Artefakt-ID;
- Artefakt-Digest;
- Paketidentität;
- Integrität des installierten Paketbaums;
- Übereinstimmung mit dem rechnerlokalen Runtime-Trust.

Ein anderes Artefakt darf eine vorhandene Installation nicht übernehmen, nur weil es dieselbe Versionsnummer behauptet.

## Keine manuelle Reparatur

> [!CAUTION]
> Ersetze Project Brain, Livariant-verwalteten Lifecycle-State, Runtime-Trust-Records oder Release-Authorization-Records niemals manuell, um ein Update abzuschließen, zu reparieren oder abzukürzen.
>
> Damit würdest du Kompatibilität, Autorität, Checkpoints, Replay-Sicherheit, Integritätsprüfung und Aktivierungssemantik umgehen.
>
> Wenn der Lifecycle-Zustand unklar ist, beginne mit:
>
> ```bash
> livariant doctor
> livariant recover
> ```

## Preview-Distribution

Der unterstützte Preview-Distributionsweg ist das kanonische Livariant-GitHub-Release, sobald der aktuelle Release Candidate veröffentlicht ist.

Dieses Release stellt Paket, Release-Manifest und Prüfsummen bereit. Die für ausführbare Updates notwendige unabhängige rechnerlokale Release-Authority bleibt davon getrennt. Ein Projekt darf seine eigenen Update-Bytes nicht selbst zur Ausführungsautorität erklären.

Bis das Release tatsächlich veröffentlicht ist, verwenden die Beispiele lokale Manifest- und Artefaktpfade. Sie erfinden bewusst keinen Registry-, Signer- oder Download-Endpunkt, der noch nicht existiert.
