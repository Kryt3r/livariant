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
- projektlokale `CLAUDE.md`- und `AGENTS.md`-Guidance-Dateien, die durch die unten beschriebene begrenzte Scope-Suche gefunden werden;
- Vorhandensein verbreiteter Source-/Test-Verzeichnisse;
- eine begrenzte Menge von Framework-/Tooling-Signalen aus deklarierten `package.json`-Abhängigkeiten und Scripts.

Jedes strukturierte Evidence-Element enthält:

- eine Kategorie;
- einen Wert;
- einen Confidence-Status;
- Provenienz, die die lokale Quelle der Schlussfolgerung benennt.

Zum Beispiel kann eine deklarierte `next`-Abhängigkeit ein `strongly_inferred`-Signal für Next.js stützen, während das Vorhandensein von `README.md` ein `confirmed`-Dokumentationsfakt ist.

## Adoption-Surface-Inventar für bestehende Projekte

Für das Onboarding bestehender Projekte enthält der strukturierte Discovery-Report zusätzlich ein begrenztes `adoption`-Inventar. Es erfasst Vorhandensein und Provenienz ausgewählter projektlokaler Oberflächen, die bei einer späteren Prüfung relevant sein können, darunter:

- Agent-Guidance wie `AGENTS.md` und `CLAUDE.md`;
- verbreitete Projektregel-Dateien wie `CONTRIBUTING.md`, `DEVELOPMENT.md`, `GOVERNANCE.md`, `SECURITY.md` und `.github/CODEOWNERS`;
- verbreitete Architektur- und Decision-Record-Dateinamen im Projekt-Root sowie unterstützte Dokumentationsdateien direkt in `docs`;
- GitHub-Actions-Workflow-Dateien und ausgewählte verbreitete CI-Einstiegspunkte;
- verbreitete Test-Verzeichnisse;
- ausgewählte Build-/Tooling-Manifeste und Konfigurationsdateien.

Das Adoption-Inventar ist **ausschließlich Metadaten-/Provenienz-Evidence**. Es interpretiert die Inhalte dieser Oberflächen nicht, vergibt keine Authority und erhebt sie nicht zu Project Truth. Seine Grenzen melden ausdrücklich `evidenceIsProjectTruth: false`, `contentsInterpreted: false`, `grantsAuthority: false` und `changesMade: 0`.

### Begrenzte Scope-Suche für Guidance

Das Inventar kann verschachtelte `AGENTS.md`- und `CLAUDE.md`-Dateien entdecken, damit eine spätere Prüfung deren projektlokalen Scope erhalten kann. Das ist weiterhin kein beliebiger Repository-Index:

- rekursiv gesucht werden ausschließlich diese exakten Guidance-Dateinamen;
- die Traversierung ist in der Tiefe begrenzt;
- die Zahl untersuchter Verzeichnisse ist begrenzt;
- bekannte schwere oder generierte Bereiche wie `.git`, `.livariant`, `node_modules`, `vendor`, `dist`, `build`, `target` und `coverage` werden ausgeschlossen;
- Symlink-Guidance wird abgelehnt statt verfolgt;
- wird das Traversierungs-Limit erreicht, entsteht ein Attention-Signal, statt stillschweigend anzunehmen, dass keine weitere Guidance existiert.

Wenn mehrere projektlokale Agent-Guidance-Oberflächen oder mehrere CI-Systeme vorhanden sind, zeigt Livariant ein Review-Attention-Signal, statt Vorrang, Gleichwertigkeit oder das maßgebliche System anzunehmen.

Unsichere Kandidatenpfade werden nicht als Adoption-Evidence interpretiert. Ist ein Kandidatenpfad nicht die erwartete reguläre Nicht-Symlink-Datei bzw. das erwartete Verzeichnis, wird er zur Prüfung angezeigt, statt verfolgt oder als vertrauenswürdig behandelt zu werden.

## Expliziter Adoption-Content-Review

Discovery selbst bleibt für Adoption-Surfaces inhaltsfrei. Ein separater expliziter Review-Schritt kann ausgewählte inventarisierte Text-Surfaces über `reviewAdoptionSurfaces(...)` lesen.

Diese Review-Schicht ist absichtlich enger als „alles lesen“:

- berücksichtigt werden nur explizit vom Aufrufer ausgewählte Pfade;
- ein ausgewählter Pfad muss bereits im Adoption-Inventar vorhanden sein;
- gelesen werden nur unterstützte Textdatei-Surface-Typen;
- die Pfadbindung an den Projekt-Root wird erneut geprüft;
- erforderlich sind reguläre Nicht-Symlink-Dateien;
- Limits pro Surface, für Gesamtbytes und für die Zahl der Surfaces begrenzen den Review;
- abgeschnittene Inhalte werden sichtbar gemeldet und ausgelassener Inhalt wird nicht inferiert;
- verschachtelte Guidance erhält einen expliziten Verzeichnis-Scope;
- überlappende Guidance wird als ungelöste Review-Attention angezeigt, statt automatisch geordnet oder zusammengeführt zu werden.

Gelesener Text bleibt **beobachtete Evidence**. Das Review-Ergebnis meldet ausdrücklich `evidenceIsProjectTruth: false`, `contentReviewIsAcceptance: false`, `grantsAuthority: false`, `automaticConflictResolution: false` und `changesMade: 0`.

Das Lesen einer Datei übernimmt sie daher nicht, macht sie nicht kanonisch, entscheidet keinen Vorrang, löst keinen Widerspruch und vergibt keine Mutation Authority.

## Evidence ist nicht Project Truth

Discovery-Ausgabe und expliziter Content-Review sind nur Beobachtung.

Sie werden nicht automatisch in den Project Brain übernommen, und Evidence wird nicht zu Authority, nur weil sie aus einer Repository-Datei stammt. Bestehende Dokumentation und providerspezifische Instruction-Dateien bleiben externe Projekt-Evidence, bis ein unterstützter Acceptance-Pfad daraus dauerhafte Project-Brain-Truth macht.

## Attention-Signale

Discovery und Adoption-Review können begrenzte Review-Signale anzeigen, wenn lokale Evidence mehrdeutig ist oder Aufmerksamkeit verdient. Aktuelle Beispiele:

- mehrere Node-Paketmanager-Lockfiles;
- mehrere projektlokale Agent-Guidance-Oberflächen ohne angenommenen Vorrang;
- mehrere CI-Systeme ohne Annahme eines maßgeblichen Systems;
- nicht lesbare oder unsichere High-Signal-Manifest-/Guidance-/Adoption-Pfade;
- erreichte Scope-Guidance-Traversierungsgrenzen;
- überlappende geprüfte Guidance ohne automatischen Vorrang oder Konfliktlösung;
- wegen expliziter Byte-Budgets abgeschnittene Review-Inhalte;
- Vorhandensein verbreiteter sensibler Dateinamen wie `.env`, `.env.local` oder `credentials.json`.

Bei sensiblen Dateien wird bewusst nur das Vorhandensein erfasst. Livariant liest oder klassifiziert deren Inhalt während Bootstrap Discovery nicht.

Diese Signale sind kein vollständiger Security Audit und dürfen nicht als solcher dargestellt werden.

## Strukturierte Ausgabe

`livariant discover --json` liefert denselben begrenzten Discovery-Stand als strukturiertes JSON, einschließlich Evidence, Adoption-Surfaces, Attention-Signalen, ungelösten übergeordneten Unknowns und:

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
