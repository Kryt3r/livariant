# Provider-Handoff

<p align="center">
  <a href="../provider-handoff.md">English</a> · <strong>Deutsch</strong>
</p>

Livariants aktuelle Provider-Integration ist breiter als die ursprüngliche Resume-only-Preview-Oberfläche. Core enthält inzwischen Project-Brain-Resume, begrenzten Provider Context/Return Evidence Flow, lokale MCP-Integration und Verification Trace. Der Desktop besitzt zusätzlich einen getrennten echten lokalen Codex-Verbindungspfad.

Alle diese Oberflächen teilen eine Regel:

```text
Provider != Connection Method != Capability != Role != Authority
```

## Project Brain bleibt die Quelle der Kontinuität

Livariant kopiert kein verborgenes Provider-Memory von einem Agenten zum anderen.

Provider-seitiger Kontext wird stattdessen aus aktuellem projekt-eigenem Zustand neu aufgebaut:

```text
Project Brain
-> begrenzter aktueller Kontext
   -> Claude-Code-Projektion / MCP-Kontext
   -> Codex-Projektion / MCP-Kontext / Desktop-Verbindung
```

Formatierung darf sich je Provider unterscheiden, während die zugrunde liegende Projektbedeutung an dieselbe aktuelle Project-Brain-Baseline gebunden bleibt.

Provider-lokales Memory, `CLAUDE.md`, `AGENTS.md` und Agentenausgabe können nützliche Evidenz oder Instruktionen sein, ersetzen aber nicht allein deshalb kanonische Project-Brain-Truth, weil ein Provider sie verwendet.

## Resume-Handoff

Die explizite Resume-Oberfläche bleibt für Claude Code und Codex verfügbar.

Beispiele:

```bash
LIVARIANT_PROVIDER_ENV=claude-code livariant resume --provider claude-code
LIVARIANT_PROVIDER_ENV=codex livariant resume --provider codex
```

Unter Windows PowerShell:

```powershell
$env:LIVARIANT_PROVIDER_ENV = "codex"
livariant resume --provider codex
```

Ein provider-spezifischer Resume-Pfad benötigt passende Umgebungsevidenz. Provider-Auswahl belegt die Anwendbarkeit dieser Capability und keine Mutation Authority.

## Provider Context und Return

Der aktuelle Core kann begrenzten aufgabenspezifischen Provider Context aufbauen und später genau einen korrelierten Provider Return verarbeiten.

Der Return bleibt externe nicht vertrauenswürdige Evidenz. Passender Provider, Packet, Projektidentität, Baseline und Task-Werte stellen Korrelation her, aber kein Approval und keine Project Truth.

Mögliche Ergebnisse umfassen je nach Evidenz Review-required, Authorization-required, stale/mismatched context, no candidate oder blocked.

## MCP-Handoff

Die lokale stdio-MCP-Bridge stellt aktuell bereit:

- `livariant_provider_context`
- `livariant_provider_return`
- `livariant_verification_trace`

MCP transportiert Kontext/Evidenz. Es erzeugt oder konsumiert keine kanonische Mutation Authority allein deshalb, weil ein Agent ein Tool aufgerufen hat.

Siehe [Lokale MCP-Agent-Bridge](mcp-agent-bridge.md).

## Desktop-Codex-Verbindung

Der Desktop besitzt einen getrennten echten lokalen Codex-Verbindungspfad über die begrenzte Connector-Host-/App-Server-Integration.

Die Verbindung kann akzeptierte Connection Intent persistieren und bei einem späteren App-Start unter den vom Host implementierten Executable-Identity-/Trust-Prüfungen wiederherstellen.

Eine erfolgreiche Verbindung vergibt weiterhin keine Mutation Authority und macht Provider-Ausgabe nicht zu Project Truth.

Zusätzliche Desktop-Provider/-Connection-Methoden bleiben geplante Erweiterungen, solange sie nicht separat implementiert und qualifiziert wurden.

## Dauerhafte semantische Änderung

Ältere Dokumentation zeigte direkte Semantic-Writer-Commands mit einem nackten `--apply`, als wäre das die vollständige heutige Authority-Geschichte. Für geschützte folgenreiche Semantic Mutation ist das nicht mehr das richtige Modell.

Der aktuelle kanonische Pfad ist Proposal-/Authority-gebunden. Semantic Apply konsumiert den exakt autorisierten Actionable Proposal:

```text
livariant apply --authorization <authorization-id> --input <actionable-proposal.json>
```

Unterstützte Semantic Operations bleiben auf die implementierten Project-Brain-Domains begrenzt. Provider-Ausgabe, MCP-Kontext, passender Text oder frühere Chat-Zustimmung können die erforderliche geschützte Authority nicht herstellen.

Siehe [Semantic Apply](semantic-apply.md) und [Semantic Maintenance](semantic-maintenance.md).

## Veralteter Provider-Kontext

Provider Context ist temporäre Evidenz/Projektion. Ändert sich die Project-Brain-Baseline, kann alter Kontext veraltete Entscheidungen oder Fakten nicht still wieder zu kanonischer Truth machen.

Aktuelle Provider-Return-/Semantic-Flows prüfen relevante Projektidentität/Baseline/Material vor folgenreicher Nutzung erneut. Veralteter oder nicht passender Kontext verengt/blockiert den Pfad statt durch Presence vertraut zu werden.

## Was Livariant nicht behauptet

Livariant behauptet derzeit nicht:

- verborgenes Provider-Memory zu synchronisieren;
- jedes Claude-Code- oder Codex-Feature zu verwalten;
- Provider-Authentifizierung/-Model-Selection zu kontrollieren;
- Provider-Ausgabe direkt zu Project Truth zu machen;
- einem Provider zu erlauben, sich selbst Mutation Authority zu geben;
- hosted Remote MCP anzubieten;
- jeden Provider im Desktop zu unterstützen.

Das Projekt besitzt die Kontinuität. Provider erhalten begrenzten Arbeitskontext darum herum.
