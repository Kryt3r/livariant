# First-Run-Komposition

`livariant first-run` ist der geführte Einstieg, um Livariant in ein Projekt einzubinden, ohne dieses Projekt stillschweigend zu verändern.

Der Befehl verbindet Fähigkeiten, die bereits unabhängig existieren: schreibgeschützte Projekterkennung, Initialisierungsbewertung, Auswahl eines Autonomy Profile, optionales externes Wissensevidenzmaterial, Guided Project Understanding Review und optionale Hinweise zur Provider-Einrichtung.

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

## Festlegen, wie oft der Agent fragen soll

First-Run enthält jetzt die Auswahl eines Autonomy Profile:

- `ask-always` - vor routinemäßigen und wichtigen frei wählbaren nächsten Schritten anhalten;
- `ask-important` - routinemäßige/schreibgeschützte Arbeit fortsetzen, vor wichtigen oder folgenreichen frei wählbaren Entscheidungen anhalten; das ist der ausgewogene Standard;
- `continue-without-confirmation` - frei wählbare Workflow-Entscheidungen ohne zusätzliche Rückfrage fortsetzen, wenn keine harte Livariant Authority erforderlich ist.

Beispiel:

```bash
livariant first-run --language Deutsch --autonomy-profile ask-important
```

Das Profil mit der höchsten Autonomie verlangt bei deterministischer/nicht-interaktiver Nutzung eine klare Risikobestätigung:

```bash
livariant first-run \
  --language Deutsch \
  --autonomy-profile continue-without-confirmation \
  --acknowledge-autonomy-risk \
  --json
```

Autonomy Profile != Authority. Auch `continue-without-confirmation` kann Mutation Authorization, Semantic-Apply-Prüfungen, Runtime Authority oder Release Authority nicht umgehen.

First-Run speichert das Profil nicht dauerhaft. Es bleibt schreibgeschützt und zeigt einen separaten expliziten nächsten Schritt `livariant autonomy set ...` an. Dauerhafter Profilzustand wird maschinenlokal gespeichert und an die stabile Projektidentität gebunden.

Siehe [Autonomy Profiles](autonomy-profiles.md) für Verhalten und Trust-Modell im Detail.

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
2. zeigt/wählt ein Autonomy Profile, ohne es dauerhaft zu speichern;
3. prüft Projekt und aktuellen Project-Brain-Zustand schreibgeschützt;
4. liest optional eine unterstützte externe Wissensquelle über die bestehende sichere Adapter-Grenze;
5. erstellt die anfängliche Guided Project Understanding Review;
6. zeigt konkrete Erkenntnisse und offene Review-Punkte;
7. erklärt, dass Discovery und externes Material Evidence und nicht Project Truth sind;
8. listet sinnvolle nächste explizite Befehle auf.

## Was First-Run nicht tut

First-Run führt **nicht** aus:

- dauerhaftes Speichern des Autonomy Profile;
- Vergabe von Authority durch das Autonomy Profile;
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

Maschinenlesbare Nutzung ist mit `--json` möglich. Im JSON-Modus ist `--language` erforderlich, damit automatisierte Nutzung nicht an einer interaktiven Eingabe hängen bleibt. Für die Auswahl des höchsten Autonomieprofils ist zusätzlich `--acknowledge-autonomy-risk` erforderlich.

## Die nächsten Authority-Grenzen bleiben getrennt

Wenn eine Project-Brain-Initialisierung nötig ist, kann First-Run folgenden Befehl anzeigen:

```bash
livariant init --apply
```

Dieser Befehl bleibt eine separate explizite Mutationsfreigabe.

Nach Vergabe einer stabilen Projektidentität kann First-Run den separaten Befehl zum maschinenlokalen Speichern des Profils anzeigen, zum Beispiel:

```bash
livariant autonomy set --profile ask-important
```

Das verändert nur maschinenlokalen Präferenzzustand. Es verleiht keine Mutation-, Runtime- oder Release Authority.

Wenn Guided Project Understanding Review offene Punkte zeigt, werden Antworten oder Korrekturen über den bestehenden Review-Pfad eingebracht. Nur geprüftes Candidate Material kann später in Controlled Starting Understanding Adoption eingehen.

Wenn nativer Agentenzugriff gewünscht ist, wird der separat angezeigte Provider-Setup-Befehl ausdrücklich ausgeführt.

First-Run ist damit Komposition und Führung, aber keine Abkürzung um das Sicherheitsmodell von Livariant.
