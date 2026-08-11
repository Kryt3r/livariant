# Updates, Migrationen & Wiederherstellung

<p align="center">
  <a href="../lifecycle-guide.md">English</a> · <strong>Deutsch</strong>
</p>

Livariant stellt den gehärteten Lifecycle über die installierte `livariant`-CLI bereit. Der sichere Pfad ist plan-first: Inspektion und Planung sind read-only; Mutation erfordert eine explizite `--apply`-Autorisierung.

## Update planen

Nutze ein Release-Manifest aus der gewählten vertrauenswürdigen Preview-Quelle:

```bash
livariant update --manifest ./release-manifest.json
```

Der Plan meldet unter anderem:

- Quell- und Zielversion;
- Update-Channel;
- Release-Source-ID;
- Artefaktidentität und SHA-256;
- ob eine Migration nötig ist;
- Projektauswirkung;
- Checkpoint-Bedarf;
- Autorisierungsbedarf.

Ohne `--apply` wird kein Update durchgeführt.

## Geprüftes Update anwenden

Gib exakt das im Plan identifizierte Artefakt an und benenne die Release-Quelle, der du ausdrücklich vertraust:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

Das Release-Manifest autorisiert seine eigene Source-ID **nicht** selbst. Die explizit angegebene Trusted-Source-Menge wird separat geprüft, und das Artefakt muss weiterhin zur im Manifest gebundenen Release-Identität und SHA-256 passen.

Zusätzlich muss der exakte Artefakt-Digest bereits durch eine **unabhängige machine-local Release-Authority** außerhalb des ausgewählten Projekts autorisiert sein. Projektinput, Release-Manifeste, `--trusted-source` und die projektseitige Livariant-CLI können diese Authority weder erzeugen noch verändern. Fehlt die exakte Digest-Autorisierung in dieser unabhängigen machine-local Policy, bricht das Update geschlossen ab, bevor Candidate-Runtime-Code installiert oder ausgeführt wird.

Einen projektseitigen `authorize-runtime`-Befehl gibt es absichtlich nicht. Die Preview-Distribution muss Release-Authority über einen getrennten vertrauenswürdigen Release-/Installationsprozess bereitstellen, statt einem Repository zu erlauben, seine eigenen Bytes zur Execution Authority zu erheben.

Der sichere normale Update-Ablauf ist:

```text
Zielrelease auflösen
→ Release-Identität und Trusted-Source-Beziehung prüfen
→ Artefakt-SHA-256 prüfen
→ Kompatibilität und Channel prüfen
→ explizite --apply-Autorisierung verlangen
→ bereits vorhandene unabhängige machine-local Artefakt-Authority verlangen
→ Ziel-Runtime ohne Lifecycle-Skripte installieren
→ gebundene Release-Evidenz schreiben und prüfen
→ installierten Runtime-Baum messen
→ machine-local Runtime-Trust herstellen und erneut prüfen
→ erst dann Candidate-Runtime-Attestation ausführen
→ Preservation-/Lifecycle-Bedingungen erneut prüfen
→ kanonischen Project-Brain-Framework-Pin committen
```

Der Project-Brain-Pin ist die finale Aktivierungsentscheidung. Nur weil eine neuere Runtime auf der Platte liegt, ist sie noch nicht aktiv.

## Framework-Update ist nicht gleich Project-Brain-Migration

Ein Release kann Livariant-Werkzeuge aktualisieren, ohne das Project-Brain-Schema zu verändern. Ändert sich das Schema, handelt es sich um eine Migration mit stärkerem Lifecycle-Vertrag.

Der Nutzer verwendet trotzdem denselben Befehl:

```bash
livariant update --manifest ./release-manifest.json
```

Wenn das kompatible Zielrelease das Project-Brain-Schema ändert, meldet Livariant die Migration im Plan und routet ein autorisiertes `--apply` automatisch durch den Migrationsvertrag.

> [!WARNING]
> **`npm install`, Tarball-Kopieren, manuelles Ersetzen von `.project-brain/` oder direktes Ändern von `metadata.json` sind keine unterstützten Projektmigrationen.**

## Migrationspfad

Die aktuelle ausführbare Preview-Baseline weist einen expliziten Schema-Migrationspfad nach: Project Brain `1 → 2`.

Der Ablauf umfasst:

