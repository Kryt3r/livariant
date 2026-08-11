# Public-Preview-Umfang & Einschränkungen

Dieses Dokument beschreibt, was die aktuelle Livariant Public Preview beansprucht — und was nicht.

## Unterstützte ausführbare Baseline

Die gehärtete Baseline besitzt ausführbare Evidenz für neue und bestehende Projekte, Claude-Code-↔-Codex-Resume-Handoff, Schutz vor veraltetem Kontext, normale Updates, den expliziten Schema-Migrationspfad 1 → 2, Diagnose unterbrochener Updates, separat autorisierte Recovery, Dateisystemgrenzen, Release-/Runtime-Integrität, unabhängige machine-local Runtime-Release-Authority, Drift-Diagnose und saubere paketierte Installation.

Die ausführbare Package-/Runtime-Identität und der installierte Befehl lauten beide `livariant`.

Die aktuelle CI-Supportzusage ist bewusst auf die tatsächlich durch die Release-Pipeline getesteten Umgebungen beschränkt: Ubuntu und Windows mit Node.js 24. Das Paket deklariert Node.js `>=20`.

## Provider-Support ist bewusst eng

Die aktuelle Preview unterstützt Claude Code und Codex für Project-Brain-Resume-Handoff. Aktuelle Provider-Anwendbarkeitsevidenz verwendet `LIVARIANT_PROVIDER_ENV`. Explizite Provider-Auswahl schafft Umgebungsevidenz für Resume; sie erzeugt keine Execution- oder Mutationsautorität.

Livariant beansprucht keine vollständige Kontrolle über jede Provider-Capability, jedes Tool, jede Modellauswahl, Authentifizierungsoberfläche oder jeden nativen Instruktionsmechanismus.

## Update- und Migrationsoberfläche

`livariant update --manifest <path>` ist standardmäßig nur Planung. Das Anwenden eines geprüften Updates erfordert zusätzlich `--apply`, das passende lokale Runtime-Artefakt und mindestens einen expliziten `--trusted-source`-Wert.

Das Release-Manifest macht seine eigene Quelle nicht vertrauenswürdig. Artefaktbytes müssen weiterhin zu Identität und SHA-256 passen, die durch den ausgewählten Release-Descriptor gebunden sind.

Für ausführbare Updates muss der exakte Artefakt-SHA-256 außerdem bereits durch eine unabhängige machine-local Release-Authority außerhalb der Projektautorität autorisiert sein. Projektdateien, Release-Manifest, `--trusted-source` und projektseitige Livariant-CLI/API können diese Autorität weder erzeugen noch verändern. Produktive Release-Authorization-Logik ist read-only und prüft nur bereits vorhandene Authority. Einen projektseitigen `authorize-runtime`-Befehl gibt es absichtlich nicht. Fehlt die exakte Artefakt-Autorität, schlägt das Update fail-closed vor npm-Installation oder Candidate-Runtime-Attestation fehl.

Schema-ändernde kompatible Releases verwenden denselben `livariant update`-Ablauf und werden durch den expliziten Migrations-Lifecycle geroutet. Der aktuell belegte Schema-ändernde Pfad ist 1 → 2. Nicht unterstützte Migrationspfade schlagen fail-closed fehl.

> [!WARNING]
> Manuelles Ersetzen von Project-Brain-Dateien, framework-verwaltetem Lifecycle-State, Schema-/Versionsmetadaten, installierten Runtime-Dateien, Runtime-Trust-Records oder Release-Authorization-Records ist kein unterstützter Update-Mechanismus. Dadurch würden Autoritäts-, Kompatibilitäts-, Integritäts-, Checkpoint-, Aktivierungs- und Recovery-Garantien des Lifecycles umgangen.

## Recovery-Oberfläche

`livariant recover` ist standardmäßig read-only Inspektion. `livariant recover --apply` autorisiert den validierten Rollback-Plan separat.

Automatische Recovery bleibt nicht verfügbar, wenn dauerhafte Lifecycle-Evidenz oder der Checkpoint fehlt, verschoben, verändert oder mehrdeutig ist.

Nach einem verifizierten Rollback schreibt Livariant zuerst das wiederhergestellte Project Brain fest, entfernt displaced Recovery-State vor dem Löschen des letzten gültigen Checkpoints und führt Checkpoint-Löschung als letzten irreversiblen Cleanup-Schritt aus. Ein später Fehler beim Cleanup des displaced State muss sowohl das wiederhergestellte Project Brain als auch den gültigen Checkpoint bewahren.

## Kein Versprechen heuristischer Reparatur

Livariant verspricht nicht, beliebigen beschädigten, manuell umgeschriebenen oder mehrdeutigen Project-Brain-State automatisch zu reparieren. Diagnose darf bewusst stoppen und menschliche Klärung verlangen, wenn sichere Semantik nicht hergestellt werden kann.

