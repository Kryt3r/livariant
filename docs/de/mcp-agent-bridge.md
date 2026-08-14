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

WP-012 zielt auf die stabile MCP-Protokollrevision `2025-11-25` über lokales stdio.

## Verfügbare Tools

In dieser Foundation werden genau zwei Tools bereitgestellt.

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

Eine andernorts bereits vorhandene passende proposal-bound Authorization wird von dieser Bridge weder gesucht noch konsumiert. Ein über MCP zurückgegebener Candidate kann deshalb in WP-012 keine kanonische semantische Mutation ausführen.

Für eine autorisierte semantische Mutation bleibt der separate bestehende lokale Authorization-/Semantic-Apply-Workflow außerhalb dieser MCP-Foundation zuständig.

## Transportgrenze

WP-012 ist ausschließlich lokales stdio.

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

WP-012 führt keine MCP-Tasks, Prompts, Resources, Sampling, HTTP-Authorization, Server-zu-Client-Requests oder Remote-Transporte ein.

## Release-Grenze

Diese Fähigkeit ist Repository-Entwicklung nach der unveränderlichen Foundation Preview `v0.1.0-rc.3`.

RC3 enthält die MCP-Agent-Bridge nicht. Ein späterer Release benötigt eine separate ausdrückliche Release-Freigabe.
