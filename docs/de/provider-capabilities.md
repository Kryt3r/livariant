# Provider-Capability-Wahrheit

Eine lokale Verbindung bedeutet **nicht**, dass jeder Provider dieselben Livariant-Fähigkeiten besitzt.

| Fähigkeit | Codex | Claude Code | Gemini CLI | Custom |
| --- | --- | --- | --- | --- |
| Live projektgebundener Provider Context/Return | unterstützt | über projektlokales MCP unterstützt | über projektbezogenes MCP unterstützt | abhängig von der Bridge |
| Live Gesprächs-/Session-Trennung | provider-eigene Codex-Thread-Metadaten + Livariant-MCP-Session | heute nur Livariant-MCP-Session | heute nur Livariant-MCP-Session | abhängig von der Bridge |
| Nachträgliche Session→Projekt-Zuordnung | aus gespeicherten Codex-Thread-/Session-Metadaten + cwd unterstützt | Provider liefert Session-/cwd-/Transcript-Hook-Metadaten, Livariant-Pfad noch nicht qualifiziert | Provider liefert Session-/cwd-/Transcript-Hook-Metadaten, Livariant-Pfad noch nicht qualifiziert | abhängig von der Bridge |
| Provider-eigene Usage-Telemetrie in Diagnose | über qualifizierte Codex-App-Server-Usage-Events unterstützt | nicht integriert | Provider-Hook-Usage-Metadaten existieren, Livariant-Pfad noch nicht qualifiziert | abhängig von der Bridge |

## Grenzen

- Die Desktop-Projektauswahl ist nur Navigation und niemals Provider-Routing.
- Provider Context bleibt über tatsächlichen Projektpfad, stabile Project-Brain-Identität und Baseline projektgebunden.
- MCP-Ready-Context bleibt Same-Session und nur einmal verwendbar.
- Provider-eigene Session-/Thread-Metadaten sind Korrelations-Evidence, niemals Authority.
- Ein Custom Provider, der über den aktuellen Probe-Vertrag `ready` meldet, beweist nur lokale Bereitschaft. MCP-Kontext, Session-Recovery oder Telemetrie sind dadurch nicht bewiesen.
- Livariant installiert Claude- oder Gemini-Hooks nicht heimlich. Provider-Konfiguration bleibt unter Kontrolle von Provider/Nutzer.
- Fehlende Provider-Historie bleibt als fehlend markiert; Repo-, Git- und Project-Brain-Zustand kann Livariant später trotzdem soweit beweisbar rekonstruieren.
