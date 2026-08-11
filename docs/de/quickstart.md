# Livariant Fünf-Minuten-Schnellstart

<p align="center">
  <a href="../quickstart.md">English</a> · <strong>Deutsch</strong>
</p>

Livariant gibt einem KI-gestützten Softwareprojekt eine persistente, projekt-eigene Quelle der Wahrheit: das **Project Brain**. Damit bleiben Projektidentität, bestätigte Ziele, akzeptierte Entscheidungen, bekannte Fakten, offene Fragen, Lifecycle-Zustand und Provider-Handoff-Kontext über Sitzungen hinweg kohärent.

## Voraussetzungen

Für die aktuelle Preview-Baseline brauchst du:

- Node.js 20 oder neuer;
- ein lokales Projektverzeichnis;
- das Livariant-Paket bzw. Release-Artefakt der aktuellen Preview.

Paket- und CLI-Identität lauten jeweils `livariant`.

## 1. Erst prüfen, dann verändern

Im Projekt-Root:

```bash
livariant status
livariant doctor
livariant init
```

`livariant init` ohne `--apply` verändert nichts. Der Befehl zeigt, was Livariant gefunden hat, ob Initialisierung anwendbar ist, welche vorhandenen Dateien betroffen wären und welche Project-Brain-Dateien angelegt würden.

> [!IMPORTANT]
> Besonders bei bestehenden Projekten ist dieser Discovery-Schritt zentral. Livariant soll das vorhandene Projekt verstehen und übernehmen — nicht es ungefragt in eine bevorzugte Struktur umformen.

## 2. Bewusst initialisieren

Wenn der Plan korrekt ist:

```bash
livariant init --apply
```

Dadurch entsteht das minimale Project Brain:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Vorhandene projekt-eigene Dateien werden dabei nicht als Teil der unterstützten Initialisierung umgeschrieben.

## 3. Ergebnis prüfen

```bash
livariant status
livariant doctor
```

Ein gesund initialisiertes Projekt sollte das Project Brain als vorhanden und den Lifecycle als initialisiert melden.

`doctor` ist diagnostisch und read-only. Drift, beschädigter Zustand oder nicht unterstützte manuelle Änderungen werden nicht still repariert.

## 4. Projektkontext wieder aufnehmen

Provider-neutral:

```bash
livariant resume
```

Für die aktuell unterstützten Preview-Handoffs:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

Die Provider-Ausgabe ist eine temporäre Projektion des kanonischen Project-Brain-Zustands. Sie ist keine zweite Quelle der Wahrheit und erhält keine zusätzliche Autorität durch Provider-Memory oder Dateien wie `CLAUDE.md` bzw. `AGENTS.md`.

## 5. Update zuerst planen

Mit einem Release-Manifest aus der gewählten vertrauenswürdigen Preview-Quelle:

```bash
livariant update --manifest ./release-manifest.json
```

Das ist nur Planung. Der Befehl zeigt unter anderem Quelle und Zielversion, Channel, Source-ID, Artefaktidentität und SHA-256, Projektauswirkung sowie einen möglichen Migrations-/Checkpoint-Bedarf.

Anwenden erst nach Prüfung:

```bash
livariant update \
  --manifest ./release-manifest.json \
  --apply \
  --artifact ./livariant-runtime.tgz \
  --trusted-source <source-id>
```

> [!WARNING]
> **Nicht** `.project-brain/`, Lifecycle-State, `metadata.json` oder verwaltete Runtime-Dateien manuell ersetzen, um ein Update oder eine Migration zu simulieren.
>
> Damit würdest du Kompatibilitäts-, Autoritäts-, Integritäts-, Checkpoint-, Replay- und Aktivierungsprüfungen umgehen.

Ein Manifest darf seine eigene `sourceId` nicht selbst als vertrauenswürdig deklarieren. `--trusted-source` ist davon getrennte Trust-Evidenz. Die Artefaktbytes müssen zusätzlich zum im Manifest gebundenen Digest passen.

Schema-ändernde Releases werden automatisch über denselben `update`-Pfad in den unterstützten Migrations-Lifecycle geroutet.

## 6. Unterbrochene Migration wiederherstellen

Immer read-only beginnen:

```bash
livariant doctor
livariant recover
```

Wenn Livariant einen gültigen Checkpoint und eine unterstützte Rollback-Strategie meldet:

```bash
livariant recover --apply
```

> [!CAUTION]
> Ein fehlender, verschobener, manipulierter oder mehrdeutiger Checkpoint wird nicht geraten. In diesem Fall bleibt automatische Wiederherstellung blockiert und die Diagnose sichtbar.

## 7. Sicherheitsgrenze erhalten

Ersetze `.project-brain/` nicht mit Dateien aus einer anderen Livariant-Version und kopiere keine neuere Runtime manuell in framework-verwalteten Lifecycle-Speicher, um ein Update vorzutäuschen.

Der unterstützte Lifecycle prüft Release-Identität, Artefaktintegrität, Migrations-Checkpoints, installierte Runtime-Integrität, Aktivierungszustand und Recovery-Evidenz, bevor geschützter Zustand aktiv wird.

## Danach lesen

- [Updates, Migrationen & Wiederherstellung](lifecycle-guide.md)
- [Englischer Existing Project Guide](../existing-projects.md)
- [Englische Architecture & Safety](../architecture-and-safety.md)
- [Englischer Provider Handoff](../provider-handoff.md)
- [Englischer Preview Scope](../preview-scope.md)
