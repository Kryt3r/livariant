# Updates, Migrationen & Wiederherstellung

<p align="center">
  <a href="../lifecycle-guide.md">English</a> · <strong>Deutsch</strong>
</p>

Livariant führt Updates, Schema-Migrationen und Wiederherstellung über die installierte `livariant`-CLI aus. Konsequenzreiche Lifecycle-Änderungen sind plan-first und benötigen unabhängige geschützte Guardian Authority.

`--apply` drückt die Absicht aus, eine bereits geprüfte Lifecycle-Operation auszuführen. Das Flag ist **nicht** selbst Lifecycle Authority.

## Geschützte Maschinenbasis besitzt einen getrennten Lifecycle

Der Lifecycle des normalen CLI-Pakets und der Lifecycle der geschützten Guardian-Bootstrap-Basis sind bewusst getrennt.

Für einen frischen unterstützten Windows-/Linux-Rechner muss die geschützte Basis bereits hergestellt sein, bevor Guardian-gestützte Projekt-Lifecycle-Autorisierung funktionieren kann:

```text
verifiziertes qualifiziertes Release
-> normale CLI-Installation
-> geschützte Stage-A-Provisionierung
-> geschützter Stage-B-Guardian-Bootstrap
-> guardian status: ready
-> Projekt-Lifecycle-Autorisierung/-Anwendung
```

Die globale npm-CLI zu installieren oder zu aktualisieren erstellt, ersetzt oder autorisiert die geschützte Bootstrap-Quelle nicht stillschweigend.

Die geschützte Stage-A-Quelle ist releasegebundener System-State:

```text
Windows: C:\Program Files\Livariant\Bootstrap\v1
Linux:   /opt/livariant/bootstrap/v1
```

Eine bereits vorhandene geschützte Quelle wird nicht überschrieben, nur weil ein neues CLI-Paket installiert wurde. Ihr Austausch erfordert ein separat verifiziertes qualifiziertes Release und einen expliziten Stage-A-Release-Übergang (`-Replace` unter Windows bzw. `--replace` unter Linux im WP-044-Installer-Design).

Dieser Austausch:

- verifiziert vor Privilegierung das neue Release/die Provenance und den exakten geschützten Payload;
- hält normale CLI-Bytes und geschützte Bootstrap-Bytes in getrennten Rollen;
- bewahrt die vorherige geschützte Quelle als Transition-Evidenz, statt Ersatzbytes still zu segnen;
- vergibt keine Mutation-, Runtime-, Integrity- oder Release-Authority;
- verändert Project-Brain-State nicht nur deshalb, weil sich geschütztes Maschinen-Tooling geändert hat.

Das Entfernen der normalen npm-CLI darf die geschützte Bootstrap-Quelle, Guardian-Records/-State, Runtime-Trust-Evidenz, Release-Authorization-Evidenz oder Projektstate nicht still löschen. Umgekehrt ist das Entfernen geschützten Systemstates eine ausdrückliche Systemadministrationsoperation und kein npm-Uninstall-Nebeneffekt.

Der genaue Fresh-Install-/Stage-A-/Stage-B-Pfad steht unter [Installation & erstes Projekt](installation.md).

## Der Lifecycle-Autorisierungsablauf

Für Initialisierung, Updates/Migrationen und Recovery gelten drei getrennte Phasen:

```text
planen / prüfen
-> --authorize
-> --apply
```

`--authorize` und `--apply` dürfen nicht in derselben Invocation kombiniert werden.

`--authorize` fordert den betriebssystemgeschützten Livariant Guardian auf, einen kurzlebigen One-Shot-Authority-Record auszustellen. Er ist an das exakte physische Projekt, die Lifecycle-Operation und das aktuelle Operationsmaterial gebunden. Die Ausstellung verlangt unabhängige lokale Benutzerpräsenz über die geschützte Elevation-Grenze.

`--apply` verlangt und verbraucht anschließend den exakt passenden Record, bevor der konsequenzreiche Mutationspfad fortgesetzt werden kann. Fehlende, abgelaufene, bereits verbrauchte, projektfremde, operationsfremde oder veraltete Authority führt zu einem geschlossenen Abbruch.

Release Authorization und Runtime Trust bleiben getrennte Voraussetzungen. Ein vertrauenswürdiges Artefakt bedeutet niemals automatisch, dass auch die Lifecycle-Mutation autorisiert wurde.

## Initialisierung

Prüfe zuerst den aktuellen Initialisierungsplan:

```bash
livariant init
```

Fordere erst nach der Prüfung und erst nach bestätigter Readiness durch `livariant guardian status` exakte Lifecycle Authority an:

