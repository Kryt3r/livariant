# Autonomy Profiles

Livariant Autonomy Profiles steuern, wie oft ein Agent oder Workflow vor frei wählbaren nächsten Schritten anhalten und nachfragen soll.

Sie sind **Interaktionspolitik, keine Authority**.

Kein Profil kann Project-Truth-Mutationsfreigaben, proposal-bound Authorization, Semantic-Apply-Prüfungen, Runtime Authority, Release Authority oder andere fail-closed Sicherheitsgrenzen umgehen.

## Profile

### Immer fragen

```text
ask-always
```

Für maximale Kontrolle und Sichtbarkeit.

Der Agent soll vor routinemäßigen und wichtigen frei wählbaren nächsten Schritten anhalten.

Harte Authority-Bestätigungen bleiben weiterhin erforderlich.

### Bei wichtigen Entscheidungen fragen

```text
ask-important
```

Das ist der ausgewogene Standardmodus.

Der Agent darf routinemäßige schreibgeschützte Arbeit ohne weitere Rückfrage fortsetzen, soll aber vor wichtigen oder folgenreichen frei wählbaren Entscheidungen anhalten.

Harte Authority-Bestätigungen bleiben weiterhin erforderlich.

### Ohne Bestätigung fortfahren

```text
continue-without-confirmation
```

Das ist das Profil mit der höchsten Autonomie.

Der Agent darf routinemäßige und wichtige frei wählbare Workflow-Entscheidungen ohne weitere Rückfrage fortsetzen, wenn dafür keine harte Livariant Authority erforderlich ist.

**Warnung:** Dadurch kann ein Agent folgenschwere Workflow-Entscheidungen treffen, ohne vorher nachzufragen. Das dauerhafte Speichern dieses Modus erfordert eine ausdrückliche Risikobestätigung.

Auch in diesem Profil kann der Agent Livariants strukturelle Authority-Grenzen nicht umgehen.

## Aktuelles Profil anzeigen

```bash
livariant autonomy show
livariant autonomy show --json
```

Solange ein Projekt noch keinen gültig initialisierten Project Brain mit stabiler Projektidentität besitzt, verwendet Livariant den ausgewogenen Standard `ask-important` und speichert keinen projektspezifischen Autonomie-Zustand dauerhaft.

## Profil dauerhaft speichern

Nach Vergabe einer stabilen Projektidentität:

```bash
livariant autonomy set --profile ask-always
livariant autonomy set --profile ask-important
```

Das Profil mit der höchsten Autonomie verlangt zusätzlich eine ausdrückliche Risikobestätigung:

```bash
livariant autonomy set \
  --profile continue-without-confirmation \
  --acknowledge-risk
```

Die Einstellung wird maschinenlokal gespeichert und an die stabile Projektidentität gebunden. Sie wird nicht als Repository- oder Project-Truth gespeichert.

Projektdateien, externe Wissensquellen, Provider-Ausgaben oder kopierter Profilzustand können die Autonomie eines anderen Projekts nicht legitim erhöhen. Ungültiger oder nicht passender gespeicherter Zustand fällt fail-closed auf `ask-always` zurück.

## First-Run

First-Run kann ein Autonomy Profile anzeigen oder auswählen:

```bash
livariant first-run --language Deutsch --autonomy-profile ask-important
```

Für deterministische Nutzung des höchsten Autonomieprofils ist eine ausdrückliche Bestätigung erforderlich:

```bash
livariant first-run \
  --language Deutsch \
  --autonomy-profile continue-without-confirmation \
  --acknowledge-autonomy-risk \
  --json
```

First-Run bleibt schreibgeschützt. Es speichert das Profil **nicht** selbst dauerhaft, sondern zeigt den separaten expliziten nächsten Schritt `livariant autonomy set ...` an.

## Authority-Grenze

Autonomy Profile != Authority.

In jedem Profil gilt weiterhin:

- Project-Truth-Mutationen benötigen den bestehenden Authorization-Pfad;
- nicht-interaktive Provider, Skripte oder CI können keine harte Mutation Authority erzeugen, wenn die Runtime eine lokale interaktive Challenge verlangt;
- Semantic Apply prüft weiterhin exakten Proposal-/Authorization-Zustand;
- Runtime Trust bleibt getrennt;
- Release Authority und ausdrückliche Release-Freigabe bleiben getrennt.

`continue-without-confirmation` bedeutet daher „weniger frei wählbare Workflow-Rückfragen“ und nicht „alles autorisieren“.
