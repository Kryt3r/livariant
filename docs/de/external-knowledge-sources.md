# Externe Wissensquellen

Livariant kann eine bestehende externe Wissensquelle als **read-only externe Evidenz** prüfen, ohne dieses Material automatisch als Project-Brain-Wahrheit zu behandeln.

Diese Grundlage erlaubt First-Run zu fragen, ob bereits ein Second Brain mit Projektwissen existiert, statt Nutzer zuerst zum Kopieren sämtlicher Inhalte nach Livariant zu zwingen.

## Trust-Modell

Material aus externen Quellen besitzt bewusst weniger Vertrauen als Project-Brain-Wahrheit.

```text
externe Quelle
-> read-only Adapter
-> provenance-gebundene externe Evidenz
-> Guided Project Understanding Review
-> explizite Antwort oder Korrektur durch Nutzer/Agent
-> Candidate Evidence
-> kontrollierter Adoption Proposal
-> Autorisierung
-> Semantic Apply
```

Externe Evidenz kann diese Kette nicht überspringen. Ein Quellenname, Pfad, eine Notiz oder eine Anweisung innerhalb der Quelle verleiht keine Authority.

## Lokale Text-/Markdown-Quelle prüfen

Der v1-Referenzadapter unterstützt ein lokales Verzeichnis mit `.md`-, `.mdx`- und `.txt`-Dateien:

```bash
livariant external-source inspect \
  --type local-directory \
  --path /pfad/zum/second-brain
```

Strukturierte Ausgabe:

```bash
livariant external-source inspect \
  --type local-directory \
  --path /pfad/zum/second-brain \
  --json
```

Die Prüfung ist read-only. Livariant schreibt weder in das externe Verzeichnis noch in das Projekt.

Der Adapter:

- lehnt einen per Symlink referenzierten Quell-Root ab;
- folgt keinen verschachtelten Symlinks;
- liest nur unterstütztes Text-/Markdown-Material;
- begrenzt einzelne Dateigrößen, insgesamt akzeptierte Bytes und die Zahl akzeptierter Dateien;
- meldet nicht unterstütztes, binäres, zu großes oder anderweitig übersprungenes Material ausdrücklich;
- versieht jedes akzeptierte Element mit Source Identity, relativem Materialpfad und SHA-256-Inhaltsdigest.

## Inert-Data-Grenze für maschinenlesbare Ausgabe

Externer natürlichsprachlicher Text ist nicht vertrauenswürdige Daten und keine Anweisung.

Auf maschinenlesbaren JSON-Oberflächen gibt Livariant externen Text nicht als gewöhnliches rohes `content`-Feld aus. Jedes externe Evidenz-Element wird in einem deterministischen Inert-Data-Envelope transportiert mit:

- `classification: "untrusted-external-data"`;
- `instructionSemantics: "none"`;
- `projectTruth: false`;
- `grantsAuthority: false`;
- ursprünglichem Medientyp;
- `encoding: "base64"` und `payloadBase64` für die exakten UTF-8-Bytes;
- Provenance mit Source Identity, codiertem relativem Materialpfad und SHA-256-Inhaltsdigest.

Dieselbe Darstellung gilt für eigenständiges External-Source-JSON, Guided-Understanding-JSON und verschachteltes First-Run-JSON.

Base64 wird **nicht** als Lösung dargestellt, die Prompt Injection unmöglich macht. Die Grenze ist enger: Livariant selbst serialisiert feindseligen externen Text nicht mehr als gewöhnlichen, anweisungsähnlichen Klartext in agentenseitigen strukturierten Ausgaben. Ein nachgelagertes Modell oder eine Integration, die den Payload bewusst decodiert, muss den decodierten Wert weiterhin als Daten behandeln und darf ihn nicht in System-, Developer-, Tool-Policy- oder andere Anweisungsfelder höherer Priorität einbetten.

Menschenlesbare CLI-Ausgabe darf begrenzte und Terminal-Control-escaped Snippets zur Prüfung anzeigen. Diese bleiben ausdrücklich als nicht vertrauenswürdige, nicht autoritative externe Daten markiert.

## Externe Evidenz gemeinsam mit dem Projektverständnis prüfen

Dieselbe read-only Quelle kann in Guided Project Understanding Review einbezogen werden:

```bash
livariant understand \
  --external-source-type local-directory \
  --external-source /pfad/zum/second-brain
```

Oder als strukturierte Ausgabe:

```bash
livariant understand \
  --external-source-type local-directory \
  --external-source /pfad/zum/second-brain \
  --json
```

Externes Material erscheint in einer getrennten `externalEvidence`-Oberfläche und nutzt in maschinenlesbarer Ausgabe den Inert-Data-Envelope. Es wird nicht automatisch zu `candidateEvidence` und kann nicht direkt über `adopt-understanding` ausgewählt werden.

Wenn externes Material nützlichen Kontext enthält, muss es weiterhin geprüft und in eine ausdrückliche Antwort oder Korrektur überführt werden, bevor Livariant den bestehenden kontrollierten Adoption-Proposal-Pfad vorbereiten kann. Eine Modellreaktion auf externes Material wird dadurch nicht selbst zu Project Truth oder Authority.

## Aktuelle Grenzen von v1

Die Foundation enthält aktuell nur den Local-Directory-Referenzadapter. Noch nicht enthalten sind:

- Notion- oder Google-Drive-Adapter;
- Cloud-Credentials oder OAuth;
- Write-back oder Synchronisierung;
- automatischer Project-Brain-Import;
- automatische Candidate-Erzeugung aus externem Text;
- Embeddings, Vector-Datenbank oder gehosteter RAG-Service.

Diese Grenzen sind beabsichtigt. v1 soll zuerst die Trust-, Provenance-, Read-only-, Inert-Data- und Adapter-Grenzen sauber etablieren, bevor breitere Quellenintegrationen ergänzt werden.