```bash
livariant init --authorize
```

Wende danach den unveränderten Plan an, solange die One-Shot-Authority gültig ist:

```bash
livariant init --apply
```

Ändert sich der Projektzustand zwischen Autorisierung und Anwendung, passt das gebundene Material nicht mehr und Livariant bricht ab, statt veraltete Authority wiederzuverwenden.

Auf einem frischen Rechner ist ein fehlgeschlagenes `init --authorize` keine Aufforderung, Guardian zu umgehen. First Run und `guardian status` sollen fehlende Stage-A-/Stage-B-Voraussetzungen anzeigen, bevor dieser Punkt erreicht wird.

## Update zuerst planen

Verwende das Release-Manifest aus der kanonischen Livariant-Release-Quelle:

```bash
livariant update --manifest ./release-manifest.json
```

Der Plan zeigt Quell- und Zielversion, Update-Channel, Source-ID, Artefaktidentität und SHA-256, Auswirkungen auf das Projekt sowie den Bedarf an Migration oder Checkpoint. Während der Planung werden keine Änderungen angewendet.

Ein Release-Manifest kann zusätzlich Protected-Bootstrap-Distributionsartefakte beschreiben. Diese gehören zum getrennten geschützten Maschinen-Lifecycle oben; ihre Manifest-Präsenz macht weder Projekt-Lifecycle-Authority noch Runtime Trust implizit.

## Geprüftes Update autorisieren

