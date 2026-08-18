# Updates, Migrationen & Wiederherstellung

<p align="center">
  <a href="../lifecycle-guide.md">English</a> · <strong>Deutsch</strong>
</p>

Livariant führt Updates, Schema-Migrationen und Wiederherstellung über die installierte `livariant`-CLI aus. Konsequenzreiche Lifecycle-Änderungen sind plan-first und benötigen unabhängige geschützte Guardian Authority.

`--apply` drückt die Absicht aus, eine bereits geprüfte Lifecycle-Operation auszuführen. Das Flag ist **nicht** selbst Lifecycle Authority.

## Der Lifecycle-Autorisierungsablauf

Für Initialisierung, Updates/Migrationen und Recovery gelten drei getrennte Phasen:

```text
planen / prüfen
→ --authorize
→ --apply
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

Fordere erst nach der Prüfung exakte Lifecycle Authority an:

```bash
livariant init --authorize
```

Wende danach den unveränderten Plan an, solange die One-Shot-Authority gültig ist:

```bash
livariant init --apply
```

Ändert sich der Projektzustand zwischen Autorisierung und Anwendung, passt das gebundene Material nicht mehr und Livariant bricht ab, statt veraltete Authority wiederzuverwenden.

## Update zuerst planen

Verwende das Release-Manifest aus der kanonischen Livariant-Release-Quelle:

```bash
livariant update --manifest ./release-manifest.json
```

Der Plan zeigt Quell- und Zielversion, Update-Channel, Source-ID, Artefaktidentität und SHA-256, Auswirkungen auf das Projekt sowie den Bedarf an Migration oder Checkpoint. Während der Planung werden keine Änderungen angewendet.

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
→ exakte geschützte Lifecycle Authority ausstellen
→ denselben Plan erneut auflösen
→ exakte Lifecycle Authority verbrauchen
→ Release-Identität und Trusted Source prüfen
→ Artefakt-SHA-256 sowie geschützte Release-/Runtime-Trust-Grenzen prüfen
→ Ziel-Runtime ohne Lifecycle-Skripte installieren
→ gebundene Release-Evidence schreiben und prüfen
→ installierten Runtime-Baum messen
→ Candidate-Runtime-Attestation erst nach Trust ausführen
→ Lifecycle- und Preservation-Bedingungen erneut prüfen
→ kanonischen Project-Brain-Framework-Pin committen
```

Der Framework-Pin im Project Brain ist die finale Aktivierungsentscheidung. Eine neuere Runtime ist nicht automatisch aktiv, nur weil sie bereits auf der Festplatte liegt.

## Framework-Update und Project-Brain-Migration sind nicht dasselbe

Ein Release kann Livariant aktualisieren, ohne das Project-Brain-Schema zu verändern. Ändert sich das Schema, behandelt Livariant die Operation als Migration und trennt ihre Lifecycle Authority als `migration-update` vom normalen `normal-update`-Bereich.

Der Einstieg bleibt derselbe Plan-Befehl:

```bash
livariant update --manifest ./release-manifest.json
```

Fehlt ein unterstützter oder vollständiger Migrationspfad, bricht Livariant geschlossen ab. Die aktuelle ausführbare Preview-Baseline weist einen expliziten Schema-Migrationspfad nach: Project Brain `1 → 2`.

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

## Keine manuelle Reparatur

> [!CAUTION]
> Ersetze Project Brain, Livariant-verwalteten Lifecycle-State, Guardian-Records, Runtime-Trust-Records oder Release-Authorization-Records niemals manuell, um ein Update abzuschließen oder zu reparieren.

Dadurch würden Kompatibilität, Authority, Checkpoints, Replay-Sicherheit, Integritätsprüfung und Aktivierungssemantik umgangen. Wenn der Zustand unklar ist, beginne mit:

```bash
livariant doctor
livariant recover
```

## Preview-Distribution

Der unterstützte Preview-Distributionsweg ist das kanonische `Kryt3r/livariant` GitHub Release. Das Release stellt Paket, `release-manifest.json` und `SHA256SUMS` für den exakten Candidate bereit.

Die initiale CLI-Installation ist unter [Installation & erstes Projekt](installation.md) beschrieben. Die Veröffentlichung eines Releases erlaubt projektkontrolliertem Input nicht, Lifecycle-, Release- oder Runtime-Authority selbst zu erzeugen.
