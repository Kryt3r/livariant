# Livariant Fünf-Minuten-Schnellstart

<p align="center">
  <a href="../quickstart.md">English</a> · <strong>Deutsch</strong>
</p>

Dieser Schnellstart beschreibt die **aktuelle `v0.1.0-rc.4`-Public-Preview-Nutzung**. Zum Zeitpunkt der Veröffentlichung entspricht der kanonische `main` dem exakt qualifizierten RC4-Quellstand.

Die kürzeste Erklärung von Livariant lautet:

> Du arbeitest mit deinem Coding-Agenten. Livariant stellt lokal eine Reliability-/Governance-Schicht bereit, die der Agent über MCP nutzen kann, während folgenschwere Project Truth und Authority explizit bleiben.

## 1. Livariant installieren

Livariant wird einmal als lokales CLI-Tool installiert. Für die normale lokale Nutzung muss es nicht als Abhängigkeit in die `package.json` deiner Anwendung eingetragen werden.

Für das aktuell veröffentlichte Public Preview installierst du den geprüften `v0.1.0-rc.4`-Tarball aus dem kanonischen GitHub Release:

```bash
npm install --global --ignore-scripts ./livariant-0.1.0-rc.4.tgz
livariant version
```

Der SHA-256 des qualifizierten RC4-Tarballs lautet:

```text
6a8a287e55344e22c97c543cb4a9e071d27d9e18c5ff585cab8235aaa37dce8e
```

Für SHA-256-Prüfung, Windows-Hinweise, PATH-Hilfe und Release-/Source-Grenzen siehe [Installation & erstes Projekt](installation.md).

## 2. Projekt öffnen und First Run starten

Im Projekt-Hauptordner:

```bash
livariant first-run
```

`first-run` ist der geführte Public-Preview-Einstieg. Er kombiniert bestehende read-only Fähigkeiten und fragt zuerst nach deiner bevorzugten Interaktionssprache.

First Run kann unter anderem sichtbar machen:

- aktuellen Projektzustand und Discovery-Evidenz;
- ob bereits ein Project Brain existiert;
- die Wahl eines Autonomy Profiles;
- optionale externe Wissens-Evidenz;
- Guided Project Understanding Review;
- die nächsten expliziten Setup-Schritte für Claude Code oder Codex.

First Run endet mit `Changes made: 0`. Er initialisiert das Projekt **nicht** stillschweigend, übernimmt keine Evidenz automatisch, konfiguriert deinen Coding-Agenten nicht selbst und vergibt keine Authority.

Für deterministische Nutzung kannst du die Sprache explizit angeben:

```bash
livariant first-run --language Deutsch
```

Mehr dazu unter [First-Run Composition](first-run.md).

## 3. Bei Bedarf bewusst initialisieren

Wenn First Run meldet, dass eine Project-Brain-Initialisierung sinnvoll ist, prüfst du zuerst den Plan:

```bash
livariant init
```

Erst nach Prüfung gehst du über den unterstützten expliziten Autorisierungspfad weiter. First Run selbst macht aus dem Plan niemals automatisch eine Änderung.

Das Project Brain ist Livariants projekt-eigener dauerhafter Zustand:

```text
.project-brain/
  project.md
  goals.md
  decisions.md
  knowledge.md
  metadata.json
```

Livariant hält Evidenz, Inferenz, Project Truth, Autorisierung und Mutation getrennt. Ein Coding-Agent kann etwas nicht allein dadurch kanonisch machen, dass er es behauptet.

## 4. Coding-Agent über MCP verbinden

RC4 enthält eine lokale MCP-Agent-Bridge. Provider-Setup bleibt explizit; Livariant schreibt Provider-Konfiguration nicht stillschweigend um.

Für Claude Code:

```bash
livariant mcp setup --provider claude-code
```

Für Codex:

```bash
livariant mcp setup --provider codex
```

Der Befehl erzeugt provider-spezifische Setup-Hinweise. Er führt selbst **null Provider-Konfigurationsänderungen** aus.

Nachdem du den normalen MCP-Registrierungsschritt des Providers angewendet hast, kann der Coding-Agent Livariants MCP-Tools und Server-Instructions direkt erkennen.

Aktuelle begrenzte MCP-Tools sind:

- `livariant_provider_context`: begrenzten Projektkontext für eine explizite Aufgabe liefern;
- `livariant_provider_return`: Provider-Ausgabe als nicht vertrauenswürdige Evidenz/Kandidatenmaterial zurückgeben;
- `livariant_verification_trace`: explizite Anforderungen oder Acceptance Criteria gegen bereitgestellte Verification Evidence bewerten.