Nach Prüfung des exakten Update-Plans fordere mit demselben Manifest geschützte Lifecycle Authority an:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --authorize
```

Dabei findet keine Lifecycle-Mutation statt. Der Guardian-Review bindet das exakte `normal-update`- oder `migration-update`-Material an dieses physische Projekt.

## Autorisiertes Update anwenden

Danach gib das passende Artefakt an und nenne ausdrücklich die Release-Quelle, der du vertraust:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

Das Release-Manifest kann seine eigene Source-ID nicht vertrauenswürdig machen. `--trusted-source` wird separat geprüft; die Artefaktbytes müssen weiterhin zur Release-Identität und zum SHA-256 des Manifests passen.

Ausführbare Updates benötigen zusätzlich die bestehenden geschützten Release-/Runtime-Trust-Grenzen. Projektdateien, Manifest, `--trusted-source`, Lifecycle Authority und die projektseitige CLI können beliebige Candidate-Runtime-Bytes nicht selbst vertrauenswürdig machen.

Der sichere normale Ablauf ist konzeptionell:

```text
Zielrelease auflösen und prüfen
-> exakte geschützte Lifecycle Authority ausstellen
-> denselben Plan erneut auflösen
-> exakte Lifecycle Authority verbrauchen
-> Release-Identität und Trusted Source prüfen
-> Artefakt-SHA-256 sowie geschützte Release-/Runtime-Trust-Grenzen prüfen
-> Ziel-Runtime ohne Lifecycle-Skripte installieren
-> gebundene Release-Evidence schreiben und prüfen
-> installierten Runtime-Baum messen
-> Candidate-Runtime-Attestation erst nach Trust ausführen
-> Lifecycle- und Preservation-Bedingungen erneut prüfen
-> kanonischen Project-Brain-Framework-Pin committen
```

Der Framework-Pin im Project Brain ist die finale Aktivierungsentscheidung. Eine neuere Runtime ist nicht automatisch aktiv, nur weil sie bereits auf der Festplatte liegt.

## Framework-Update und Project-Brain-Migration sind nicht dasselbe

Ein Release kann Livariant aktualisieren, ohne das Project-Brain-Schema zu verändern. Ändert sich das Schema, behandelt Livariant die Operation als Migration und trennt ihre Lifecycle Authority als `migration-update` vom normalen `normal-update`-Bereich.

Der Einstieg bleibt derselbe Plan-Befehl:

```bash
livariant update --manifest ./release-manifest.json
```

Fehlt ein unterstützter oder vollständiger Migrationspfad, bricht Livariant geschlossen ab. Die aktuelle ausführbare Preview-Baseline weist einen expliziten Schema-Migrationspfad nach: Project Brain `1 -> 2`.

## Was bei einer unterbrochenen Migration passiert

Ein Abbruch nach nicht sicher wiederholbarer Arbeit bedeutet nicht, dass nichts passiert ist. Livariant hält dauerhafte Lifecycle-Evidence fest, damit ein unvollständiger Zustand nicht frisch oder gesund wirkt.

Solange Recovery ungeklärt ist:

- ist normale Update-Anwendung blockiert;
- wird die Migration nicht blind wiederholt;
- meldet `livariant status` den Zustand `recovery-required`;
- bleibt `livariant doctor` diagnostisch und read-only.

## Wiederherstellung zuerst prüfen

Beginne mit:

```bash
livariant doctor
livariant recover
```

`livariant recover` zeigt die unterbrochene Operation, Migrationsidentität, Quell- und Zielrelease/-schema, Checkpoint-Gültigkeit und eine unterstützte Recovery-Strategie, sofern vorhanden.

Fehlt der Checkpoint, wurde er verschoben, manipuliert oder ist er mehrdeutig, bleibt automatische Wiederherstellung gesperrt.

## Recovery autorisieren und anwenden

Wenn Livariant einen gültigen Checkpoint und eine unterstützte Rollback-Strategie meldet, fordere zuerst exakte Recovery Authority an:

```bash
livariant recover --authorize
```

Wende danach dasselbe Recovery-Material an:

```bash
livariant recover --apply
```

Recovery Authority ist an das physische Projekt, die unterbrochene Operation, Recovery-Strategie, Checkpoint-Identität und erwartetes Quellrelease/-schema gebunden. Ein Recovery-Record kann keine Initialisierung oder kein Update autorisieren; Authority eines anderen Projekts ist nicht wiederverwendbar.

Vor dem Rollback prüft Livariant weiterhin Migrationsjournal, Checkpoint-Ort und -Identität, Quellrelease/-schema sowie Digests der kanonischen Project-Brain-Dateien im Checkpoint.

Das wiederhergestellte Project Brain wird vor der Bereinigung committed. Schlägt eine späte Bereinigung fehl, bleibt wiederherstellbare Evidence erhalten, statt durch einen mehrdeutigen Zustand zu raten.

## Wiederholungs- und Replay-Verhalten

One-Shot-Lifecycle-Authority ist nach geschütztem Verbrauch nicht wiederverwendbar. Scheitert eine Operation vor Abschluss, gelten weiterhin die vorhandenen operationsspezifischen Recovery- und Freshness-Regeln; Authority für anderes Material kann nicht auf die fehlgeschlagene Operation umgelenkt werden.

Eine bereits installierte Ziel-Runtime darf nur wiederverwendet werden, wenn alle gebundenen Release-Evidence weiterhin exakt übereinstimmt: Version, Channel, Source-ID, Artefakt-ID, Artefakt-Digest, Paketidentität, Integrität des installierten Paketbaums und geschützter Runtime Trust.

## Lifecycle- oder Protected-State nicht manuell reparieren

> [!CAUTION]
> Ersetze Project Brain, Livariant-verwalteten Lifecycle-State, geschützte Bootstrap-Dateien, Guardian-Records, Runtime-Trust-Records oder Release-Authorization-Records niemals manuell, um ein Update abzuschließen oder zu reparieren.

Dadurch würden Kompatibilität, Authority, Release-Provenance, OS-Schutz, Checkpoints, Replay-Sicherheit, Integritätsprüfung und Aktivierungssemantik umgangen. Ein geschützt wirkender Pfad ist nicht allein deshalb vertrauenswürdig, weil dort Dateien liegen.

Wenn Projekt-Lifecycle-State unklar ist, beginne mit:

```bash
livariant doctor
livariant recover
```

Wenn geschützter Maschinen-State unklar ist, prüfe ihn read-only mit:

```bash
livariant guardian status
```

Ein `unsafe`-Zustand ist eine Stop-Bedingung und kein automatisches Reparaturziel.

## Preview-Distribution

Das aktuell veröffentlichte `v0.1.0-rc.4` bleibt historische Release-Truth: Sein normales CLI-Artefakt wurde qualifiziert, aber seine öffentliche Distribution erfüllt die beim Windows-Dogfooding entdeckte Protected-Stage-A-Fresh-Install-Voraussetzung nicht vollständig.

Ein zukünftiges qualifiziertes Release mit WP-044 muss normales CLI-Paket, Protected-Bootstrap-Paket, plattformspezifische Stage-A-Installer, Release-Manifest/Prüfsummen und Provenance-Evidenz bewusst durch den GitHub-Release-Asset-Pfad tragen. GitHub-generierte Source-Archive sind keine installierbaren Livariant-Pakete.

Initiale Installation und Provenance-Prüfung sind unter [Installation & erstes Projekt](installation.md) beschrieben. Veröffentlichung oder Installation eines Releases erlaubt projektkontrolliertem Input nicht, Lifecycle-, Release-, Runtime- oder Guardian-Authority selbst zu erzeugen.
