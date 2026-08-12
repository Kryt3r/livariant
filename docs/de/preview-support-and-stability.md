# Public-Preview-Support & Stabilität

Livariant `0.1.0-rc.2` ist ein Preview-Kandidat. Preview bedeutet, dass unterstütztes Verhalten durch Evidenz abgesichert ist. Es bedeutet noch keinen endgültigen 1.0-Kompatibilitäts-Freeze.

## Worauf du dich bei unterstützten Pfaden verlassen können sollst

Für unterstützte Preview-Abläufe gelten weiterhin diese Eigenschaften:

- projekt-eigener Zustand wird nicht stillschweigend überschrieben;
- projektverändernde Aktionen brauchen explizite Autorität;
- Release-Artefakte und installierte Runtime werden auf Integrität geprüft;
- Schema-Migrationen verwenden deklarierte Kompatibilitäts- und Checkpoint-Regeln;
- unterbrochener oder mehrdeutiger Lifecycle-Zustand führt zu Diagnose und Recovery statt zu geratenen Reparaturen;
- unterstützter Provider-Resume-Handoff rekonstruiert Project-Brain-Kontext, ohne verstecktes Provider-Memory zu benötigen.

Preview bedeutet nicht, dass schwere Sicherheits- oder Datenprobleme akzeptabel wären. Ein bekannter Datenverlustpfad, Authority-Bypass, Migrationsintegritätsfehler oder Release-Trust-Bypass auf einem unterstützten Ablauf ist ein Release-Blocker und keine normale Preview-Einschränkung.

## Was sich vor 1.0 noch ändern kann

Vor einem stabilen 1.0-Vertrag kann Livariant noch folgende Dinge ändern:

- CLI-Details und Flags;
- Felder des Release-Manifests;
- Adapter-Fähigkeiten;
- das Project-Brain-Schema über explizit unterstützte Migrationen;
- interne Framework-Struktur;
- Preview-Kompatibilitätsbereiche;
- Installations- und Distributionsmechanik.

Auch Breaking Changes müssen die Projektbewahrung respektieren. "Preview" ist keine Erlaubnis, alten Project-Brain-Zustand stillschweigend neu zu interpretieren oder eine notwendige Migration zu überspringen.

Nutzerrelevante Änderungen sollten in Release Notes zusammen mit Migrationshinweisen und erforderlichen Aktionen erklärt werden.

## Aktueller Provider-Umfang

Die aktuelle Supportaussage für Claude Code und Codex ist auf Project-Brain-Resume-Handoff begrenzt.

Livariant verspricht nicht, jede Provider-Funktion, Authentifizierungsmethode, Tool-Ausführung, Modelloption oder native Instruktionsdatei zu verwalten.

## Aktueller Migrationsumfang

Nur ausdrücklich deklarierte Migrationspfade werden unterstützt.

Die aktuelle ausführbare Baseline belegt Project-Brain-Schema `1 -> 2`. Die Existenz einer Migrationsengine bedeutet nicht, dass Livariant beliebige Schema-Versionen sicher ineinander überführen kann.

## Support erhalten

Die Public Preview wird durch Maintainer und Community unterstützt. Es gibt keinen bezahlten SLA, sofern nichts anderes separat vereinbart wurde.

Unter [SUPPORT.md](../../SUPPORT.md) findest du den richtigen Weg für Nutzungsfragen, Bugs, Dokumentationsprobleme, Ideen und Sicherheitsmeldungen.

Ein guter Bugreport enthält normalerweise:

- Livariant-Version und Channel;
- Betriebssystem;
- Node.js-Version;
- betroffenen Befehl oder Workflow;
- beobachteten Lifecycle-Zustand;
- minimale Reproduktionsschritte;
- die Information, ob projekt-eigene Daten betroffen waren.

Vermutete Sicherheitslücken gehören nicht in ein öffentliches Issue. Folge [SECURITY.md](../../SECURITY.md).

## Was jedes Preview-Release mitteilen sollte

Ein öffentliches Preview-Release sollte mindestens nennen:

- Livariant-Version und Channel;
- Project-Brain-Schema-Kompatibilität;
- ob eine Migration erforderlich ist;
- unterstützten Source-Version-Bereich;
- bekannte Probleme und Einschränkungen;
- erforderliche Nutzeraktionen;
- Recovery-Hinweise für schema-ändernde Releases.

## Veraltete oder zurückgezogene Funktionen

Preview-Funktionen können geändert oder entfernt werden, wenn sie den Sicherheits- oder Wartungsanspruch von Livariant nicht erfüllen.

Wird ein unterstützter Pfad zurückgezogen, sollte das klar kommuniziert werden, statt einen kaputten Ablauf weiterhin nominell als unterstützt zu führen.

## 1.0 ist eine eigene Stabilitätsentscheidung

Eine erfolgreiche Public Preview definiert nicht automatisch das spätere 1.0-Kompatibilitätsversprechen.

Vor 1.0 muss ein eigener Stable-Release-Readiness-Review die langfristige Kompatibilitäts- und Support-Policy festlegen.
