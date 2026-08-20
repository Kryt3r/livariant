# First-Run-Komposition

`livariant first-run` ist der geführte, read-only Einstieg, um Livariant in ein Projekt einzubinden, ohne dieses Projekt stillschweigend zu verändern.

Der remediated First Run verbindet Project Discovery, Initialisierungsbewertung, Auswahl eines Autonomy Profile, optionale externe Wissensevidenz, Guided Project Understanding Review, Provider-Setup-Hinweise **und die Guardian-Readiness des Rechners**.

## Interaktions-Lokalisierung

Für deterministische Nutzung gibst du die bevorzugte Interaktionssprache explizit an:

```bash
livariant first-run --language Deutsch
livariant first-run --language English
```

Deutsch und Englisch sind in der WP-044-Remediation eingebaute unterstützte CLI-Interaktions-Locals. Wird eine davon gewählt, verwenden nutzerseitige First-Run-Prompts, Warnungen, Überschriften, Erklärungen und Next-Action-Beschreibungen ab dem ersten lokalisierten Prompt diese Sprache.

Übliche Aliase wie `de`, `de-DE`, `en`, `en-US`, `Deutsch` und `English` werden dem entsprechenden Locale zugeordnet.

Eine noch nicht als CLI-Locale implementierte Sprache kann weiterhin als bevorzugter Interaktionssprachwert für maschinenlesbaren/Projekt-Kontext erhalten bleiben; die CLI meldet dann jedoch ausdrücklich, dass die sichtbare Oberfläche auf Englisch zurückfällt. Livariant behauptet nicht, beliebige Sprachen vollständig zu lokalisieren, wenn das nicht der Fall ist.

Interaktions-Lokalisierung ist getrennt von:

- der Sprache von Project Truth;
- Befehlsnamen;
- Machine-Identifiern und Enum-Werten;
- Provider-Protokollfeldern;
- Authority oder Trust Evidence.

Die Sprachpräferenz vergibt keine Authority.

## Festlegen, wie oft der Agent fragen soll

First Run enthält die Auswahl eines Autonomy Profile:

- `ask-always` - vor routinemäßigen und wichtigen frei entscheidbaren nächsten Schritten anhalten;
- `ask-important` - routinemäßige/read-only Arbeit fortsetzen, vor wichtigen oder folgenreichen frei entscheidbaren Schritten anhalten; ausgewogener Standard;
- `continue-without-confirmation` - frei entscheidbare Workflow-Schritte ohne zusätzliche Bestätigung fortsetzen, wenn keine feste Livariant-Authority erforderlich ist.

Beispiel:

```bash
livariant first-run --language Deutsch --autonomy-profile ask-important
```

Das Profil mit der höchsten Autonomie erfordert bei deterministischer/nicht-interaktiver Nutzung eine explizite Risikobestätigung:

```bash
livariant first-run \
  --language Deutsch \
  --autonomy-profile continue-without-confirmation \
  --acknowledge-autonomy-risk \
  --json
```

Autonomy Profile != Authority. Auch `continue-without-confirmation` kann Mutation Authorization, Runtime Authority, Guardian Authority oder Release Authority nicht umgehen.

First Run speichert das Profil nicht dauerhaft. Persistenter Autonomy-Profile-State bleibt eine separate explizite maschinenlokale Aktion, die an eine stabile Projektidentität gebunden ist.

## Maschinen-Readiness gehört zum Onboarding

First Run prüft nun neben dem Projekt auch die geschützte Lifecycle-Basis des Rechners.

Der Report unterscheidet mindestens diese Zustände:

```text
geschützte Bootstrap-Quelle fehlt
geschützte Bootstrap-Quelle unsicher
Guardian Bootstrap erforderlich
Guardian bereit
Guardian-Plattform nicht unterstützt
```

Diese Prüfung ist read-only und vergibt keine Authority.

### Frischer unterstützter Rechner

Wurde die geschützte Stage-A-Quelle noch nicht provisioniert, muss First Run auf den verifizierten Protected-Installationspfad verweisen. `livariant init --authorize` oder `livariant init --apply` dürfen dann **nicht** als unmittelbar nächster Lifecycle-Schritt erscheinen.

Ist Stage A bereit, Guardian aber noch nicht gebootstrapped, verweist First Run auf den geschützten Stage-B-Pfad.

