# First-Run-Komposition

`livariant first-run` ist der geführte Einstieg, um Livariant in ein Projekt einzubinden, ohne dieses Projekt stillschweigend zu verändern.

Der Befehl verbindet Fähigkeiten, die bereits unabhängig existieren: schreibgeschützte Projekterkennung, Initialisierungsbewertung, optionales externes Wissensevidenzmaterial, Guided Project Understanding Review und optionale Hinweise zur Provider-Einrichtung.

## Mit der Sprachpräferenz beginnen

Bei interaktiver Nutzung wird zuerst nach der bevorzugten Interaktionssprache gefragt.

Für deterministische oder agentengesteuerte Nutzung wird sie explizit angegeben:

```bash
livariant first-run --language Deutsch
livariant first-run --language English
livariant first-run --language Español --json
```

Die Sprachangabe ist nur eine Kommunikationspräferenz. Sie ist kein Vertrauensnachweis und verleiht keine Authority.

Die aktuelle CLI erfasst und meldet die Präferenz, damit ein Mensch oder ein verbundener Agent sie durch das Onboarding tragen kann. Die fest eingebauten deterministischen CLI-Beschriftungen werden von Livariant selbst nicht automatisch in jede beliebige Sprache übersetzt.

## Optional ein bestehendes Second Brain anbinden

Eine unterstützte lokale Text-/Markdown-Wissensquelle kann schreibgeschützt angebunden werden:

```bash
livariant first-run \
  --language Deutsch \
  --external-source-type local-directory \
  --external-source ../meine-notizen
```

Externes Material bleibt External Evidence. Es wird nicht zu Project-Brain-Truth und kann nicht direkt übernommen werden.

## Einen Provider-Setup-Pfad anzeigen

First-Run kann den separaten MCP-Setup-Befehl als optionalen nächsten Schritt anzeigen:

```bash
livariant first-run --language Deutsch --provider claude-code
livariant first-run --language Deutsch --provider codex
```

First-Run führt das Provider-Setup nicht aus. Es zeigt nur, welcher explizite Befehl dafür verwendet werden kann.

## Was First-Run tut

First-Run:

1. legt die bevorzugte Interaktionssprache fest;
2. prüft Projekt und aktuellen Project-Brain-Zustand schreibgeschützt;
3. liest optional eine unterstützte externe Wissensquelle über die bestehende sichere Adapter-Grenze;
4. erstellt die anfängliche Guided Project Understanding Review;
5. zeigt, wie viel bestätigt, abgeleitet, unsicher oder weiterhin unbekannt ist;
6. erklärt, dass Discovery und externes Material Evidence und nicht Project Truth sind;
7. listet sinnvolle nächste explizite Befehle auf.

## Was First-Run nicht tut

First-Run führt **nicht** aus:

- `livariant init --apply`;
- Erstellen oder Umschreiben des Project Brain;
- automatische Umwandlung von Discovery in Project Truth;
- automatische Umwandlung von External Evidence in Project Truth;
- Erzeugen von Adoption-Kandidaten aus rohem externem Text;
- Übernahme von Candidate Evidence;
- Konfiguration von Claude Code oder Codex;
- Vergabe von Runtime Authority;
- Vergabe von Release Authority.

Die menschlich lesbare Ausgabe endet mit `Changes made: 0`.

Maschinenlesbare Nutzung ist mit `--json` möglich. Im JSON-Modus ist `--language` erforderlich, damit automatisierte Nutzung nicht an einer interaktiven Eingabe hängen bleibt.

## Die nächsten Authority-Grenzen bleiben getrennt

Wenn eine Project-Brain-Initialisierung nötig ist, kann First-Run folgenden Befehl anzeigen:

```bash
livariant init --apply
```

Dieser Befehl bleibt eine separate explizite Mutationsfreigabe.

Wenn Guided Project Understanding Review offene Punkte zeigt, werden Antworten oder Korrekturen über den bestehenden Review-Pfad eingebracht. Nur geprüftes Candidate Material kann später in Controlled Starting Understanding Adoption eingehen.

Wenn nativer Agentenzugriff gewünscht ist, wird der separat angezeigte Provider-Setup-Befehl ausdrücklich ausgeführt.

First-Run ist damit Komposition und Führung, aber keine Abkürzung um das Sicherheitsmodell von Livariant.
