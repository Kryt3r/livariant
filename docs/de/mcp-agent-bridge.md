# Lokale MCP-Agent-Bridge

Status: Repository-Entwicklung nach RC3

Livariant stellt eine begrenzte lokale MCP-kompatible stdio-Bridge für kompatible Coding-Agents bereit.

Die Bridge ist ausschließlich ein Adapter über bestehende Active-Project-Intelligence-Primitiven. Sie ist kein zweiter Project Brain, keine zweite Proposal-Engine, kein Authorization-Store, kein Recovery-Mechanismus und kein semantischer Writer.

## Bridge starten

Im Livariant-Projektverzeichnis:

```text
livariant mcp
```

Der Prozess kommuniziert ausschließlich über MCP-JSON-RPC-Nachrichten auf Standard-Ein-/Ausgabe. Diagnosefehler werden auf Standardfehler ausgegeben.

Die Bridge zielt auf die MCP-Protokollrevision `2025-11-25` über lokales stdio.

## Nativer Setup-Helfer

WP-013 ergänzt eine ausschließlich lesende Setup-Ausgabe für die aktuell unterstützten lokalen MCP-Pfade:

```text
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
livariant mcp setup --provider <claude-code|codex> --json
```

Der Setup-Helfer **führt weder Claude Code noch Codex aus und schreibt keine Provider-Konfiguration**. Er gibt nur providerspezifische native Befehle bzw. Konfigurationsmaterial aus, das der Nutzer selbst prüfen und anwenden kann.

### Claude Code

Der ausgegebene native lokale stdio-Registrierungsbefehl lautet:

```text
claude mcp add --transport stdio --scope local livariant -- livariant mcp
```

Er sollte im Livariant-Projektverzeichnis ausgeführt werden. Prüfen lässt sich die Registrierung mit:

```text
claude mcp get livariant
claude mcp list
```

Claude Code bleibt Eigentümer seiner MCP-Konfiguration und seines Freigabeverhaltens.

### Codex

Der ausgegebene native CLI-Registrierungsbefehl lautet:

```text
codex mcp add livariant -- livariant mcp
```

Prüfen lässt sich die Registrierung mit:

```text
codex mcp list
```

Für ein ausdrücklich projektgebundenes Codex-Setup gibt der Helfer zusätzlich einen `.codex/config.toml`-Abschnitt aus. Dieser verwendet das aktuelle Projektverzeichnis als `cwd` und erlaubt exakt die beiden Livariant-MCP-Tools. Livariant schreibt diese Datei nicht selbst.

Codex CLI, die Codex-IDE-Erweiterung und unterstützte Desktop-Clients teilen sich die Codex-MCP-Konfiguration entsprechend dem aktuellen Provider-Modell.

Die Provider-Setup-Syntax wurde am 16.08.2026 gegen die aktuelle Herstellerdokumentation geprüft. Provider-Konfigurationssyntax ist externe Kompatibilität und kann sich unabhängig von Livariant ändern.

## Agent-Workflow-Anweisungen

Die MCP-Initialize-Antwort erklärt kompatiblen Agents nun den begrenzten Ablauf:

```text
Livariant Provider Context für genau eine explizite Aufgabe anfordern
-> mit der zurückgegebenen begrenzten Projektion arbeiten
-> den bereitgestellten Kontext plus genau einen unterstützten typisierten dauerhaften Änderungskandidaten oder keinen Kandidaten zurückgeben
-> bei Review / Authorization-required / Blocked / No-candidate stoppen
```

Die Anweisungen stellen ausdrücklich klar, dass MCP keine proposal-bound Authorization erzeugen, entdecken, auswählen oder konsumieren und keine kanonische semantische Mutation durchführen kann.

## Verfügbare Tools

Es werden weiterhin exakt zwei Tools bereitgestellt.

### `livariant_provider_context`

Eingabe:

```json
{
  "provider": "codex",
  "task": "Prüfe das aktuelle Projekt und melde bei Bedarf genau einen dauerhaften Änderungskandidaten"
}
```

