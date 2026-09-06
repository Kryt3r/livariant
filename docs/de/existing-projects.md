# Leitfaden für bestehende Projekte

<p align="center">
  <a href="../existing-projects.md">English</a> · <strong>Deutsch</strong>
</p>

Bestehende Projekte sind ein zentraler Livariant-Anwendungsfall. Livariant arbeitet preservation-first: Es prüft zuerst vorhandenen Zustand und soll ein Repository nicht nur deshalb umbauen, damit es stärker wie ein Livariant-Projekt aussieht.

> [!IMPORTANT]
> Der normale durchgängige **Desktop-Existing-Project-Adoption-Pfad wird noch fertiggestellt**. Project Truth / First Steps ist aktuell eine nützliche Foundation, aber noch kein fertiger persistenter Project-Brain-Adoption-Editor.

## Vor der Übernahme prüfen

Im Projektroot:

```bash
livariant status
livariant doctor
livariant init
```

`livariant init` ist ohne den nachfolgenden autorisierten Apply-Pfad plan-first und read-only. Prüfe, was erkannt wurde und welchen Project-Brain-State Livariant vorschlägt.

Initialisierung darf nicht still:

- Source Code reorganisieren;
- fremde Konfiguration umschreiben;
- widersprüchliche Dokumentation erraten;
- Secrets in Project Brain kopieren;
- `CLAUDE.md`, `AGENTS.md` oder andere Provider-Instruktionsdateien ersetzen;
- Discovery-Evidenz als bereits akzeptierte Project Truth behandeln.

## Aktueller Initialisierungsablauf

Ein nacktes `--apply` reicht für den aktuellen geschützten Lifecycle nicht aus.

Wenn die erforderlichen geschützten Machine-/Guardian-Voraussetzungen bereit sind:

```bash
livariant init
livariant init --authorize
livariant init --apply
```

Plan, Authorization und Apply bleiben getrennt. Die Autorisierung ist an Projekt, Operation und Material gebunden; veralteter oder nicht passender Zustand darf nicht still wiederverwendet werden.

Sind die geschützten Voraussetzungen nicht bereit, zuerst diagnostizieren und nicht durch manuelles State-Editing oder Kopieren von Paketdateien in geschützte Pfade umgehen.

Siehe [Installation](installation.md), [First Run](first-run.md) und [Updates, Migrationen & Recovery](lifecycle-guide.md).

## Discovery ist Evidenz, nicht Project Truth

Livariant kann begrenzte direkte Evidenz verwenden, zum Beispiel:

- gültige Package-Metadaten;
- relevante Repository-/Verzeichnisstruktur;
- Git-Repository-Präsenz/-State;
- Präsenz ausgewählter Provider-Instruktionsdateien;
- unterstützte Projekt-/Lifecycle-Signale.

Bei fehlerhafter oder widersprüchlicher Evidenz sollen Claims enger werden, statt Lücken zu erraten. Die Präsenz einer `.env` kann beispielsweise für sichere Discovery relevant sein, ohne Secret-Inhalte zu übernehmen.

## Bestehende Provider-Dateien bleiben projekt-eigen

`CLAUDE.md`, `AGENTS.md` und vergleichbare Dateien bleiben projekt-eigene Evidence-/Instruction-Oberflächen. Ihr Text wird nicht allein deshalb kanonische Project Truth, weil ein Provider ihn nutzt. Provider Memory und Agentenausgabe überstimmen akzeptierten Project-Brain-State ebenfalls nicht.

Die beabsichtigte Adoption-Richtung ist:

```text
prüfen
-> Evidenz entdecken
-> verstehen / reviewen
-> Kandidatenwissen vorschlagen
-> ausdrücklich übernehmen, wo unterstützt
```

nicht:

```text
Repository scannen
-> Wahrheit erraten
-> Projekt umschreiben
```

## Nachdem ein Project Brain existiert

Ein Project Brain verwaltet die dafür vorgesehenen dauerhaften Kontextbereiche:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Semantische Änderungen folgen dem aktuellen Proposal-/Review-/Authority-Modell. Veraltete `--apply`-Beispiele dürfen nicht als Erlaubnis verstanden werden, geschützte Semantic-Mutation-Grenzen zu umgehen.

Relevante Guides:

- [Semantic Proposal Core](semantic-proposal-core.md)
- [Conflict & Drift Assessment](conflict-drift-assessment.md)
- [Controlled Understanding Adoption](controlled-understanding-adoption.md)
- [Semantic Maintenance](semantic-maintenance.md)

## Nicht erneut initialisieren, um zu reparieren

Sobald ein gültiges Project Brain existiert, ist frische Initialisierung nicht der normale Repair-Pfad.

Bei beschädigtem, teilweisem, gedriftetem oder recovery-required Zustand zuerst:

```bash
livariant doctor
livariant recover
```

> [!CAUTION]
> `.project-brain/` nicht manuell löschen/ersetzen und danach erneut initialisieren. Dadurch können Historie sowie unterstützte Recovery-/Integrity-Grenzen umgangen werden.

## Filesystem- und Trust-Grenzen

Livariant-managed Project-Brain-/Lifecycle-State muss innerhalb der autorisierten Projektgrenze bleiben. Symlink-/Topology-/Path-Substitutionen, die verwaltete Writes nach außen umleiten, werden von den gehärteten Pfaden abgelehnt.

Dauerhafte Regeln:

```text
Capability != Authority
Evidence != Project Truth
Proposal != Authorization
bestehende Projektdatei != Livariant-managed kanonischer State
```

## Desktop-Richtung

Der Desktop bietet bereits Project Truth / First Steps, Connections, Diagnostics, Updates und Settings. Die nächste Adoption-Arbeit verbindet den normalen Existing-Project-Pfad vollständiger, ohne eine zweite Source of Truth zu erzeugen.

Diese Integration ist geplant und keine Behauptung, dass der aktuelle Renderer bereits alle Adoption-Entscheidungen persistiert.