## 5. Danach normal mit dem Agenten arbeiten

Nach dem Setup musst du **nicht** in jeden Prompt Livariant-Commands schreiben.

Eine normale Interaktion kann einfach so aussehen:

```text
Du:
"Implementiere E-Mail-Login und Rate Limiting. Prüfe am Ende, ob die angeforderten Ergebnisse wirklich verifiziert sind."

Coding-Agent
    -> nutzt bei Bedarf verfügbare Livariant-MCP-Tools
    -> arbeitet am Projekt
    -> kann livariant_verification_trace aufrufen
    -> erhält supported / contradicted / unproven
    -> gibt das Ergebnis im normalen Gespräch zurück
```

Die CLI bleibt für direkte Inspektion, Diagnose, Setup, explizite Kontrolle und providerunabhängige Abläufe verfügbar. Sie soll den Nutzer bei verbundenem MCP-Agenten aber nicht in einen command-lastigen Alltag zwingen.

## 6. Den zentralen Reliability-Moment sehen

`livariant_verification_trace` bewertet einen expliziten Version-1-Trace aus Anforderungen oder Acceptance Criteria, Implementierungsclaims und Verification Evidence.

Konzeptionell:

```text
angefordertes Ergebnis
      +
Implementierungsclaim
      +
Verification Evidence
      ↓
Livariant
      ↓
SUPPORTED / CONTRADICTED / UNPROVEN
```

Beispiel:

```text
E-Mail-Login ......... SUPPORTED
Passwort-Reset ....... UNPROVEN
Rate Limiting ........ CONTRADICTED
```

Das ist absichtlich strenger als ein Agent, der nur "fertig" sagt.

Die Grenzen bleiben:

```text
supported != DONE
Verification Evidence != akzeptierte Completion
Evidence != Project Truth
MCP-Transport != unabhängiges Vertrauen
Capability != Authority
```

Livariant entdeckt aktuell **nicht** automatisch jede Anforderung, erzeugt nicht automatisch vertrauenswürdige Evidenz, beweist nicht universell, ob jeder Agentenclaim wahr oder falsch ist, und verifiziert beliebigen Code nicht ohne explizites Trace-/Evidenzmaterial.

Die exakte Semantik und der CLI-Fallback stehen unter [Verification Trace](verification-trace.md).

## 7. Wiederholte Nutzung

Ein normaler wiederholter Ablauf kann so aussehen:

```text
Projekt öffnen
-> Coding-Agent verbindet sich über MCP mit Livariant
-> Agent holt bei Bedarf begrenzten aktuellen Kontext
-> du arbeitest normal in natürlicher Sprache
-> explizite Evidenz kann über Verification Trace bewertet werden
-> folgenschwere dauerhafte Änderungen respektieren weiter Review-/Authority-Grenzen
-> spätere Sessions rekonstruieren projekt-eigenen Zustand statt altem Chat-Memory zu vertrauen
```

Direkte CLI-Oberflächen bleiben bei Bedarf verfügbar:

```bash
livariant status
livariant doctor
livariant context
livariant resume
livariant autonomy show --json
```

## Veröffentlichtes RC4 und Repository-`main`

`v0.1.0-rc.4` ist das aktuell veröffentlichte Public-Preview-Prerelease. Es enthält First Run Composition, MCP-Bridge, Verification Trace, geschützte Guardian-origin Authority für folgenschwere Consumer, External-Knowledge-Grundlagen und zusätzliche Active-Project-Intelligence-Fähigkeiten.

`v0.1.0-rc.3` bleibt unveränderliche historische Foundation-Preview-Evidenz; spätere Fähigkeiten wurden diesem Artefakt nicht rückwirkend hinzugefügt.

Zum Zeitpunkt der RC4-Veröffentlichung entspricht der kanonische `main` dem exakt qualifizierten RC4-Quellstand. Künftige Repository-Entwicklung kann wieder vorauslaufen, daher ist Repository-Existenz weiterhin **keine** Veröffentlichung.

## Danach lesen

- [Installation & erstes Projekt](installation.md)
- [First-Run Composition](first-run.md)
- [Verification Trace](verification-trace.md)
- [Bestehende Projekte](existing-projects.md)
- [Provider-Handoff](provider-handoff.md)
- [Architektur & Sicherheit](architecture-and-safety.md)
- [Updates, Migrationen & Wiederherstellung](lifecycle-guide.md)
