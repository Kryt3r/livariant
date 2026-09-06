# Public-Preview-Support & Stabilität

<p align="center">
  <a href="../preview-support-and-stability.md">English</a> · <strong>Deutsch</strong>
</p>

Das aktuell veröffentlichte grafische Preview ist **Livariant Desktop `0.1.0-rc.28` für Windows x64**. Preview bedeutet, dass aktuelles unterstütztes Verhalten durch Engineering-/Release-Evidenz gestützt ist. Livariant befindet sich trotzdem noch in einer frühen Entwicklungsphase und besitzt noch keinen finalen Stable-/1.0-Kompatibilitätsvertrag.

Das historische CLI Public Preview `v0.1.0-rc.4` bleibt eine getrennte unveränderliche ältere Release-Oberfläche.

## Was unterstützte Preview-Pfade bewahren sollen

Auch vor Stable soll Livariant seine Safety-/Trust-Eigenschaften bewahren:

- projekt-eigener Zustand wird nicht still durch Provider-Ausgabe oder UI-State neu definiert;
- folgenreiche Mutation benötigt den unterstützten Authority-Pfad;
- Connection/Capability wird nicht zu Authority;
- mehrdeutiger, veralteter, substituierter oder fehlerhafter folgenreicher Trust-State schlägt geschlossen fehl;
- Update-Verfügbarkeit ist keine Installationsautorisierung;
- Release-/Update-Artefakte verwenden explizite Identity-/Integrity-Prüfungen;
- Migration/Recovery verwendet, wo relevant, explizite Compatibility-, Checkpoint-, Journal- und Operation-Domain-Grenzen;
- Verification Evidence wird nicht still zu akzeptierter Completion hochgestuft;
- historische Release-Evidenz wird nicht umgeschrieben, damit sie zu späterem Produktverhalten passt.

Preview bedeutet **nicht**, dass schwere Safety-Probleme akzeptabel wären. Ein bestätigter Datenverlustpfad, Authority-Bypass, Release-/Update-Trust-Bypass, Project-Truth-Korruptionspfad oder vergleichbarer Security-Fehler auf einem unterstützten Workflow ist ein Blocker-/Remediation-Thema und keine normale Preview-Einschränkung.

## Was sich vor Stable / 1.0 noch ändern kann

Preview-Releases können weiterhin ändern:

- Desktop-UI-Struktur und Interaktionsdetails;
- unterstützte Desktop-Plattformen;
- Provider-/Connection-Methoden;
- CLI-Details und Flags;
- Release-/Update-Metadatenverträge;
- Project-Brain-Schema über explizite unterstützte Migrationen;
- Adapter-/Connector-Fähigkeiten;
- Installations- und Distributionsmechanik;
- Performance-Eigenschaften und Budgets;
- Preview-Kompatibilitätsbereiche.

Änderungen müssen Preservation- und Authority-Grenzen trotzdem respektieren. „Preview“ ist keine Erlaubnis, alten Project-Brain-Zustand still neu zu interpretieren, eine erforderliche Migration zu umgehen oder Safety nur für Kompatibilität zu schwächen.

Nutzerrelevante Änderungen sollen in Release Notes zusammen mit erforderlichen Aktionen oder bekannten Einschränkungen beschrieben werden.

## Aktueller Desktop-Supportumfang

Aktuell veröffentlichtes Desktop Preview:

- Windows x64;
- Current-User-NSIS-Installation;
- gebündelte qualifizierte Runtime;
- Project Truth / First Steps Foundation Workspace;
- echte Codex-Verbindungsoberfläche;
- lokale Diagnostics-Evidence-Darstellung;
- signierter Desktop-Update-Discovery-/Install-Flow;
- Deutsch/English-Anwendungs-UI.

Der Project-Truth-Renderer ist noch kein fertiger persistenter Project-Brain-Editor; der normale Existing-Project-Adoption-Pfad wird ebenfalls noch fertiggestellt.

Ein künftiges Linux-/macOS-Desktop-Release benötigt getrennte Packaging-/Installations-Evidenz. Breitere Core-/CLI-Plattformunterstützung impliziert kein Desktop-Release.

## Aktueller Provider-Umfang

Livariant Core stellt provider-native MCP-Setup-Hinweise für Claude Code und Codex bereit. Der aktuelle Desktop besitzt den tiefer implementierten echten lokalen Verbindungspfad für Codex.

