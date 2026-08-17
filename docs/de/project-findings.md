# Evidenzbasierte Projekt-Findings

`livariant findings` ist eine schreibgeschützte Projektprüfung für eine kleine Gruppe deterministischer, hochsignaliger Sicherheits- und Qualitätsprobleme.

Sie soll fünf praktische Fragen beantworten:

1. Was wirkt riskant oder kaputt?
2. Warum meldet Livariant das?
3. Welche konkrete lokale Evidenz stützt das Finding?
4. Wie schwerwiegend ist es und wie sicher ist die Einordnung?
5. Was sollte als Nächstes geprüft werden?

## Prüfung ausführen

```bash
livariant findings
livariant findings --json
```

Der Befehl repariert nichts automatisch. Die menschlich lesbare Ausgabe endet mit:

```text
Changes made: 0
```

## Finding-Modell

Jedes v1-Finding enthält:

- eine stabile, an die Evidenz gebundene Finding-Identität und Rule-ID;
- Kategorie: `security` oder `quality`;
- Schweregrad: `critical`, `high`, `medium` oder `low`;
- Sicherheit der Einordnung: `strong` oder `moderate`;
- einen kurzen Titel und eine verständliche Erklärung;
- konkrete projektlokale Evidenzverweise;
- eine Empfehlung für die nächste Prüfung oder Behebungsrichtung.

Die JSON-Ausgabe ist deterministisch und für Agenten oder Automatisierungen gedacht, die dieselbe Evidenz ohne Prosa-Parsing benötigen.

## Erste deterministische Regeln

Das bewusst kleine v1-Regelwerk konzentriert sich auf hochsignalige Bedingungen, darunter:

- eine `package.json`, die keine reguläre projektlokale Datei ist;
- fehlerhafte oder ungewöhnlich große Paket-Manifeste, die nicht sicher geprüft werden können;
- mehrere Node-Paketmanager-Lockfiles;
- deklarierte installierbare Node-Abhängigkeiten ohne unterstütztes Lockfile;
- Package-Skripte, die Inhalte deterministisch herunterladen und unmittelbar über eine Shell oder einen PowerShell-Ausdruck ausführen;
- üblicherweise sensible Root-Pfade, die Symlinks oder andere nicht unterstützte Dateitypen sind, ohne dass Livariant ihnen folgt oder sie liest;
- üblicherweise sensible reguläre Dateien im Projektstamm eines echten lokalen Git-Workspaces, wenn Livariant keine wirksame einfache exakte Root-Regel in `.gitignore` für die gemeldete Datei bestätigen kann;
- unterschiedliche Bytes in `CLAUDE.md` und `AGENTS.md`, als Review-Hinweis statt als automatisch behaupteter Konflikt.

Ein Package-Manifest ohne deklarierte installierbare Abhängigkeiten erhält nicht allein wegen der Existenz von `package.json` ein Missing-Lockfile-Finding.

Die Inhalte sensibler Dateien werden von den Sensitive-Root-File-Regeln nicht gelesen. v1 erkennt absichtlich nur einfache exakte Root-Ignore- und Negationsregeln wie `.env`, `/.env` oder `!.env` und wertet sie in ihrer Reihenfolge aus; es behauptet nicht, die vollständige gitignore-Pattern-Sprache zu implementieren. Native Agent-Regeln werden in der Evidenz über Hashes repräsentiert, statt deren Inhalt in den Report zu kopieren.

## Begrenzte Prüfung

v1 führt bewusst keinen rekursiven Scan des gesamten Repositories aus.

Geprüft wird nur eine kleine Menge bekannter Root-Signale. Für `package.json`, `.gitignore` und native Agent-Regeln gelten feste Größenobergrenzen. Symlinks oder nicht unterstützte Dateitypen werden nicht als vertrauenswürdige lokale Evidenz verfolgt. Die Sensitive-File-Regeln werden nur aktiviert, wenn `.git` ein reguläres lokales Verzeichnis und keine beliebige Datei oder ein Symlink ist.

Dadurch bleibt die erste Findings-Schicht vorhersehbar und reduziert sowohl Ressourcenmissbrauch als auch schwache Fehlalarme.

## Confidence ist nicht Severity

Severity beschreibt die mögliche Auswirkung der Bedingung.

Confidence beschreibt, wie direkt die lokale Evidenz Livariants Einordnung stützt.

Beispiel: Eine sensible `.env`-Datei ohne bestätigten wirksamen einfachen exakten Root-Ignore-Eintrag ist ein ernstes Hygieneproblem, beweist aber nicht, dass die Datei committed oder veröffentlicht wurde. Diese Regel ist deshalb `high` Severity mit `moderate` Confidence.

## Authority-Grenze

**Finding != Truth != Authority.**

Ein Finding ist strukturierte Evidenz plus deterministische Einordnung. Es wird nicht automatisch zu Project Truth und kann weder eine Mutation noch Runtime Trust, Release-Freigabe, Tagging, Package-Veröffentlichung oder irgendeine andere harte Livariant Authority autorisieren.

Ein leerer Report ist ebenfalls keine Sicherheitsgarantie. v1 ist bewusst kein vollständiges SAST-, Dependency-, Fuzzing- oder unabhängiges Audit-System.

Behebungen bleiben getrennte explizite Arbeit und müssen weiterhin die normalen Livariant-Authorization-Grenzen durchlaufen.
