# Read-Only Bootstrap Discovery

> Repository-Funktion nach dem unveränderlichen `v0.1.0-rc.3`. Diese Seite beschreibt das aktuelle Verhalten auf dem kanonischen Repository-Stand, nicht den Inhalt des veröffentlichten RC3-Releases.

Livariant kann ein Projekt vor der Initialisierung untersuchen mit:

```text
livariant discover
livariant discover --json
```

Der Befehl ist ausschließlich lesend. Er erstellt keine Project-Brain-Dateien, verändert keine Projektdateien, führt keine Provider-Befehle aus, installiert keine Abhängigkeiten, kontaktiert keinen Livariant-Cloud-Dienst und vergibt keine Mutation Authority.

## Was v1 untersucht

Bootstrap Discovery verwendet bewusst eine begrenzte Menge lokaler High-Signal-Evidence, statt das gesamte Repository rekursiv zu indexieren.

Aktuelle Evidence kann umfassen:

- Vorhandensein von Git-Metadaten;
- verbreitete Projekt-/Build-Manifeste wie `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, Maven-/Gradle-Dateien und TypeScript-Konfiguration;
- verbreitete Node-Paketmanager-Lockfiles;
- README und ein oberstes `docs`-Verzeichnis;
- oberste `CLAUDE.md`- und `AGENTS.md`-Guidance-Dateien;
- Vorhandensein verbreiteter Source-/Test-Verzeichnisse;
- eine begrenzte Menge von Framework-/Tooling-Signalen aus deklarierten `package.json`-Abhängigkeiten und Scripts.

Jedes strukturierte Evidence-Element enthält:

- eine Kategorie;
- einen Wert;
- einen Confidence-Status;
- Provenienz, die die lokale Quelle der Schlussfolgerung benennt.

Zum Beispiel kann eine deklarierte `next`-Abhängigkeit ein `strongly_inferred`-Signal für Next.js stützen, während das Vorhandensein von `README.md` ein `confirmed`-Dokumentationsfakt ist.

## Evidence ist nicht Project Truth

Discovery-Ausgabe ist nur Beobachtung und Inferenz.

Sie wird nicht automatisch in den Project Brain übernommen und wird nicht zu Authority, nur weil sie aus einer Repository-Datei stammt. Bestehende Dokumentation und providerspezifische Instruction-Dateien bleiben externe Projekt-Evidence, bis ein unterstützter Acceptance-Pfad daraus dauerhafte Project-Brain-Truth macht.

## Attention-Signale

Discovery kann begrenzte Review-Signale anzeigen, wenn lokale Evidence mehrdeutig ist oder Aufmerksamkeit verdient. Aktuelle Beispiele:

- mehrere Node-Paketmanager-Lockfiles;
- nicht lesbare oder unsichere High-Signal-Manifest-/Guidance-Pfade;
- Vorhandensein verbreiteter sensibler Dateinamen wie `.env`, `.env.local` oder `credentials.json`.

Bei sensiblen Dateien wird bewusst nur das Vorhandensein erfasst. Livariant liest oder klassifiziert deren Inhalt während Bootstrap Discovery nicht.

Diese Signale sind kein vollständiger Security Audit und dürfen nicht als solcher dargestellt werden.

## Strukturierte Ausgabe

`livariant discover --json` liefert denselben begrenzten Discovery-Stand als strukturiertes JSON, einschließlich Evidence, Attention-Signalen, ungelösten übergeordneten Unknowns und:

```json
{
  "changesMade": 0
}
```

Diese Ausgabe soll später Guided-Onboarding- und Evidence-Adoption-Workflows ermöglichen, ohne Discovery selbst zu einem Mutationspfad zu machen.

## Verhältnis zu `livariant init`

`livariant init` bleibt standardmäßig plan-first und read-only. Der aktuelle Lifecycle-Ablauf trennt Review, Autorisierung und Mutation:

```text
livariant init
→ livariant init --authorize
→ livariant init --apply
```

Der erste Befehl zeigt die Initialization Assessment und denselben read-only Bootstrap-Discovery-Report. `--authorize` fordert kurzlebige, exakt materialgebundene geschützte Guardian Lifecycle Authority an und verändert weiterhin keine Projektdateien. `--apply` kann nur initialisieren, wenn für denselben aktuellen Plan passende unverbrauchte Authority vorhanden ist.

Ein nacktes `--apply`-Flag ist keine Autorisierung. Ändert sich Projektmaterial zwischen Autorisierung und Anwendung, passt die Authority nicht mehr. Discovery bleibt damit reine Beobachtung und vergibt selbst keine Initialization-, Lifecycle-, Runtime-, Recovery- oder Project-Brain-Mutation-Authority.