Livariant verspricht nicht, jedes Provider-Feature, jede Authentifizierungsmethode, jede Model-Selection-Option, jeden nativen Memory-/Instruction-Mechanismus oder zukünftiges MCP-Verhalten zu verwalten.

Zusätzliche Provider/Connection-Methoden sind zukünftige Fähigkeiten, solange sie nicht implementiert und qualifiziert wurden.

## Aktueller Migration-/Recovery-Umfang

Nur ausdrücklich implementierte und deklarierte Migration-/Recovery-Pfade sind unterstützt.

Generische Lifecycle-Mechanik bedeutet nicht, dass beliebige Schema-/Runtime-Transitions sicher sind. Folgenreiche Lifecycle-Operationen bleiben plan-first und, wo erforderlich, Authority-gebunden.

Ist Installations-/Projektzustand mehrdeutig, ist Diagnose/Recovery statt geratener Mutation das sichere Verhalten.

## Windows-Signing-/Reputation-Einschränkung

Der aktuelle Desktop-Preview-Installer besitzt exakte Release-Identität sowie Updater-Signing-/Integrity-Evidenz, aber noch **nicht** die finale produktive Authenticode-Publisher-Signierung/-Reputation.

Windows kann deshalb abhängig von Richtlinie/Reputation Publisher-/SmartScreen-Hinweise anzeigen. Diese Einschränkung muss sichtbar bleiben, bis produktives Signing/Reputation gelöst ist; sie darf nicht hinter einem generischen „Preview“-Label versteckt werden.

## Support erhalten

Public-Preview-Support erfolgt durch Maintainer/Community. Es gibt keinen bezahlten Response-Time-SLA, sofern nicht separat vereinbart.

Unter [SUPPORT.md](../../SUPPORT.md) findest du den richtigen Weg für Nutzungsfragen, Bugs, Dokumentationsprobleme, Feature-Ideen oder Security-Reporting.

Ein hilfreicher Desktop-Bugreport enthält normalerweise:

- Livariant-Desktop-Version und Release-/Tag-Identität;
- Windows-Version/-Architektur;
- betroffenen Bereich (Project Truth, Connections, Diagnostics, Updates, Settings, Installer, Startup);
- beobachtetes und erwartetes Verhalten;
- minimale Reproduktionsschritte;
- ob projekt-eigene Daten oder Connection-/Update-State betroffen waren.

Für Core-/CLI-Probleme zusätzlich relevante Core-/CLI-Version, Node.js-/Runtime-Informationen, Command/Workflow und gegebenenfalls Lifecycle-State angeben.

Vermutete Vulnerability-Details nicht in einem öffentlichen Issue veröffentlichen. Siehe [SECURITY.md](../../SECURITY.md).

## Was jedes Preview-Release kommunizieren soll

Ein öffentliches Preview-Release soll mindestens nennen:

- genaue Produktoberfläche/Version und Plattform;
- exakte Source-/Release-Identität;
- Installationsartefakt und relevante Verifikationsdaten;
- bekannte Probleme und Einschränkungen;
- wesentliche nutzerrelevante Änderungen;
- erforderliche Aktionen, wo relevant;
- Compatibility-/Migration-/Recovery-Hinweise, wenn relevant.

Desktop und Core/CLI sind unabhängig versionierte Produktoberflächen; Release Notes dürfen nicht suggerieren, gleiche oder unterschiedliche RC-Nummern würden ihre Trust-Rollen verändern.

## Deprecation

Preview-Funktionen können geändert oder entfernt werden, wenn sie Livariants Safety-, Wartbarkeits- oder Produktqualitätsniveau nicht erfüllen können.

Wird ein unterstützter Pfad zurückgezogen, soll das ausdrücklich dokumentiert werden, statt einen defekten Pfad nominell unterstützt zu lassen.

## Stable / 1.0 ist eine eigene Entscheidung

Ein erfolgreiches Preview definiert nicht automatisch das spätere Stable-/1.0-Kompatibilitätsversprechen.

Vor Stable/1.0 muss eine eigene Readiness-Entscheidung die langfristigen Plattform-, Compatibility-, Support-, Migration-, Distribution-Signing- und Release-Maintenance-Zusagen definieren.