Unterstützte Provider bleiben die bereits durch Provider Context unterstützten Ziele:

- `codex`
- `claude-code`

Das Tool delegiert direkt an `buildProviderContext()`.

Es rekonstruiert den aktuellen lokalen Project-Brain-Kontext und gibt das bestehende begrenzte Provider-Context-Paket zurück. Es erzeugt keine Mutation Authority und verändert den Project Brain nicht.

### `livariant_provider_return`

Eingabe:

```json
{
  "context": { "...": "das bereitgestellte ready Provider-Context-Paket" },
  "providerReturn": { "...": "genau ein Provider-Return-Paket im bestehenden Schema" }
}
```

Das Tool delegiert direkt an `processProviderReturn()` ohne Authorization-Selector.

Der bereitgestellte Kontext und das Return-Paket bleiben externe, nicht vertrauenswürdige Evidenz. Provider, Packet-ID, Stable Project Identity, Baseline und Task-Werte sind ausschließlich Korrelationsmaterial; sie beweisen weder frühere Ausgabe noch Zustimmung, vertrauenswürdige aktuelle Wahrheit oder Mutation Authority.

Mögliche Ergebnisse bleiben die bestehenden Provider-Return-/Maintenance-Zustände, unter anderem:

- `no-candidate`
- `stale-context`
- `mismatched-context`
- `candidate-received` mit Review-/Authorization-required-Maintenance-Zustand
- `blocked`

## Authority-Grenze

Die MCP-Oberfläche akzeptiert **nicht**:

- `authorization`
- `authorizationId`
- Approval-Flags
- Mutation Permission
- providerspezifische Schreibrechte

Unbekannte oder zusätzliche MCP-Toolargumente schlagen fail-closed fehl.

Eine andernorts bereits vorhandene passende proposal-bound Authorization wird von dieser Bridge weder gesucht noch konsumiert. Ein über MCP zurückgegebener Candidate kann deshalb keine kanonische semantische Mutation ausführen.

Für eine autorisierte semantische Mutation bleibt der separate bestehende lokale Authorization-/Semantic-Apply-Workflow außerhalb dieser MCP-Oberfläche zuständig.

## Transportgrenze

Die Bridge ist ausschließlich lokales stdio.

Nicht enthalten sind:

- HTTP- oder TCP-Listener
- Remote-MCP-Hosting
- Cloud-Synchronisierung
- automatische Provider-Prozesssteuerung
- automatischer Projekt-Upload
- Webhooks
- Provider-Account-/Session-Authentifizierung

Der normale Livariant Core und die CLI bleiben ohne MCP nutzbar.

## Eingabegrenzen

Jede stdio-JSON-RPC-Nachricht ist UTF-8 und newline-delimited und wird bereits vor dem JSON-Parsing durch eine begrenzte Nachrichtengröße geschützt.

Provider-Context-Taskmaterial sowie Provider-Return-/Context-Copy-Daten werden nach dem Transport weiterhin durch ihre bestehenden Core-Grenzen validiert.

Zu große, fehlerhafte, partielle sowie unbekannte Methoden-/Tool-Eingaben schlagen fail-closed fehl.

## MCP-Lifecycle

Die Bridge implementiert den für die aktuelle Tool-Oberfläche erforderlichen begrenzten Lifecycle:

```text
initialize
-> notifications/initialized
-> tools/list / tools/call
```

`ping` wird ebenfalls unterstützt.

Es werden keine MCP-Tasks, Prompts, Resources, Sampling, HTTP-Authorization, Server-zu-Client-Requests oder Remote-Transporte eingeführt.

## Release-Grenze

Diese Fähigkeit ist Repository-Entwicklung nach der unveränderlichen Foundation Preview `v0.1.0-rc.3`.

RC3 enthält weder die MCP-Agent-Bridge noch die native WP-013-Setup-UX. Ein späterer Release benötigt eine separate ausdrückliche Release-Freigabe.