Wird geschützter State als `unsafe` bewertet, stoppt First Run die Lifecycle-Führung, statt diesen Zustand aufgrund seiner bloßen Existenz zu segnen, zu reparieren oder als vertrauenswürdig zu behandeln.

Erst wenn Guardian Readiness hergestellt ist, darf First Run die normale Projektinitialisierungssequenz anzeigen.

Siehe [Installation & erstes Projekt](installation.md) für den Stage-A-/Stage-B-Vertrauenspfad.

## Optional ein bestehendes Second Brain anbinden

Eine unterstützte lokale Text-/Markdown-Wissensquelle kann read-only angebunden werden:

```bash
livariant first-run \
  --language Deutsch \
  --external-source-type local-directory \
  --external-source ../meine-notizen
```

Externes Material bleibt External Evidence. Es wird nicht zu Project Truth und kann nicht direkt übernommen werden.

## Einen Provider-Setup-Pfad anzeigen

First Run kann den separaten MCP-Setup-Befehl als optionalen nächsten Schritt anzeigen:

```bash
livariant first-run --language Deutsch --provider claude-code
livariant first-run --language Deutsch --provider codex
```

First Run führt das Provider-Setup nicht aus und nimmt selbst null Provider-Konfigurationsänderungen vor.

## Was First Run tut

First Run:

1. löst bevorzugte Interaktionssprache und unterstütztes CLI-Locale auf;
2. zeigt/wählt ein Autonomy Profile, ohne es dauerhaft zu speichern;
3. prüft Projekt und aktuellen Project-Brain-Zustand read-only;
4. prüft Protected-Bootstrap-/Guardian-Maschinen-Readiness read-only;
5. liest optional eine unterstützte externe Wissensquelle über die sichere Adapter-Grenze;
6. erstellt die anfängliche Guided Project Understanding Review;
7. zeigt konkrete Erkenntnisse und offene Review-Punkte;
8. erklärt Evidence-/Project-Truth- und Capability-/Authority-Grenzen;
9. listet ausschließlich nächste Schritte auf, die zum aktuellen Maschinen-/Projektzustand passen.

## Was First Run nicht tut

First Run führt **nicht** aus:

- Stage-A-Provisionierung;
- Guardian Bootstrap;
- Erzeugung von Guardian-/Lifecycle-Authority;
- dauerhaftes Speichern des Autonomy Profile;
- Erstellen oder Umschreiben des Project Brain;
- automatisches `init --authorize` oder `init --apply`;
- Umwandlung von Discovery oder External Evidence in Project Truth;
- Erzeugen von Adoption-Kandidaten aus rohem externem Text;
- Konfiguration von Claude Code oder Codex;
- Vergabe von Runtime oder Release Authority;
- Vertrauen in einen geschützt wirkenden Pfad allein deshalb, weil er existiert.

Die menschlich lesbare Ausgabe endet mit null Änderungen (`Vorgenommene Änderungen: 0` auf Deutsch; entsprechende englische Ausgabe bei English).

Maschinenlesbare Nutzung ist mit `--json` möglich. Im JSON-Modus bleibt `--language` erforderlich, damit automatisierte Nutzung nicht an einem interaktiven Prompt hängen bleibt. Der Report bewahrt stabile Machine-Identifier und führt den Interaction-Locale-State getrennt.

## Lifecycle-Next-Actions bleiben zustandsabhängig

Solange Guardian nicht bereit ist, zeigt First Run Maschinenvorbereitung/Diagnose statt Projekt-Lifecycle-Autorisierung.

Ist Guardian bereit und eine Project-Brain-Initialisierung nötig, bleibt die sichere Sequenz explizit:

```bash
livariant init
livariant init --authorize
livariant init --apply
```

Plan, Autorisierung und Anwendung bleiben getrennte Vorgänge. First Run führt keinen davon selbst aus.

Nach Entstehung einer stabilen Projektidentität kann First Run separat das Persistieren des Autonomy Profile anzeigen, zum Beispiel:

```bash
livariant autonomy set --profile ask-important
```

Das verändert ausschließlich maschinenlokalen Präferenz-State und vergibt keine Mutation-, Runtime-, Guardian- oder Release-Authority.

First Run ist damit Komposition und zustandsbewusste Führung, aber keine Abkürzung um Livariants Sicherheitsmodell.
