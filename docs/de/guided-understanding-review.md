# Geführter Review des Projektverständnisses

> Repository-Funktion nach dem unveränderlichen `v0.1.0-rc.3`. Diese Seite beschreibt das aktuelle Repository-Verhalten, sobald die Implementierung gemergt ist; sie ist keine Aussage über den veröffentlichten RC3-Release.

Livariant kann Bootstrap-Discovery-Evidence in eine kompakte, review-orientierte Projektion des Projektverständnisses überführen:

```text
livariant understand
livariant understand --json
livariant understand --input review.json
livariant understand --input review.json --json
```

Der Befehl ist read-only. Er erstellt oder verändert keinen Project-Brain-Zustand, keine Projektdateien, keine Provider-Konfiguration, keinen Lifecycle-Zustand, keine Authorization und keine Release-/Runtime-Trust-Struktur.

## Was der Review zeigt

Der Review komponiert direkt aus dem begrenzten Bootstrap-Discovery-Ergebnis. Er trennt:

- bestätigte Evidence;
- stark abgeleitete Evidence;
- unsichere Evidence;
- Attention-Signale;
- echte Unknowns als gezielte Klärungsfragen.

Materielle Evidence behält ihre Discovery-Provenienz und Confidence. Der Review scannt das Repository nicht über ein paralleles Analyse-System erneut.

## Klärungsfragen

Fragen entstehen nur aus Unknowns, die Bootstrap Discovery bereits ausweist. Beispiele sind Projektzweck, aktuelle Produktrichtung oder nicht verhandelbare Projektregeln.

Eine Frage bedeutet nicht, dass das Projekt vollständig spezifiziert werden muss. Sie ist eine begrenzte Möglichkeit, Livariants Verständnis dort zu verbessern, wo die vorhandene Repository-Evidence nicht ausreicht.

## Optionales Review-Input

Der Nutzer kann eine kleine JSON-Review-Datei bereitstellen:

```json
{
  "schemaVersion": 1,
  "responses": [
    {
      "questionId": "unknown:project-purpose",
      "statement": "Ein Browser-Spiel mit dauerhafter Progression."
    }
  ],
  "corrections": [
    {
      "target": "stack:React",
      "statement": "React ist nur in Tooling vorhanden und nicht die Produkt-UI."
    }
  ]
}
```

Review-Input ist begrenzt und fail-closed. Die Datei muss eine reguläre Nicht-Symlink-Datei sein, ist größenbegrenzt, nutzt ein striktes Top-Level-Schema und unbekannte Frage-IDs werden abgelehnt.

## Candidate Evidence ist keine Project Truth

Nutzerantworten und Korrekturen werden ausdrücklich als `candidate-evidence` zurückgegeben.

Sie werden nicht automatisch in Project Brain Truth übernommen, vergeben keine Authority und autorisieren keine spätere Mutation nur deshalb, weil ein Nutzer sie diesem Befehl übergeben hat.

Das strukturierte Ergebnis hält diese Grenze ausdrücklich fest:

```json
{
  "boundaries": {
    "evidenceIsProjectTruth": false,
    "candidateEvidenceIsProjectTruth": false,
    "grantsAuthority": false,
    "changesMade": 0
  }
}
```

Die kontrollierte Übernahme eines geprüften Verständnisses in dauerhafte Project Brain Truth ist eine separate zukünftige Fähigkeit und absichtlich nicht Teil dieser Review-Oberfläche.

## Verhältnis zu Bootstrap Discovery

Der gedachte Ablauf ist:

```text
Repository
-> Bootstrap Discovery
-> Evidence + Provenienz + Confidence
-> Guided Understanding Review
-> Klärungs-/Korrektur-Candidate-Evidence
-> keine kanonische Mutation
```

Damit wird Projektverständnis sichtbar und überprüfbar, ohne Livariants Trennung zwischen Beobachtung, Inferenz, geprüfter Candidate Evidence, akzeptierter Truth und Mutation Authority zu schwächen.
