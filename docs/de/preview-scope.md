# Public-Preview-Umfang & Einschränkungen

Diese Seite erklärt, was der aktuelle Livariant-Preview-Kandidat unterstützt und wo die Grenzen liegen.

Sie ist keine Marketingliste. Sie soll so klar sein, dass Nutzer erkennen können, worauf sie sich verlassen dürfen und was sie nicht einfach voraussetzen sollten.

## Unterstützte ausführbare Baseline

Die gehärtete Baseline besitzt ausführbare Evidenz für:

- neue und bestehende Projekte;
- wiederholte semantische Pflege bestätigter Ziele, bestätigten Projektwissens und akzeptierter Entscheidungen;
- plan-first Mutation mit ausdrücklichem `--apply`;
- Supersession von Entscheidungen mit erhaltener Historie;
- Project-Brain-Resume-Handoff für Claude Code und Codex;
- Schutz vor veraltetem Kontext;
- normale Updates;
- den expliziten Project-Brain-Schema-Pfad `1 -> 2`;
- Diagnose unterbrochener Updates;
- separat autorisierte Wiederherstellung;
- Dateisystemgrenzen;
- Release- und Runtime-Integrität;
- unabhängige rechnerlokale Runtime-Release-Authority;
- Drift-Diagnose;
- saubere Paketinstallation.

Paket, Runtime und installierter CLI-Befehl heißen `livariant`.

Die aktuelle CI-Supportaussage ist bewusst auf die Umgebungen begrenzt, die von der Release-Pipeline tatsächlich getestet werden: Ubuntu und Windows mit Node.js 24. Das Paket selbst deklariert Node.js `>=20`.

## Provider-Support ist bewusst begrenzt

Die aktuelle Preview unterstützt Claude Code und Codex für Project-Brain-Resume-Handoff.

Die Provider-Anwendbarkeit verwendet `LIVARIANT_PROVIDER_ENV`. Wenn du einen Provider explizit auswählst, teilst du Livariant mit, welche unterstützte Resume-Umgebung du gerade ansprechen möchtest. Dadurch entsteht keine Ausführungs- oder Mutationsautorität.

Livariant beansprucht nicht, jede Provider-Funktion, jedes Tool, jede Modellauswahl, Authentifizierungsmethode oder native Instruktionsdatei zu verwalten.

## Semantische Wissenspflege

Die ausführbare CLI von `0.1.0-rc.2` unterstützt eine klar begrenzte Oberfläche für wiederholte Änderungen an dauerhafter Project-Brain-Wahrheit.

Die ausführbare Befehlsoberfläche lautet:

```text
init
status
doctor
resume
goals
knowledge
decisions
update
recover
version
```

Unterstützt werden:

```text
livariant goals [list]
livariant goals add <goal> [--apply]

livariant knowledge [list]
livariant knowledge add <fact> [--apply]

livariant decisions [list]
livariant decisions add <decision> [--apply]
livariant decisions supersede <id> <replacement> [--reason <reason>] [--apply]
```

Mutation ist plan-first. Ohne `--apply` zeigt Livariant die geplante kanonische Änderung und schreibt nichts. Eine unterstützte Änderung darf nur bei einem gültigen und gesunden Project Brain angewendet werden. Verwaltete Writes bleiben hinter der Project-Brain-Storage-Grenze, lehnen unsichere Managed-File-Topologien ab, verwenden atomare Ersetzung mit Exact-Original-Concurrency-Prüfung und verifizieren den gespeicherten Zustand, bevor Erfolg gemeldet wird.

Einfache Duplikate werden abgelehnt, statt bestehenden Projektstand still umzuschreiben. Beim Superseden einer Entscheidung bleibt die alte Entscheidung als Historie erhalten und eine neue aktive Entscheidungsidentität wird angelegt.

`livariant resume` enthält bestätigte Ziele, aktive Entscheidungen, bekannte Fakten, offene Unklarheiten und vorhandene Projektidentität. Die Resume-Projektionen für Claude Code und Codex verwenden denselben kanonischen Zustand.

