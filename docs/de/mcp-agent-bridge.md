# Lokale MCP-Agent-Bridge

<p align="center">
  <a href="../mcp-agent-bridge.md">English</a> · <strong>Deutsch</strong>
</p>

Livariant stellt eine begrenzte lokale MCP-kompatible stdio-Bridge für kompatible Coding-Agents bereit.

Die Bridge ist ein Adapter über bestehende Livariant-Core-Fähigkeiten. Sie ist kein zweiter Project Brain, keine Proposal Engine, kein Authorization Store, kein Recovery-Mechanismus und kein semantischer Writer.

## Bridge starten

Im Projektverzeichnis:

```text
livariant mcp
```

Der Prozess kommuniziert über MCP JSON-RPC auf Standard-Ein-/Ausgabe. Diagnosefehler werden auf Standardfehler ausgegeben.

Die aktuelle Bridge zielt auf die MCP-Protokollrevision `2025-11-25` über lokales stdio.

## Provider-Setup-Helfer

Aktuelle Setup-Hinweise existieren für Claude Code und Codex:

```text
livariant mcp setup --provider claude-code
livariant mcp setup --provider codex
livariant mcp setup --provider <claude-code|codex> --json
```

Der Helfer führt den Provider **nicht** aus und schreibt keine Provider-Konfiguration. Er gibt provider-native Commands/Konfigurationsmaterial zur Prüfung und Anwendung durch den Nutzer aus.

### Claude Code

Der ausgegebene lokale stdio-Registrierungsbefehl lautet:

```text
claude mcp add --transport stdio --scope local livariant -- livariant mcp
```

Claude Code bleibt Eigentümer seiner MCP-Konfiguration und seines Approval-Verhaltens.

### Codex

Der ausgegebene native CLI-Registrierungsbefehl lautet:

```text
codex mcp add livariant -- livariant mcp
```

Für projektgebundenes Codex-Setup kann der Helfer zusätzlich einen `.codex/config.toml`-Abschnitt mit dem aktuellen Projektverzeichnis als `cwd` ausgeben. Die aktuelle Allow-List enthält die drei unten dokumentierten Livariant-MCP-Tools. Livariant schreibt diese Datei nicht selbst.

Provider-Konfigurationssyntax ist externe Kompatibilität und kann sich unabhängig von Livariant ändern. Provider-native Command-Beispiele müssen deshalb bei Provider-Änderungen erneut verifiziert werden.

## Aktuelle MCP-Tools

Der aktuelle Server stellt **drei** begrenzte Tools bereit:

- `livariant_provider_context`
- `livariant_provider_return`
- `livariant_verification_trace`

Keines davon kann Mutation Authority erzeugen oder konsumieren.

### `livariant_provider_context`

Dieses Tool baut begrenzten Provider-Kontext für genau eine explizite Aufgabe und ein unterstütztes Provider-Ziel.

Unterstützte Provider-Identifier sind unter anderem:

- `codex`
- `claude-code`

Der zurückgegebene Kontext ist eine Projektion aktuellen lokalen Projektzustands für die Aufgabe. Er ist keine Mutation Authority und mutiert Project Brain nicht.

### `livariant_provider_return`

Dieses Tool akzeptiert die bereitgestellte Provider-Context-Kopie plus genau ein unterstütztes Provider-Return-Paket und delegiert an die bestehende Provider-Return-Verarbeitungsgrenze.

Bereitgestellter Kontext und Return-Paket bleiben externe nicht vertrauenswürdige Evidenz. Provider Identity, Packet ID, stabile Projektidentität, Baseline und Task-Werte sind Korrelationsmaterial; sie beweisen allein weder Approval noch aktuelle Project Truth oder Mutation Authority.

Mögliche Ergebnisse umfassen begrenzte Zustände wie:

- `no-candidate`
- `stale-context`
- `mismatched-context`
- `candidate-received`
- `blocked`

Ein dauerhafter Änderungskandidat stoppt weiterhin an der unterstützten Review-/Authority-Grenze.

### `livariant_verification_trace`

Dieses read-only Tool bewertet explizite Anforderungen/Claims gegen bereitgestellte Implementierungs- und Verification Evidence.

Seine Evidence-Support-Zustände sind:

```text
SUPPORTED
CONTRADICTED
UNPROVEN
```

Wichtige Grenze:

```text
SUPPORTED != DONE
Verification Evidence != akzeptierte Completion
Evidence != Project Truth
```

Das Tool erzeugt keine vertrauenswürdige Verification Evidence und vergibt weder Completion noch Mutation Authority.

Siehe [Verification Trace](verification-trace.md).

## Authority-Grenze

Die MCP-Bridge macht Provider-Ausgabe, Verification-Ausgabe oder Transport-State nicht zu kanonischer Mutation Authority.

Unbekannte/zusätzliche Tool-Argumente werden durch die aktuellen Tool-Schemas validiert; nicht unterstützter folgenreicher Input schlägt geschlossen fehl.

Ein passender Semantic-/Lifecycle-Authority-Record wird nicht allein deshalb gesucht und konsumiert, weil ein MCP-Call existiert. Folgenreiche Mutation bleibt im getrennten unterstützten Authority-kontrollierten Workflow.

## Transportgrenze

Die Core-MCP-Bridge ist ausschließlich lokales stdio. Sie fügt nicht hinzu:

- HTTP-/TCP-Listener;
- von Livariant gehostetes Remote MCP;
- Cloud-Synchronisierung;
- automatischen Projekt-Upload;
- Webhooks;
- Provider-Account-/Session-Authentifizierung.

Livariant Core/CLI bleibt ohne MCP nutzbar.

Die Desktop-Codex-Verbindung ist eine **getrennte lokale Connector-/App-Server-Integration**. Der echte Desktop-Verbindungspfad darf nicht mit dem auf dieser Seite beschriebenen Core-stdio-MCP-Transport verwechselt werden.

## Input- und Lifecycle-Grenzen

Jede stdio-JSON-RPC-Nachricht ist newline-delimited UTF-8 und unterliegt begrenztem Parsing/Validation.

Die aktuelle Bridge unterstützt den für ihre Tool-Oberfläche nötigen begrenzten Lifecycle:

```text
initialize
-> notifications/initialized
-> tools/list / tools/call
```

`ping` wird ebenfalls unterstützt.

Nicht unterstützter, fehlerhafter oder zu großer Input muss geschlossen fehlschlagen statt die Capability der Bridge still zu erweitern.

## Release-Grenze

Die MCP-Bridge entstand nach der historischen Foundation Preview `v0.1.0-rc.3`. Das bleibt historische Release-Wahrheit und ist nicht die aktuelle Produktgrenze.

Der aktuelle kanonische Repository-Stand und spätere Preview-Oberflächen enthalten mehr MCP-Capability als RC3. Historische RC3-Aussagen dürfen nicht umgeschrieben werden, um etwas anderes zu suggerieren.
