# Public-Preview-Support & Stabilität

Die Livariant Public Preview ist eine evidenzgestützte Preview, kein Versprechen eines API- oder Verhaltens-Freeze.

## Was Preview bedeutet

Von unterstützten Preview-Pfaden wird erwartet, dass sie die geschützten Eigenschaften des Frameworks bewahren:

- projekt-eigener Zustand wird nicht stillschweigend überschrieben;
- Mutationsautorität bleibt explizit;
- Release- und installierte Runtime-Integrität werden auf unterstützten Pfaden verifiziert;
- Migrationen verwenden deklarierte Kompatibilitäts- und Checkpoint-Semantik;
- mehrdeutiger unterbrochener Zustand wird auf Diagnose/Recovery eingeschränkt statt geraten repariert;
- unterstützter Provider-Resume-Handoff rekonstruiert kanonischen Project-Brain-State, ohne verstecktes Provider-Memory zu benötigen.

Eine Preview-Einschränkung kann existieren, wenn sie explizit und begrenzt ist. Ein bekannter Datenverlust-, Autoritätseskalations-, Migrationsintegritäts- oder Release-Trust-Bypass auf einem unterstützten Pfad ist keine akzeptable Preview-Einschränkung.

## Stabilitätserwartungen

Vor einem stabilen 1.0-Vertrag kann Livariant Folgendes ändern:

- CLI-Details und Flags;
- Felder des Release-Manifests;
- Adapter-Capabilities;
- das Project-Brain-Schema über explizit unterstützte Migrationen;
- interne Framework-Struktur;
- Preview-Kompatibilitätsbereiche;
- Installations-/Distributionsmechanik.

Solche Änderungen sollten sich in Release Notes sowie Migrations- und Required-Action-Informationen widerspiegeln. Eine Breaking Change ist keine Erlaubnis, Projektbewahrung zu umgehen oder alten kanonischen Zustand stillschweigend neu zu interpretieren.

## Unterstützter Provider-Umfang

Die erste Preview-Supportzusage für Claude Code und Codex ist bewusst auf Project-Brain-Resume-Handoff begrenzt. Sie garantiert nicht, dass jede Provider-Funktion, Authentifizierungsmethode, Tool-Ausführung, Modelloption oder jeder native Instruktionsmechanismus von Livariant verwaltet wird.

## Migrationsumfang

Nur explizit deklarierte Migrationspfade werden unterstützt. Die aktuelle ausführbare Baseline belegt Project-Brain-Schema `1 → 2`; die Existenz der Migrationsengine impliziert keine beliebigen Schema-zu-Schema-Migrationen.

## Supportmodell

Die Public Preview wird durch Community/Maintainer unterstützt und enthält keinen kostenpflichtigen SLA, sofern keine separate Vereinbarung etwas anderes festlegt.

Gute Bugreports sollten Version/Channel, Betriebssystem, Node.js-Version, Befehl, beobachteten Lifecycle-State, minimale Reproduktion und die Information enthalten, ob projekt-eigene Daten betroffen waren.

Sicherheitsrelevante Meldungen folgen `SECURITY.md` und sollten nicht zuerst über ein öffentliches Issue offengelegt werden.

## Kommunikation zur Kompatibilität

Jedes öffentliche Preview-Release sollte mindestens kommunizieren:

- Livariant-Version und Channel;
- Project-Brain-Schema-Kompatibilität;
- ob eine Migration erforderlich ist;
- unterstützten Source-Version-Bereich;
- bekannte Probleme/Einschränkungen;
- erforderliche Nutzeraktionen;
- Recovery-Hinweise für Schema-ändernde Releases.

## Deprecation

Preview-Funktionen können deprecated oder entfernt werden, wenn sie den Sicherheits- oder Wartungsanspruch des Frameworks nicht erfüllen können. Eine Entfernung sollte explizit erfolgen, statt einen kaputten Pfad nominell unterstützt zu lassen.

## Grenze zum stabilen Release

Erfolg der Public Preview definiert nicht automatisch das spätere 1.0-Kompatibilitätsversprechen. Vor 1.0 muss ein separater Stable-Release-Readiness-Review die langfristigere Kompatibilitäts- und Support-Policy festlegen.