Das bedeutet nicht, dass Livariant Gespräche automatisch beobachtet oder selbst entscheidet, welche KI-Ausgabe Projektwahrheit werden soll. Der Nutzer entscheidet weiterhin, welcher bestätigte Projektzustand dauerhaft festgehalten wird. Reichhaltigere Natural-Language- oder provider-native Wissenspflege kann später hinzukommen, darf diese Authority- und Verifikationsgrenzen aber nicht schwächen.

## Update- und Migrationssupport

`livariant update --manifest <path>` plant standardmäßig nur ein Update.

Zum Anwenden eines geprüften Updates brauchst du zusätzlich:

- `--apply`;
- das passende lokale Runtime-Artefakt;
- mindestens einen expliziten `--trusted-source`-Wert.

Das Release-Manifest kann seine eigene Quelle nicht selbst vertrauenswürdig machen. Die Artefaktbytes müssen weiterhin zu Identität und SHA-256 des ausgewählten Release-Descriptors passen.

Für ausführbare Updates gibt es eine weitere Voraussetzung. Der exakte Artefakt-SHA-256 muss bereits durch eine unabhängige rechnerlokale Release-Policy außerhalb der Projektautorität autorisiert sein.

Projektdateien, Release-Manifest, `--trusted-source` und die projektseitige Livariant-CLI oder API können diese Autorität weder erzeugen noch verändern. Produktive Release-Authorization-Logik ist read-only und prüft nur Authority, die bereits existiert. Einen projektseitigen `authorize-runtime`-Befehl gibt es absichtlich nicht.

Fehlt die exakte Artefakt-Autorität, stoppt das Update vor npm-Installation oder Candidate-Runtime-Attestation.

Kompatible schema-ändernde Releases verwenden denselben `livariant update`-Ablauf und werden durch den Migrations-Lifecycle geführt. Der aktuell belegte Schema-Pfad ist `1 -> 2`. Nicht unterstützte Migrationspfade brechen geschlossen ab.

> [!WARNING]
> Das manuelle Ersetzen von Project-Brain-Dateien, framework-verwaltetem Lifecycle-State, Schema- oder Versionsmetadaten, installierten Runtime-Dateien, Runtime-Trust-Records oder Release-Authorization-Records ist kein unterstützter Update-Weg. Damit würden Autoritäts-, Kompatibilitäts-, Integritäts-, Checkpoint-, Aktivierungs- und Recovery-Garantien umgangen.

## Wiederherstellung

`livariant recover` ist standardmäßig read-only.

`livariant recover --apply` autorisiert einen validierten Rollback-Plan separat.

Automatische Wiederherstellung bleibt gesperrt, wenn dauerhafte Lifecycle-Evidenz oder der Checkpoint fehlt, verschoben, verändert oder mehrdeutig ist.

Nach einem verifizierten Rollback schreibt Livariant zuerst das wiederhergestellte Project Brain fest. Verdrängter Recovery-State wird entfernt, bevor der letzte gültige Checkpoint gelöscht wird. Das Löschen des Checkpoints ist der letzte irreversible Bereinigungsschritt.

Scheitert die späte Bereinigung, müssen das wiederhergestellte Project Brain und der gültige Checkpoint erhalten bleiben.

## Keine versprochene Wunderreparatur

Livariant verspricht nicht, beliebigen beschädigten, manuell umgeschriebenen oder mehrdeutigen Project-Brain-Zustand automatisch zu reparieren.

Wenn sichere Semantik nicht eindeutig hergestellt werden kann, darf die Diagnose bewusst stoppen und menschliche Klärung verlangen.

## Local-first bedeutet nicht vertrauensfrei

Die normale Project-Brain-Nutzung ist local-first und braucht kein Livariant-Cloud-Konto.

Release- und Update-Vorgänge benötigen trotzdem vertrauenswürdige Release-Evidenz sowie bereits vorhandene unabhängige rechnerlokale Authority für das exakte ausführbare Artefakt.

Die aktuelle Runtime implementiert keine Livariant-Telemetrie, keinen automatischen Project-Brain-Upload und keinen automatischen Remote-Update-Check. Siehe [Datenschutz & Netzwerkverhalten](privacy-and-network.md).

## Öffentliche Distribution

Der vorgesehene Preview-Distributionsweg sind GitHub Releases aus dem kanonischen Livariant-Repository mit der erwarteten Source-Identität:

```text
github:Kryt3r/livariant
```

Das Release-Tooling erzeugt:

- einen konkreten Runtime-Tarball;
- ein maschinenlesbares Manifest, das an den exakten Artefakt-SHA-256 gebunden ist;
- `SHA256SUMS`.

CI verifiziert dieses Release-Bundle gegen einen sauberen Consumer.

Das Repository bleibt privat, bis das separate Public-Visibility-Gate ausdrücklich freigegeben wurde. Die öffentliche Dokumentation behandelt Repository-Sichtbarkeit deshalb nicht als Runtime-Sicherheitsannahme und erfindet keinen npm-Registry-Distributionspfad, den es nicht gibt.

Das historische private Release `v0.1.0-rc.1` bleibt Validierungsevidenz aus der Pre-Fix-Baseline. Es darf nicht neu erstellt, überschrieben, neu getaggt oder als aktueller Kandidat dargestellt werden.

Die aktuelle Repository-Paketidentität ist `0.1.0-rc.2`. Tag-Erstellung, GitHub-Release-Veröffentlichung, npm-Publishing und Änderungen der Repository-Sichtbarkeit benötigen jeweils eine separate ausdrückliche Freigabe.

## Lizenz, Sicherheit, Datenschutz, Beiträge und Support

Zum Preview-Repository gehören:

- PolyForm Perimeter License 1.0.1 in `LICENSE`;
- `THIRD_PARTY_NOTICES.md`;
- `SECURITY.md`;
- `CONTRIBUTING.md`;
- `SUPPORT.md`;
- `docs/de/license-and-warranty.md`;
- `docs/de/privacy-and-network.md`;
- `docs/de/preview-support-and-stability.md`.

Livariant ist source-available und wird nicht als OSI-zertifiziertes Open Source angeboten.

Externe Code-Beiträge bleiben ausgesetzt, bis Contributor-Rechte finalisiert sind, die mit dem source-available und zukünftigen kommerziellen Lizenzmodell vereinbar sind.

Host-seitige Sicherheitsfunktionen, die im aktuellen privaten Zustand noch nicht verfügbar sind, bleiben Punkte für das Public-Gate. Sie werden nicht als aktuelle Abdeckung behauptet, bevor sie tatsächlich aktiviert und verifiziert wurden.

## Was Preview bedeutet

Public Preview bedeutet:

- die unterstützte Oberfläche ist bewusst begrenzt;
- bekannte Einschränkungen sollen ausdrücklich dokumentiert werden;
- Breaking Changes können unter den dokumentierten Preview- und SemVer-Regeln noch vorkommen;
- Autorität und Projektmutationsumfang dürfen nicht stillschweigend wachsen;
- unterstützte Pfade sollen durch ausführbare Evidenz belegt sein, statt pauschal jede Umgebung zu versprechen.

Preview-Support ist Maintainer- und Community-Support ohne bezahlten SLA, sofern nichts anderes separat vereinbart wurde.

Der spätere 1.0-Stabilitäts- und Kompatibilitätsvertrag braucht eine eigene Readiness-Entscheidung.

## Verbleibende Arbeit vor PUBLIC

Bevor das Repository öffentlich gemacht und die Preview breit angekündigt wird, muss der Release-Prozess noch:

1. den aktuellen Human-Documentation- und Repository-Acceptance-Pass abschließen;
2. den finalen Kandidaten nach Abschluss aller paketierten öffentlichen Texte neu bauen und prüfen;
3. eine ausdrückliche Freigabe für PRIVATE -> PUBLIC erhalten;
4. anwendbare Host-Schutzmechanismen für den öffentlichen Zustand aktivieren und verifizieren;
5. Release- und Tag-Schutz sowie den vorgesehenen unveränderlichen Release-Ablauf prüfen;
6. nur ein ausdrücklich freigegebenes manifestgebundenes Preview-Bundle aus dem exakten kanonischen Kandidaten veröffentlichen;
7. veröffentlichte Artefaktidentität, Source-Identität und Prüfsummen verifizieren;
8. den finalen Public-Release-Readiness-Check gegen exakt diesen veröffentlichten Kandidaten durchführen.