```text
Kompatibilitätsprüfung
→ explizite Migrationsidentität
→ Autorisierung
→ integritätsgebundener Checkpoint
→ dauerhaftes Migrationsjournal
→ Evidenz für nicht replay-sichere Schritte
→ Mutation
→ Validierung
→ Zielaktivierung
```

Nicht unterstützte oder unvollständige Migrationspfade failen geschlossen. Livariant darf keine Transformation erraten, nur weil Quell- und Zielschema unterschiedlich sind.

## Unterbrochene Migration

Ein Abbruch nach einer nicht replay-sicheren Mutation bedeutet nicht „es ist nichts passiert“. Dauerhafte Lifecycle-Evidenz hält den mehrdeutigen/in-progress Zustand fest.

Solange Recovery ungeklärt ist:

- normale Update-Planung/-Anwendung ist blockiert;
- blindes Wiederholen der Migration ist blockiert;
- `livariant status` verengt auf recovery-required;
- `livariant doctor` bleibt diagnostisch statt automatisch reparierend.

## Recovery prüfen

Immer read-only beginnen:

```bash
livariant doctor
livariant recover
```

`livariant recover` meldet die unterbrochene Operation, Migrationsidentität, Quell-/Zielrelease und -schema, Checkpoint-Gültigkeit und — falls vorhanden — eine unterstützte Recovery-Strategie.

Ist der Checkpoint fehlend, verschoben, manipuliert oder anderweitig mehrdeutig, bleibt automatische Recovery nicht verfügbar.

## Recovery anwenden

Wenn `livariant recover` einen gültigen Checkpoint und die Strategie `rollback` meldet:

```bash
livariant recover --apply
```

Recovery ist eine separate, explizit autorisierte Lifecycle-Operation. Vor Rollback prüft Livariant:

- das Migrationsjournal;
- Checkpoint-Ort und erwartete Identität;
- Quellrelease/-schema-Metadaten;
- Digests der kanonischen Project-Brain-Checkpoint-Dateien.

Recovery committet das verifizierte wiederhergestellte Project Brain vor dem Cleanup. Der displaced Pre-Recovery-Baum wird zuerst entfernt; der letzte gültige Recovery-Checkpoint wird erst als finaler irreversibler Cleanup-Schritt gelöscht. Ein später Fehler beim displaced-tree Cleanup darf weder das wiederhergestellte Project Brain zurückrollen noch diesen Checkpoint zerstören.

Ein fehlender, verschobener, manipulierter oder mehrdeutiger Checkpoint löst keine geratene Wiederherstellung aus.

## Retry-Semantik

Eine während eines unterbrochenen Versuchs bereits installierte Ziel-Runtime darf nur wiederverwendet werden, wenn ihre gebundene Release-Evidenz exakt übereinstimmt: Version, Channel, Source-ID, Artefakt-ID, Artefakt-Digest, Paketidentität und Integrität des installierten Paketbaums, und der installierte Baum weiterhin zum machine-local Runtime-Trust passt.

Ein anderes Artefakt kann eine existierende Installation nicht übernehmen, nur weil es dieselbe Versionsnummer behauptet.

## Warnung vor manueller Reparatur

> [!CAUTION]
> **Project Brain, Livariant-verwalteten Lifecycle-State, Runtime-Trust-Records oder Release-Authorization-Records niemals manuell ersetzen, um ein Update abzuschließen, zu reparieren oder abzukürzen.**
>
> Das umgeht Kompatibilität, Autorität, Checkpoints, Replay-Sicherheit, Integritätsprüfung und Aktivierungssemantik.
>
> Wenn Lifecycle-State unklar ist, zuerst den tatsächlichen Zustand diagnostizieren:
>
> ```bash
> livariant doctor
> livariant recover
> ```

## Aktuelle Preview-Distribution

Die CLI-Lifecycle-Oberfläche ist ausführbar. Für die Public-Preview-Distribution braucht es noch einen finalisierten öffentlichen Weg, über den Nutzer Livariant-Paket, Release-Manifest, passendes Runtime-Artefakt und die für ausführbare Updates erforderliche unabhängige machine-local Release-Authority erhalten. Bis dieser Release-/Installationspfad veröffentlicht ist, verwenden Beispiele lokale Manifest-/Artefaktpfade und benennen die Authority-Voraussetzung, statt einen nicht existierenden Registry-, Signer- oder Download-Endpunkt zu erfinden.
