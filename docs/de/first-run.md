# First-Run-Komposition

<p align="center">
  <a href="../first-run.md">English</a> · <strong>Deutsch</strong>
</p>

`livariant first-run` ist die **CLI**-Oberfläche für einen geführten, read-only Projekteinstieg. Sie ist vom aktuellen Desktop-Workspace **Project Truth / First Steps** getrennt.

Beide Oberflächen teilen Livariants Preservation-/Trust-Modell, sind aber nicht austauschbar:

- CLI First Run verbindet read-only Projekt-/Machine-Understanding mit zustandsabhängiger Next-Action-Führung;
- Desktop First Steps / Project Truth ist der grafische Workspace und enthält aktuell noch Renderer-/Session-State-Foundation-Verhalten statt eines fertigen persistenten Project-Brain-Editors.

## Interaktions-Lokalisierung

Für deterministische CLI-Nutzung eine unterstützte Interaktionssprache explizit auswählen:

```bash
livariant first-run --language Deutsch
livariant first-run --language English
```

Deutsch und Englisch sind eingebaute CLI-Interaktions-Locals. Sichtbare Prompts, Warnungen, Überschriften, Erklärungen und Next-Action-Beschreibungen verwenden die gewählte unterstützte Sprache.

Interaktions-Lokalisierung bleibt getrennt von:

- Project-Truth-Sprache/-Inhalt;
- Command-Namen;
- Machine Identifiern/Enums;
- Provider-Protokollfeldern;
- Authority-/Trust-Evidenz.

Sprachpräferenz vergibt keine Authority.

## Autonomy Profile

CLI First Run kann eine Autonomy-Profile-Wahl enthalten:

- `ask-always` - vor routinemäßigen und wichtigen Ermessensschritten stoppen;
- `ask-important` - routinemäßige/read-only Arbeit fortsetzen, vor wichtigen/folgenreichen Ermessensentscheidungen stoppen; balancierter Default;
- `continue-without-confirmation` - Ermessensschritte ohne zusätzliche Bestätigung fortsetzen, sofern keine harte Livariant-Authority erforderlich ist.

Beispiel:

```bash
livariant first-run --language Deutsch --autonomy-profile ask-important
```

Autonomy ist Interaktionspolitik und keine harte Authority. Auch das höchste Autonomy Profile kann Mutation-, Runtime-, Guardian-, Lifecycle- oder Release-Authority nicht umgehen.

CLI First Run persistiert das gewählte Profil nicht still.

## Projekt- und Machine-Readiness

CLI First Run prüft Projektzustand sowie die Protected-Machine-/Guardian-Readiness, die der tiefergehende Core-Lifecycle erwartet.

Es kann Zustände unterscheiden wie:

```text
protected bootstrap source missing
protected bootstrap source unsafe
guardian bootstrap required
guardian ready
unsupported Guardian platform
```

Diese Inspektion ist read-only und vergibt keine Authority.

> [!IMPORTANT]
> Diese tiefergehenden Guardian-Readiness-Zustände sind **nicht** die normalen Installationsanweisungen für das aktuelle Windows Desktop Preview. Normale Desktop-Nutzer beginnen bei [Installation](installation.md). Der CLI-/Guardian-Pfad bleibt für Advanced-Core-/Lifecycle-Workflows relevant.

Ist Protected-State für eine Lifecycle-Operation unsicher oder unvollständig, darf First Run nicht zum Umgehen raten oder Projektmutation als unmittelbar sicher darstellen.

## Optionales External Knowledge

Eine unterstützte lokale Text-/Markdown-Wissensquelle kann read-only eingebunden werden:

```bash
livariant first-run \
  --language Deutsch \
  --external-source-type local-directory \
  --external-source ../meine-notizen
```

Externes Material bleibt External Evidence. Es wird nicht automatisch Project Truth oder Mutation Authority.

## Optionale Provider-Setup-Hinweise

First Run kann Provider-Setup-Hinweise als nächsten Schritt einblenden:

```bash
livariant first-run --language Deutsch --provider claude-code
livariant first-run --language Deutsch --provider codex
```

First Run führt Provider-Setup nicht selbst aus und verändert Provider-Konfiguration nicht still.

Der aktuelle Desktop besitzt eine getrennte echte Codex-Verbindungsoberfläche. Zusätzliche Desktop-Provider/-Connection-Methoden bleiben Zukunft, solange sie nicht implementiert und qualifiziert wurden.

## Was CLI First Run tut

CLI First Run kann:

1. die Interaktionssprache auflösen;
2. ein Autonomy Profile anzeigen/auswählen, ohne daraus Authority zu machen;
3. Projekt und aktuellen Project-Brain-State read-only prüfen;
4. tiefergehende Protected-Machine-/Guardian-Readiness read-only prüfen;
5. optional unterstütztes External Knowledge über die sichere Adaptergrenze lesen;
6. Guided-Project-Understanding-Review-Information zusammensetzen;
7. Findings/offene Review-Punkte melden;
8. Evidence-/Project-Truth- und Capability-/Authority-Grenzen erklären;
9. für den beobachteten Zustand gültige nächste Schritte anzeigen.

## Was CLI First Run nicht tut

CLI First Run:

- initialisiert/überschreibt Project Brain nicht automatisch;
- persistiert ein Autonomy Profile nicht still;
- macht Discovery-/External-Evidence nicht automatisch zu Project Truth;
- konfiguriert Claude Code oder Codex nicht automatisch;
- erzeugt keine Mutation-/Runtime-/Lifecycle-/Release-Authority;
- repariert unsicheren Protected-State nicht durch Raten;
- macht den aktuellen Desktop-Project-Truth-Renderer nicht persistent;
- veröffentlicht oder installiert kein Release.

Der menschliche Pfad bleibt Zero-Change-Onboarding/-Inspektion. Maschinenlesbare Nutzung ist mit `--json` unter den aktuellen deterministischen Eingabeanforderungen des Commands möglich.

## Lifecycle-Schritte bleiben zustandsabhängig

Wenn tiefergehende Projektinitialisierung passend ist und Protected-Voraussetzungen bereit sind, trennt der aktuelle Lifecycle weiterhin:

```bash
livariant init
livariant init --authorize
livariant init --apply
```

First Run selbst führt keine dieser Mutationen aus.

Für den normalen aktuellen Desktop-Pfad:

- [Installation](installation.md)
- [Fünf-Minuten-Schnellstart](quickstart.md)
- [Bestehende Projekte](existing-projects.md)

Für tiefergehende Trust-/Lifecycle-Details:

- [Architektur & Sicherheit](architecture-and-safety.md)
- [Updates, Migrationen & Recovery](lifecycle-guide.md)