## Local-first bedeutet nicht trust-free

Die Kernnutzung des Project Brain ist local-first und benötigt für normalen lokalen Betrieb keinen Cloud-Account. Release-/Update-Operationen benötigen weiterhin vertrauenswürdige Release-Evidenz sowie bereits vorhandene unabhängige machine-local Authority für das exakte ausführbare Artefakt.

Die aktuelle Runtime implementiert keine Livariant-Telemetrie, keinen automatischen Project-Brain-Upload und keinen automatischen Remote-Update-Check. Siehe `docs/de/privacy-and-network.md`.

## Öffentliche Distribution

Der vorgesehene öffentliche Preview-Distributionspfad sind GitHub Releases aus dem kanonischen Livariant-Repository mit erwarteter Source-Identität:

```text
github:Kryt3r/livariant
```

Release-Tooling erzeugt ein konkretes Runtime-Tarball, ein maschinenlesbares Manifest, das an den exakten Artefakt-SHA-256 gebunden ist, sowie `SHA256SUMS`. CI verifiziert das Bundle gegen einen sauberen Consumer.

Das Repository kann privat bleiben, bis das explizite Public-Visibility-Gate freigegeben wird. Öffentliche Dokumentation verlässt sich deshalb weder auf einen Package-Manager-Installationspfad noch auf Repository-Sichtbarkeit als Runtime-Sicherheitsannahme.

Das historische private Release `v0.1.0-rc.1` bleibt Validierungsevidenz aus der Pre-Fix-Baseline und darf nicht neu erstellt, überschrieben, neu getaggt oder als aktueller Candidate dargestellt werden. Die Repository-Package-Identität ist jetzt `0.1.0-rc.2`, aber das Erstellen eines Tags, GitHub Releases, npm-Publishings oder einer Visibility-Änderung erfordert eine separate explizite Release-Aktion und Freigabe.

## Lizenz, Sicherheit, Datenschutz, Beiträge und Support

Die Repository-seitige Preview-Baseline ist dokumentiert durch:

- PolyForm Perimeter License 1.0.1 in `LICENSE`;
- `THIRD_PARTY_NOTICES.md`;
- `SECURITY.md`;
- `CONTRIBUTING.md`;
- `docs/de/license-and-warranty.md`;
- `docs/de/privacy-and-network.md`;
- `docs/de/preview-support-and-stability.md`.

Livariant ist source-available und wird nicht als OSI-zertifiziertes Open Source angeboten.

Externe Code-Beiträge bleiben ausgesetzt, bis Contributor-Rechte finalisiert sind, die mit dem source-available und zukünftigen kommerziellen Lizenzmodell vereinbar sind.

Host-seitige Sicherheitsfunktionen, die für den aktuellen privaten Repository-Plan nicht verfügbar sind, sind Public-Gate-Punkte und keine Behauptung aktueller Abdeckung.

## Preview-Erwartungen

Public Preview bedeutet: Nutzer sollten eine bewusst begrenzte unterstützte Oberfläche, explizite bekannte Einschränkungen, mögliche Breaking Changes unter Preview-/SemVer-Kommunikationsregeln, keine stillschweigende Ausweitung von Autorität oder Projektmutationsumfang und evidenzgestützte unterstützte Pfade statt universeller Umgebungsversprechen erwarten.

Public-Preview-Support ist Maintainer-/Community-Support ohne kostenpflichtigen SLA, sofern nicht separat vereinbart. Der spätere 1.0-Stabilitäts-/Kompatibilitätsvertrag benötigt eine eigene spätere Readiness-Entscheidung.

## Verbleibende Public-Visibility-Gates

Bevor das Repository selbst öffentlich gemacht und die Preview breit angekündigt wird:

1. private RC-Vorbereitung und candidate-spezifische Verifikation für die aktuell akzeptierte Baseline abschließen;
2. explizite Freigabe erhalten, `Kryt3r/livariant` von private auf public zu stellen;
3. Host-Schutzmechanismen aktivieren und verifizieren, die am Public-Gate verfügbar werden, einschließlich Secret Scanning / Push Protection und CodeQL, soweit anwendbar;
4. Release-/Tag-Schutz und den vorgesehenen Immutable-Release-Ablauf verifizieren;
5. nur ein explizit freigegebenes manifestgebundenes Preview-Bundle aus dem exakten kanonischen Candidate veröffentlichen oder promoten;
6. veröffentlichte Artefakt-/Source-Identität und Checksummen verifizieren;
7. finalen Public-Release-Readiness-Review gegen den exakten veröffentlichten Candidate durchführen.
